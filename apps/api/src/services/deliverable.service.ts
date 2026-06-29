/**
 * DeliverableService — monta o "pacote final" de um card a partir das entidades já
 * consolidadas (PRD-003 §5.4 / SPEC-003 §2.4). O formato depende do contentType:
 *  - VÍDEO    → roteiro + hook + textos de tela + insights de edição + legenda/CTAs
 *  - ESTÁTICO → copy + elementos gráficos (slides) + paleta + formato
 */
import { ContentType } from '@content-engine/shared';
import type { GraphicElement, Shot, Typography, AIAdCreativeOutput } from '@content-engine/shared';
import { prisma } from '../lib/prisma.js';

interface ProductionPlan {
  typography?: Typography;
  voiceTone?: string;
  shotList?: Shot[];
}

/** Plano de anúncio (Meta Ads) exibido no pacote final (PRD-009). */
export type AdCreativePlan = AIAdCreativeOutput;

export type Deliverable =
  | {
      type: 'VIDEO';
      title: string;
      isAd: boolean;
      ad: AdCreativePlan | null;
      hook: string | null;
      script: Record<string, unknown> | null;
      screenTexts: string[];
      editingInsights: string[];
      voiceTone: string | null;
      shotList: Shot[];
      typography: Typography | null;
      palette: string | null;
      format: string | null;
      caption: string | null;
      ctaVariations: string[];
    }
  | {
      type: 'ESTATICO';
      title: string;
      format: string | null;
      caption: string | null;
      ctaVariations: string[];
      graphicElements: GraphicElement[];
      typography: Typography | null;
      palette: string | null;
    };

export async function assemble(cardId: string): Promise<Deliverable> {
  const card = await prisma.card.findUniqueOrThrow({
    where: { id: cardId },
    include: {
      script: true,
      copy: true,
      creative: true,
      hooks: { where: { status: 'ESCOLHIDO' } },
    },
  });

  const plan = (card.creative?.productionPlan as ProductionPlan | null) ?? {};
  const typography = plan.typography && (plan.typography.headingFont || plan.typography.bodyFont || plan.typography.notes) ? plan.typography : null;

  if (card.contentType === ContentType.ESTATICO) {
    return {
      type: 'ESTATICO',
      title: card.title,
      format: card.creative?.format ?? null,
      caption: card.copy?.caption ?? null,
      ctaVariations: card.copy?.ctaVariations ?? [],
      graphicElements: (card.creative?.graphicElements as GraphicElement[] | null) ?? [],
      typography,
      palette: card.creative?.palette ?? null,
    };
  }

  return {
    type: 'VIDEO',
    title: card.title,
    isAd: card.isAd,
    ad: card.isAd && card.adPlan ? (card.adPlan as AdCreativePlan) : null,
    hook: card.hooks[0]?.text ?? null,
    script: card.script
      ? {
          dor: card.script.dor,
          quebra: card.script.quebra,
          mecanismo: card.script.mecanismo,
          beneficio: card.script.beneficio,
          cta: card.script.cta,
          durationSec: card.script.durationSec,
        }
      : null,
    screenTexts: card.screenTexts ?? [],
    editingInsights: card.creative?.editingInsights ?? [],
    voiceTone: plan.voiceTone ?? null,
    shotList: plan.shotList ?? [],
    typography,
    palette: card.creative?.palette ?? null,
    format: card.creative?.format ?? null,
    caption: card.copy?.caption ?? null,
    ctaVariations: card.copy?.ctaVariations ?? [],
  };
}

export function toMarkdown(d: Deliverable): string {
  const lines: string[] = [`# ${d.title}`, ''];

  if (d.type === 'VIDEO') {
    lines.push(d.isAd ? '**Tipo:** Vídeo de anúncio (Meta Ads)' : '**Tipo:** Vídeo (Reel)', '');
    if (d.ad) lines.push(...adLines(d.ad));
    if (d.hook) lines.push(`## Hook`, d.hook, '');
    if (d.script) {
      lines.push('## Roteiro');
      for (const k of ['dor', 'quebra', 'mecanismo', 'beneficio', 'cta'] as const) {
        lines.push(`**${k}:** ${String(d.script[k] ?? '—')}`);
      }
      lines.push(`_Duração estimada: ${String(d.script['durationSec'] ?? '—')}s_`, '');
    }
    if (d.voiceTone) lines.push('## Direção de fala (entonação)', d.voiceTone, '');
    if (d.shotList.length) {
      lines.push('## Decupagem (cena a cena)');
      d.shotList.forEach((s, i) => {
        lines.push(
          `### Cena ${i + 1}${s.durationSec ? ` (${s.durationSec}s)` : ''}`,
          s.scene ? `**Descrição:** ${s.scene}` : '',
          s.visual ? `**Enquadramento/B-roll:** ${s.visual}` : '',
          s.screenText ? `**Texto na tela:** ${s.screenText}` : '',
          s.voiceover ? `**Fala:** ${s.voiceover}` : '',
          '',
        );
      });
    }
    if (d.screenTexts.length) lines.push('## Textos de tela', ...d.screenTexts.map((t) => `- ${t}`), '');
    if (d.editingInsights.length) lines.push('## Insights de edição', ...d.editingInsights.map((t) => `- ${t}`), '');
    if (d.typography) lines.push('## Tipografia', typographyLines(d.typography), '');
    if (d.palette) lines.push('## Paleta', d.palette, '');
  } else {
    lines.push('**Tipo:** Estático (post/carrossel)', '');
    if (d.format) lines.push(`**Formato:** ${d.format.replace(/_/g, ' ')}`, '');
    if (d.graphicElements.length) {
      const single = d.graphicElements.length === 1;
      lines.push(single ? '## Imagem' : '## Elementos gráficos (carrossel)');
      d.graphicElements.forEach((g, i) => {
        lines.push(
          single ? '### Imagem única' : `### Slide ${g.slide ?? i + 1}`,
          g.headline ? `**Título:** ${g.headline}` : '',
          g.body ? `**Texto:** ${g.body}` : '',
          g.visual ? `**Visual:** ${g.visual}` : '',
          g.layout ? `**Disposição na tela:** ${g.layout}` : '',
          g.font ? `**Fonte:** ${g.font}` : '',
          g.fontSize ? `**Tamanho da fonte:** ${g.fontSize}` : '',
          g.colors ? `**Cores:** ${g.colors}` : '',
          '',
        );
      });
    }
    if (d.typography) lines.push('## Tipografia', typographyLines(d.typography), '');
    if (d.palette) lines.push('## Paleta', d.palette, '');
  }

  if (d.caption) lines.push('## Legenda', d.caption, '');
  if (d.ctaVariations.length) lines.push('## CTAs', ...d.ctaVariations.map((c) => `- ${c}`), '');

  return lines.filter((l) => l !== undefined).join('\n');
}

/** Seção "Criativo de anúncio (Meta Ads)" do Markdown (PRD-009). */
function adLines(ad: AdCreativePlan): string[] {
  const out: string[] = ['## 📣 Criativo de anúncio (Meta Ads)', ''];
  if (ad.primaryText) out.push('**Texto principal:**', ad.primaryText, '');
  if (ad.headline) out.push(`**Título:** ${ad.headline}`);
  if (ad.description) out.push(`**Descrição:** ${ad.description}`);
  if (ad.ctaButton) out.push(`**Botão (CTA):** ${ad.ctaButton}`);
  if (ad.copyVariations?.length) out.push('', '**Variações de texto (teste A/B):**', ...ad.copyVariations.map((c) => `- ${c}`));
  if (ad.hook) out.push('', `**Gancho (3s):** ${ad.hook}`);
  if (ad.systemAssets?.length) out.push('', '**Vídeos do sistema / b-roll:**', ...ad.systemAssets.map((a) => `- ${a}`));
  if (ad.music) out.push('', `**Trilha:** ${ad.music}`);
  if (ad.soundEffects?.length) out.push('', '**Efeitos sonoros:**', ...ad.soundEffects.map((s) => `- ${s}`));
  if (ad.voiceTone) out.push('', `**Tom de voz:** ${ad.voiceTone}`);
  if (ad.conversionTips?.length) out.push('', '**Dicas de conversão (Meta Ads):**', ...ad.conversionTips.map((t) => `- ${t}`));
  out.push('');
  return out;
}

function typographyLines(t: Typography): string {
  const parts = [
    t.headingFont ? `**Título:** ${t.headingFont}` : '',
    t.bodyFont ? `**Corpo:** ${t.bodyFont}` : '',
    t.notes ? `_${t.notes}_` : '',
  ].filter(Boolean);
  return parts.join('  \n');
}
