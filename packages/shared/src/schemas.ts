import { z } from 'zod';
import {
  AwarenessLevel,
  AngleType,
  ContentClass,
  ContentType,
  StaticFormat,
  CreativeFormat,
  DerivedAssetType,
  HookStatus,
  Pillar,
  Role,
  SignalSource,
  Stage,
  ValidationVerdict,
} from './enums.js';
import { VALIDATION_THRESHOLDS, SCRIPT_DURATION } from './constants.js';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RefreshSchema = z.object({
  refreshToken: z.string(),
});

// ── User ─────────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
});

// ── Card ─────────────────────────────────────────────────────────────────────

export const CreateCardSchema = z.object({
  title: z.string().min(3).max(300),
  stage: z.nativeEnum(Stage).default(Stage.SINAIS_MERCADO),
  contentType: z.nativeEnum(ContentType).default(ContentType.VIDEO),
  staticFormat: z.nativeEnum(StaticFormat).optional(),
  isAd: z.boolean().optional(),
  signalSource: z.nativeEnum(SignalSource).optional(),
  signalContent: z.string().max(2000).optional(),
  signalLink: z.string().url().optional(),
  pillar: z.nativeEnum(Pillar).optional(),
  awareness: z.nativeEnum(AwarenessLevel).optional(),
  assigneeId: z.string().cuid().optional(),
});

export const UpdateCardSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  staticFormat: z.nativeEnum(StaticFormat).optional(),
  isAd: z.boolean().optional(),
  persona: z.string().max(500).optional(),
  pain: z.string().max(1000).optional(),
  promise: z.string().max(500).optional(),
  awareness: z.nativeEnum(AwarenessLevel).optional(),
  pillar: z.nativeEnum(Pillar).optional(),
  ctaText: z.string().max(300).optional(),
  screenTexts: z.array(z.string()).optional(),
  primaryMetric: z.string().max(200).optional(),
  contentClass: z.nativeEnum(ContentClass).optional(),
  signalSource: z.nativeEnum(SignalSource).optional(),
  signalContent: z.string().max(2000).optional(),
  signalLink: z.string().url().optional().or(z.literal('')).optional(),
  rawFootageUrl: z.string().url().optional().or(z.literal('')).optional(),
  editedVideoUrl: z.string().url().optional().or(z.literal('')).optional(),
  referenceUrls: z.array(z.string().url()).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

export const TransitionSchema = z.object({
  to: z.nativeEnum(Stage),
});

export const AssignSchema = z.object({
  assigneeId: z.string().cuid().nullable(),
});

// ── Validation ───────────────────────────────────────────────────────────────

const ScoreField = z.number().int().min(0).max(VALIDATION_THRESHOLDS.CRITERIA_MAX);

export const ValidationSchema = z.object({
  dorQuente: ScoreField,
  clareza: ScoreField,
  contraste: ScoreField,
  especificidadeAgencia: ScoreField,
  potencialComentarios: ScoreField,
  potencialComercial: ScoreField,
  aiJustifications: z.record(z.string()).optional(),
  aiSuggested: z.boolean().optional(),
  reviewedById: z.string().cuid().optional(),
});

// ── Angle ────────────────────────────────────────────────────────────────────

export const CreateAngleSchema = z.object({
  type: z.nativeEnum(AngleType),
  text: z.string().min(5).max(500),
  selected: z.boolean().optional(),
  aiGenerated: z.boolean().optional(),
});

export const UpdateAngleSchema = CreateAngleSchema.partial();

// ── Hook ─────────────────────────────────────────────────────────────────────

export const CreateHookSchema = z.object({
  text: z.string().min(5).max(300),
  status: z.nativeEnum(HookStatus).optional(),
  aiGenerated: z.boolean().optional(),
});

export const UpdateHookSchema = CreateHookSchema.partial();

// ── Script ───────────────────────────────────────────────────────────────────

export const ScriptSchema = z.object({
  dor: z.string().min(10).max(1000),
  quebra: z.string().min(10).max(1000),
  mecanismo: z.string().min(10).max(1000),
  beneficio: z.string().min(10).max(1000),
  cta: z.string().min(5).max(300),
  durationSec: z.number().int().min(SCRIPT_DURATION.MIN_SEC).max(SCRIPT_DURATION.MAX_SEC),
  strongPhrases: z.array(z.string()).optional(),
  approved: z.boolean().optional(),
  aiGenerated: z.boolean().optional(),
});

// ── Creative Direction ────────────────────────────────────────────────────────

export const CreativeDirectionSchema = z.object({
  format: z.nativeEnum(CreativeFormat),
  visualNotes: z.string().max(1000).optional(),
  referenceUrls: z.array(z.string().url()).optional(),
});

// ── Copy ─────────────────────────────────────────────────────────────────────

export const CopyContentSchema = z.object({
  caption: z.string().min(10).max(2200),
  ctaVariations: z.array(z.string()).min(1),
  aiGenerated: z.boolean().optional(),
});

// ── Schedule ─────────────────────────────────────────────────────────────────

export const ScheduleSchema = z.object({
  objective: z.string().min(5).max(300),
  audience: z.string().min(5).max(300),
  cta: z.string().min(5).max(300),
  primaryMetric: z.string().min(3).max(200),
  hypothesis: z.string().min(5).max(500),
  scheduledFor: z.string().datetime(),
});

// ── Retention Review ──────────────────────────────────────────────────────────

export const RetentionAnswerSchema = z.object({
  question: z.string(),
  good: z.boolean(),
});

export const RetentionReviewSchema = z.object({
  answers: z.array(RetentionAnswerSchema).min(1),
  notes: z.string().max(1000).optional(),
  reviewerId: z.string().cuid().optional(),
});

// ── Checklist ────────────────────────────────────────────────────────────────

export const ChecklistItemUpdateSchema = z.object({
  id: z.string().cuid(),
  checked: z.boolean(),
  checkedById: z.string().cuid().optional(),
});

export const ChecklistBatchUpdateSchema = z.object({
  items: z.array(ChecklistItemUpdateSchema),
});

// ── Metrics ──────────────────────────────────────────────────────────────────

export const MetricSnapshotSchema = z.object({
  retentionPct: z.number().min(0).max(100).optional(),
  shares: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  profileClicks: z.number().int().min(0).optional(),
  directs: z.number().int().min(0).optional(),
  newFollowers: z.number().int().min(0).optional(),
  measuredAt: z.string().datetime().optional(),
  enteredById: z.string().cuid().optional(),
});

// ── Derived Asset ─────────────────────────────────────────────────────────────

export const DerivedAssetSchema = z.object({
  type: z.nativeEnum(DerivedAssetType),
  content: z.string().optional(),
  externalUrl: z.string().url().optional(),
  aiGenerated: z.boolean().optional(),
});

// ── Comment ───────────────────────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

// ── Board filters ─────────────────────────────────────────────────────────────

export const BoardFiltersSchema = z.object({
  assigneeId: z.string().cuid().optional(),
  pillar: z.nativeEnum(Pillar).optional(),
  awareness: z.nativeEnum(AwarenessLevel).optional(),
  contentClass: z.nativeEnum(ContentClass).optional(),
  search: z.string().max(200).optional(),
});

// ── App Settings ──────────────────────────────────────────────────────────────

export const AppSettingSchema = z.object({
  mixTargets: z.object({
    dorConsciencia: z.number(),
    solucaoMecanismo: z.number(),
    provaBastidorProduto: z.number(),
  }),
  pillarGroupMap: z.record(z.string()),
  weeklyTargets: z.object({
    dor: z.number().int(),
    autoridade: z.number().int(),
    produto: z.number().int(),
    prova: z.number().int(),
    trend: z.number().int(),
  }),
  goldenRulePrompt: z.string(),
});

// ── Checklist Template ────────────────────────────────────────────────────────

export const ChecklistTemplateItemSchema = z.object({
  label: z.string().min(3).max(300),
  order: z.number().int().min(0),
});

export const ChecklistTemplateSchema = z.object({
  items: z.array(ChecklistTemplateItemSchema),
});

// ── AI Jobs ───────────────────────────────────────────────────────────────────

export const AIProspectInputSchema = z.object({
  signalIds: z.array(z.string().cuid()).min(1),
});

export const AIStructureInputSchema = z.object({
  rawText: z.string().min(10).max(5000),
  cardId: z.string().cuid().optional(),
});

export const AIValidateInputSchema = z.object({
  cardId: z.string().cuid(),
});

export const AIAnglesInputSchema = z.object({
  cardId: z.string().cuid(),
});

export const AICopyInputSchema = z.object({
  cardId: z.string().cuid(),
});

export const AIRecycleInputSchema = z.object({
  cardId: z.string().cuid(),
});

// ── AI outputs (estruturados — SPEC-001 §9.3 / SPEC-002 §1.3) ──────────────────

/** Normaliza string: minúsculas, sem acentos, espaços colapsados. */
function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Coerção tolerante de enum: a IA frequentemente devolve o rótulo legível
 * ("Consciente do problema…") ou uma frase em vez do valor do enum. Esta
 * função mapeia por (1) valor exato, (2) fragmentos-chave. Se nada casar,
 * retorna undefined — o campo é opcional e a consolidação não quebra.
 */
function coerceEnum<T extends Record<string, string>>(
  enumObj: T,
  keywords: Partial<Record<T[keyof T], string[]>>,
) {
  const values = Object.values(enumObj) as T[keyof T][];
  return (raw: unknown): T[keyof T] | undefined => {
    if (typeof raw !== 'string') return undefined;
    const n = normalizeText(raw);
    if (!n) return undefined;
    for (const v of values) {
      if (n === normalizeText(v)) return v;
    }
    for (const v of values) {
      for (const frag of keywords[v] ?? []) {
        if (n.includes(frag)) return v;
      }
    }
    return undefined;
  };
}

const PillarLoose = z.preprocess(
  coerceEnum(Pillar, {
    [Pillar.DOR_DONO_AGENCIA]: ['dor'],
    [Pillar.QUEBRA_CRENCA]: ['quebra', 'crenc'],
    [Pillar.OPORTUNIDADE_TICKET]: ['oportunidade', 'ticket'],
    [Pillar.PRODUTO_MECANISMO]: ['produto', 'mecanismo'],
    [Pillar.PROVA_BASTIDORES]: ['prova', 'bastidor'],
    [Pillar.OBJECOES]: ['objec', 'objeç'],
    [Pillar.AUTORIDADE]: ['autoridade'],
  }),
  z.nativeEnum(Pillar).optional(),
);

const AwarenessLoose = z.preprocess(
  coerceEnum(AwarenessLevel, {
    [AwarenessLevel.INTENCAO]: ['intenc', 'intenç', 'decis', 'compra'],
    [AwarenessLevel.IDENTIFICACAO]: ['identifica', 'solucao', 'solução', 'produto'],
    [AwarenessLevel.NOVA_PERSPECTIVA]: ['perspectiv', 'nova'],
    [AwarenessLevel.PROBLEMA]: ['problema'],
  }),
  z.nativeEnum(AwarenessLevel).optional(),
);

/** Prospecção de ideias a partir de sinais. */
export const AIProspectOutputSchema = z.object({
  ideas: z
    .array(
      z.object({
        hook: z.string(),
        dorPrincipal: z.string(),
        persona: z.string(),
        objetivo: z.string(),
        pillar: PillarLoose,
      }),
    )
    .min(1),
  temasRecorrentes: z.array(z.string()).default([]),
});

/** Estruturação de input solto em campos do template. */
export const AIStructureOutputSchema = z.object({
  title: z.string(),
  persona: z.string().optional(),
  pain: z.string().optional(),
  promise: z.string().optional(),
  pillar: PillarLoose,
  awareness: AwarenessLoose,
});

/** Validação assistida — 6 notas (0–3) + justificativa por critério. */
export const AIValidateOutputSchema = z.object({
  dorQuente: ScoreField,
  clareza: ScoreField,
  contraste: ScoreField,
  especificidadeAgencia: ScoreField,
  potencialComentarios: ScoreField,
  potencialComercial: ScoreField,
  justificativas: z.record(z.string()).default({}),
});

/** Ângulos + hooks. */
export const AIAnglesOutputSchema = z.object({
  angles: z
    .array(
      z.object({
        type: z.nativeEnum(AngleType),
        text: z.string(),
      }),
    )
    .min(1),
  hooks: z.array(z.string()).min(3).max(12),
});

/** Geração de copy: roteiro + legenda + CTAs. */
export const AICopyOutputSchema = z.object({
  script: z.object({
    dor: z.string(),
    quebra: z.string(),
    mecanismo: z.string(),
    beneficio: z.string(),
    cta: z.string(),
    durationSec: z.number().int().min(15).max(90).default(40),
  }),
  caption: z.string(),
  ctaVariations: z.array(z.string()).min(1),
  screenTexts: z.array(z.string()).default([]),
});

/** Reciclagem: ativos derivados. */
export const AIRecycleOutputSchema = z.object({
  derivedAssets: z
    .array(
      z.object({
        type: z.nativeEnum(DerivedAssetType),
        content: z.string(),
      }),
    )
    .min(1),
});

/**
 * Normaliza qualquer valor que a IA devolva (string, número, array ou objeto)
 * em texto legível. A IA frequentemente retorna estrutura onde esperamos texto
 * (ex.: palette como {primary, secondary} ou colors como array) — em vez de
 * falhar a validação, achatamos para uma frase.
 */
function looseStringify(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(looseStringify).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => {
        const s = looseStringify(val);
        return s ? `${k}: ${s}` : '';
      })
      .filter(Boolean)
      .join('; ');
  }
  return String(v);
}

/** Campo de texto tolerante: coage objeto/array/número da IA para string. */
const LooseString = z.preprocess(looseStringify, z.string());

/** Array tolerante: aceita um valor único da IA e o embrulha em lista. */
const looseArray = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(item));

/** Tipografia sugerida para a peça (fonte de título/corpo + observações). */
export const TypographySchema = z.object({
  headingFont: LooseString.default(''),
  bodyFont: LooseString.default(''),
  notes: LooseString.default(''),
});

/** ESTÁTICO: cada slide/elemento com disposição na tela, fonte, tamanho e cores. */
export const GraphicElementSchema = z.object({
  slide: z.union([z.number(), z.string()]).optional(),
  headline: LooseString.default(''),
  body: LooseString.default(''),
  visual: LooseString.default(''),
  /** Como dispor os elementos na tela (ex.: "título no topo centralizado, imagem ao fundo"). */
  layout: LooseString.default(''),
  font: LooseString.default(''),
  fontSize: LooseString.default(''),
  colors: LooseString.default(''),
});

/** VÍDEO: cada cena com enquadramento, texto de tela e narração/fala. */
export const ShotSchema = z.object({
  scene: LooseString.default(''),
  durationSec: z.union([z.number(), z.string()]).optional(),
  visual: LooseString.default(''),
  screenText: LooseString.default(''),
  voiceover: LooseString.default(''),
});

/** Direção criativa consolidada (PRD-003 / PRD-006) — adapta-se ao tipo de conteúdo. */
export const AIDirectionOutputSchema = z.object({
  format: z.nativeEnum(CreativeFormat),
  visualNotes: LooseString.default(''),
  palette: LooseString.default(''),
  typography: TypographySchema.optional().default({}),
  /** VÍDEO: instruções de edição (cortes, ritmo, b-roll, trilha). */
  editingInsights: looseArray(LooseString).default([]),
  /** VÍDEO: direção de fala/entonação. */
  voiceTone: LooseString.default(''),
  /** VÍDEO: decupagem cena a cena. */
  shotList: looseArray(ShotSchema).default([]),
  /** ESTÁTICO: estrutura de slides/post com fonte, tamanho, cores e disposição. */
  graphicElements: looseArray(GraphicElementSchema).default([]),
});

export const AIDirectionInputSchema = z.object({
  cardId: z.string().cuid(),
});

// ── Base de conhecimento da empresa + Calendário editorial (PRD-005 / SPEC-005) ─

export const CompanyPersonaSchema = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  pains: z.string().default(''),
});

/** Perfil estruturado da empresa — singleton; embasa todas as gerações de IA. */
export const CompanyProfileSchema = z.object({
  companyName: z.string().max(200).default(''),
  about: z.string().max(4000).default(''),
  offerings: z.string().max(4000).default(''),
  personas: z.array(CompanyPersonaSchema).default([]),
  mainPains: z.string().max(4000).default(''),
  toneOfVoice: z.string().max(2000).default(''),
  differentiators: z.string().max(4000).default(''),
  proofCases: z.string().max(4000).default(''),
  dos: z.array(z.string()).default([]),
  donts: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
});

/** Input do usuário para gerar um calendário editorial. */
export const GenerateCalendarInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    objective: z.string().min(1).max(2000),
    startDate: z.string().min(8), // ISO (yyyy-mm-dd)
    endDate: z.string().min(8), // ISO (yyyy-mm-dd)
    videoCount: z.number().int().min(0).max(60).default(0),
    postCount: z.number().int().min(0).max(60).default(0),
    carrosselCount: z.number().int().min(0).max(60).default(0),
    /** Vídeos criados como ANÚNCIO (Meta Ads) — gerados com isAd=true (PRD-009). */
    adVideoCount: z.number().int().min(0).max(60).default(0),
    notes: z.string().max(4000).optional(),
  })
  .refine((d) => d.videoCount + d.postCount + d.carrosselCount + d.adVideoCount >= 1, {
    message: 'Defina ao menos 1 conteúdo (vídeo, post, carrossel ou anúncio).',
  })
  .refine((d) => d.videoCount + d.postCount + d.carrosselCount + d.adVideoCount <= 60, {
    message: 'O total de peças não pode passar de 60.',
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'A data fim deve ser igual ou posterior à data início.',
  });

/** Boolean tolerante: a IA pode devolver "true"/"sim"/1 em vez de boolean. */
const BooleanLoose = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    return ['true', '1', 'sim', 'yes', 'anuncio', 'ad'].includes(normalizeText(v));
  }
  return false;
}, z.boolean());

const ContentTypeLoose = z.preprocess(
  coerceEnum(ContentType, {
    [ContentType.VIDEO]: ['video', 'reel', 'reels', 'short'],
    [ContentType.ESTATICO]: ['estatic', 'static', 'post', 'carrossel', 'carousel', 'imagem'],
  }),
  z.nativeEnum(ContentType).optional(),
);

const FormatLoose = z.preprocess(
  coerceEnum(CreativeFormat, {
    [CreativeFormat.PESSOA_FALANDO]: ['pessoa', 'falando', 'talking'],
    [CreativeFormat.PRINTS_PROCESSO]: ['print', 'processo'],
    [CreativeFormat.POV_DONO_AGENCIA]: ['pov', 'dono'],
    [CreativeFormat.ANTES_DEPOIS]: ['antes', 'depois'],
    [CreativeFormat.CHECKLIST]: ['checklist', 'lista'],
    [CreativeFormat.STORYTELLING]: ['story', 'historia', 'narrativa'],
    [CreativeFormat.COMPARATIVO]: ['comparativ', 'versus', 'vs'],
    [CreativeFormat.TREND_ADAPTADA]: ['trend', 'tendenc'],
    [CreativeFormat.SIMULACAO_CONVERSA]: ['simula', 'conversa', 'chat'],
    [CreativeFormat.DEMONSTRACAO_PRODUTO]: ['demo', 'demonstra', 'produto'],
  }),
  z.nativeEnum(CreativeFormat).optional(),
);

const StaticFormatLoose = z.preprocess(
  coerceEnum(StaticFormat, {
    [StaticFormat.IMAGEM_UNICA]: ['imagem', 'unica', 'single', 'image', 'foto', 'post'],
    [StaticFormat.CARROSSEL]: ['carrossel', 'carousel', 'slides', 'sequencia'],
  }),
  z.nativeEnum(StaticFormat).optional(),
);

/** Item devolvido pela IA (datas são calculadas no backend). */
export const AICalendarItemSchema = z.object({
  week: z.number().int().min(1).default(1),
  title: z.string(),
  pillar: PillarLoose,
  contentType: ContentTypeLoose,
  format: FormatLoose,
  staticFormat: StaticFormatLoose,
  persona: z.string().optional(),
  pain: z.string().optional(),
  promise: z.string().optional(),
  connection: z.string().optional(),
  /** Marca a peça como anúncio (Meta Ads) — recebe criativo de anúncio (PRD-009). */
  isAd: BooleanLoose,
});

/** Saída completa da IA: fio condutor + sequência de itens conectados. */
export const AICalendarOutputSchema = z.object({
  theme: z.string().default(''),
  items: z.array(AICalendarItemSchema).min(1),
});

// ── Criativo de anúncio / Meta Ads (PRD-009) ────────────────────────────────────

/**
 * Saída do criativo de ANÚNCIO (Meta Ads). Substitui o criativo orgânico para
 * peças marcadas como anúncio: roteiro + copy de resposta direta + direção de
 * edição focada em conversão (vídeos do sistema, trilha, efeitos, tom de voz).
 */
export const AIAdCreativeOutputSchema = z.object({
  /** Roteiro do anúncio (mesma forma do roteiro, foco em conversão). */
  script: z.object({
    dor: LooseString.default(''),
    quebra: LooseString.default(''),
    mecanismo: LooseString.default(''),
    beneficio: LooseString.default(''),
    cta: LooseString.default(''),
    durationSec: z.union([z.number(), z.string()]).optional(),
  }),
  // — Copy de anúncio (resposta direta) —
  /** Texto principal do anúncio (corpo acima do criativo). */
  primaryText: LooseString.default(''),
  /** Título / manchete do anúncio. */
  headline: LooseString.default(''),
  /** Descrição (link / abaixo do título). */
  description: LooseString.default(''),
  /** Botão de CTA do anúncio (ex.: "Saiba mais", "Enviar mensagem", "Cadastre-se"). */
  ctaButton: LooseString.default('Saiba mais'),
  /** Variações do texto principal para teste A/B. */
  copyVariations: looseArray(LooseString).default([]),
  // — Direção de edição focada em anúncio —
  format: FormatLoose,
  /** Gancho dos primeiros 3 segundos para segurar tráfego frio. */
  hook: LooseString.default(''),
  /** Decupagem cena a cena. */
  shotList: looseArray(ShotSchema).default([]),
  /** Vídeos do sistema / banco / b-roll sugeridos. */
  systemAssets: looseArray(LooseString).default([]),
  /** Trilha / música sugerida. */
  music: LooseString.default(''),
  /** Efeitos sonoros sugeridos. */
  soundEffects: looseArray(LooseString).default([]),
  /** Tom de voz / entonação para conversão. */
  voiceTone: LooseString.default(''),
  /** Insights de edição (cortes, ritmo, legendas/captions). */
  editingInsights: looseArray(LooseString).default([]),
  /** Dicas de conversão específicas para Meta Ads. */
  conversionTips: looseArray(LooseString).default([]),
});

export const AIAdCreativeInputSchema = z.object({
  cardId: z.string().cuid(),
});

// ── Conversa por fase (PRD-003 / SPEC-003) ─────────────────────────────────────

export const ConversationMessageInputSchema = z.object({
  content: z.string().min(1).max(8000),
});

export const ConsolidateInputSchema = z.object({
  /** Opcional: força um estágio específico; default = estágio da conversa. */
  stage: z.nativeEnum(Stage).optional(),
});

// ── Geração com IA por fase (PRD-004 / SPEC-004) ───────────────────────────────

export const GenerateStageInputSchema = z.object({
  /** Informação de partida fornecida pelo usuário. Obrigatória em IDEIAS_BRUTAS; opcional nas demais fases. */
  context: z.string().max(8000).optional(),
});

// ── Prompt templates por fase (PRD-003 §5.2) ───────────────────────────────────

export const CreatePromptTemplateSchema = z.object({
  stage: z.nativeEnum(Stage),
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(4000),
  isDefault: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const UpdatePromptTemplateSchema = CreatePromptTemplateSchema.partial().omit({ stage: true });

// ── Inferred types ────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateCardInput = z.infer<typeof CreateCardSchema>;
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;
export type TransitionInput = z.infer<typeof TransitionSchema>;
export type ValidationInput = z.infer<typeof ValidationSchema>;
export type CreateAngleInput = z.infer<typeof CreateAngleSchema>;
export type CreateHookInput = z.infer<typeof CreateHookSchema>;
export type ScriptInput = z.infer<typeof ScriptSchema>;
export type CreativeDirectionInput = z.infer<typeof CreativeDirectionSchema>;
export type CopyContentInput = z.infer<typeof CopyContentSchema>;
export type ScheduleInput = z.infer<typeof ScheduleSchema>;
export type RetentionReviewInput = z.infer<typeof RetentionReviewSchema>;
export type MetricSnapshotInput = z.infer<typeof MetricSnapshotSchema>;
export type DerivedAssetInput = z.infer<typeof DerivedAssetSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type BoardFiltersInput = z.infer<typeof BoardFiltersSchema>;
export type AppSettingInput = z.infer<typeof AppSettingSchema>;
export type AIProspectOutput = z.infer<typeof AIProspectOutputSchema>;
export type AIStructureOutput = z.infer<typeof AIStructureOutputSchema>;
export type AIValidateOutput = z.infer<typeof AIValidateOutputSchema>;
export type AIAnglesOutput = z.infer<typeof AIAnglesOutputSchema>;
export type AICopyOutput = z.infer<typeof AICopyOutputSchema>;
export type AIRecycleOutput = z.infer<typeof AIRecycleOutputSchema>;
export type AIDirectionOutput = z.infer<typeof AIDirectionOutputSchema>;
export type AIDirectionInput = z.infer<typeof AIDirectionInputSchema>;
export type GraphicElement = z.infer<typeof GraphicElementSchema>;
export type Shot = z.infer<typeof ShotSchema>;
export type Typography = z.infer<typeof TypographySchema>;
export type ConversationMessageInput = z.infer<typeof ConversationMessageInputSchema>;
export type ConsolidateInput = z.infer<typeof ConsolidateInputSchema>;
export type GenerateStageInput = z.infer<typeof GenerateStageInputSchema>;
export type CreatePromptTemplateInput = z.infer<typeof CreatePromptTemplateSchema>;
export type UpdatePromptTemplateInput = z.infer<typeof UpdatePromptTemplateSchema>;
export type CompanyPersona = z.infer<typeof CompanyPersonaSchema>;
export type CompanyProfileInput = z.infer<typeof CompanyProfileSchema>;
export type GenerateCalendarInput = z.infer<typeof GenerateCalendarInputSchema>;
export type AICalendarItem = z.infer<typeof AICalendarItemSchema>;
export type AICalendarOutput = z.infer<typeof AICalendarOutputSchema>;
export type AIAdCreativeOutput = z.infer<typeof AIAdCreativeOutputSchema>;
export type AIAdCreativeInput = z.infer<typeof AIAdCreativeInputSchema>;
