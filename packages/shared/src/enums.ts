// Valores de estágio (mantidos por compat com o banco e com o arquivamento).
// Desde o PRD-011, o pipeline ATIVO usa apenas as 9 etapas de STAGE_ORDER; as
// demais (SINAIS_MERCADO, DIRECAO_CRIATIVA, COPY_LEGENDA_CTA, GRAVADO, AGENDADO,
// EM_DISTRIBUICAO, ANALISE, ESCALAR_RECICLAR) ficam fora do pipeline — inalcançáveis
// pelo board/stepper/gates, retidas só para dados legados. ARQUIVADO segue como
// estado terminal de arquivamento (marcado junto com Card.archivedAt).
export enum Stage {
  SINAIS_MERCADO = 'SINAIS_MERCADO',
  IDEIAS_BRUTAS = 'IDEIAS_BRUTAS',
  IDEIAS_VALIDADAS = 'IDEIAS_VALIDADAS',
  ANGULO_DEFINIDO = 'ANGULO_DEFINIDO',
  HOOKS_EM_TESTE = 'HOOKS_EM_TESTE',
  ROTEIRO = 'ROTEIRO',
  DIRECAO_CRIATIVA = 'DIRECAO_CRIATIVA',
  PRONTO_PARA_GRAVAR = 'PRONTO_PARA_GRAVAR',
  GRAVADO = 'GRAVADO',
  EM_EDICAO = 'EM_EDICAO',
  REVISAO_RETENCAO = 'REVISAO_RETENCAO',
  COPY_LEGENDA_CTA = 'COPY_LEGENDA_CTA',
  AGENDADO = 'AGENDADO',
  PUBLICADO = 'PUBLICADO',
  EM_DISTRIBUICAO = 'EM_DISTRIBUICAO',
  ANALISE = 'ANALISE',
  ESCALAR_RECICLAR = 'ESCALAR_RECICLAR',
  ARQUIVADO = 'ARQUIVADO',
}

// Pipeline ativo (9 etapas — PRD-011). Roteiro reúne roteiro + direção + copy.
export const STAGE_ORDER: Stage[] = [
  Stage.IDEIAS_BRUTAS,
  Stage.IDEIAS_VALIDADAS,
  Stage.ANGULO_DEFINIDO,
  Stage.HOOKS_EM_TESTE,
  Stage.ROTEIRO,
  Stage.PRONTO_PARA_GRAVAR,
  Stage.EM_EDICAO,
  Stage.REVISAO_RETENCAO,
  Stage.PUBLICADO,
];

// Pilares de conteúdo (PRD §8)
export enum Pillar {
  DOR_DONO_AGENCIA = 'DOR_DONO_AGENCIA',
  QUEBRA_CRENCA = 'QUEBRA_CRENCA',
  OPORTUNIDADE_TICKET = 'OPORTUNIDADE_TICKET',
  PRODUTO_MECANISMO = 'PRODUTO_MECANISMO',
  PROVA_BASTIDORES = 'PROVA_BASTIDORES',
  OBJECOES = 'OBJECOES',
  AUTORIDADE = 'AUTORIDADE',
}

export enum AwarenessLevel {
  PROBLEMA = 'PROBLEMA',
  NOVA_PERSPECTIVA = 'NOVA_PERSPECTIVA',
  IDENTIFICACAO = 'IDENTIFICACAO',
  INTENCAO = 'INTENCAO',
}

export enum ContentClass {
  VIRAL = 'VIRAL',
  AUTORIDADE = 'AUTORIDADE',
  VENDEDOR = 'VENDEDOR',
  FRACO = 'FRACO',
}

export enum SignalSource {
  WHATSAPP_LEAD = 'WHATSAPP_LEAD',
  OBJECAO_CALL = 'OBJECAO_CALL',
  COMENTARIO_INSTAGRAM = 'COMENTARIO_INSTAGRAM',
  ANUNCIO_CONCORRENTE = 'ANUNCIO_CONCORRENTE',
  PRINT_CONVERSA = 'PRINT_CONVERSA',
  RECLAMACAO_LEADS_RUINS = 'RECLAMACAO_LEADS_RUINS',
}

export enum AngleType {
  DOR = 'DOR',
  CULPA_TRANSFERIDA = 'CULPA_TRANSFERIDA',
  OPORTUNIDADE = 'OPORTUNIDADE',
  MEDO = 'MEDO',
  AUTORIDADE = 'AUTORIDADE',
}

export enum CreativeFormat {
  PESSOA_FALANDO = 'PESSOA_FALANDO',
  PRINTS_PROCESSO = 'PRINTS_PROCESSO',
  POV_DONO_AGENCIA = 'POV_DONO_AGENCIA',
  ANTES_DEPOIS = 'ANTES_DEPOIS',
  CHECKLIST = 'CHECKLIST',
  STORYTELLING = 'STORYTELLING',
  COMPARATIVO = 'COMPARATIVO',
  TREND_ADAPTADA = 'TREND_ADAPTADA',
  SIMULACAO_CONVERSA = 'SIMULACAO_CONVERSA',
  DEMONSTRACAO_PRODUTO = 'DEMONSTRACAO_PRODUTO',
}

export enum DerivedAssetType {
  CARROSSEL = 'CARROSSEL',
  STORY = 'STORY',
  ANUNCIO = 'ANUNCIO',
  EMAIL = 'EMAIL',
  CORTE_SHORTS = 'CORTE_SHORTS',
  POST_LINKEDIN = 'POST_LINKEDIN',
  SCRIPT_SDR = 'SCRIPT_SDR',
  HOOK_NOVO = 'HOOK_NOVO',
}

export enum Role {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',
  ESTRATEGISTA = 'ESTRATEGISTA',
  ROTEIRISTA = 'ROTEIRISTA',
  GRAVACAO = 'GRAVACAO',
  EDITOR = 'EDITOR',
  REVISOR_RETENCAO = 'REVISOR_RETENCAO',
}

export enum HookStatus {
  EM_TESTE = 'EM_TESTE',
  ESCOLHIDO = 'ESCOLHIDO',
  DESCARTADO = 'DESCARTADO',
}

export enum ValidationVerdict {
  DESCARTAR = 'DESCARTAR',
  MELHORAR_ANGULO = 'MELHORAR_ANGULO',
  SEGUIR_ROTEIRO = 'SEGUIR_ROTEIRO',
}

export enum AIJobType {
  PROSPECT = 'prospect',
  STRUCTURE = 'structure',
  VALIDATE = 'validate',
  ANGLES = 'angles',
  COPY = 'copy',
  RECYCLE = 'recycle',
}

export enum AIJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

/**
 * Colunas do BOARD V2 (PRD-017) — board independente e leve, focado em copy.
 * Sem gates: o funil cria em COPY_PRONTA e o usuário move livremente.
 */
export enum V2Stage {
  RASCUNHO = 'RASCUNHO',
  COPY_PRONTA = 'COPY_PRONTA',
  APROVADO = 'APROVADO',
  PUBLICADO = 'PUBLICADO',
  ARQUIVADO = 'ARQUIVADO',
}

export const V2_STAGE_ORDER: V2Stage[] = [
  V2Stage.RASCUNHO,
  V2Stage.COPY_PRONTA,
  V2Stage.APROVADO,
  V2Stage.PUBLICADO,
];

// Tipo de conteúdo do card — define o formato do entregável final (PRD-003)
export enum ContentType {
  VIDEO = 'VIDEO',
  ESTATICO = 'ESTATICO',
}

/**
 * Sub-formato de um conteúdo ESTÁTICO no Instagram (PRD-007).
 * IMAGEM_UNICA (default) = uma só composição/imagem; CARROSSEL = sequência de slides (até 10).
 */
export enum StaticFormat {
  IMAGEM_UNICA = 'IMAGEM_UNICA',
  CARROSSEL = 'CARROSSEL',
}

/**
 * Fases criativas com geração de IA (PRD-003 §5.1 / PRD-011). Roteiro passou a
 * cobrir direção + copy, então as etapas Direção/Copy/Reciclar saíram da lista.
 */
export const CONVERSATIONAL_STAGES: Stage[] = [
  Stage.IDEIAS_BRUTAS,
  Stage.IDEIAS_VALIDADAS,
  Stage.ANGULO_DEFINIDO,
  Stage.HOOKS_EM_TESTE,
  Stage.ROTEIRO,
];

export function isConversationalStage(stage: Stage): boolean {
  return CONVERSATIONAL_STAGES.includes(stage);
}

/** Papel/objetivo da IA em cada fase — injetado no system prompt da conversa (SPEC-003 §2.2). */
export const STAGE_GOAL: Partial<Record<Stage, string>> = {
  [Stage.IDEIAS_BRUTAS]:
    'Ajude a lapidar a ideia bruta: clarear a dor central, a persona (dono de agência) e a promessa. Sugira ângulos iniciais e ajude a definir título, pilar e nível de consciência.',
  [Stage.IDEIAS_VALIDADAS]:
    'Avalie criticamente o potencial da ideia (dor quente, clareza, contraste, especificidade de agência, potencial de comentários e comercial). Aponte fraquezas e como fortalecer antes de seguir.',
  [Stage.ANGULO_DEFINIDO]:
    'Explore ângulos narrativos (dor, culpa transferida, oportunidade, medo, autoridade). Ajude a escolher o ângulo mais forte para a persona.',
  [Stage.HOOKS_EM_TESTE]:
    'Gere e refine hooks de abertura (primeiros 2 segundos). Busque variações que parem o scroll e entrem direto na dor.',
  [Stage.ROTEIRO]:
    'Etapa única de criação (PRD-011): escreva o roteiro de 30–45s (dor → quebra → mecanismo → benefício → CTA), defina a direção criativa (formato, cortes/slides, tipografia, paleta) e a copy/legenda + variações de CTA.',
  [Stage.DIRECAO_CRIATIVA]:
    'Defina a direção criativa. Para VÍDEO: cortes, ritmo, b-roll, textos de tela, trilha. Para ESTÁTICO: estrutura de slides/post, elementos visuais por slide, paleta e hierarquia.',
  [Stage.COPY_LEGENDA_CTA]:
    'Escreva e refine a legenda e variações de CTA para a peça, mantendo a Regra de Ouro e o tom para dono de agência.',
  [Stage.ESCALAR_RECICLAR]:
    'Transforme a peça vencedora em ativos derivados (carrossel, e-mail, SDR, LinkedIn, novos hooks, cortes). Adapte a mensagem a cada canal.',
};
