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
import { useAuthStore } from '../store/auth.js';
import { useAIStatus } from '../hooks/useAI.js';
import KanbanColumn from '../components/board/KanbanColumn.js';
import KanbanCard from '../components/board/KanbanCard.js';
import CreateCardModal from '../components/board/CreateCardModal.js';
import CardDetail from '../components/card/CardDetail.js';
import { PILLAR_LABELS, AWARENESS_LABELS } from '../lib/labels.js';
import type { CardSummary } from '../hooks/useBoard.js';

export default function Board() {
  const { data: cards = [], isLoading } = useBoard();
  const transition = useTransitionCard();
  const { openCardId, setOpenCard, boardFilters, setFilter, clearFilters } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const aiStatus = useAIStatus();
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
    <div className="flex flex-col h-screen bg-surface-950">
      {/* Top bar */}
      <header className="bg-surface-900 border-b border-surface-700 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-ai-500 text-white font-bold text-sm">◑</div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-white">Content Engine</h1>
            <span className="text-[10px] text-slate-500">Lumen Digital</span>
          </div>
          {aiStatus.data && (
            <span className={`badge ml-2 ${aiStatus.data.enabled ? 'bg-ai-600/15 text-ai-400 border border-ai-500/40' : 'bg-surface-700 text-slate-400'}`}>
              {aiStatus.data.enabled ? '✦ IA ativa' : 'IA off'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-xs text-slate-200">{user?.name}</p>
            <p className="text-[10px] text-slate-500">{user?.role}</p>
          </div>
          <button onClick={() => void logout()} className="btn-ghost text-xs px-2 py-1.5">Sair</button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-surface-900/60 border-b border-surface-800 px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
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
          <span className="text-xs text-slate-500">{cards.length} cards</span>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <span className="text-base leading-none">+</span> Novo Card
          </button>
        </div>
      </div>

      {/* Gate error toast */}
      {gateError && (
        <div className="fixed bottom-4 right-4 bg-rose-500/10 border border-rose-500/40 text-rose-200 text-sm px-4 py-3 rounded-xl shadow-card z-50 max-w-sm animate-slide-in">
          <strong className="text-rose-300">Transição bloqueada:</strong> {gateError}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">Carregando board…</div>
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
