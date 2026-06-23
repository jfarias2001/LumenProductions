import { useCard } from '../../hooks/useBoard.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { STAGE_LABELS } from '@content-engine/shared';
import { formatDate } from '../../lib/utils.js';
import { useState } from 'react';

interface Props {
  cardId: string;
  onClose: () => void;
}

type Tab =
  | 'template'
  | 'validacao'
  | 'angulos'
  | 'roteiro'
  | 'direcao'
  | 'checklists'
  | 'retencao'
  | 'copy'
  | 'agendamento'
  | 'metricas'
  | 'reciclagem'
  | 'atividade';

const TABS: { id: Tab; label: string }[] = [
  { id: 'template', label: 'Template' },
  { id: 'validacao', label: 'Validação' },
  { id: 'angulos', label: 'Ângulos & Hooks' },
  { id: 'roteiro', label: 'Roteiro' },
  { id: 'direcao', label: 'Direção' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'retencao', label: 'Retenção' },
  { id: 'copy', label: 'Copy' },
  { id: 'agendamento', label: 'Agendamento' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'reciclagem', label: 'Reciclagem' },
  { id: 'atividade', label: 'Atividade' },
];

export default function CardDetail({ cardId, onClose }: Props) {
  const { data: card, isLoading } = useCard(cardId);
  const [activeTab, setActiveTab] = useState<Tab>('template');
  const qc = useQueryClient();

  const updateCard = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/cards/${cardId}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['card', cardId] }); void qc.invalidateQueries({ queryKey: ['board'] }); },
  });

  if (isLoading || !card) {
    return (
      <div className="fixed inset-0 z-40 flex">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="ml-auto w-full max-w-2xl bg-white shadow-xl flex items-center justify-center">
          <span className="text-gray-400">Carregando…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="ml-auto w-full max-w-2xl bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full font-medium">
                {STAGE_LABELS[card.stage as keyof typeof STAGE_LABELS]}
              </span>
              {card.pillar && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {String(card.pillar).replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">{card.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {card.assignee ? `Responsável: ${card.assignee.name}` : 'Sem responsável'} · Atualizado {formatDate(card.updatedAt)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5 shrink-0">×</button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-5 overflow-x-auto shrink-0">
          <div className="flex gap-0 whitespace-nowrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'template' && <TemplateTab card={card} onUpdate={(d) => updateCard.mutate(d)} />}
          {activeTab === 'validacao' && <ValidacaoTab card={card} />}
          {activeTab === 'angulos' && <AngulosTab card={card} />}
          {activeTab === 'roteiro' && <RoteiroTab card={card} />}
          {activeTab === 'metricas' && <MetricasTab card={card} />}
          {activeTab === 'atividade' && <AtividadeTab card={card} />}
          {!['template', 'validacao', 'angulos', 'roteiro', 'metricas', 'atividade'].includes(activeTab) && (
            <div className="text-sm text-gray-400 text-center py-8">
              Aba <strong>{TABS.find((t) => t.id === activeTab)?.label}</strong> — em construção.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab components ────────────────────────────────────────────────────────────

function TemplateTab({ card, onUpdate }: { card: Record<string, unknown>; onUpdate: (d: Record<string, unknown>) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(String(card.title ?? ''));
  const [persona, setPersona] = useState(String(card.persona ?? ''));
  const [pain, setPain] = useState(String(card.pain ?? ''));

  return (
    <div className="space-y-4">
      <Field label="Título">
        {editing ? (
          <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} />
        ) : (
          <p className="text-sm text-gray-800">{String(card.title)}</p>
        )}
      </Field>
      <Field label="Persona">
        {editing ? (
          <input className="input-base" value={persona} onChange={(e) => setPersona(e.target.value)} />
        ) : (
          <p className="text-sm text-gray-600">{String(card.persona ?? '—')}</p>
        )}
      </Field>
      <Field label="Dor">
        {editing ? (
          <textarea className="input-base h-20 resize-none" value={pain} onChange={(e) => setPain(e.target.value)} />
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{String(card.pain ?? '—')}</p>
        )}
      </Field>
      <div className="flex gap-2">
        {editing ? (
          <>
            <button className="btn-primary text-xs" onClick={() => { onUpdate({ title, persona, pain }); setEditing(false); }}>Salvar</button>
            <button className="btn-ghost text-xs" onClick={() => setEditing(false)}>Cancelar</button>
          </>
        ) : (
          <button className="btn-ghost text-xs" onClick={() => setEditing(true)}>Editar</button>
        )}
      </div>
    </div>
  );
}

function ValidacaoTab({ card }: { card: Record<string, unknown> }) {
  const v = card.validation as Record<string, unknown> | null | undefined;
  return (
    <div className="space-y-3">
      {v ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{String(v.total)}</span>
            <span className="text-gray-400">/18</span>
            <span className={`text-sm font-semibold px-2 py-1 rounded ${
              v.verdict === 'SEGUIR_ROTEIRO' ? 'bg-green-100 text-green-700' :
              v.verdict === 'MELHORAR_ANGULO' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>{String(v.verdict).replace(/_/g, ' ')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {['dorQuente','clareza','contraste','especificidadeAgencia','potencialComentarios','potencialComercial'].map((k) => (
              <div key={k} className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">{k.replace(/([A-Z])/g, ' $1')}</p>
                <p className="font-bold text-gray-900">{String(v[k] ?? '—')}/3</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400">Nenhuma validação registrada.</p>
      )}
    </div>
  );
}

function AngulosTab({ card }: { card: Record<string, unknown> }) {
  const angles = (card.angles as Array<Record<string, unknown>>) ?? [];
  const hooks = (card.hooks as Array<Record<string, unknown>>) ?? [];
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Ângulos ({angles.length})</h3>
        {angles.length ? angles.map((a) => (
          <div key={String(a.id)} className={`text-sm p-2 rounded mb-1 ${a.selected ? 'bg-brand-50 border border-brand-200' : 'bg-gray-50'}`}>
            <span className="text-xs text-gray-400 mr-1">{String(a.type)}</span>{String(a.text)}
            {Boolean(a.selected) && <span className="ml-2 text-xs text-brand-500">✓ Selecionado</span>}
          </div>
        )) : <p className="text-sm text-gray-400">Nenhum ângulo.</p>}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Hooks ({hooks.length})</h3>
        {hooks.length ? hooks.map((h) => (
          <div key={String(h.id)} className="text-sm p-2 bg-gray-50 rounded mb-1 flex items-center justify-between">
            <span>{String(h.text)}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${h.status === 'ESCOLHIDO' ? 'bg-green-100 text-green-700' : h.status === 'DESCARTADO' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>{String(h.status)}</span>
          </div>
        )) : <p className="text-sm text-gray-400">Nenhum hook.</p>}
      </div>
    </div>
  );
}

function RoteiroTab({ card }: { card: Record<string, unknown> }) {
  const s = card.script as Record<string, unknown> | null | undefined;
  if (!s) return <p className="text-sm text-gray-400">Roteiro não preenchido.</p>;
  return (
    <div className="space-y-3 text-sm">
      {(['dor','quebra','mecanismo','beneficio','cta'] as const).map((k) => (
        <div key={k} className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{k}</p>
          <p className="text-gray-800 whitespace-pre-wrap">{String(s[k] ?? '—')}</p>
        </div>
      ))}
      <p className="text-xs text-gray-400">Duração estimada: {String(s.durationSec)}s</p>
    </div>
  );
}

function MetricasTab({ card }: { card: Record<string, unknown> }) {
  const snaps = (card.metricSnapshots as Array<Record<string, unknown>>) ?? [];
  if (!snaps.length) return <p className="text-sm text-gray-400">Nenhuma métrica registrada.</p>;
  const latest = snaps[0]!;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        ['Retenção', latest.retentionPct != null ? `${String(latest.retentionPct)}%` : null],
        ['Compartilhamentos', latest.shares],
        ['Salvamentos', latest.saves],
        ['Comentários', latest.comments],
        ['Cliques perfil', latest.profileClicks],
        ['Directs', latest.directs],
        ['Novos seguidores', latest.newFollowers],
      ].map(([label, val]) => (
        <div key={String(label)} className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">{String(label)}</p>
          <p className="text-lg font-bold text-gray-900">{val != null ? String(val) : '—'}</p>
        </div>
      ))}
    </div>
  );
}

function AtividadeTab({ card }: { card: Record<string, unknown> }) {
  const comments = (card.comments as Array<Record<string, unknown>>) ?? [];
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase">Comentários</h3>
      {comments.length ? comments.map((c) => (
        <div key={String(c.id)} className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">{String((c.author as Record<string, unknown>)?.name ?? '')} · {formatDate(String(c.createdAt))}</p>
          <p className="text-sm text-gray-800">{String(c.body)}</p>
        </div>
      )) : <p className="text-sm text-gray-400">Sem comentários.</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{label}</label>
      {children}
    </div>
  );
}
