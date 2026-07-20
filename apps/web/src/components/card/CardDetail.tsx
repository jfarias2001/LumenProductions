import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { STAGE_LABELS, STAGE_ORDER, Stage, SignalSource, AwarenessLevel, Pillar, ContentClass, AngleType, HookStatus, CreativeFormat, RETENTION_QUESTIONS, MIN_HOOKS_TO_ADVANCE, SCRIPT_DURATION } from '@content-engine/shared';
import { formatDate } from '../../lib/utils.js';
import { useCard, useArchiveCard, useTransitionCard, useConfirmValidation, useUndoGeneration } from '../../hooks/useBoard.js';
import { useAIStructure, useAIValidate, useAIAngles, useAICopy, useAIRecycle, useAIDirection } from '../../hooks/useAI.js';
import { PILLAR_LABELS, AWARENESS_LABELS, PILLAR_BADGE, VERDICT_BADGE, ANGLE_LABELS, DERIVED_LABELS, CONTENT_TYPE_LABELS, SIGNAL_LABELS, CLASS_BADGE, FORMAT_LABELS } from '../../lib/labels.js';
import AICopilotButton from './AICopilotButton.js';
import StageGenerator from './StageGenerator.js';
import FinalPackageView from './FinalPackageView.js';

interface Props {
  cardId: string;
  onClose: () => void;
}

// Fases visíveis no fluxo (ARQUIVADO é estado terminal, fora do stepper).
const FLOW: Stage[] = STAGE_ORDER.filter((s) => s !== Stage.ARQUIVADO);

/** Para cada etapa: o trabalho a fazer agora e o que o gate exige para avançar. */
const STAGE_META: Record<Stage, { job: string; gate: string }> = {
  [Stage.SINAIS_MERCADO]: { job: 'Capture o sinal de mercado que originou a ideia.', gate: 'Preencha a fonte e o conteúdo do sinal.' },
  [Stage.IDEIAS_BRUTAS]: { job: 'Lapide a ideia com o copiloto: dor central, persona e promessa.', gate: 'Defina um título claro (mín. 3 caracteres).' },
  [Stage.IDEIAS_VALIDADAS]: { job: 'Valide o potencial da ideia (6 critérios, 0–3).', gate: 'Nota mínima SEGUIR_ROTEIRO (≥13) — a IA se auto-corrige para atingi-la.' },
  [Stage.ANGULO_DEFINIDO]: { job: 'Explore ângulos narrativos e escolha o mais forte.', gate: 'Selecione ao menos 1 ângulo.' },
  [Stage.HOOKS_EM_TESTE]: { job: 'Gere e refine hooks de abertura (primeiros 2 segundos).', gate: 'Mínimo 5 hooks, com 1 marcado como ESCOLHIDO.' },
  [Stage.ROTEIRO]: { job: 'Etapa única de criação: roteiro (dor → quebra → mecanismo → benefício → CTA), direção criativa e copy/legenda.', gate: 'Roteiro completo + formato de direção definido + legenda com ao menos 1 CTA.' },
  [Stage.DIRECAO_CRIATIVA]: { job: 'Defina a direção criativa (formato, cortes/slides, paleta).', gate: 'Formato de direção criativa definido.' },
  [Stage.PRONTO_PARA_GRAVAR]: { job: 'Prepare a pré-produção.', gate: 'Checklist de pré-produção completo.' },
  [Stage.GRAVADO]: { job: 'Grave e registre o link da captação bruta.', gate: 'Link da gravação bruta preenchido.' },
  [Stage.EM_EDICAO]: { job: 'Edite e registre o link do vídeo editado (e a captação bruta, se houver).', gate: 'Checklist de retenção + link do vídeo editado.' },
  [Stage.REVISAO_RETENCAO]: { job: 'Revise a retenção da peça editada.', gate: 'Revisão de retenção aprovada (<3 respostas ruins).' },
  [Stage.COPY_LEGENDA_CTA]: { job: 'Escreva a legenda e as variações de CTA.', gate: 'Legenda + ao menos 1 variação de CTA.' },
  [Stage.AGENDADO]: { job: 'Agende a publicação com objetivo, público e hipótese.', gate: 'Agendamento completo (todos os campos).' },
  [Stage.PUBLICADO]: { job: 'Publique manualmente no Instagram.', gate: 'Publicação é manual — mova o card ao publicar.' },
  [Stage.EM_DISTRIBUICAO]: { job: 'Distribua nos demais canais.', gate: 'Checklist de distribuição completo.' },
  [Stage.ANALISE]: { job: 'Registre métricas e classifique a peça.', gate: '1 snapshot de métricas + classificação da peça.' },
  [Stage.ESCALAR_RECICLAR]: { job: 'Transforme a peça vencedora em ativos derivados.', gate: '—' },
  [Stage.ARQUIVADO]: { job: 'Card arquivado.', gate: '—' },
};

export default function CardDetail({ cardId, onClose }: Props) {
  const { data: card, isLoading } = useCard(cardId);
  const [view, setView] = useState<'flow' | 'package'>('flow');
  const [focusStage, setFocusStage] = useState<Stage | null>(null);
  const qc = useQueryClient();
  const archive = useArchiveCard();

  const updateCard = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/cards/${cardId}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['card', cardId] }); void qc.invalidateQueries({ queryKey: ['board'] }); },
  });

  if (isLoading || !card) {
    return (
      <div className="fixed inset-0 z-40 flex">
        <div className="glass-overlay" onClick={onClose} />
        <div className="relative ml-auto w-full max-w-2xl bg-surface-900/95 backdrop-blur-xl border-l border-white/[0.08] flex items-center justify-center">
          <span className="text-slate-500 animate-pulse">Carregando…</span>
        </div>
      </div>
    );
  }

  const cardStage = card.stage as Stage;
  const pillar = card.pillar ? String(card.pillar) : null;
  // Etapa em foco: a atual por padrão; o usuário pode revisitar etapas já concluídas.
  const stage = focusStage ?? cardStage;
  const meta = STAGE_META[stage];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="glass-overlay" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-surface-900/95 backdrop-blur-xl border-l border-white/[0.08] shadow-card flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-700 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="badge bg-brand-600/20 text-brand-300">{STAGE_LABELS[cardStage]}</span>
              {card.contentType ? <span className="badge bg-ai-600/15 text-ai-400 border border-ai-500/30">{CONTENT_TYPE_LABELS[String(card.contentType)] ?? String(card.contentType)}</span> : null}
              {(card as { isAd?: boolean }).isAd ? <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/40">📣 Anúncio</span> : null}
              {pillar && <span className={`badge ${PILLAR_BADGE[pillar] ?? 'bg-surface-700 text-slate-400'}`}>{PILLAR_LABELS[pillar] ?? pillar}</span>}
            </div>
            <EditableTitle title={card.title} onSave={(t) => updateCard.mutate({ title: t })} />
            <div className="mt-1.5">
              <StarRating
                value={(card as { rating?: number | null }).rating ?? null}
                onChange={(rating) => updateCard.mutate({ rating })}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {card.assignee ? `Responsável: ${card.assignee.name}` : 'Sem responsável'} · Atualizado {formatDate(card.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { if (confirm('Arquivar este card?')) archive.mutate(cardId, { onSuccess: onClose }); }}
              className="btn-ghost text-xs px-2 py-1.5" title="Arquivar"
            >🗑</button>
            <button onClick={onClose} className="btn-ghost text-lg leading-none px-2 py-1">×</button>
          </div>
        </div>

        {/* Alternância Fluxo / Pacote */}
        <div className="px-5 pt-3 flex gap-1.5 shrink-0">
          <button onClick={() => setView('flow')} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${view === 'flow' ? 'bg-brand-600/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}>Fluxo da pipeline</button>
          <button onClick={() => setView('package')} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${view === 'package' ? 'bg-brand-600/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}>📦 Pacote final</button>
        </div>

        {view === 'package' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-5"><FinalPackageView cardId={cardId} /></div>
        ) : (
          <>
            {/* Stepper das fases */}
            <StageStepper currentStage={cardStage} focusStage={stage} onPick={setFocusStage} />

            {/* Desfazer geração da IA (PRD-016) — destacado enquanto houver snapshots */}
            <UndoBar cardId={cardId} card={card} />

            {/* Painel da etapa em foco */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{STAGE_LABELS[stage]}</h3>
                  {stage === cardStage ? <span className="badge bg-emerald-500/15 text-emerald-300">etapa atual</span> : FLOW.indexOf(stage) < FLOW.indexOf(cardStage) ? <span className="badge bg-surface-700 text-slate-400">concluída</span> : null}
                </div>
                <p className="text-xs text-slate-500 mt-1">{meta.job}</p>
              </div>

              <StagePanel stage={stage} cardId={cardId} card={card} onUpdate={(d) => updateCard.mutate(d)} />

              {/* Editar fundamentos (PRD-016) — disponível em qualquer etapa exceto onde já aparecem */}
              {stage !== Stage.SINAIS_MERCADO && stage !== Stage.IDEIAS_BRUTAS && (
                <FundamentalsEditor card={card} onUpdate={(d) => updateCard.mutate(d)} />
              )}

              <CommentsSection card={card} />
            </div>

            {/* Barra de avanço — só quando a etapa em foco é a atual do card */}
            {stage === cardStage && <AdvanceBar cardId={cardId} stage={cardStage} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Título editável no cabeçalho (PRD-016) ────────────────────────────────────
function EditableTitle({ title, onSave }: { title: string; onSave: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => { setValue(title); }, [title]);

  if (editing) {
    const commit = () => {
      const t = value.trim();
      if (t && t !== title) onSave(t);
      setEditing(false);
    };
    return (
      <input
        autoFocus
        className="input-base text-base font-semibold"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setValue(title); setEditing(false); }
        }}
      />
    );
  }
  return (
    <h2
      onClick={() => setEditing(true)}
      title="Clique para editar o título"
      className="group inline-flex items-start gap-1.5 text-base font-semibold text-white leading-tight cursor-text hover:text-brand-100"
    >
      <span>{title}</span>
      <span className="shrink-0 mt-0.5 text-xs text-slate-600 group-hover:text-brand-400">✎</span>
    </h2>
  );
}

// ── Desfazer geração da IA (PRD-016) ──────────────────────────────────────────
interface SnapshotSummary { id: string; label: string; stage: string; createdAt: string }

function UndoBar({ cardId, card }: { cardId: string; card: Rec }) {
  const undo = useUndoGeneration(cardId);
  const snapshots = ((card.snapshots as SnapshotSummary[] | undefined) ?? []);
  if (!snapshots.length) return null;
  const top = snapshots[0]!;
  return (
    <div className="mx-5 mt-3 surface-card border-amber-500/40 bg-amber-500/[0.08] p-3 flex items-center gap-3 shrink-0 animate-fade-in">
      <span className="text-lg leading-none">↩</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-200">A IA alterou este card</p>
        <p className="text-[11px] text-slate-400 truncate">
          Última: {top.label} · {formatDate(top.createdAt)}{snapshots.length > 1 ? ` · ${snapshots.length} passos p/ desfazer` : ''}
        </p>
        {undo.isError && <p className="text-[11px] text-rose-400 mt-0.5">Falha ao desfazer. Tente novamente.</p>}
      </div>
      <button
        onClick={() => undo.mutate()}
        disabled={undo.isPending}
        title="Desfaz a última geração e restaura o estado anterior"
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-100 border border-amber-500/50 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
      >
        {undo.isPending ? 'Desfazendo…' : '↩ Desfazer'}
      </button>
    </div>
  );
}

// ── Editar fundamentos da ideia (PRD-016) — recolhível, em qualquer etapa ──────
function FundamentalsEditor({ card, onUpdate }: { card: Rec; onUpdate: (d: Rec) => void }) {
  const [open, setOpen] = useState(false);
  const [persona, setPersona] = useState('');
  const [pain, setPain] = useState('');
  const [promise, setPromise] = useState('');
  const [pillar, setPillar] = useState('');
  const [awareness, setAwareness] = useState('');

  function openEditor() {
    setPersona(String(card.persona ?? ''));
    setPain(String(card.pain ?? ''));
    setPromise(String(card.promise ?? ''));
    setPillar(String(card.pillar ?? ''));
    setAwareness(String(card.awareness ?? ''));
    setOpen(true);
  }

  function save() {
    onUpdate({
      persona: persona.trim(),
      pain: pain.trim(),
      promise: promise.trim(),
      ...(pillar ? { pillar } : {}),
      ...(awareness ? { awareness } : {}),
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={openEditor}
        className="mt-5 w-full text-left text-xs font-medium text-slate-400 hover:text-slate-200 surface-card bg-surface-850 px-3 py-2.5 flex items-center gap-2 transition-colors"
      >
        <span className="text-slate-500">▸</span> Editar fundamentos da ideia (persona, dor, promessa, pilar, consciência)
      </button>
    );
  }

  return (
    <div className="mt-5 surface-card bg-surface-850 p-3 space-y-3">
      <p className="text-xs font-semibold text-slate-300 flex items-center gap-2"><span className="text-slate-500">▾</span> Fundamentos da ideia</p>
      <Field label="Persona">
        <input className="input-base" value={persona} onChange={(e) => setPersona(e.target.value)} />
      </Field>
      <Field label="Dor">
        <textarea className="input-base h-20 resize-none" value={pain} onChange={(e) => setPain(e.target.value)} />
      </Field>
      <Field label="Promessa">
        <textarea className="input-base h-16 resize-none" value={promise} onChange={(e) => setPromise(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pilar">
          <select className="input-base" value={pillar} onChange={(e) => setPillar(e.target.value)}>
            <option value="">—</option>
            {Object.values(Pillar).map((p) => <option key={p} value={p}>{PILLAR_LABELS[p] ?? p}</option>)}
          </select>
        </Field>
        <Field label="Nível de consciência">
          <select className="input-base" value={awareness} onChange={(e) => setAwareness(e.target.value)}>
            <option value="">—</option>
            {Object.values(AwarenessLevel).map((a) => <option key={a} value={a}>{AWARENESS_LABELS[a] ?? a}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary text-xs" onClick={save}>Salvar</button>
        <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Stepper ──────────────────────────────────────────────────────────────────
function StageStepper({ currentStage, focusStage, onPick }: { currentStage: Stage; focusStage: Stage; onPick: (s: Stage | null) => void }) {
  const currentIdx = FLOW.indexOf(currentStage);
  return (
    <div className="border-b border-surface-700 px-5 py-3 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max">
        {FLOW.map((s, i) => {
          const done = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          const isFocus = s === focusStage;
          const clickable = !isFuture; // não dá para pular para o futuro
          return (
            <div key={s} className="flex items-center">
              <button
                disabled={!clickable}
                onClick={() => onPick(isCurrent ? null : s)}
                title={STAGE_LABELS[s] + (isFuture ? ' (bloqueada)' : '')}
                className={`group flex flex-col items-center gap-1 px-1.5 ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${
                    isFocus
                      ? 'bg-brand-500 border-brand-400 text-white ring-2 ring-brand-500/40'
                      : done
                        ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                        : isCurrent
                          ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                          : 'bg-surface-850 border-surface-700 text-slate-600'
                  }`}
                >
                  {done ? '✓' : isFuture ? '🔒' : i + 1}
                </span>
                <span className={`text-[9px] leading-tight w-14 text-center truncate ${isFocus ? 'text-brand-300' : done ? 'text-slate-400' : isCurrent ? 'text-brand-300' : 'text-slate-600'}`}>
                  {STAGE_LABELS[s]}
                </span>
              </button>
              {i < FLOW.length - 1 && <span className={`h-0.5 w-3 -mt-4 ${i < currentIdx ? 'bg-emerald-500/40' : 'bg-surface-700'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Barra de avanço ──────────────────────────────────────────────────────────
function AdvanceBar({ cardId, stage }: { cardId: string; stage: Stage }) {
  const qc = useQueryClient();
  const transition = useTransitionCard();
  const idx = STAGE_ORDER.indexOf(stage);
  const nextStage = idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1]! : null;
  if (!nextStage || nextStage === Stage.ARQUIVADO) return null;

  function advance() {
    if (!nextStage) return;
    transition.mutate(
      { cardId, to: nextStage },
      { onSuccess: () => { void qc.invalidateQueries({ queryKey: ['card', cardId] }); } },
    );
  }

  return (
    <div className="border-t border-white/[0.06] px-5 py-3 shrink-0 bg-surface-900/95 backdrop-blur-md">
      <p className="text-[11px] text-slate-500 mb-2"><span className="text-slate-400 font-medium">Para avançar:</span> {STAGE_META[stage].gate}</p>
      <button onClick={advance} disabled={transition.isPending} className="btn-primary text-sm w-full">
        {transition.isPending ? 'Avançando…' : `Avançar → ${STAGE_LABELS[nextStage]}`}
      </button>
      {transition.isError && (
        <p className="text-[11px] text-amber-300/90 mt-2">{(transition.error as Error)?.message ?? 'Transição bloqueada pelo gate de qualidade.'}</p>
      )}
      {transition.isSuccess && <p className="text-[11px] text-emerald-300/90 mt-2">Card movido para {STAGE_LABELS[nextStage]} ✓</p>}
    </div>
  );
}

// ── Roteador de painel por etapa ──────────────────────────────────────────────
type Rec = Record<string, unknown>;

/** Invalida card + board após qualquer ação que altera o card. */
function useCardInvalidate(cardId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['card', cardId] });
    void qc.invalidateQueries({ queryKey: ['board'] });
  };
}

function StagePanel({ stage, cardId, card, onUpdate }: { stage: Stage; cardId: string; card: Rec; onUpdate: (d: Rec) => void }) {
  const copiloto = <StageGenerator cardId={cardId} stage={stage} />;
  switch (stage) {
    case Stage.SINAIS_MERCADO:
      return <TemplateTab cardId={cardId} card={card} onUpdate={onUpdate} focus="signal" />;
    case Stage.IDEIAS_BRUTAS:
      return <div className="space-y-5">{copiloto}<TemplateTab cardId={cardId} card={card} onUpdate={onUpdate} focus="idea" /></div>;
    case Stage.IDEIAS_VALIDADAS:
      return <div className="space-y-5">{copiloto}<ValidacaoTab cardId={cardId} card={card} /></div>;
    case Stage.ANGULO_DEFINIDO:
    case Stage.HOOKS_EM_TESTE:
      return <div className="space-y-5">{copiloto}<AngulosTab cardId={cardId} card={card} /></div>;
    // Roteiro (PRD-011) reúne roteiro + direção criativa + copy numa só etapa.
    case Stage.ROTEIRO:
      return (
        <div className="space-y-5">
          {copiloto}
          <StageSection title="Roteiro"><RoteiroTab cardId={cardId} card={card} /></StageSection>
          <StageSection title="Direção criativa"><DirecaoTab cardId={cardId} card={card} /></StageSection>
          <StageSection title="Copy / legenda / CTA"><CopyTab cardId={cardId} card={card} /></StageSection>
        </div>
      );
    case Stage.DIRECAO_CRIATIVA:
      return <div className="space-y-5">{copiloto}<DirecaoTab cardId={cardId} card={card} /></div>;
    case Stage.PRONTO_PARA_GRAVAR:
      return <ChecklistsTab cardId={cardId} />;
    case Stage.GRAVADO:
      return <div className="space-y-5"><MediaTab card={card} onUpdate={onUpdate} field="rawFootageUrl" label="Link da gravação bruta" /><ChecklistsTab cardId={cardId} /></div>;
    case Stage.EM_EDICAO:
      return <div className="space-y-5"><MediaTab card={card} onUpdate={onUpdate} field="rawFootageUrl" label="Link da gravação bruta (opcional)" /><MediaTab card={card} onUpdate={onUpdate} field="editedVideoUrl" label="Link do vídeo editado" /><ChecklistsTab cardId={cardId} /></div>;
    case Stage.REVISAO_RETENCAO:
      return <RetencaoTab cardId={cardId} card={card} />;
    case Stage.COPY_LEGENDA_CTA:
      return <div className="space-y-5">{copiloto}<CopyTab cardId={cardId} card={card} /></div>;
    case Stage.AGENDADO:
    case Stage.PUBLICADO:
      return <AgendamentoTab cardId={cardId} card={card} />;
    case Stage.EM_DISTRIBUICAO:
      return <ChecklistsTab cardId={cardId} />;
    case Stage.ANALISE:
      return <div className="space-y-5"><MetricasTab cardId={cardId} card={card} /><ContentClassField card={card} onUpdate={onUpdate} /></div>;
    case Stage.ESCALAR_RECICLAR:
      return <div className="space-y-5">{copiloto}<ReciclagemTab cardId={cardId} card={card} /></div>;
    case Stage.ARQUIVADO:
      return <Empty>Card arquivado.</Empty>;
    default:
      return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

/** Subseção nomeada — usada para agrupar roteiro/direção/copy na etapa Roteiro (PRD-011). */
function StageSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-surface-800 pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</h4>
      {children}
    </section>
  );
}

// ── Template (fundamentos) — modo sinal ou ideia ──────────────────────────────
function TemplateTab({ cardId, card, onUpdate, focus }: { cardId: string; card: Rec; onUpdate: (d: Rec) => void; focus: 'signal' | 'idea' }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(String(card.title ?? ''));
  const [persona, setPersona] = useState(String(card.persona ?? ''));
  const [pain, setPain] = useState(String(card.pain ?? ''));
  const [pillar, setPillar] = useState(String(card.pillar ?? ''));
  const [awareness, setAwareness] = useState(String(card.awareness ?? ''));
  const [signalSource, setSignalSource] = useState(String(card.signalSource ?? ''));
  const [signalContent, setSignalContent] = useState(String(card.signalContent ?? ''));
  const [rawText, setRawText] = useState('');
  const structure = useAIStructure(cardId);

  function startEdit() {
    setTitle(String(card.title ?? '')); setPersona(String(card.persona ?? '')); setPain(String(card.pain ?? ''));
    setPillar(String(card.pillar ?? '')); setAwareness(String(card.awareness ?? ''));
    setSignalSource(String(card.signalSource ?? '')); setSignalContent(String(card.signalContent ?? ''));
    setEditing(true);
  }

  function save() {
    const data: Rec = focus === 'signal'
      ? { ...(signalSource ? { signalSource } : {}), signalContent }
      : { title, persona, pain, ...(pillar ? { pillar } : {}), ...(awareness ? { awareness } : {}) };
    onUpdate(data);
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      {focus === 'idea' && (
        <div className="surface-card p-3 space-y-2 bg-surface-850">
          <p className="text-xs text-slate-400">Cole uma transcrição/nota solta e deixe a IA preencher o template:</p>
          <textarea className="input-base h-20 resize-none" value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Ex.: ontem um cliente reclamou que recebe muito lead mas não fecha…" />
          <button onClick={() => structure.mutate(rawText)} disabled={structure.isPending || rawText.trim().length < 10} className="btn-ai">
            {structure.isPending ? <><span className="h-3 w-3 rounded-full border-2 border-ai-400/40 border-t-ai-400 animate-spin" /> Estruturando…</> : '✦ Estruturar com IA'}
          </button>
          {structure.isError && <p className="text-[11px] text-amber-300/80">IA indisponível — preencha manualmente.</p>}
        </div>
      )}

      {focus === 'signal' ? (
        <>
          <Field label="Fonte do sinal">
            {editing ? (
              <select className="input-base" value={signalSource} onChange={(e) => setSignalSource(e.target.value)}>
                <option value="">—</option>
                {Object.values(SignalSource).map((s) => <option key={s} value={s}>{SIGNAL_LABELS[s] ?? s}</option>)}
              </select>
            ) : <p className="text-sm text-slate-400">{card.signalSource ? (SIGNAL_LABELS[String(card.signalSource)] ?? String(card.signalSource)) : '—'}</p>}
          </Field>
          <Field label="Conteúdo do sinal">
            {editing ? <textarea className="input-base h-28 resize-none" value={signalContent} onChange={(e) => setSignalContent(e.target.value)} placeholder="Cole aqui o print/transcrição/comentário…" /> : <p className="text-sm text-slate-400 whitespace-pre-wrap">{String(card.signalContent ?? '—')}</p>}
          </Field>
        </>
      ) : (
        <>
          <Field label="Título">
            {editing ? <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} /> : <p className="text-sm text-slate-200">{String(card.title)}</p>}
          </Field>
          <Field label="Persona">
            {editing ? <input className="input-base" value={persona} onChange={(e) => setPersona(e.target.value)} /> : <p className="text-sm text-slate-400">{String(card.persona ?? '—')}</p>}
          </Field>
          <Field label="Dor">
            {editing ? <textarea className="input-base h-20 resize-none" value={pain} onChange={(e) => setPain(e.target.value)} /> : <p className="text-sm text-slate-400 whitespace-pre-wrap">{String(card.pain ?? '—')}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pilar">
              {editing ? (
                <select className="input-base" value={pillar} onChange={(e) => setPillar(e.target.value)}>
                  <option value="">—</option>
                  {Object.values(Pillar).map((p) => <option key={p} value={p}>{PILLAR_LABELS[p] ?? p}</option>)}
                </select>
              ) : <p className="text-sm text-slate-400">{card.pillar ? (PILLAR_LABELS[String(card.pillar)] ?? String(card.pillar)) : '—'}</p>}
            </Field>
            <Field label="Nível de consciência">
              {editing ? (
                <select className="input-base" value={awareness} onChange={(e) => setAwareness(e.target.value)}>
                  <option value="">—</option>
                  {Object.values(AwarenessLevel).map((a) => <option key={a} value={a}>{AWARENESS_LABELS[a] ?? a}</option>)}
                </select>
              ) : <p className="text-sm text-slate-400">{card.awareness ? (AWARENESS_LABELS[String(card.awareness)] ?? String(card.awareness)) : '—'}</p>}
            </Field>
          </div>
        </>
      )}

      <div className="flex gap-2">
        {editing ? (
          <>
            <button className="btn-primary text-xs" onClick={save}>Salvar</button>
            <button className="btn-ghost text-xs" onClick={() => setEditing(false)}>Cancelar</button>
          </>
        ) : (
          <button className="btn-ghost text-xs" onClick={startEdit}>Editar</button>
        )}
      </div>
    </div>
  );
}

// ── Link de mídia (gravação / vídeo editado) ──────────────────────────────────
function MediaTab({ card, onUpdate, field, label }: { card: Rec; onUpdate: (d: Rec) => void; field: 'rawFootageUrl' | 'editedVideoUrl'; label: string }) {
  const current = String(card[field] ?? '');
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(current);
  return (
    <Field label={label}>
      {editing ? (
        <div className="space-y-2">
          <input className="input-base" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" />
          <div className="flex gap-2">
            <button className="btn-primary text-xs" onClick={() => { onUpdate({ [field]: url }); setEditing(false); }}>Salvar</button>
            <button className="btn-ghost text-xs" onClick={() => { setUrl(current); setEditing(false); }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {current ? <a href={current} target="_blank" rel="noreferrer" className="text-sm text-brand-300 hover:underline break-all flex-1">{current}</a> : <span className="text-sm text-slate-500 flex-1">Nenhum link.</span>}
          <button className="btn-ghost text-xs shrink-0" onClick={() => { setUrl(current); setEditing(true); }}>{current ? 'Editar' : 'Adicionar'}</button>
        </div>
      )}
    </Field>
  );
}

// ── Classificação da peça (ANALISE) ───────────────────────────────────────────
function ContentClassField({ card, onUpdate }: { card: Rec; onUpdate: (d: Rec) => void }) {
  const current = String(card.contentClass ?? '');
  return (
    <Field label="Classificação da peça">
      <select className="input-base" value={current} onChange={(e) => onUpdate({ contentClass: e.target.value })}>
        <option value="">—</option>
        {Object.values(ContentClass).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {current ? <span className={`badge mt-2 inline-block ${CLASS_BADGE[current] ?? 'bg-surface-700 text-slate-400'}`}>{current}</span> : null}
    </Field>
  );
}

// ── Validação ────────────────────────────────────────────────────────────────
function ValidacaoTab({ cardId, card }: { cardId: string; card: Rec }) {
  const v = card.validation as Rec | null | undefined;
  const validate = useAIValidate(cardId);
  const confirm = useConfirmValidation(cardId);
  const transition = useTransitionCard();
  const qc = useQueryClient();
  const cardStage = card.stage as Stage;
  const idx = STAGE_ORDER.indexOf(cardStage);
  const nextStage = idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1]! : null;
  const SCORE_KEYS = ['dorQuente', 'clareza', 'contraste', 'especificidadeAgencia', 'potencialComentarios', 'potencialComercial'] as const;
  const handleConfirm = () => {
    if (!v) return;
    const scores: Record<string, number> = {};
    for (const k of SCORE_KEYS) scores[k] = Number(v[k] ?? 0);
    // Ao confirmar, o humano assume a validação e o card já avança automaticamente
    // para a próxima fase (a confirmação é o gate — o veredito numérico vira referência).
    confirm.mutate(scores, {
      onSuccess: () => {
        if (cardStage === Stage.IDEIAS_VALIDADAS && nextStage && nextStage !== Stage.ARQUIVADO) {
          transition.mutate(
            { cardId, to: nextStage },
            { onSuccess: () => { void qc.invalidateQueries({ queryKey: ['card', cardId] }); } },
          );
        }
      },
    });
  };
  const busy = confirm.isPending || transition.isPending;
  const passed = String(v?.verdict) === 'SEGUIR_ROTEIRO';
  return (
    <div className="space-y-4">
      <AICopilotButton label="Validar com IA" mutation={validate} hint="busca a nota mínima sozinha; reescreve a ideia se ficar baixa" />
      {v ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">{String(v.total)}</span>
            <span className="text-slate-500">/18</span>
            <span className={`badge !text-xs !px-2 !py-1 ${VERDICT_BADGE[String(v.verdict)] ?? 'bg-surface-700 text-slate-400'}`}>{String(v.verdict).replace(/_/g, ' ')}</span>
            {passed
              ? <span className="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">✓ nota mínima atingida</span>
              : <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/40">abaixo do mínimo</span>}
          </div>
          {passed ? (
            <p className="text-xs text-emerald-300/90">A ideia atingiu a nota mínima — pode seguir pela barra "Avançar" abaixo. Validação manual não é mais necessária.</p>
          ) : (
            <div className="surface-card bg-surface-850 p-3 space-y-2">
              <p className="text-xs text-slate-400">A IA tentou corrigir a ideia, mas a nota ficou abaixo do mínimo. Reescreva a ideia (etapa anterior) e valide de novo, ou confirme manualmente para avançar mesmo assim.</p>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="btn-ghost w-full disabled:opacity-50"
              >
                {confirm.isPending ? 'Confirmando…' : transition.isPending ? 'Avançando…' : '✓ Confirmar manualmente e avançar'}
              </button>
              {confirm.isError && <p className="text-xs text-rose-400">Falha ao confirmar. Tente novamente.</p>}
              {transition.isError && <p className="text-xs text-amber-300/90">Validação confirmada, mas o avanço foi bloqueado: {(transition.error as Error)?.message ?? 'gate de qualidade.'}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {['dorQuente','clareza','contraste','especificidadeAgencia','potencialComentarios','potencialComercial'].map((k) => (
              <div key={k} className="surface-card bg-surface-850 p-2.5">
                <p className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                <p className="font-bold text-slate-100 text-base">{String(v[k] ?? '—')}<span className="text-slate-600 text-xs">/3</span></p>
                {(v.aiJustifications as Rec)?.[k] ? <p className="text-[10px] text-slate-500 mt-1">{String((v.aiJustifications as Rec)[k])}</p> : null}
              </div>
            ))}
          </div>
        </>
      ) : <Empty>Nenhuma validação registrada.</Empty>}
    </div>
  );
}

// ── Ângulos & Hooks ──────────────────────────────────────────────────────────
function AngulosTab({ cardId, card }: { cardId: string; card: Rec }) {
  const angles = (card.angles as Rec[]) ?? [];
  const hooks = (card.hooks as Rec[]) ?? [];
  const gen = useAIAngles(cardId);
  const invalidate = useCardInvalidate(cardId);

  const selectAngle = useMutation({
    mutationFn: ({ id, selected }: { id: string; selected: boolean }) => api.patch(`/cards/${cardId}/angles/${id}`, { selected }),
    onSuccess: invalidate,
  });
  const setHookStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/cards/${cardId}/hooks/${id}`, { status }),
    onSuccess: invalidate,
  });
  const addAngle = useMutation({
    mutationFn: (data: { type: string; text: string }) => api.post(`/cards/${cardId}/angles`, data),
    onSuccess: invalidate,
  });
  const addHook = useMutation({
    mutationFn: (text: string) => api.post(`/cards/${cardId}/hooks`, { text }),
    onSuccess: invalidate,
  });

  const [angleText, setAngleText] = useState('');
  const [angleType, setAngleType] = useState<string>(AngleType.DOR);
  const [hookText, setHookText] = useState('');

  const selectedAngles = angles.filter((a) => a.selected).length;
  const chosenHooks = hooks.filter((h) => h.status === 'ESCOLHIDO').length;

  return (
    <div className="space-y-4">
      <AICopilotButton label="Gerar ângulos & hooks" mutation={gen} />

      {/* Ângulos */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          Ângulos ({angles.length}) · <span className={selectedAngles ? 'text-emerald-400' : 'text-amber-400'}>{selectedAngles} selecionado(s)</span>
        </h3>
        <p className="text-[11px] text-slate-500 mb-2">Clique em um ângulo para selecioná-lo (gate exige ao menos 1).</p>
        {angles.length ? angles.map((a) => (
          <button
            key={String(a.id)}
            type="button"
            onClick={() => selectAngle.mutate({ id: String(a.id), selected: !a.selected })}
            disabled={selectAngle.isPending}
            className={`w-full text-left text-sm p-2.5 rounded-lg mb-1.5 border transition-colors ${a.selected ? 'bg-brand-600/10 border-brand-500/40' : 'bg-surface-850 border-surface-700 hover:border-surface-600'}`}
          >
            <span className="badge bg-surface-700 text-slate-400 mr-1.5">{ANGLE_LABELS[String(a.type)] ?? String(a.type)}</span>
            <span className="text-slate-200">{String(a.text)}</span>
            <span className={`ml-2 text-xs ${a.selected ? 'text-brand-300' : 'text-slate-600'}`}>{a.selected ? '✓ selecionado' : 'selecionar'}</span>
          </button>
        )) : <Empty>Nenhum ângulo.</Empty>}
        <div className="flex gap-1.5 mt-2">
          <select className="input-base !w-auto text-xs" value={angleType} onChange={(e) => setAngleType(e.target.value)}>
            {Object.values(AngleType).map((t) => <option key={t} value={t}>{ANGLE_LABELS[t] ?? t}</option>)}
          </select>
          <input className="input-base flex-1 text-xs" value={angleText} onChange={(e) => setAngleText(e.target.value)} placeholder="Adicionar ângulo manualmente (mín. 5 caracteres)…" />
          <button
            type="button"
            className="btn-ghost text-xs shrink-0"
            disabled={angleText.trim().length < 5 || addAngle.isPending}
            onClick={() => addAngle.mutate({ type: angleType, text: angleText.trim() }, { onSuccess: () => setAngleText('') })}
          >+ Add</button>
        </div>
      </div>

      {/* Hooks */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          Hooks (<span className={hooks.length >= MIN_HOOKS_TO_ADVANCE ? 'text-emerald-400' : 'text-amber-400'}>{hooks.length}/{MIN_HOOKS_TO_ADVANCE} mín</span>) · <span className={chosenHooks ? 'text-emerald-400' : 'text-amber-400'}>{chosenHooks} escolhido</span>
        </h3>
        {hooks.length ? hooks.map((h) => {
          const status = String(h.status);
          return (
            <div key={String(h.id)} className="text-sm p-2.5 bg-surface-850 border border-surface-700 rounded-lg mb-1.5 flex items-center justify-between gap-2">
              <span className={`flex-1 ${status === 'DESCARTADO' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{String(h.text)}</span>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  title="Marcar como escolhido"
                  onClick={() => setHookStatus.mutate({ id: String(h.id), status: status === 'ESCOLHIDO' ? HookStatus.EM_TESTE : HookStatus.ESCOLHIDO })}
                  className={`badge ${status === 'ESCOLHIDO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-surface-700 text-slate-400 hover:text-emerald-300'}`}
                >✓ escolher</button>
                <button
                  type="button"
                  title="Descartar"
                  onClick={() => setHookStatus.mutate({ id: String(h.id), status: status === 'DESCARTADO' ? HookStatus.EM_TESTE : HookStatus.DESCARTADO })}
                  className={`badge ${status === 'DESCARTADO' ? 'bg-rose-500/20 text-rose-300' : 'bg-surface-700 text-slate-400 hover:text-rose-300'}`}
                >✗</button>
              </div>
            </div>
          );
        }) : <Empty>Nenhum hook.</Empty>}
        <div className="flex gap-1.5 mt-2">
          <input className="input-base flex-1 text-xs" value={hookText} onChange={(e) => setHookText(e.target.value)} placeholder="Adicionar hook manualmente (mín. 5 caracteres)…" />
          <button
            type="button"
            className="btn-ghost text-xs shrink-0"
            disabled={hookText.trim().length < 5 || addHook.isPending}
            onClick={() => addHook.mutate(hookText.trim(), { onSuccess: () => setHookText('') })}
          >+ Add</button>
        </div>
      </div>
    </div>
  );
}

// ── Roteiro ──────────────────────────────────────────────────────────────────
const SCRIPT_SECTIONS = ['dor', 'quebra', 'mecanismo', 'beneficio', 'cta'] as const;
function RoteiroTab({ cardId, card }: { cardId: string; card: Rec }) {
  const s = card.script as Rec | null | undefined;
  const gen = useAICopy(cardId);
  const invalidate = useCardInvalidate(cardId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState(String(s?.durationSec ?? 40));

  const save = useMutation({
    mutationFn: () => api.put(`/cards/${cardId}/script`, {
      dor: form.dor ?? '', quebra: form.quebra ?? '', mecanismo: form.mecanismo ?? '',
      beneficio: form.beneficio ?? '', cta: form.cta ?? '', durationSec: Number(duration),
    }),
    onSuccess: () => { invalidate(); setEditing(false); },
  });

  function startEdit() {
    const init: Record<string, string> = {};
    for (const k of SCRIPT_SECTIONS) init[k] = String(s?.[k] ?? '');
    setForm(init);
    setDuration(String(s?.durationSec ?? 40));
    setEditing(true);
  }

  const durNum = Number(duration);
  const durOk = durNum >= SCRIPT_DURATION.MIN_SEC && durNum <= SCRIPT_DURATION.MAX_SEC;
  const sectionsOk = SCRIPT_SECTIONS.every((k) => (form[k] ?? '').trim().length >= (k === 'cta' ? 5 : 10));

  if (editing) {
    return (
      <div className="space-y-3">
        {SCRIPT_SECTIONS.map((k) => (
          <Field key={k} label={k === 'cta' ? 'CTA (mín. 5)' : `${k} (mín. 10 caracteres)`}>
            <textarea className="input-base h-20 resize-none" value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
          </Field>
        ))}
        <Field label={`Duração (segundos) — entre ${SCRIPT_DURATION.MIN_SEC} e ${SCRIPT_DURATION.MAX_SEC}`}>
          <input type="number" className="input-base" value={duration} onChange={(e) => setDuration(e.target.value)} />
          {!durOk && <p className="text-[11px] text-amber-300/90 mt-1">Duração deve ficar entre {SCRIPT_DURATION.MIN_SEC} e {SCRIPT_DURATION.MAX_SEC}s.</p>}
        </Field>
        <div className="flex gap-2">
          <button className="btn-primary text-xs" disabled={!durOk || !sectionsOk || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando…' : 'Salvar roteiro'}</button>
          <button className="btn-ghost text-xs" onClick={() => setEditing(false)}>Cancelar</button>
        </div>
        {save.isError && <p className="text-[11px] text-rose-400">Falha ao salvar. Verifique os campos.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AICopilotButton label="Gerar roteiro + copy" mutation={gen} hint="segue a Regra de Ouro" />
      {s ? (
        <div className="space-y-3 text-sm">
          {SCRIPT_SECTIONS.map((k) => (
            <div key={k} className="surface-card bg-surface-850 p-3">
              <p className="text-xs font-semibold text-brand-300/80 uppercase mb-1">{k}</p>
              <p className="text-slate-200 whitespace-pre-wrap">{String(s[k] ?? '—')}</p>
            </div>
          ))}
          <p className="text-xs text-slate-500">Duração estimada: {String(s.durationSec)}s</p>
        </div>
      ) : <Empty>Roteiro não preenchido.</Empty>}
      <button className="btn-ghost text-xs" onClick={startEdit}>{s ? 'Editar roteiro' : 'Escrever roteiro manualmente'}</button>
    </div>
  );
}

// ── Copy ─────────────────────────────────────────────────────────────────────
function CopyTab({ cardId, card }: { cardId: string; card: Rec }) {
  const c = card.copy as Rec | null | undefined;
  const screenTexts = (card.screenTexts as string[]) ?? [];
  const gen = useAICopy(cardId);
  const invalidate = useCardInvalidate(cardId);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState('');
  const [ctas, setCtas] = useState('');

  const save = useMutation({
    mutationFn: () => api.put(`/cards/${cardId}/copy`, {
      caption: caption.trim(),
      ctaVariations: ctas.split('\n').map((l) => l.trim()).filter(Boolean),
    }),
    onSuccess: () => { invalidate(); setEditing(false); },
  });

  function startEdit() {
    setCaption(String(c?.caption ?? ''));
    setCtas(((c?.ctaVariations as string[]) ?? []).join('\n'));
    setEditing(true);
  }

  const ctaList = ctas.split('\n').map((l) => l.trim()).filter(Boolean);
  const valid = caption.trim().length >= 10 && ctaList.length >= 1;

  if (editing) {
    return (
      <div className="space-y-3">
        <Field label="Legenda (mín. 10 caracteres)">
          <textarea className="input-base h-28 resize-none" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <Field label="Variações de CTA (uma por linha, mín. 1)">
          <textarea className="input-base h-20 resize-none" value={ctas} onChange={(e) => setCtas(e.target.value)} placeholder={'Comente "EU QUERO"\nChama no direct\nLink na bio'} />
        </Field>
        <div className="flex gap-2">
          <button className="btn-primary text-xs" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando…' : 'Salvar copy'}</button>
          <button className="btn-ghost text-xs" onClick={() => setEditing(false)}>Cancelar</button>
        </div>
        {save.isError && <p className="text-[11px] text-rose-400">Falha ao salvar.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AICopilotButton label="Gerar copy + legenda" mutation={gen} />
      {c ? (
        <>
          <Field label="Legenda">
            <p className="text-sm text-slate-200 whitespace-pre-wrap surface-card bg-surface-850 p-3">{String(c.caption)}</p>
          </Field>
          <Field label="Variações de CTA">
            <ul className="space-y-1">
              {((c.ctaVariations as string[]) ?? []).map((cta, i) => (
                <li key={i} className="text-sm text-slate-300 surface-card bg-surface-850 px-3 py-2">{cta}</li>
              ))}
            </ul>
          </Field>
        </>
      ) : <Empty>Copy não gerada.</Empty>}
      <button className="btn-ghost text-xs" onClick={startEdit}>{c ? 'Editar copy' : 'Escrever copy manualmente'}</button>
      {screenTexts.length > 0 && (
        <Field label="Textos de tela">
          <div className="flex flex-wrap gap-1.5">
            {screenTexts.map((t, i) => <span key={i} className="badge bg-surface-700 text-slate-300">{t}</span>)}
          </div>
        </Field>
      )}
    </div>
  );
}

// ── Direção criativa ─────────────────────────────────────────────────────────
function DirecaoTab({ cardId, card }: { cardId: string; card: Rec }) {
  const c = card.creative as Rec | null | undefined;
  const invalidate = useCardInvalidate(cardId);
  const gen = useAIDirection(cardId);
  const isStatic = String(card.contentType) === 'ESTATICO';
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<string>(String(c?.format ?? ''));
  const [notes, setNotes] = useState(String(c?.visualNotes ?? ''));

  const save = useMutation({
    mutationFn: () => api.put(`/cards/${cardId}/creative`, { format, ...(notes.trim() ? { visualNotes: notes.trim() } : {}) }),
    onSuccess: () => { invalidate(); setOpen(false); },
  });

  function startEdit() {
    setFormat(String(c?.format ?? ''));
    setNotes(String(c?.visualNotes ?? ''));
    setOpen(true);
  }

  if (open) {
    return (
      <div className="space-y-3">
        <Field label="Formato (obrigatório para avançar)">
          <select className="input-base" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">—</option>
            {Object.values(CreativeFormat).map((f) => <option key={f} value={f}>{FORMAT_LABELS[f] ?? f}</option>)}
          </select>
        </Field>
        <Field label="Notas visuais (opcional)">
          <textarea className="input-base h-24 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paleta, ritmo de cortes, referências…" />
        </Field>
        <div className="flex gap-2">
          <button className="btn-primary text-xs" disabled={!format || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando…' : 'Salvar direção'}</button>
          <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancelar</button>
        </div>
        {save.isError && <p className="text-[11px] text-rose-400">Falha ao salvar.</p>}
      </div>
    );
  }

  if (!c) {
    return (
      <div className="space-y-3">
        <AICopilotButton label="Gerar direção com IA" mutation={gen} hint={isStatic ? 'elementos visuais, layout, fontes e cores' : 'decupagem, entonação e edição'} />
        <Empty>Direção criativa não definida. Gere com IA acima ou defina manualmente.</Empty>
        <button className="btn-ghost text-xs" onClick={startEdit}>Definir formato manualmente</button>
      </div>
    );
  }
  const editing = (c.editingInsights as string[]) ?? [];
  const graphics = (c.graphicElements as Rec[]) ?? [];
  const plan = (c.productionPlan as Rec | null) ?? {};
  const typo = plan.typography as Rec | undefined;
  const shots = (plan.shotList as Rec[]) ?? [];
  const voiceTone = String(plan.voiceTone ?? '');
  return (
    <div className="space-y-3">
      <AICopilotButton label="Gerar direção com IA" mutation={gen} hint={isStatic ? 'elementos visuais, layout, fontes e cores' : 'decupagem, entonação e edição'} />
      <Field label="Formato"><span className="badge bg-brand-600/20 text-brand-300">{String(c.format).replace(/_/g, ' ')}</span></Field>

      {/* VÍDEO — decupagem cena a cena */}
      {shots.length > 0 && (
        <Field label="Decupagem (cena a cena)">
          <div className="space-y-2">
            {shots.map((s, i) => (
              <div key={i} className="surface-card bg-surface-850 p-2.5">
                <p className="text-[11px] font-semibold text-brand-300/80 uppercase mb-0.5">Cena {i + 1}{s.durationSec ? ` · ${String(s.durationSec)}s` : ''}</p>
                {s.scene ? <p className="text-sm text-slate-200">{String(s.scene)}</p> : null}
                {s.visual ? <p className="text-xs text-slate-400 mt-0.5">🎥 {String(s.visual)}</p> : null}
                {s.screenText ? <p className="text-xs text-slate-400 mt-0.5">🅰 Tela: {String(s.screenText)}</p> : null}
                {s.voiceover ? <p className="text-xs text-slate-400 mt-0.5">🎙 Fala: {String(s.voiceover)}</p> : null}
              </div>
            ))}
          </div>
        </Field>
      )}
      {voiceTone && <Field label="Direção de fala (entonação)"><p className="text-sm text-slate-300 whitespace-pre-wrap">{voiceTone}</p></Field>}
      {editing.length > 0 && (
        <Field label="Insights de edição (vídeo)">
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">{editing.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Field>
      )}

      {/* ESTÁTICO — elementos gráficos detalhados (imagem única = 1; carrossel = N) */}
      {graphics.length > 0 && (
        <Field label={graphics.length === 1 ? 'Imagem (estático)' : 'Elementos gráficos (carrossel)'}>
          <div className="space-y-2">
            {graphics.map((g, i) => (
              <div key={i} className="surface-card bg-surface-850 p-2.5">
                <p className="text-[11px] font-semibold text-brand-300/80 uppercase mb-0.5">{graphics.length === 1 ? 'Imagem única' : `Slide ${String(g.slide ?? i + 1)}`}</p>
                {g.headline ? <p className="text-sm text-slate-100 font-medium">{String(g.headline)}</p> : null}
                {g.body ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{String(g.body)}</p> : null}
                {g.visual ? <p className="text-xs text-slate-400 mt-0.5">🖼 Visual: {String(g.visual)}</p> : null}
                {g.layout ? <p className="text-xs text-slate-400 mt-0.5">📐 Disposição: {String(g.layout)}</p> : null}
                {(g.font || g.fontSize) ? <p className="text-xs text-slate-400 mt-0.5">🔤 Fonte: {String(g.font ?? '')}{g.fontSize ? ` · ${String(g.fontSize)}` : ''}</p> : null}
                {g.colors ? <p className="text-xs text-slate-400 mt-0.5">🎨 Cores: {String(g.colors)}</p> : null}
              </div>
            ))}
          </div>
        </Field>
      )}

      {typo && (typo.headingFont || typo.bodyFont || typo.notes) ? (
        <Field label="Tipografia">
          <div className="text-sm text-slate-300 space-y-0.5">
            {typo.headingFont ? <p>Título: <span className="text-slate-100">{String(typo.headingFont)}</span></p> : null}
            {typo.bodyFont ? <p>Corpo: <span className="text-slate-100">{String(typo.bodyFont)}</span></p> : null}
            {typo.notes ? <p className="text-xs text-slate-500">{String(typo.notes)}</p> : null}
          </div>
        </Field>
      ) : null}
      {c.palette ? <Field label="Paleta"><p className="text-sm text-slate-300 whitespace-pre-wrap">{String(c.palette)}</p></Field> : null}
      {c.visualNotes ? <Field label="Notas visuais"><p className="text-sm text-slate-300 whitespace-pre-wrap">{String(c.visualNotes)}</p></Field> : null}
      {((c.referenceUrls as string[]) ?? []).length > 0 && (
        <Field label="Referências">
          <ul className="space-y-1">
            {(c.referenceUrls as string[]).map((u, i) => <li key={i}><a href={u} target="_blank" rel="noreferrer" className="text-sm text-brand-300 hover:underline break-all">{u}</a></li>)}
          </ul>
        </Field>
      )}
      <button className="btn-ghost text-xs" onClick={startEdit}>Editar direção</button>
    </div>
  );
}

// ── Checklists ───────────────────────────────────────────────────────────────
function ChecklistsTab({ cardId }: { cardId: string }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<Rec[]>({
    queryKey: ['checklist', cardId],
    queryFn: () => api.get(`/cards/${cardId}/checklist`),
  });
  const toggle = useMutation({
    mutationFn: (item: Rec) => api.patch(`/cards/${cardId}/checklist`, { items: [{ id: item.id, checked: !item.checked }] }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['checklist', cardId] }),
  });

  if (isLoading) return <Empty>Carregando…</Empty>;
  if (!items.length) return <Empty>Sem checklist para o estágio atual.</Empty>;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={String(it.id)}>
          <button onClick={() => toggle.mutate(it)} className="w-full flex items-center gap-2.5 text-left surface-card bg-surface-850 px-3 py-2 hover:border-surface-600">
            <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${it.checked ? 'bg-brand-600 border-brand-600 text-white' : 'border-surface-500'}`}>{it.checked ? '✓' : ''}</span>
            <span className={`text-sm ${it.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{String(it.label)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Retenção ─────────────────────────────────────────────────────────────────
function RetencaoTab({ cardId, card }: { cardId: string; card: Rec }) {
  const r = card.retentionReview as Rec | null | undefined;
  const invalidate = useCardInvalidate(cardId);
  const existingAnswers = (r?.answers as Rec[]) ?? [];

  // Estado inicial: respostas existentes ou todas as perguntas padrão como "boas".
  const [answers, setAnswers] = useState<{ question: string; good: boolean }[]>(() =>
    existingAnswers.length
      ? existingAnswers.map((a) => ({ question: String(a.question), good: Boolean(a.good) }))
      : RETENTION_QUESTIONS.map((q) => ({ question: q, good: true })),
  );
  const [notes, setNotes] = useState(String(r?.notes ?? ''));
  const [open, setOpen] = useState(!r);

  const submit = useMutation({
    mutationFn: () => api.put(`/cards/${cardId}/retention-review`, { answers, ...(notes.trim() ? { notes: notes.trim() } : {}) }),
    onSuccess: () => { invalidate(); setOpen(false); },
  });

  const badCount = answers.filter((a) => !a.good).length;
  const willPass = badCount < 3;

  if (open) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-400">Marque cada critério. Reprova com 3 ou mais respostas negativas — nesse caso o card volta para edição.</p>
        <ul className="space-y-1.5">
          {answers.map((a, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm surface-card bg-surface-850 px-3 py-2">
              <span className="text-slate-200 flex-1">{a.question}</span>
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => setAnswers((arr) => arr.map((x, j) => j === i ? { ...x, good: true } : x))} className={`badge ${a.good ? 'bg-emerald-500/20 text-emerald-300' : 'bg-surface-700 text-slate-400'}`}>✓ bom</button>
                <button type="button" onClick={() => setAnswers((arr) => arr.map((x, j) => j === i ? { ...x, good: false } : x))} className={`badge ${!a.good ? 'bg-rose-500/20 text-rose-300' : 'bg-surface-700 text-slate-400'}`}>✗ ruim</button>
              </div>
            </li>
          ))}
        </ul>
        <Field label="Notas (opcional)"><textarea className="input-base h-16 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <p className={`text-xs ${willPass ? 'text-emerald-400' : 'text-rose-400'}`}>{badCount} negativa(s) → {willPass ? 'Aprova' : 'Reprova (volta para edição)'}</p>
        <div className="flex gap-2">
          <button className="btn-primary text-xs" disabled={submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? 'Salvando…' : 'Salvar revisão'}</button>
          {r && <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancelar</button>}
        </div>
        {submit.isError && <p className="text-[11px] text-rose-400">Falha ao salvar revisão.</p>}
      </div>
    );
  }

  if (!r) return <Empty>Carregando…</Empty>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`badge !text-xs !px-2 !py-1 ${r.passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{r.passed ? 'Aprovado' : 'Reprovado'}</span>
        <span className="text-xs text-slate-500">{String(r.badCount)} respostas negativas</span>
      </div>
      <ul className="space-y-1.5">
        {existingAnswers.map((a, i) => (
          <li key={i} className="flex items-center gap-2 text-sm surface-card bg-surface-850 px-3 py-2">
            <span className={a.good ? 'text-emerald-400' : 'text-rose-400'}>{a.good ? '✓' : '✗'}</span>
            <span className="text-slate-300">{String(a.question)}</span>
          </li>
        ))}
      </ul>
      {r.notes ? <Field label="Notas"><p className="text-sm text-slate-400">{String(r.notes)}</p></Field> : null}
      <button className="btn-ghost text-xs" onClick={() => setOpen(true)}>Refazer revisão</button>
    </div>
  );
}

// ── Agendamento ──────────────────────────────────────────────────────────────
const SCHEDULE_FIELDS = [
  ['Objetivo', 'objective'], ['Público', 'audience'], ['CTA', 'cta'],
  ['Métrica principal', 'primaryMetric'], ['Hipótese', 'hypothesis'],
] as const;

/** Date → string para <input type="datetime-local"> no fuso local. */
function toLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function AgendamentoTab({ cardId, card }: { cardId: string; card: Rec }) {
  const s = card.schedule as Rec | null | undefined;
  const invalidate = useCardInvalidate(cardId);
  const [open, setOpen] = useState(!s);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [, k] of SCHEDULE_FIELDS) init[k] = String(s?.[k] ?? '');
    return init;
  });
  const [when, setWhen] = useState(toLocalInput(s?.scheduledFor ? String(s.scheduledFor) : undefined));

  const save = useMutation({
    mutationFn: () => api.put(`/cards/${cardId}/schedule`, {
      objective: form.objective, audience: form.audience, cta: form.cta,
      primaryMetric: form.primaryMetric, hypothesis: form.hypothesis,
      scheduledFor: new Date(when).toISOString(),
    }),
    onSuccess: () => { invalidate(); setOpen(false); },
  });

  const valid = SCHEDULE_FIELDS.every(([, k]) => (form[k] ?? '').trim().length >= 5) && !!when;

  if (open) {
    return (
      <div className="space-y-3">
        {SCHEDULE_FIELDS.map(([label, k]) => (
          <Field key={k} label={`${label} (mín. 5 caracteres)`}>
            <input className="input-base" value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
          </Field>
        ))}
        <Field label="Agendar para">
          <input type="datetime-local" className="input-base" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <button className="btn-primary text-xs" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando…' : 'Salvar agendamento'}</button>
          {s && <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancelar</button>}
        </div>
        {save.isError && <p className="text-[11px] text-rose-400">Falha ao salvar.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {SCHEDULE_FIELDS.map(([label, k]) => (
        <Field key={k} label={label}><p className="text-slate-300">{String(s?.[k] ?? '—')}</p></Field>
      ))}
      {s?.scheduledFor ? <Field label="Agendado para"><p className="text-slate-300">{formatDate(String(s.scheduledFor))}</p></Field> : null}
      <button className="btn-ghost text-xs" onClick={() => setOpen(true)}>Editar agendamento</button>
    </div>
  );
}

// ── Métricas ─────────────────────────────────────────────────────────────────
const METRIC_FIELDS = [
  ['Retenção (%)', 'retentionPct'], ['Compartilhamentos', 'shares'], ['Salvamentos', 'saves'],
  ['Comentários', 'comments'], ['Cliques perfil', 'profileClicks'], ['Directs', 'directs'], ['Novos seguidores', 'newFollowers'],
] as const;

function MetricasTab({ cardId, card }: { cardId: string; card: Rec }) {
  const snaps = (card.metricSnapshots as Rec[]) ?? [];
  const invalidate = useCardInvalidate(cardId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const add = useMutation({
    mutationFn: () => {
      const payload: Record<string, number> = {};
      for (const [, k] of METRIC_FIELDS) {
        const raw = form[k];
        if (raw != null && raw !== '') payload[k] = Number(raw);
      }
      return api.post(`/cards/${cardId}/metrics`, payload);
    },
    onSuccess: () => { invalidate(); setForm({}); setOpen(false); },
  });

  const latest = snaps[0];
  return (
    <div className="space-y-3">
      {latest ? (
        <div className="grid grid-cols-2 gap-3">
          {METRIC_FIELDS.map(([label, k]) => (
            <div key={k} className="surface-card bg-surface-850 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold text-white">{latest[k] != null ? String(latest[k]) : '—'}</p>
            </div>
          ))}
        </div>
      ) : <Empty>Nenhuma métrica registrada.</Empty>}

      {open ? (
        <div className="surface-card bg-surface-850 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {METRIC_FIELDS.map(([label, k]) => (
              <Field key={k} label={label}>
                <input type="number" className="input-base" value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
              </Field>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-xs" disabled={add.isPending} onClick={() => add.mutate()}>{add.isPending ? 'Salvando…' : 'Salvar snapshot'}</button>
            <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
          {add.isError && <p className="text-[11px] text-rose-400">Falha ao salvar.</p>}
        </div>
      ) : (
        <button className="btn-ghost text-xs" onClick={() => setOpen(true)}>+ Registrar métricas</button>
      )}
    </div>
  );
}

// ── Reciclagem ───────────────────────────────────────────────────────────────
function ReciclagemTab({ cardId, card }: { cardId: string; card: Rec }) {
  const assets = (card.derivedAssets as Rec[]) ?? [];
  const gen = useAIRecycle(cardId);
  return (
    <div className="space-y-3">
      <AICopilotButton label="Gerar ativos derivados" mutation={gen} hint="carrossel, e-mail, SDR, LinkedIn…" />
      {assets.length ? assets.map((a) => (
        <div key={String(a.id)} className="surface-card bg-surface-850 p-3">
          <span className="badge bg-ai-600/15 text-ai-400 mb-1.5">{DERIVED_LABELS[String(a.type)] ?? String(a.type)}</span>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{String(a.content ?? '—')}</p>
        </div>
      )) : <Empty>Nenhum ativo derivado.</Empty>}
    </div>
  );
}

// ── Comentários / atividade (transversal, colapsável) ─────────────────────────
function CommentsSection({ card }: { card: Rec }) {
  const [open, setOpen] = useState(false);
  const comments = (card.comments as Rec[]) ?? [];
  return (
    <div className="mt-6 pt-4 border-t border-surface-800">
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-slate-500 uppercase hover:text-slate-300 flex items-center gap-1.5">
        <span>{open ? '▾' : '▸'}</span> 💬 Comentários & atividade ({comments.length})
      </button>
      {open && (
        <div className="space-y-3 mt-3">
          {comments.length ? comments.map((c) => (
            <div key={String(c.id)} className="surface-card bg-surface-850 p-3">
              <p className="text-xs text-slate-500 mb-1">{String((c.author as Rec)?.name ?? '')} · {formatDate(String(c.createdAt))}</p>
              <p className="text-sm text-slate-200">{String(c.body)}</p>
            </div>
          )) : <Empty>Sem comentários.</Empty>}
        </div>
      )}
    </div>
  );
}

/** Avaliação 1–5 estrelas da peça (PRD-010). Clicar na estrela marcada limpa a nota. */
function StarRating({ value, onChange }: { value: number | null; onChange: (rating: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-0.5" title="Avalie a peça — a IA usa as notas para repetir o que funciona e evitar o que não">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(value === n ? null : n)}
          className={`text-base leading-none transition-colors ${n <= shown ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {value ? <span className="ml-1.5 text-[11px] text-slate-500">{value}/5</span> : <span className="ml-1.5 text-[11px] text-slate-600">avaliar</span>}
    </div>
  );
}
