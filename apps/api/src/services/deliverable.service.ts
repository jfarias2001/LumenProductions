/**
 * DeliverableService — monta o "pacote final" de um card a partir das entidades já
 * consolidadas (PRD-003 §5.4 / SPEC-003 §2.4). O formato depende do contentType:
 *  - VÍDEO    → roteiro + hook + textos de tela + insights de edição + legenda/CTAs
 *  - ESTÁTICO → copy + elementos gráficos (slides) + paleta + formato
 */
import { ContentType } from '@content-engine/shared';
import { prisma } from '../lib/prisma.js';

interface GraphicElement {
  slide?: number | string;
  headline?: string;
  body?: string;
  visual?: string;
}

export type Deliverable =
  | {
      type: 'VIDEO';
      title: string;
      hook: string | null;
      script: Record<string, unknown> | null;
      screenTexts: string[];
      editingInsights: string[];
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

  if (card.contentType === ContentType.ESTATICO) {
    return {
      type: 'ESTATICO',
      title: card.title,
      format: card.creative?.format ?? null,
      caption: card.copy?.caption ?? null,
      ctaVariations: card.copy?.ctaVariations ?? [],
      graphicElements: (card.creative?.graphicElements as GraphicElement[] | null) ?? [],
      palette: card.creative?.palette ?? null,
    };
  }

  return {
    type: 'VIDEO',
    title: card.title,
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
    format: card.creative?.format ?? null,
    caption: card.copy?.caption ?? null,
    ctaVariations: card.copy?.ctaVariations ?? [],
  };
}

export function toMarkdown(d: Deliverable): string {
  const lines: string[] = [`# ${d.title}`, ''];

  if (d.type === 'VIDEO') {
    lines.push('**Tipo:** Vídeo (Reel)', '');
    if (d.hook) lines.push(`## Hook`, d.hook, '');
    if (d.script) {
      lines.push('## Roteiro');
      for (const k of ['dor', 'quebra', 'mecanismo', 'beneficio', 'cta'] as const) {
        lines.push(`**${k}:** ${String(d.script[k] ?? '—')}`);
      }
      lines.push(`_Duração estimada: ${String(d.script['durationSec'] ?? '—')}s_`, '');
    }
    if (d.screenTexts.length) lines.push('## Textos de tela', ...d.screenTexts.map((t) => `- ${t}`), '');
    if (d.editingInsights.length) lines.push('## Insights de edição', ...d.editingInsights.map((t) => `- ${t}`), '');
  } else {
    lines.push('**Tipo:** Estático (post/carrossel)', '');
    if (d.format) lines.push(`**Formato:** ${d.format.replace(/_/g, ' ')}`, '');
    if (d.graphicElements.length) {
      lines.push('## Elementos gráficos');
      d.graphicElements.forEach((g, i) => {
        lines.push(
          `### Slide ${g.slide ?? i + 1}`,
          g.headline ? `**Título:** ${g.headline}` : '',
          g.body ? `**Texto:** ${g.body}` : '',
          g.visual ? `**Visual:** ${g.visual}` : '',
          '',
        );
      });
    }
    if (d.palette) lines.push('## Paleta', d.palette, '');
  }

  if (d.caption) lines.push('## Legenda', d.caption, '');
  if (d.ctaVariations.length) lines.push('## CTAs', ...d.ctaVariations.map((c) => `- ${c}`), '');

  return lines.filter((l) => l !== undefined).join('\n');
}
