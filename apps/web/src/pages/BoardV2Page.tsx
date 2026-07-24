import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { V2_STAGE_ORDER, V2Stage } from '@content-engine/shared';
import { useV2Cards, useUpdateV2Card, type V2Card } from '../hooks/useV2.js';
import AppHeader from '../components/AppHeader.js';
import FunnelWizard from '../components/v2/FunnelWizard.js';
import V2CardDrawer from '../components/v2/V2CardDrawer.js';
import { useAIStatus } from '../hooks/useAI.js';
import { V2_STAGE_LABELS, V2_STAGE_ACCENT } from '../lib/labels.js';

function V2CardTile({ card, onClick }: { card: V2Card; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`surface-card bg-surface-850 p-2.5 cursor-grab active:cursor-grabbing hover:border-surface-600 transition-colors ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="text-sm text-slate-100 font-medium line-clamp-2">{card.title}</p>
      {card.focus && <span className="badge bg-ai-600/15 text-ai-300 border border-ai-500/30 mt-1.5 inline-block">{card.focus}</span>}
      {card.copy && <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 whitespace-pre-wrap">{card.copy}</p>}
    </div>
  );
}

function V2Column({ stage, cards, onOpen }: { stage: V2Stage; cards: V2Card[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const accent = V2_STAGE_ACCENT[stage];
  return (
    <div className={`w-72 shrink-0 rounded-2xl bg-white/[0.02] border flex flex-col ${isOver ? 'border-brand-500/50 shadow-glow' : 'border-white/[0.05]'}`}>
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-white/[0.05]">
        <span className={`h-2 w-2 rounded-full ${accent?.dot ?? 'bg-slate-500'}`} />
        <span className="text-xs font-semibold text-slate-200">{V2_STAGE_LABELS[stage]}</span>
        <span className="ml-auto text-[11px] text-slate-500 tabular-nums">{cards.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 min-h-[120px]">
        {cards.map((c) => <V2CardTile key={c.id} card={c} onClick={() => onOpen(c.id)} />)}
        {!cards.length && (
          <p className="text-[11px] text-slate-600 text-center py-6 border border-dashed border-surface-700 rounded-lg">vazio</p>
        )}
      </div>
    </div>
  );
}

export default function BoardV2Page() {
  const { data: cards = [], isLoading } = useV2Cards();
  const update = useUpdateV2Card();
  const aiStatus = useAIStatus();
  const [showFunnel, setShowFunnel] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<V2Card | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const columns = [...V2_STAGE_ORDER, V2Stage.ARQUIVADO];
  const byStage = (s: V2Stage) => cards.filter((c) => c.stage === s);
  const openCard = cards.find((c) => c.id === openId) ?? null;

  function handleDragStart(e: DragStartEvent) {
    setActiveCard(cards.find((c) => c.id === e.active.id) ?? null);
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;
    const card = cards.find((c) => c.id === active.id);
    const to = String(over.id) as V2Stage;
    if (!card || card.stage === to) return;
    update.mutate({ id: card.id, stage: to });
  }

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />

      <div className="bg-surface-900/40 backdrop-blur-md border-b border-white/[0.06] px-4 py-2 flex items-center gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white font-display">BOARD V2</h2>
          <p className="text-[11px] text-slate-500">Funil de criação com IA → copy pronta</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1 tabular-nums">{cards.length} cards</span>
          <button
            onClick={() => setShowFunnel(true)}
            disabled={aiStatus.data && !aiStatus.data.enabled}
            title={aiStatus.data && !aiStatus.data.enabled ? 'IA indisponível' : ''}
            className="btn-ai text-sm disabled:opacity-40"
          >✦ Criar com IA</button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm animate-pulse">Carregando…</div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 p-4 h-full">
              {columns.map((s) => <V2Column key={s} stage={s} cards={byStage(s)} onOpen={setOpenId} />)}
            </div>
            <DragOverlay>{activeCard && (
              <div className="surface-card bg-surface-850 p-2.5 shadow-glow rotate-2 w-64">
                <p className="text-sm text-slate-100 font-medium line-clamp-2">{activeCard.title}</p>
              </div>
            )}</DragOverlay>
          </DndContext>
        )}
      </div>

      {showFunnel && <FunnelWizard onClose={() => setShowFunnel(false)} />}
      {openCard && <V2CardDrawer card={openCard} onClose={() => setOpenId(null)} />}
    </div>
  );
}
