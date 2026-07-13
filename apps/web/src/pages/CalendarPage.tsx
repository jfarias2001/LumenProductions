import { useState } from 'react';
import { Pillar, PILLAR_GROUP_MAP, MIX_TARGETS } from '@content-engine/shared';
import {
  useCalendars,
  useCalendar,
  useAllCalendarItems,
  useGenerateCalendar,
  useSendCalendarItem,
  useSetItemAd,
  useAutoProduceCalendar,
  useDeleteCalendar,
  type CalendarItem,
} from '../hooks/useCalendar.js';
import { useAIStatus } from '../hooks/useAI.js';
import { PILLAR_LABELS, PILLAR_BADGE, FORMAT_LABELS, CONTENT_TYPE_LABELS, STATIC_FORMAT_LABELS } from '../lib/labels.js';
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
  const setAd = useSetItemAd(calendarId);
  const inPipeline = !!item.cardId;
  return (
    <div className={`surface-card p-3 space-y-1.5 ${item.isAd ? 'ring-1 ring-amber-500/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-slate-500">{fmtDate(item.scheduledFor)}</span>
        <span className="badge bg-surface-700 text-slate-300">{CONTENT_TYPE_LABELS[item.contentType]}</span>
      </div>
      <p className="text-sm text-slate-100 font-medium leading-snug">{item.title}</p>
      <div className="flex flex-wrap gap-1.5">
        {item.isAd && <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/40">📣 Anúncio</span>}
        {item.pillar && <span className={`badge ${PILLAR_BADGE[item.pillar]}`}>{PILLAR_LABELS[item.pillar]}</span>}
        {item.format && <span className="badge bg-surface-700 text-slate-400">{FORMAT_LABELS[item.format]}</span>}
        {item.staticFormat && <span className="badge bg-surface-700 text-slate-400">{STATIC_FORMAT_LABELS[item.staticFormat]}</span>}
      </div>
      {item.connection && <p className="text-[11px] text-slate-400 italic">🔗 {item.connection}</p>}
      <div className="pt-1 flex items-center justify-between gap-2">
        {inPipeline ? (
          <span className="text-[11px] text-emerald-400">✓ No pipeline</span>
        ) : (
          <button onClick={() => send.mutate(item.id)} disabled={send.isPending} className="btn-ghost text-[11px]">
            {send.isPending ? 'Enviando…' : '→ Enviar para o pipeline'}
          </button>
        )}
        <button
          onClick={() => setAd.mutate({ itemId: item.id, isAd: !item.isAd })}
          disabled={setAd.isPending}
          className={`text-[11px] ${item.isAd ? 'text-amber-300 hover:text-amber-200' : 'text-slate-500 hover:text-slate-300'}`}
          title="Anúncios recebem copy de conversão + edição focada em Meta Ads"
        >
          {item.isAd ? '✓ Anúncio' : '📣 Marcar anúncio'}
        </button>
      </div>
    </div>
  );
}

function CalendarDetailView({ id, aiOff }: { id: string; aiOff: boolean }) {
  const { data, isLoading } = useCalendar(id);
  const autoProduce = useAutoProduceCalendar(id);
  const [detailView, setDetailView] = useState<'list' | 'calendar'>('calendar');
  if (isLoading || !data) return <p className="text-slate-500 text-sm">Carregando calendário…</p>;

  const pending = data.items.filter((it) => !it.cardId).length;
  const result = autoProduce.data;
  const startMs = new Date(data.startDate).getTime();
  const lastMs = data.items.length
    ? Math.max(...data.items.map((it) => new Date(it.scheduledFor).getTime()))
    : startMs;
  const weekCount = Math.max(1, Math.floor((lastMs - startMs) / (7 * 86400000)) + 1);
  const weeks = Array.from({ length: weekCount }, (_, i) => i + 1);
  const itemsByWeek = (w: number) => {
    const start = startMs + (w - 1) * 7 * 86400000;
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
        <div className="pt-2 border-t border-surface-700 space-y-1.5">
          <button
            onClick={() => autoProduce.mutate()}
            disabled={autoProduce.isPending || aiOff || pending === 0}
            className="btn-ai text-sm w-full"
            title={aiOff ? 'IA indisponível' : pending === 0 ? 'Todos os itens já têm card' : ''}
          >
            {autoProduce.isPending ? 'Produzindo tudo… (pode levar alguns minutos)' : `✦ Produzir tudo com IA (${pending} ${pending === 1 ? 'item' : 'itens'})`}
          </button>
          <p className="text-[10px] text-slate-500">
            Cria o card de cada item sem card, gera ideia → ângulos/hooks → roteiro → direção → copy e avança até a validação (que continua exigindo revisão humana).
          </p>
          {autoProduce.isError && <p className="text-[11px] text-rose-300">{(autoProduce.error as Error)?.message ?? 'Falha na auto-produção.'}</p>}
          {result && (
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <p className="text-emerald-400">✓ {result.produced} produzido(s) · {result.skipped} já no pipeline · {result.failed} falha(s).</p>
              {result.errors.map((e) => (
                <p key={e.itemId} className="text-rose-300">• {e.title}: {e.message}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alternância Calendário (grade mensal) ↔ Lista (por semana) */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setDetailView('calendar')}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${detailView === 'calendar' ? 'bg-brand-600/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
        >📅 Calendário</button>
        <button
          onClick={() => setDetailView('list')}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${detailView === 'list' ? 'bg-brand-600/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
        >☰ Lista</button>
      </div>

      {detailView === 'calendar' ? (
        <CalendarMonthView items={data.items} startDate={data.startDate} />
      ) : (
        weeks.map((w) => {
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
        })
      )}
    </div>
  );
}

// ── Visualização em grade mensal (PRD-011) ────────────────────────────────────
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const monthTitleFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

/** Chave YYYY-MM-DD no fuso local (agrupa itens por dia). */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Rótulo curto do formato para a grade (mês). */
function shortFormat(item: CalendarItem): string {
  if (item.isAd) return '📣 Anúncio';
  if (item.contentType === 'ESTATICO') return item.staticFormat === 'CARROSSEL' ? 'Carrossel' : 'Imagem';
  return 'Reel';
}

/** Item da grade: um CalendarItem que PODE trazer o calendário de origem (visão geral). */
type MonthItem = CalendarItem & { calendar?: { id: string; title: string } };

function CalendarMonthView({ items, startDate }: { items: MonthItem[]; startDate?: string }) {
  const [cursor, setCursor] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Agrupa itens por dia.
  const byDay = new Map<string, MonthItem[]>();
  for (const it of items) {
    const k = dayKey(new Date(it.scheduledFor));
    const arr = byDay.get(k);
    if (arr) arr.push(it); else byDay.set(k, [it]);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(new Date());

  // Células: preenchimento inicial vazio + dias do mês.
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="btn-ghost text-sm px-2 py-1">‹</button>
        <h4 className="text-sm font-semibold text-white capitalize">{monthTitleFmt.format(cursor)}</h4>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="btn-ghost text-sm px-2 py-1">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-semibold text-slate-500 uppercase py-1">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="min-h-[76px] rounded-lg bg-surface-900/40" />;
          const k = dayKey(new Date(year, month, day));
          const dayItems = byDay.get(k) ?? [];
          const isToday = k === todayKey;
          return (
            <div key={k} className={`min-h-[76px] rounded-lg border p-1 space-y-0.5 ${isToday ? 'border-brand-500/60 bg-brand-600/5' : 'border-surface-700 bg-surface-850'}`}>
              <div className={`text-[10px] font-medium ${isToday ? 'text-brand-300' : 'text-slate-500'}`}>{day}</div>
              {dayItems.map((it) => (
                <div
                  key={it.id}
                  title={`${it.title} — ${shortFormat(it)}${it.calendar ? ` · ${it.calendar.title}` : ''}${it.cardId ? ' (no pipeline)' : ''}`}
                  className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate border-l-2 ${it.isAd ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'bg-surface-800 text-slate-300'} ${PILLAR_DOT[it.pillar ?? ''] ?? ''}`}
                >
                  {it.cardId ? '✓ ' : ''}{it.isAd ? '📣 ' : ''}{it.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 pt-1 border-t border-surface-700">
        <span>✓ = já no pipeline</span>
        <span>📣 = anúncio</span>
        <span>Borda colorida = pilar</span>
      </div>
    </div>
  );
}

// ── Visão geral: grade mensal com os itens de TODOS os calendários (PRD-013) ──────
function GeneralCalendarView() {
  const { data: items = [], isLoading } = useAllCalendarItems();
  if (isLoading) return <p className="text-slate-500 text-sm">Carregando calendário geral…</p>;
  if (!items.length) {
    return (
      <div className="surface-card p-8 text-center text-slate-500 text-sm">
        Nenhum evento ainda. Gere um calendário para começar a preencher a agenda.
      </div>
    );
  }
  // Mês inicial = mês do evento mais próximo de hoje (mais útil ao abrir).
  const now = Date.now();
  const nearest = items.reduce(
    (best, it) => {
      const dist = Math.abs(new Date(it.scheduledFor).getTime() - now);
      return dist < best.dist ? { dist, iso: it.scheduledFor } : best;
    },
    { dist: Infinity, iso: items[0]!.scheduledFor },
  );
  return (
    <div className="space-y-3">
      <div className="surface-card p-4 space-y-1">
        <h3 className="text-base font-bold text-white">📅 Calendário geral</h3>
        <p className="text-sm text-slate-400">
          Eventos de todos os calendários ({items.length}). Selecione um calendário à esquerda para editar ou produzir os itens dele.
        </p>
      </div>
      <CalendarMonthView items={items} startDate={nearest.iso} />
    </div>
  );
}

/** Cor de borda-esquerda por pilar (grade mensal). */
const PILLAR_DOT: Record<string, string> = {
  DOR_DONO_AGENCIA: 'border-l-rose-400',
  QUEBRA_CRENCA: 'border-l-orange-400',
  OPORTUNIDADE_TICKET: 'border-l-emerald-400',
  PRODUTO_MECANISMO: 'border-l-brand-400',
  PROVA_BASTIDORES: 'border-l-cyan-400',
  OBJECOES: 'border-l-amber-400',
  AUTORIDADE: 'border-l-violet-400',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoPlusDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
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
    endDate: isoPlusDays(14),
    videoCount: 2,
    postCount: 2,
    carrosselCount: 1,
    adVideoCount: 0,
    notes: '',
  });

  const total = form.videoCount + form.postCount + form.carrosselCount + form.adVideoCount;

  function generateNow() {
    if (total < 1) return;
    generate.mutate(
      {
        title: form.title,
        objective: form.objective,
        startDate: form.startDate,
        endDate: form.endDate,
        videoCount: form.videoCount,
        postCount: form.postCount,
        carrosselCount: form.carrosselCount,
        adVideoCount: form.adVideoCount,
        notes: form.notes || undefined,
      },
      { onSuccess: (cal) => setSelectedId(cal.id) },
    );
  }

  const aiOff = aiStatus.data && !aiStatus.data.enabled;
  const validPeriod = new Date(form.endDate) >= new Date(form.startDate);
  const canGenerate = form.title.trim() && form.objective.trim() && total >= 1 && total <= 60 && validPeriod;

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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-base">Início</label>
                  <input type="date" className="input-base !py-1.5" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="label-base">Fim</label>
                  <input type="date" min={form.startDate} className="input-base !py-1.5" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              {!validPeriod && <p className="text-[11px] text-rose-300">A data fim deve ser igual ou posterior à data início.</p>}
              <div>
                <label className="label-base">Quantidade por tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Vídeos</span>
                    <input type="number" min={0} max={60} className="input-base !py-1.5" value={form.videoCount} onChange={(e) => setForm({ ...form, videoCount: Math.max(0, Number(e.target.value)) })} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Posts</span>
                    <input type="number" min={0} max={60} className="input-base !py-1.5" value={form.postCount} onChange={(e) => setForm({ ...form, postCount: Math.max(0, Number(e.target.value)) })} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Carrosséis</span>
                    <input type="number" min={0} max={60} className="input-base !py-1.5" value={form.carrosselCount} onChange={(e) => setForm({ ...form, carrosselCount: Math.max(0, Number(e.target.value)) })} />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-amber-300">📣 Vídeos de anúncio (Meta Ads)</span>
                  <input type="number" min={0} max={60} className="input-base !py-1.5" value={form.adVideoCount} onChange={(e) => setForm({ ...form, adVideoCount: Math.max(0, Number(e.target.value)) })} />
                  <p className="text-[10px] text-slate-500 mt-0.5">Vídeos focados em conversão: copy de resposta direta + edição p/ tráfego pago.</p>
                </div>
              </div>
              <div>
                <label className="label-base">Observações (opcional)</label>
                <textarea className="input-base min-h-[44px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button onClick={generateNow} disabled={!canGenerate || generate.isPending || aiOff} className="btn-ai text-sm w-full">
                {generate.isPending ? 'Gerando…' : '✦ Gerar com IA'}
              </button>
              {generate.isError && <p className="text-[11px] text-rose-300">{(generate.error as Error)?.message ?? 'Falha ao gerar.'}</p>}
              <p className="text-[10px] text-slate-500">Total: {total} {total === 1 ? 'peça' : 'peças'} no período. A IA respeita o mix 60/25/15 e conecta as peças.</p>
            </div>

            <div className="surface-card p-4 space-y-2">
              <h2 className="text-sm font-bold text-white">Calendários</h2>
              {/* Visão geral unificada (todos os calendários) — ativa ao abrir a seção. */}
              <div
                className={`rounded-lg px-3 py-2 cursor-pointer border ${selectedId === null ? 'border-brand-500/50 bg-surface-800' : 'border-surface-700 hover:bg-surface-800/60'}`}
                onClick={() => setSelectedId(null)}
              >
                <p className="text-sm text-slate-100">📅 Geral (todos)</p>
                <p className="text-[10px] text-slate-500">Eventos de todos os calendários</p>
              </div>
              {calendars.length === 0 && <p className="text-[11px] text-slate-500">Nenhum calendário ainda.</p>}
              {calendars.map((c) => (
                <div key={c.id} className={`rounded-lg px-3 py-2 cursor-pointer border ${selectedId === c.id ? 'border-brand-500/50 bg-surface-800' : 'border-surface-700 hover:bg-surface-800/60'}`} onClick={() => setSelectedId(c.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-100 truncate">{c.title}</p>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir este calendário?')) { del.mutate(c.id); if (selectedId === c.id) setSelectedId(null); } }} className="text-slate-500 hover:text-rose-300 text-xs">✕</button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {c._count.items} {c._count.items === 1 ? 'peça' : 'peças'}
                    {c.endDate ? ` · ${fmtDate(c.startDate)}–${fmtDate(c.endDate)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna direita: detalhe */}
          <div>
            {selectedId ? <CalendarDetailView id={selectedId} aiOff={!!aiOff} /> : <GeneralCalendarView />}
          </div>
        </div>
      </div>
    </div>
  );
}
