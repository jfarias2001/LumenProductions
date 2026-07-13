import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { STAGE_ORDER, Stage, Pillar, AwarenessLevel, ContentClass } from '@content-engine/shared';
import { useBoard, useTransitionCard } from '../hooks/useBoard.js';
import { useUIStore } from '../store/ui.js';
import KanbanColumn from '../components/board/KanbanColumn.js';
import KanbanCard from '../components/board/KanbanCard.js';
import CreateCardModal from '../components/board/CreateCardModal.js';
import CardDetail from '../components/card/CardDetail.js';
import AppHeader from '../components/AppHeader.js';
import { PILLAR_LABELS, AWARENESS_LABELS } from '../lib/labels.js';
import type { CardSummary } from '../hooks/useBoard.js';

export default function Board() {
  const { data: cards = [], isLoading } = useBoard();
  const transition = useTransitionCard();
  const { openCardId, setOpenCard, boardFilters, setFilter, clearFilters } = useUIStore();
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const cardsByStage = STAGE_ORDER.reduce<Record<Stage, CardSummary[]>>((acc, stage) => {
    acc[stage] = cards.filter((c) => c.stage === stage);
    return acc;
  }, {} as Record<Stage, CardSummary[]>);

  const hasFilters = Object.values(boardFilters).some(Boolean);

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
    setGateError(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const over = event.over?.id ? String(event.over.id) : null;
    setOverStage(over && STAGE_ORDER.includes(over as Stage) ? (over as Stage) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    setOverStage(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cardId = String(active.id);
    const toStage = String(over.id) as Stage;
    if (!STAGE_ORDER.includes(toStage as Stage)) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.stage === toStage) return;

    transition.mutate(
      { cardId, to: toStage },
      {
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Transição bloqueada.';
          setGateError(msg);
          setTimeout(() => setGateError(null), 4000);
        },
      },
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <AppHeader />

      {/* Toolbar */}
      <div className="bg-surface-900/40 backdrop-blur-md border-b border-white/[0.06] px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
        <input
          className="input-base !w-56 !py-1.5"
          placeholder="Buscar por título…"
          value={boardFilters.search ?? ''}
          onChange={(e) => setFilter('search', e.target.value || undefined)}
        />
        <select className="input-base !w-auto !py-1.5" value={boardFilters.pillar ?? ''} onChange={(e) => setFilter('pillar', e.target.value || undefined)}>
          <option value="">Todos os pilares</option>
          {Object.values(Pillar).map((p) => <option key={p} value={p}>{PILLAR_LABELS[p]}</option>)}
        </select>
        <select className="input-base !w-auto !py-1.5" value={boardFilters.awareness ?? ''} onChange={(e) => setFilter('awareness', e.target.value || undefined)}>
          <option value="">Toda consciência</option>
          {Object.values(AwarenessLevel).map((a) => <option key={a} value={a}>{AWARENESS_LABELS[a]}</option>)}
        </select>
        <select className="input-base !w-auto !py-1.5" value={boardFilters.contentClass ?? ''} onChange={(e) => setFilter('contentClass', e.target.value || undefined)}>
          <option value="">Toda classe</option>
          {Object.values(ContentClass).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {hasFilters && <button onClick={clearFilters} className="btn-ghost text-xs">Limpar</button>}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1 tabular-nums">
            {cards.length} cards
          </span>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <span className="text-base leading-none">+</span> Novo Card
          </button>
        </div>
      </div>

      {/* Gate error toast */}
      {gateError && (
        <div className="fixed bottom-4 right-4 bg-surface-900/90 backdrop-blur-md border border-rose-500/40 text-rose-200 text-sm px-4 py-3 rounded-2xl z-50 max-w-sm animate-slide-in shadow-[0_0_0_1px_rgba(244,63,94,0.15),0_8px_32px_-8px_rgba(244,63,94,0.35)]">
          <strong className="text-rose-300">⬡ Transição bloqueada:</strong> {gateError}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm animate-pulse">Carregando board…</div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 p-4 h-full">
              {STAGE_ORDER.map((stage) => (
                <KanbanColumn key={stage} stage={stage} cards={cardsByStage[stage] ?? []} isOver={overStage === stage} />
              ))}
            </div>
            <DragOverlay>{activeCard && <KanbanCard card={activeCard} dragging />}</DragOverlay>
          </DndContext>
        )}
      </div>

      {showCreate && <CreateCardModal onClose={() => setShowCreate(false)} />}
      {openCardId && <CardDetail cardId={openCardId} onClose={() => setOpenCard(null)} />}
    </div>
  );
}
