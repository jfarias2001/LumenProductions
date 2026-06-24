import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { STAGE_LABELS, SignalSource } from '@content-engine/shared';
import { formatDate } from '../../lib/utils.js';
import { useCard, useArchiveCard } from '../../hooks/useBoard.js';
import { useAIStructure, useAIValidate, useAIAngles, useAICopy, useAIRecycle } from '../../hooks/useAI.js';
import { PILLAR_LABELS, PILLAR_BADGE, VERDICT_BADGE, ANGLE_LABELS, DERIVED_LABELS, CONTENT_TYPE_LABELS, SIGNAL_LABELS } from '../../lib/labels.js';
import AICopilotButton from './AICopilotButton.js';
import PhaseChat from './PhaseChat.js';
import FinalPackageView from './FinalPackageView.js';
import type { Stage } from '@content-engine/shared';

interface Props {
  cardId: string;
  onClose: () => void;
}

type Tab =
  | 'copiloto' | 'pacote'
  | 'template' | 'validacao' | 'angulos' | 'roteiro' | 'direcao'
  | 'checklists' | 'retencao' | 'copy' | 'agendamento' | 'metricas'
  | 'reciclagem' | 'atividade';

const TABS: { id: Tab; label: string }[] = [
  { id: 'copiloto', label: '✦ Copiloto IA' },
  { id: 'pacote', label: '📦 Pacote' },
  { id: 'template', label: 'Template' },
  { id: 'validacao', label: 'Validação' },
  { id: 'angulos', label: 'Ângulos & Hooks' },
  { id: 'roteiro', label: 'Roteiro' },
  { id: 'copy', label: 'Copy' },
  { id: 'direcao', label: 'Direção' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'retencao', label: 'Retenção' },
  { id: 'agendamento', label: 'Agendamento' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'reciclagem', label: 'Reciclagem' },
  { id: 'atividade', label: 'Atividade' },
];

export default function CardDetail({ cardId, onClose }: Props) {
  const { data: card, isLoading } = useCard(cardId);
  const [activeTab, setActiveTab] = useState<Tab>('copiloto');
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

  const pillar = card.pillar ? String(card.pillar) : null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-surface-900 border-l border-surface-700 shadow-card flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-700 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="badge bg-brand-600/20 text-brand-300">{STAGE_LABELS[card.stage as keyof typeof STAGE_LABELS]}</span>
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

        {/* Tabs */}
        <div className="border-b border-surface-700 px-3 overflow-x-auto shrink-0">
          <div className="flex gap-0 whitespace-nowrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-brand-500 text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 min-h-0 p-5 ${activeTab === 'copiloto' ? 'flex flex-col' : 'overflow-y-auto'}`}>
          {activeTab === 'copiloto' && <PhaseChat cardId={cardId} currentStage={card.stage as Stage} />}
          {activeTab === 'pacote' && <FinalPackageView cardId={cardId} />}
          {activeTab === 'template' && <TemplateTab cardId={cardId} card={card} onUpdate={(d) => updateCard.mutate(d)} />}
          {activeTab === 'validacao' && <ValidacaoTab cardId={cardId} card={card} />}
          {activeTab === 'angulos' && <AngulosTab cardId={cardId} card={card} />}
          {activeTab === 'roteiro' && <RoteiroTab cardId={cardId} card={card} />}
          {activeTab === 'copy' && <CopyTab cardId={cardId} card={card} />}
          {activeTab === 'direcao' && <DirecaoTab card={card} />}
          {activeTab === 'checklists' && <ChecklistsTab cardId={cardId} />}
          {activeTab === 'retencao' && <RetencaoTab card={card} />}
          {activeTab === 'agendamento' && <AgendamentoTab card={card} />}
          {activeTab === 'metricas' && <MetricasTab card={card} />}
          {activeTab === 'reciclagem' && <ReciclagemTab cardId={cardId} card={card} />}
          {activeTab === 'atividade' && <AtividadeTab card={card} />}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
type Rec = Record<string, unknown>;

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

// ── Template ─────────────────────────────────────────────────────────────────
function TemplateTab({ cardId, card, onUpdate }: { cardId: string; card: Rec; onUpdate: (d: Rec) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(String(card.title ?? ''));
  const [persona, setPersona] = useState(String(card.persona ?? ''));
  const [pain, setPain] = useState(String(card.pain ?? ''));
  const [signalSource, setSignalSource] = useState(String(card.signalSource ?? ''));
  const [signalContent, setSignalContent] = useState(String(card.signalContent ?? ''));
  const [rawText, setRawText] = useState('');
  const structure = useAIStructure(cardId);

  return (
    <div className="space-y-4">
      {/* IA: estruturar input solto */}
      <div className="surface-card p-3 space-y-2 bg-surface-850">
        <p className="text-xs text-slate-400">Cole uma transcrição/nota solta e deixe a IA preencher o template:</p>
        <textarea className="input-base h-20 resize-none" value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Ex.: ontem um cliente reclamou que recebe muito lead mas não fecha…" />
        <button
          onClick={() => structure.mutate(rawText)}
          disabled={structure.isPending || rawText.trim().length < 10}
          className="btn-ai"
        >
          {structure.isPending ? <><span className="h-3 w-3 rounded-full border-2 border-ai-400/40 border-t-ai-400 animate-spin" /> Estruturando…</> : '✦ Estruturar com IA'}
        </button>
        {structure.isError && <p className="text-[11px] text-amber-300/80">IA indisponível — preencha manualmente.</p>}
      </div>

      <Field label="Título">
        {editing ? <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} /> : <p className="text-sm text-slate-200">{String(card.title)}</p>}
      </Field>
      <Field label="Persona">
        {editing ? <input className="input-base" value={persona} onChange={(e) => setPersona(e.target.value)} /> : <p className="text-sm text-slate-400">{String(card.persona ?? '—')}</p>}
      </Field>
      <Field label="Dor">
        {editing ? <textarea className="input-base h-20 resize-none" value={pain} onChange={(e) => setPain(e.target.value)} /> : <p className="text-sm text-slate-400 whitespace-pre-wrap">{String(card.pain ?? '—')}</p>}
      </Field>
      <Field label="Fonte do sinal">
        {editing ? (
          <select className="input-base" value={signalSource} onChange={(e) => setSignalSource(e.target.value)}>
            <option value="">—</option>
            {Object.values(SignalSource).map((s) => <option key={s} value={s}>{SIGNAL_LABELS[s] ?? s}</option>)}
          </select>
        ) : <p className="text-sm text-slate-400">{card.signalSource ? (SIGNAL_LABELS[String(card.signalSource)] ?? String(card.signalSource)) : '—'}</p>}
      </Field>
      <Field label="Conteúdo do sinal">
        {editing ? <textarea className="input-base h-24 resize-none" value={signalContent} onChange={(e) => setSignalContent(e.target.value)} placeholder="Cole aqui o print/transcrição/comentário…" /> : <p className="text-sm text-slate-400 whitespace-pre-wrap">{String(card.signalContent ?? '—')}</p>}
      </Field>
      <div className="flex gap-2">
        {editing ? (
          <>
            <button className="btn-primary text-xs" onClick={() => { onUpdate({ title, persona, pain, ...(signalSource ? { signalSource } : {}), signalContent }); setEditing(false); }}>Salvar</button>
            <button className="btn-ghost text-xs" onClick={() => setEditing(false)}>Cancelar</button>
          </>
        ) : (
          <button className="btn-ghost text-xs" onClick={() => { setTitle(String(card.title ?? '')); setPersona(String(card.persona ?? '')); setPain(String(card.pain ?? '')); setSignalSource(String(card.signalSource ?? '')); setSignalContent(String(card.signalContent ?? '')); setEditing(true); }}>Editar</button>
        )}
      </div>
    </div>
  );
}

// ── Validação ────────────────────────────────────────────────────────────────
function ValidacaoTab({ cardId, card }: { cardId: string; card: Rec }) {
  const v = card.validation as Rec | null | undefined;
  const validate = useAIValidate(cardId);
  return (
    <div className="space-y-4">
      <AICopilotButton label="Validar com IA" mutation={validate} hint="entra como sugestão; gate exige confirmação humana" />
      {v ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">{String(v.total)}</span>
            <span className="text-slate-500">/18</span>
            <span className={`badge !text-xs !px-2 !py-1 ${VERDICT_BADGE[String(v.verdict)] ?? 'bg-surface-700 text-slate-400'}`}>{String(v.verdict).replace(/_/g, ' ')}</span>
            {Boolean(v.aiSuggested) && !v.reviewedById && <span className="badge bg-ai-600/15 text-ai-400 border border-ai-500/40">sugestão IA — revisar</span>}
          </div>
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
  if (!c) return <Empty>Direção criativa não definida. Use o Copiloto IA na fase "Direção Criativa".</Empty>;
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

// ── Atividade ────────────────────────────────────────────────────────────────
function AtividadeTab({ card }: { card: Rec }) {
  const comments = (card.comments as Rec[]) ?? [];
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase">Comentários</h3>
      {comments.length ? comments.map((c) => (
        <div key={String(c.id)} className="surface-card bg-surface-850 p-3">
          <p className="text-xs text-slate-500 mb-1">{String((c.author as Rec)?.name ?? '')} · {formatDate(String(c.createdAt))}</p>
          <p className="text-sm text-slate-200">{String(c.body)}</p>
        </div>
      )) : <Empty>Sem comentários.</Empty>}
    </div>
  );
}
