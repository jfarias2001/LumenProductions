/**
 * PipelineService — coração das regras de negócio de transição de estágio.
 * Testável unitariamente sem dependência de Fastify ou Prisma.
 * SPEC-001 §7.2 e §7.3
 */

import {
  Stage,
  STAGE_ORDER,
  ValidationVerdict,
  VALIDATION_THRESHOLDS,
  MIN_HOOKS_TO_ADVANCE,
} from '@content-engine/shared';

// Tipos mínimos necessários para as verificações (independentes do Prisma)
export interface CardSnapshot {
  stage: Stage;
  title: string;
  signalSource?: string | null;
  signalContent?: string | null;
  rawFootageUrl?: string | null;
  editedVideoUrl?: string | null;
  validation?: {
    total: number;
    verdict: string;
    reviewedById?: string | null;
  } | null;
  angles?: Array<{ selected: boolean }>;
  hooks?: Array<{ status: string }>;
  script?: {
    dor: string;
    quebra: string;
    mecanismo: string;
    beneficio: string;
    cta: string;
    durationSec: number;
  } | null;
  creative?: { format: string } | null;
  copy?: { caption: string; ctaVariations: string[] } | null;
  schedule?: {
    objective: string;
    audience: string;
    cta: string;
    primaryMetric: string;
    hypothesis: string;
    scheduledFor: Date | string;
  } | null;
  retentionReview?: { passed: boolean } | null;
  checklistItems?: Array<{ stage: Stage; checked: boolean }>;
  metricSnapshots?: Array<{ id: string }>;
  contentClass?: string | null;
}

export interface TransitionResult {
  allowed: boolean;
  code?: string;
  message?: string;
}

function checklistComplete(card: CardSnapshot, stage: Stage): boolean {
  const items = (card.checklistItems ?? []).filter((i) => i.stage === stage);
  return items.length > 0 && items.every((i) => i.checked);
}

export class PipelineService {
  /**
   * Verifica se a transição de `card.stage` para `to` é permitida.
   * Centraliza TODA lógica de gate — não duplicar em controllers ou frontend.
   */
  canTransition(card: CardSnapshot, to: Stage): TransitionResult {
    const from = card.stage;

    // Sempre permitido: qualquer estágio → ARQUIVADO
    if (to === Stage.ARQUIVADO) return { allowed: true };

    // Retroceder uma etapa é sempre permitido (exceto de ARQUIVADO)
    const fromIdx = STAGE_ORDER.indexOf(from);
    const toIdx = STAGE_ORDER.indexOf(to);

    // `to` já é garantidamente ≠ ARQUIVADO aqui (early return na linha acima).
    if (from === Stage.ARQUIVADO) {
      return { allowed: false, code: 'ARCHIVED_CARD', message: 'Card arquivado não pode ser reativado.' };
    }

    // Pular etapas não é permitido (avanço de mais de 1 posição)
    if (toIdx > fromIdx + 1) {
      return { allowed: false, code: 'SKIP_STAGE', message: 'Não é permitido pular etapas.' };
    }

    // Verificar pré-condições específicas por transição destino
    return this.checkPreconditions(card, from, to);
  }

  private checkPreconditions(card: CardSnapshot, from: Stage, to: Stage): TransitionResult {
    // Gates do pipeline enxuto de 9 etapas (PRD-011). As etapas removidas (Sinais,
    // Direção, Copy, Gravado, Agendado, Distribuição, Análise, Reciclar) não têm gate:
    // são inalcançáveis pelo fluxo ativo.
    switch (to) {
      case Stage.IDEIAS_VALIDADAS:
        if (from !== Stage.IDEIAS_BRUTAS) break;
        if (!card.title || card.title.trim().length < 3) return err('MISSING_FIELD', 'Título resumível em uma frase é obrigatório.');
        break;

      case Stage.ANGULO_DEFINIDO: {
        if (from !== Stage.IDEIAS_VALIDADAS) break;
        const v = card.validation;
        if (!v) return err('GATE_NOT_PASSED', 'Pontuação de validação não preenchida.');
        // Passa automaticamente quando a IA atinge a nota mínima (SEGUIR_ROTEIRO, ≥13) —
        // a auto-correção da validação busca essa nota, sem exigir humano. Um humano ainda
        // pode confirmar manualmente (reviewedById) para destravar uma nota baixa.
        if (v.verdict !== ValidationVerdict.SEGUIR_ROTEIRO && !v.reviewedById) {
          return err('GATE_NOT_PASSED', `Validação abaixo do mínimo (necessário SEGUIR_ROTEIRO, total ≥ ${VALIDATION_THRESHOLDS.SEGUIR_MIN}) — ou confirme manualmente.`);
        }
        break;
      }

      case Stage.HOOKS_EM_TESTE: {
        if (from !== Stage.ANGULO_DEFINIDO) break;
        const hasSelected = (card.angles ?? []).some((a) => a.selected);
        if (!hasSelected) return err('MISSING_FIELD', 'Pelo menos 1 ângulo deve ser selecionado.');
        break;
      }

      case Stage.ROTEIRO: {
        if (from !== Stage.HOOKS_EM_TESTE) break;
        const hooks = card.hooks ?? [];
        if (hooks.length < MIN_HOOKS_TO_ADVANCE) {
          return err('MISSING_FIELD', `Mínimo ${MIN_HOOKS_TO_ADVANCE} hooks cadastrados (atual: ${hooks.length}).`);
        }
        const hasChosen = hooks.some((h) => h.status === 'ESCOLHIDO');
        if (!hasChosen) return err('MISSING_FIELD', 'Pelo menos 1 hook deve estar com status ESCOLHIDO.');
        break;
      }

      // Roteiro agora reúne roteiro + direção criativa + copy (PRD-011): este gate
      // funde os antigos ROTEIRO→DIRECAO, DIRECAO→PRONTO e COPY→AGENDADO.
      case Stage.PRONTO_PARA_GRAVAR: {
        if (from !== Stage.ROTEIRO) break;
        const s = card.script;
        if (!s || !s.dor || !s.quebra || !s.mecanismo || !s.beneficio || !s.cta) {
          return err('MISSING_FIELD', 'Roteiro incompleto — todas as 5 seções são obrigatórias.');
        }
        if (!card.creative?.format) return err('MISSING_FIELD', 'Formato de direção criativa não definido.');
        const copy = card.copy;
        if (!copy?.caption) return err('MISSING_FIELD', 'Legenda (copy) é obrigatória.');
        if (!copy.ctaVariations?.length) return err('MISSING_FIELD', 'Pelo menos 1 variação de CTA é obrigatória.');
        break;
      }

      case Stage.EM_EDICAO:
        if (from !== Stage.PRONTO_PARA_GRAVAR) break;
        if (!checklistComplete(card, Stage.PRONTO_PARA_GRAVAR)) {
          return err('CHECKLIST_INCOMPLETE', 'Checklist de pré-produção incompleto.');
        }
        break;

      case Stage.REVISAO_RETENCAO:
        if (from !== Stage.EM_EDICAO) break;
        if (!checklistComplete(card, Stage.EM_EDICAO)) {
          return err('CHECKLIST_INCOMPLETE', 'Checklist de retenção da edição incompleto.');
        }
        if (!card.editedVideoUrl) return err('MISSING_FIELD', 'Link do vídeo editado (editedVideoUrl) é obrigatório.');
        break;

      case Stage.PUBLICADO: {
        // Publicar é sempre manual (nunca automatizado). Gate = retenção aprovada.
        if (from !== Stage.REVISAO_RETENCAO) break;
        const rr = card.retentionReview;
        if (!rr) return err('GATE_NOT_PASSED', 'Revisão de retenção não realizada.');
        if (!rr.passed) return err('GATE_NOT_PASSED', 'Revisão de retenção não aprovada (≥3 respostas ruins). Retorno para edição necessário.');
        break;
      }

      default:
        break;
    }

    return { allowed: true };
  }
}

function err(code: string, message: string): TransitionResult {
  return { allowed: false, code, message };
}

export const pipelineService = new PipelineService();
