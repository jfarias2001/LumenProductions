import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { STAGE_ORDER, Stage } from '@content-engine/shared';
import { useBoard, useTransitionCard } from '../hooks/useBoard.js';
import { useUIStore } from '../store/ui.js';
import { useAuthStore } from '../store/auth.js';
import KanbanColumn from '../components/board/KanbanColumn.js';
import KanbanCard from '../components/board/KanbanCard.js';
import CardDetail from '../components/card/CardDetail.js';
import type { CardSummary } from '../hooks/useBoard.js';

export default function Board() {
  const { data: cards = [], isLoading } = useBoard();
  const transition = useTransitionCard();
  const { openCardId, setOpenCard } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const cardsByStage = STAGE_ORDER.reduce<Record<Stage, CardSummary[]>>((acc, stage) => {
    acc[stage] = cards.filter((c) => c.stage === stage);
    return acc;
  }, {} as Record<Stage, CardSummary[]>);

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
    setGateError(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cardId = String(active.id);
    const toStage = String(over.id) as Stage;

    // Only accept drops on column droppables (stage IDs)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-400">Carregando board…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">Content Engine</h1>
          <span className="text-xs text-gray-400">Lumen Digital</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{user?.role}</span>
          <button onClick={() => void logout()} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Sair
          </button>
        </div>
      </header>

      {/* Gate error toast */}
      {gateError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl shadow-lg z-50 max-w-sm">
          <strong>Transição bloqueada:</strong> {gateError}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 p-4 h-full">
            {STAGE_ORDER.map((stage) => (
              <KanbanColumn key={stage} stage={stage} cards={cardsByStage[stage] ?? []} />
            ))}
          </div>
          <DragOverlay>
            {activeCard && <KanbanCard card={activeCard} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card detail drawer */}
      {openCardId && <CardDetail cardId={openCardId} onClose={() => setOpenCard(null)} />}
    </div>
  );
}
