import { useState } from 'react';
import { ContentType, Pillar, PILLAR_GROUP_MAP, MIX_TARGETS } from '@content-engine/shared';
import {
  useCalendars,
  useCalendar,
  useGenerateCalendar,
  useSendCalendarItem,
  useDeleteCalendar,
  type CalendarItem,
} from '../hooks/useCalendar.js';
import { useAIStatus } from '../hooks/useAI.js';
import { PILLAR_LABELS, PILLAR_BADGE, FORMAT_LABELS, CONTENT_TYPE_LABELS } from '../lib/labels.js';
import AppHeader from '../components/AppHeader.js';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
function fmtDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

const GROUP_LABELS: Record<keyof typeof MIX_TARGETS, string> = {
  DOR_CONSCIENCIA: 'Dor/consciência',
  SOLUCAO_MECANISMO: 'Solução/mecanismo',
  PROVA_BASTIDOR_PRODUTO: 'Prova/bastidor',
};

function MixBar({ items }: { items: CalendarItem[] }) {
  const counts: Record<keyof typeof MIX_TARGETS, number> = { DOR_CONSCIENCIA: 0, SOLUCAO_MECANISMO: 0, PROVA_BASTIDOR_PRODUTO: 0 };
  let withPillar = 0;
  for (const it of items) {
    if (it.pillar) { counts[PILLAR_GROUP_MAP[it.pillar as Pillar]]++; withPillar++; }
  }
  if (!withPillar) return null;
  return (
    <div className="flex flex-wrap gap-3 text-[11px]">
      {(Object.keys(MIX_TARGETS) as (keyof typeof MIX_TARGETS)[]).map((g) => {
        const pct = Math.round((counts[g] / withPillar) * 100);
        const target = MIX_TARGETS[g];
        const off = Math.abs(pct - target) > 15;
        return (
          <span key={g} className={off ? 'text-amber-300' : 'text-slate-400'}>
            {GROUP_LABELS[g]}: <strong>{pct}%</strong> <span className="text-slate-600">(alvo {target}%)</span>
          </span>
        );
      })}
    </div>
  );
}

function ItemCard({ item, calendarId }: { item: CalendarItem; calendarId: string }) {
  const send = useSendCalendarItem(calendarId);
  const inPipeline = !!item.cardId;
  return (
    <div className="surface-card p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-slate-500">{fmtDate(item.scheduledFor)}</span>
        <span className="badge bg-surface-700 text-slate-300">{CONTENT_TYPE_LABELS[item.contentType]}</span>
      </div>
      <p className="text-sm text-slate-100 font-medium leading-snug">{item.title}</p>
      <div className="flex flex-wrap gap-1.5">
        {item.pillar && <span className={`badge ${PILLAR_BADGE[item.pillar]}`}>{PILLAR_LABELS[item.pillar]}</span>}
        {item.format && <span className="badge bg-surface-700 text-slate-400">{FORMAT_LABELS[item.format]}</span>}
      </div>
      {item.connection && <p className="text-[11px] text-slate-400 italic">🔗 {item.connection}</p>}
      <div className="pt-1">
        {inPipeline ? (
          <span className="text-[11px] text-emerald-400">✓ No pipeline</span>
        ) : (
          <button onClick={() => send.mutate(item.id)} disabled={send.isPending} className="btn-ghost text-[11px]">
            {send.isPending ? 'Enviando…' : '→ Enviar para o pipeline'}
          </button>
        )}
      </div>
    </div>
  );
}

function CalendarDetailView({ id }: { id: string }) {
  const { data, isLoading } = useCalendar(id);
  if (isLoading || !data) return <p className="text-slate-500 text-sm">Carregando calendário…</p>;

  const weeks = Array.from({ length: data.weeks }, (_, i) => i + 1);
  const itemsByWeek = (w: number) => {
    const start = new Date(data.startDate).getTime() + (w - 1) * 7 * 86400000;
    const end = start + 7 * 86400000;
    return data.items.filter((it) => {
      const t = new Date(it.scheduledFor).getTime();
      return t >= start && t < end;
    });
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 space-y-2">
        <h3 className="text-base font-bold text-white">{data.title}</h3>
        <p className="text-sm text-slate-400">{data.objective}</p>
        {data.theme && <p className="text-sm text-ai-300">🧵 Fio condutor: {data.theme}</p>}
        <MixBar items={data.items} />
      </div>
      {weeks.map((w) => {
        const weekItems = itemsByWeek(w);
        if (!weekItems.length) return null;
        return (
          <div key={w}>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Semana {w}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {weekItems.map((it) => <ItemCard key={it.id} item={it} calendarId={data.id} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const { data: calendars = [] } = useCalendars();
  const generate = useGenerateCalendar();
  const del = useDeleteCalendar();
  const aiStatus = useAIStatus();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    objective: '',
    startDate: todayISO(),
    weeks: 2,
    postsPerWeek: 3,
    video: true,
    estatico: true,
    notes: '',
  });

  function generateNow() {
    const contentTypes = [
      ...(form.video ? [ContentType.VIDEO] : []),
      ...(form.estatico ? [ContentType.ESTATICO] : []),
    ];
    if (!contentTypes.length) return;
    generate.mutate(
      {
        title: form.title,
        objective: form.objective,
        startDate: form.startDate,
        weeks: form.weeks,
        postsPerWeek: form.postsPerWeek,
        contentTypes,
        notes: form.notes || undefined,
      },
      { onSuccess: (cal) => setSelectedId(cal.id) },
    );
  }

  const aiOff = aiStatus.data && !aiStatus.data.enabled;
  const canGenerate = form.title.trim() && form.objective.trim() && (form.video || form.estatico);

  return (
    <div className="flex flex-col h-screen bg-surface-950">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* Coluna esquerda: gerador + lista */}
          <div className="space-y-4">
            <div className="surface-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-white">✦ Gerar calendário</h2>
              {aiOff && <p className="text-[11px] text-amber-300">IA indisponível (sem chave). Configure o backend para gerar.</p>}
              <div>
                <label className="label-base">Título</label>
                <input className="input-base !py-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Lançamento mês 1" />
              </div>
              <div>
                <label className="label-base">Objetivo / tema</label>
                <textarea className="input-base min-h-[60px]" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="O que essa sequência precisa provocar?" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label-base">Início</label>
                  <input type="date" className="input-base !py-1.5" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="label-base">Semanas</label>
                  <input type="number" min={1} max={12} className="input-base !py-1.5" value={form.weeks} onChange={(e) => setForm({ ...form, weeks: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label-base">Posts/sem</label>
                  <input type="number" min={1} max={14} className="input-base !py-1.5" value={form.postsPerWeek} onChange={(e) => setForm({ ...form, postsPerWeek: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.video} onChange={(e) => setForm({ ...form, video: e.target.checked })} /> Vídeo</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.estatico} onChange={(e) => setForm({ ...form, estatico: e.target.checked })} /> Estático</label>
              </div>
              <div>
                <label className="label-base">Observações (opcional)</label>
                <textarea className="input-base min-h-[44px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button onClick={generateNow} disabled={!canGenerate || generate.isPending || aiOff} className="btn-ai text-sm w-full">
                {generate.isPending ? 'Gerando…' : '✦ Gerar com IA'}
              </button>
              {generate.isError && <p className="text-[11px] text-rose-300">{(generate.error as Error)?.message ?? 'Falha ao gerar.'}</p>}
              <p className="text-[10px] text-slate-500">Total: {form.weeks * form.postsPerWeek} posts. A IA respeita o mix 60/25/15 e conecta as peças.</p>
            </div>

            <div className="surface-card p-4 space-y-2">
              <h2 className="text-sm font-bold text-white">Calendários</h2>
              {calendars.length === 0 && <p className="text-[11px] text-slate-500">Nenhum calendário ainda.</p>}
              {calendars.map((c) => (
                <div key={c.id} className={`rounded-lg px-3 py-2 cursor-pointer border ${selectedId === c.id ? 'border-brand-500/50 bg-surface-800' : 'border-surface-700 hover:bg-surface-800/60'}`} onClick={() => setSelectedId(c.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-100 truncate">{c.title}</p>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir este calendário?')) { del.mutate(c.id); if (selectedId === c.id) setSelectedId(null); } }} className="text-slate-500 hover:text-rose-300 text-xs">✕</button>
                  </div>
                  <p className="text-[10px] text-slate-500">{c._count.items} posts · {c.weeks} sem · {c.postsPerWeek}/sem</p>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna direita: detalhe */}
          <div>
            {selectedId ? (
              <CalendarDetailView id={selectedId} />
            ) : (
              <div className="surface-card p-8 text-center text-slate-500 text-sm">
                Gere um calendário ou selecione um existente para ver a sequência de posts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
