import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { STAGE_LABELS, STAGE_ORDER, Stage, SignalSource, AwarenessLevel, Pillar, ContentClass } from '@content-engine/shared';
import { formatDate } from '../../lib/utils.js';
import { useCard, useArchiveCard, useTransitionCard, useConfirmValidation } from '../../hooks/useBoard.js';
import { useAIStructure, useAIValidate, useAIAngles, useAICopy, useAIRecycle } from '../../hooks/useAI.js';
import { PILLAR_LABELS, AWARENESS_LABELS, PILLAR_BADGE, VERDICT_BADGE, ANGLE_LABELS, DERIVED_LABELS, CONTENT_TYPE_LABELS, SIGNAL_LABELS, CLASS_BADGE } from '../../lib/labels.js';
import AICopilotButton from './AICopilotButton.js';
import PhaseChat from './PhaseChat.js';
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
  [Stage.IDEIAS_VALIDADAS]: { job: 'Valide o potencial da ideia (6 critérios, 0–3).', gate: 'Veredito SEGUIR_ROTEIRO (≥13) confirmado por um humano.' },
  [Stage.ANGULO_DEFINIDO]: { job: 'Explore ângulos narrativos e escolha o mais forte.', gate: 'Selecione ao menos 1 ângulo.' },
  [Stage.HOOKS_EM_TESTE]: { job: 'Gere e refine hooks de abertura (primeiros 2 segundos).', gate: 'Mínimo 5 hooks, com 1 marcado como ESCOLHIDO.' },
  [Stage.ROTEIRO]: { job: 'Escreva o roteiro: dor → quebra → mecanismo → benefício → CTA.', gate: 'Roteiro com as 5 seções e duração entre 30–45s.' },
  [Stage.DIRECAO_CRIATIVA]: { job: 'Defina a direção criativa (formato, cortes/slides, paleta).', gate: 'Formato de direção criativa definido.' },
  [Stage.PRONTO_PARA_GRAVAR]: { job: 'Prepare a pré-produção.', gate: 'Checklist de pré-produção completo.' },
  [Stage.GRAVADO]: { job: 'Grave e registre o link da captação bruta.', gate: 'Link da gravação bruta preenchido.' },
  [Stage.EM_EDICAO]: { job: 'Edite e registre o link do vídeo editado.', gate: 'Checklist de retenção + link do vídeo editado.' },
  [Stage.REVISAO_RETENCAO]: { job: 'Revise a retenção da peça editada.', gate: 'Revisão de retenção aprovada (<3 respostas ruins).' },
  [Stage.COPY_LEGENDA_CTA]: { job: 'Escreva a legenda e as variações de CTA.', gate: 'Legenda + ao menos 1 variação de CTA.' },
  [Stage.AGENDADO]: { job: 'Agende a publicação com objetivo, público e hipótese.', gate: 'Agendamento completo (todos os campos).' },
  [Stage.PUBLICADO]: { job: 'Publique manualmente na plataforma.', gate: 'Publicação é manual — confirme após postar.' },
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative ml-auto w-full max-w-2xl bg-surface-900 border-l border-surface-700 flex items-center justify-center">
          <span className="text-slate-500">Carregando…</span>
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-surface-900 border-l border-surface-700 shadow-card flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-700 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="badge bg-brand-600/20 text-brand-300">{STAGE_LABELS[cardStage]}</span>
              {card.contentType ? <span className="badge bg-ai-600/15 text-ai-400 border border-ai-500/30">{CONTENT_TYPE_LABELS[String(card.contentType)] ?? String(card.contentType)}</span> : null}
              {pillar && <span className={`badge ${PILLAR_BADGE[pillar] ?? 'bg-surface-700 text-slate-400'}`}>{PILLAR_LABELS[pillar] ?? pillar}</span>}
            </div>
            <h2 className="text-base font-semibold text-white leading-tight">{card.title}</h2>
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
    <div className="border-t border-surface-700 px-5 py-3 shrink-0 bg-surface-900">
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

function StagePanel({ stage, cardId, card, onUpdate }: { stage: Stage; cardId: string; card: Rec; onUpdate: (d: Rec) => void }) {
  const copiloto = <PhaseChat cardId={cardId} currentStage={stage} embedded />;
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
    case Stage.ROTEIRO:
      return <div className="space-y-5">{copiloto}<RoteiroTab cardId={cardId} card={card} /></div>;
    case Stage.DIRECAO_CRIATIVA:
      return <div className="space-y-5">{copiloto}<DirecaoTab card={card} /></div>;
    case Stage.PRONTO_PARA_GRAVAR:
      return <ChecklistsTab cardId={cardId} />;
    case Stage.GRAVADO:
      return <div className="space-y-5"><MediaTab card={card} onUpdate={onUpdate} field="rawFootageUrl" label="Link da gravação bruta" /><ChecklistsTab cardId={cardId} /></div>;
    case Stage.EM_EDICAO:
      return <div className="space-y-5"><MediaTab card={card} onUpdate={onUpdate} field="editedVideoUrl" label="Link do vídeo editado" /><ChecklistsTab cardId={cardId} /></div>;
    case Stage.REVISAO_RETENCAO:
      return <RetencaoTab card={card} />;
    case Stage.COPY_LEGENDA_CTA:
      return <div className="space-y-5">{copiloto}<CopyTab cardId={cardId} card={card} /></div>;
    case Stage.AGENDADO:
    case Stage.PUBLICADO:
      return <AgendamentoTab card={card} />;
    case Stage.EM_DISTRIBUICAO:
      return <ChecklistsTab cardId={cardId} />;
    case Stage.ANALISE:
      return <div className="space-y-5"><MetricasTab card={card} /><ContentClassField card={card} onUpdate={onUpdate} /></div>;
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
  const SCORE_KEYS = ['dorQuente', 'clareza', 'contraste', 'especificidadeAgencia', 'potencialComentarios', 'potencialComercial'] as const;
  const handleConfirm = () => {
    if (!v) return;
    const scores: Record<string, number> = {};
    for (const k of SCORE_KEYS) scores[k] = Number(v[k] ?? 0);
    confirm.mutate(scores);
  };
  return (
    <div className="space-y-4">
      <AICopilotButton label="Validar com IA" mutation={validate} hint="entra como sugestão; gate exige confirmação humana" />
      {v ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">{String(v.total)}</span>
            <span className="text-slate-500">/18</span>
            <span className={`badge !text-xs !px-2 !py-1 ${VERDICT_BADGE[String(v.verdict)] ?? 'bg-surface-700 text-slate-400'}`}>{String(v.verdict).replace(/_/g, ' ')}</span>
            {v.reviewedById
              ? <span className="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">✓ confirmada por humano</span>
              : <span className="badge bg-ai-600/15 text-ai-400 border border-ai-500/40">sugestão IA — revisar</span>}
          </div>
          {!v.reviewedById && (
            <div className="surface-card bg-surface-850 p-3 space-y-2">
              <p className="text-xs text-slate-400">Revise as notas acima. Ao confirmar, você assume a validação como humano e libera o avanço da etapa.</p>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirm.isPending}
                className="btn-primary w-full disabled:opacity-50"
              >
                {confirm.isPending ? 'Confirmando…' : '✓ Confirmar validação'}
              </button>
              {confirm.isError && <p className="text-xs text-rose-400">Falha ao confirmar. Tente novamente.</p>}
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
  return (
    <div className="space-y-4">
      <AICopilotButton label="Gerar ângulos & hooks" mutation={gen} />
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Ângulos ({angles.length})</h3>
        {angles.length ? angles.map((a) => (
          <div key={String(a.id)} className={`text-sm p-2.5 rounded-lg mb-1.5 border ${a.selected ? 'bg-brand-600/10 border-brand-500/40' : 'bg-surface-850 border-surface-700'}`}>
            <span className="badge bg-surface-700 text-slate-400 mr-1.5">{ANGLE_LABELS[String(a.type)] ?? String(a.type)}</span>
            <span className="text-slate-200">{String(a.text)}</span>
            {Boolean(a.selected) && <span className="ml-2 text-xs text-brand-300">✓</span>}
          </div>
        )) : <Empty>Nenhum ângulo.</Empty>}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Hooks ({hooks.length})</h3>
        {hooks.length ? hooks.map((h) => (
          <div key={String(h.id)} className="text-sm p-2.5 bg-surface-850 border border-surface-700 rounded-lg mb-1.5 flex items-center justify-between gap-2">
            <span className="text-slate-200">{String(h.text)}</span>
            <span className={`badge shrink-0 ${h.status === 'ESCOLHIDO' ? 'bg-emerald-500/15 text-emerald-300' : h.status === 'DESCARTADO' ? 'bg-rose-500/15 text-rose-300' : 'bg-surface-700 text-slate-400'}`}>{String(h.status)}</span>
          </div>
        )) : <Empty>Nenhum hook.</Empty>}
      </div>
    </div>
  );
}

// ── Roteiro ──────────────────────────────────────────────────────────────────
function RoteiroTab({ cardId, card }: { cardId: string; card: Rec }) {
  const s = card.script as Rec | null | undefined;
  const gen = useAICopy(cardId);
  return (
    <div className="space-y-3">
      <AICopilotButton label="Gerar roteiro + copy" mutation={gen} hint="segue a Regra de Ouro" />
      {s ? (
        <div className="space-y-3 text-sm">
          {(['dor','quebra','mecanismo','beneficio','cta'] as const).map((k) => (
            <div key={k} className="surface-card bg-surface-850 p-3">
              <p className="text-xs font-semibold text-brand-300/80 uppercase mb-1">{k}</p>
              <p className="text-slate-200 whitespace-pre-wrap">{String(s[k] ?? '—')}</p>
            </div>
          ))}
          <p className="text-xs text-slate-500">Duração estimada: {String(s.durationSec)}s</p>
        </div>
      ) : <Empty>Roteiro não preenchido.</Empty>}
    </div>
  );
}

// ── Copy ─────────────────────────────────────────────────────────────────────
function CopyTab({ cardId, card }: { cardId: string; card: Rec }) {
  const c = card.copy as Rec | null | undefined;
  const screenTexts = (card.screenTexts as string[]) ?? [];
  const gen = useAICopy(cardId);
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
function DirecaoTab({ card }: { card: Rec }) {
  const c = card.creative as Rec | null | undefined;
  if (!c) return <Empty>Direção criativa não definida. Use o Copiloto IA acima.</Empty>;
  const editing = (c.editingInsights as string[]) ?? [];
  const graphics = (c.graphicElements as Rec[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Formato"><span className="badge bg-brand-600/20 text-brand-300">{String(c.format).replace(/_/g, ' ')}</span></Field>
      {editing.length > 0 && (
        <Field label="Insights de edição (vídeo)">
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">{editing.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Field>
      )}
      {graphics.length > 0 && (
        <Field label="Elementos gráficos (estático)">
          <div className="space-y-2">
            {graphics.map((g, i) => (
              <div key={i} className="surface-card bg-surface-850 p-2.5">
                <p className="text-[11px] font-semibold text-brand-300/80 uppercase mb-0.5">Slide {String(g.slide ?? i + 1)}</p>
                {g.headline ? <p className="text-sm text-slate-100 font-medium">{String(g.headline)}</p> : null}
                {g.body ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{String(g.body)}</p> : null}
                {g.visual ? <p className="text-xs text-slate-500 mt-0.5">Visual: {String(g.visual)}</p> : null}
              </div>
            ))}
          </div>
        </Field>
      )}
      {c.palette ? <Field label="Paleta"><p className="text-sm text-slate-300 whitespace-pre-wrap">{String(c.palette)}</p></Field> : null}
      {c.visualNotes ? <Field label="Notas visuais"><p className="text-sm text-slate-300 whitespace-pre-wrap">{String(c.visualNotes)}</p></Field> : null}
      {((c.referenceUrls as string[]) ?? []).length > 0 && (
        <Field label="Referências">
          <ul className="space-y-1">
            {(c.referenceUrls as string[]).map((u, i) => <li key={i}><a href={u} target="_blank" rel="noreferrer" className="text-sm text-brand-300 hover:underline break-all">{u}</a></li>)}
          </ul>
        </Field>
      )}
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
function RetencaoTab({ card }: { card: Rec }) {
  const r = card.retentionReview as Rec | null | undefined;
  if (!r) return <Empty>Revisão de retenção não realizada.</Empty>;
  const answers = (r.answers as Rec[]) ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`badge !text-xs !px-2 !py-1 ${r.passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{r.passed ? 'Aprovado' : 'Reprovado'}</span>
        <span className="text-xs text-slate-500">{String(r.badCount)} respostas negativas</span>
      </div>
      <ul className="space-y-1.5">
        {answers.map((a, i) => (
          <li key={i} className="flex items-center gap-2 text-sm surface-card bg-surface-850 px-3 py-2">
            <span className={a.good ? 'text-emerald-400' : 'text-rose-400'}>{a.good ? '✓' : '✗'}</span>
            <span className="text-slate-300">{String(a.question)}</span>
          </li>
        ))}
      </ul>
      {r.notes ? <Field label="Notas"><p className="text-sm text-slate-400">{String(r.notes)}</p></Field> : null}
    </div>
  );
}

// ── Agendamento ──────────────────────────────────────────────────────────────
function AgendamentoTab({ card }: { card: Rec }) {
  const s = card.schedule as Rec | null | undefined;
  if (!s) return <Empty>Sem agendamento.</Empty>;
  return (
    <div className="space-y-3 text-sm">
      {([['Objetivo','objective'],['Público','audience'],['CTA','cta'],['Métrica principal','primaryMetric'],['Hipótese','hypothesis']] as const).map(([label, k]) => (
        <Field key={k} label={label}><p className="text-slate-300">{String(s[k] ?? '—')}</p></Field>
      ))}
      {s.scheduledFor ? <Field label="Agendado para"><p className="text-slate-300">{formatDate(String(s.scheduledFor))}</p></Field> : null}
    </div>
  );
}

// ── Métricas ─────────────────────────────────────────────────────────────────
function MetricasTab({ card }: { card: Rec }) {
  const snaps = (card.metricSnapshots as Rec[]) ?? [];
  if (!snaps.length) return <Empty>Nenhuma métrica registrada.</Empty>;
  const latest = snaps[0]!;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        ['Retenção', latest.retentionPct != null ? `${String(latest.retentionPct)}%` : null],
        ['Compartilhamentos', latest.shares], ['Salvamentos', latest.saves], ['Comentários', latest.comments],
        ['Cliques perfil', latest.profileClicks], ['Directs', latest.directs], ['Novos seguidores', latest.newFollowers],
      ].map(([label, val]) => (
        <div key={String(label)} className="surface-card bg-surface-850 p-3">
          <p className="text-xs text-slate-500">{String(label)}</p>
          <p className="text-lg font-bold text-white">{val != null ? String(val) : '—'}</p>
        </div>
      ))}
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
