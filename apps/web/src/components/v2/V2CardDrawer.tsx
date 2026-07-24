import { useState } from 'react';
import { V2_STAGE_ORDER, V2Stage } from '@content-engine/shared';
import { useUpdateV2Card, useDeleteV2Card, type V2Card } from '../../hooks/useV2.js';
import { V2_STAGE_LABELS } from '../../lib/labels.js';

/** Drawer de edição de um card do BOARD V2 (PRD-017): título/foco/copy/CTAs + coluna + excluir. */
export default function V2CardDrawer({ card, onClose }: { card: V2Card; onClose: () => void }) {
  const update = useUpdateV2Card();
  const del = useDeleteV2Card();
  const [title, setTitle] = useState(card.title);
  const [focus, setFocus] = useState(card.focus);
  const [copy, setCopy] = useState(card.copy);
  const [ctas, setCtas] = useState(card.ctas.join('\n'));

  function save() {
    update.mutate({
      id: card.id,
      title: title.trim(),
      focus: focus.trim(),
      copy,
      ctas: ctas.split('\n').map((l) => l.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="glass-overlay" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-xl bg-surface-900/95 backdrop-blur-xl border-l border-white/[0.08] shadow-card flex flex-col animate-slide-in">
        <div className="px-5 py-4 border-b border-surface-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="badge bg-brand-600/20 text-brand-300">BOARD V2</span>
            <select
              className="input-base !w-auto !py-1 text-xs"
              value={card.stage}
              onChange={(e) => update.mutate({ id: card.id, stage: e.target.value as V2Stage })}
            >
              {V2_STAGE_ORDER.map((s) => <option key={s} value={s}>{V2_STAGE_LABELS[s]}</option>)}
              <option value={V2Stage.ARQUIVADO}>{V2_STAGE_LABELS.ARQUIVADO}</option>
            </select>
          </div>
          <button onClick={onClose} className="btn-ghost text-lg leading-none px-2 py-1">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="label-base">Título</label>
            <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label-base">Foco</label>
            <input className="input-base" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Dor, Oferta, Prova…" />
          </div>
          <div>
            <label className="label-base">Ideia (origem)</label>
            <p className="text-xs text-slate-500 whitespace-pre-wrap surface-card bg-surface-850 p-2.5">{card.idea}</p>
          </div>
          <div>
            <label className="label-base">Copy</label>
            <textarea className="input-base h-48 resize-none text-sm" value={copy} onChange={(e) => setCopy(e.target.value)} />
          </div>
          <div>
            <label className="label-base">CTAs (uma por linha)</label>
            <textarea className="input-base h-20 resize-none text-sm" value={ctas} onChange={(e) => setCtas(e.target.value)} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-surface-700 flex items-center gap-2 shrink-0 bg-surface-900/95">
          <button className="btn-primary text-xs" onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            className="btn-ghost text-xs text-rose-300 ml-auto"
            onClick={() => { if (confirm('Excluir este card?')) del.mutate(card.id, { onSuccess: onClose }); }}
          >Excluir</button>
        </div>
      </div>
    </div>
  );
}
