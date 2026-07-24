/** Rótulos e classes de cor (tema dark) para enums de domínio. */
import { Pillar, AwarenessLevel, ContentClass, ContentType, StaticFormat, ValidationVerdict, SignalSource, AngleType, DerivedAssetType, CreativeFormat } from '@content-engine/shared';

export const FORMAT_LABELS: Record<string, string> = {
  [CreativeFormat.PESSOA_FALANDO]: 'Pessoa falando',
  [CreativeFormat.PRINTS_PROCESSO]: 'Prints do processo',
  [CreativeFormat.POV_DONO_AGENCIA]: 'POV dono de agência',
  [CreativeFormat.ANTES_DEPOIS]: 'Antes/depois',
  [CreativeFormat.CHECKLIST]: 'Checklist',
  [CreativeFormat.STORYTELLING]: 'Storytelling',
  [CreativeFormat.COMPARATIVO]: 'Comparativo',
  [CreativeFormat.TREND_ADAPTADA]: 'Trend adaptada',
  [CreativeFormat.SIMULACAO_CONVERSA]: 'Simulação de conversa',
  [CreativeFormat.DEMONSTRACAO_PRODUTO]: 'Demonstração de produto',
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  [ContentType.VIDEO]: 'Vídeo (Reel)',
  [ContentType.ESTATICO]: 'Estático (post/carrossel)',
};

export const STATIC_FORMAT_LABELS: Record<string, string> = {
  [StaticFormat.IMAGEM_UNICA]: 'Imagem única',
  [StaticFormat.CARROSSEL]: 'Carrossel',
};

export const PILLAR_LABELS: Record<string, string> = {
  [Pillar.DOR_DONO_AGENCIA]: 'Dor do dono',
  [Pillar.QUEBRA_CRENCA]: 'Quebra de crença',
  [Pillar.OPORTUNIDADE_TICKET]: 'Oportunidade/ticket',
  [Pillar.PRODUTO_MECANISMO]: 'Produto/mecanismo',
  [Pillar.PROVA_BASTIDORES]: 'Prova/bastidores',
  [Pillar.OBJECOES]: 'Objeções',
  [Pillar.AUTORIDADE]: 'Autoridade',
};

export const AWARENESS_LABELS: Record<string, string> = {
  [AwarenessLevel.PROBLEMA]: 'Problema',
  [AwarenessLevel.NOVA_PERSPECTIVA]: 'Nova perspectiva',
  [AwarenessLevel.IDENTIFICACAO]: 'Identificação',
  [AwarenessLevel.INTENCAO]: 'Intenção',
};

export const SIGNAL_LABELS: Record<string, string> = {
  [SignalSource.WHATSAPP_LEAD]: 'WhatsApp / lead',
  [SignalSource.OBJECAO_CALL]: 'Objeção em call',
  [SignalSource.COMENTARIO_INSTAGRAM]: 'Comentário Instagram',
  [SignalSource.ANUNCIO_CONCORRENTE]: 'Anúncio concorrente',
  [SignalSource.PRINT_CONVERSA]: 'Print de conversa',
  [SignalSource.RECLAMACAO_LEADS_RUINS]: 'Reclamação leads ruins',
};

export const ANGLE_LABELS: Record<string, string> = {
  [AngleType.DOR]: 'Dor',
  [AngleType.CULPA_TRANSFERIDA]: 'Culpa transferida',
  [AngleType.OPORTUNIDADE]: 'Oportunidade',
  [AngleType.MEDO]: 'Medo',
  [AngleType.AUTORIDADE]: 'Autoridade',
};

export const DERIVED_LABELS: Record<string, string> = {
  [DerivedAssetType.CARROSSEL]: 'Carrossel',
  [DerivedAssetType.STORY]: 'Story',
  [DerivedAssetType.ANUNCIO]: 'Anúncio',
  [DerivedAssetType.EMAIL]: 'E-mail',
  [DerivedAssetType.CORTE_SHORTS]: 'Corte/Shorts',
  [DerivedAssetType.POST_LINKEDIN]: 'Post LinkedIn',
  [DerivedAssetType.SCRIPT_SDR]: 'Script SDR',
  [DerivedAssetType.HOOK_NOVO]: 'Hook novo',
};

export const PILLAR_BADGE: Record<string, string> = {
  [Pillar.DOR_DONO_AGENCIA]: 'bg-rose-500/15 text-rose-300',
  [Pillar.QUEBRA_CRENCA]: 'bg-orange-500/15 text-orange-300',
  [Pillar.OPORTUNIDADE_TICKET]: 'bg-emerald-500/15 text-emerald-300',
  [Pillar.PRODUTO_MECANISMO]: 'bg-brand-500/20 text-brand-300',
  [Pillar.PROVA_BASTIDORES]: 'bg-cyan-500/15 text-cyan-300',
  [Pillar.OBJECOES]: 'bg-amber-500/15 text-amber-300',
  [Pillar.AUTORIDADE]: 'bg-violet-500/15 text-violet-300',
};

export const CLASS_BADGE: Record<string, string> = {
  [ContentClass.VIRAL]: 'bg-fuchsia-500/15 text-fuchsia-300',
  [ContentClass.AUTORIDADE]: 'bg-brand-500/20 text-brand-300',
  [ContentClass.VENDEDOR]: 'bg-emerald-500/15 text-emerald-300',
  [ContentClass.FRACO]: 'bg-surface-700 text-slate-400',
};

export const VERDICT_BADGE: Record<string, string> = {
  [ValidationVerdict.SEGUIR_ROTEIRO]: 'bg-emerald-500/15 text-emerald-300',
  [ValidationVerdict.MELHORAR_ANGULO]: 'bg-amber-500/15 text-amber-300',
  [ValidationVerdict.DESCARTAR]: 'bg-rose-500/15 text-rose-300',
};

/** Acento visual por estágio do pipeline enxuto (dot + hairline no topo da coluna). */
export const STAGE_ACCENT: Record<string, { dot: string; bar: string }> = {
  IDEIAS_BRUTAS: { dot: 'bg-sky-400', bar: 'from-sky-400/70' },
  IDEIAS_VALIDADAS: { dot: 'bg-teal-400', bar: 'from-teal-400/70' },
  ANGULO_DEFINIDO: { dot: 'bg-violet-400', bar: 'from-violet-400/70' },
  HOOKS_EM_TESTE: { dot: 'bg-fuchsia-400', bar: 'from-fuchsia-400/70' },
  ROTEIRO: { dot: 'bg-brand-400', bar: 'from-brand-400/70' },
  PRONTO_PARA_GRAVAR: { dot: 'bg-amber-400', bar: 'from-amber-400/70' },
  EM_EDICAO: { dot: 'bg-orange-400', bar: 'from-orange-400/70' },
  REVISAO_RETENCAO: { dot: 'bg-rose-400', bar: 'from-rose-400/70' },
  PUBLICADO: { dot: 'bg-emerald-400', bar: 'from-emerald-400/70' },
};

/** Barra lateral do card do board na cor do pilar. */
export const PILLAR_BORDER: Record<string, string> = {
  [Pillar.DOR_DONO_AGENCIA]: 'border-l-rose-400/80',
  [Pillar.QUEBRA_CRENCA]: 'border-l-orange-400/80',
  [Pillar.OPORTUNIDADE_TICKET]: 'border-l-emerald-400/80',
  [Pillar.PRODUTO_MECANISMO]: 'border-l-brand-400/80',
  [Pillar.PROVA_BASTIDORES]: 'border-l-cyan-400/80',
  [Pillar.OBJECOES]: 'border-l-amber-400/80',
  [Pillar.AUTORIDADE]: 'border-l-violet-400/80',
};

/** BOARD V2 (PRD-017) — rótulos e acentos das colunas. */
export const V2_STAGE_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  COPY_PRONTA: 'Copy Pronta',
  APROVADO: 'Aprovado',
  PUBLICADO: 'Publicado',
  ARQUIVADO: 'Arquivado',
};

export const V2_STAGE_ACCENT: Record<string, { dot: string; bar: string }> = {
  RASCUNHO: { dot: 'bg-slate-400', bar: 'from-slate-400/60' },
  COPY_PRONTA: { dot: 'bg-brand-400', bar: 'from-brand-400/70' },
  APROVADO: { dot: 'bg-teal-400', bar: 'from-teal-400/70' },
  PUBLICADO: { dot: 'bg-emerald-400', bar: 'from-emerald-400/70' },
  ARQUIVADO: { dot: 'bg-surface-600', bar: 'from-surface-600/60' },
};

export function enumLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Rótulo curto do FORMATO DA PUBLICAÇÃO para o card do board (PRD-011):
 * "Reel" (vídeo), "Imagem única"/"Carrossel" (estático). Anúncio tem selo próprio.
 */
export function publicationFormatLabel(card: { contentType?: string; staticFormat?: string | null }): string {
  if (String(card.contentType) === ContentType.ESTATICO) {
    return card.staticFormat === StaticFormat.CARROSSEL ? 'Carrossel' : 'Imagem única';
  }
  return 'Reel';
}

/** Glyph geométrico do formato (acompanha o rótulo no card do board). */
export function publicationFormatGlyph(card: { contentType?: string; staticFormat?: string | null }): string {
  if (String(card.contentType) === ContentType.ESTATICO) {
    return card.staticFormat === StaticFormat.CARROSSEL ? '▤' : '◻';
  }
  return '▶';
}
