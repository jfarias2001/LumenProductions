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

export function enumLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
