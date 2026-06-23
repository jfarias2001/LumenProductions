import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '../../lib/utils.js';
import KanbanCard from './KanbanCard.js';
import type { CardSummary } from '../../hooks/useBoard.js';
import type { Stage } from '@content-engine/shared';
import { STAGE_LABELS } from '@content-engine/shared';

interface Props {
  stage: Stage;
  cards: CardSummary[];
  isOver?: boolean;
}

const GATE_STAGES = ['IDEIAS_VALIDADAS', 'REVISAO_RETENCAO'];

export default function KanbanColumn({ stage, cards, isOver }: Props) {
  const { setNodeRef } = useDroppable({ id: stage });

  const isGate = GATE_STAGES.includes(stage);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[240px] max-w-[240px] rounded-xl border bg-gray-50',
        isOver ? 'border-brand-500 bg-brand-50' : 'border-gray-200',
        isGate && 'border-amber-300',
      )}
    >
      <div className={cn('px-3 py-2 border-b flex items-center justify-between', isGate ? 'border-amber-200' : 'border-gray-200')}>
        <div className="flex items-center gap-2">
          {isGate && <span className="text-amber-500 text-xs">⬡</span>}
          <span className="text-xs font-semibold text-gray-700 truncate">{STAGE_LABELS[stage]}</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">{cards.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
