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

// Colunas que são gates de qualidade (revisão humana obrigatória)
const GATE_STAGES = ['IDEIAS_VALIDADAS', 'REVISAO_RETENCAO'];

export default function KanbanColumn({ stage, cards, isOver }: Props) {
  const { setNodeRef } = useDroppable({ id: stage });
  const isGate = GATE_STAGES.includes(stage);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[256px] max-w-[256px] rounded-xl border bg-surface-900/70 transition-colors',
        isOver ? 'border-brand-500 bg-brand-600/5 shadow-glow' : 'border-surface-700',
      )}
    >
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-surface-800">
        <div className="flex items-center gap-1.5 min-w-0">
          {isGate && <span className="text-amber-400 text-xs shrink-0" title="Gate de qualidade">⬡</span>}
          <span className="text-xs font-semibold text-slate-300 truncate">{STAGE_LABELS[stage]}</span>
        </div>
        <span className="text-[10px] text-slate-500 font-medium bg-surface-800 px-1.5 py-0.5 rounded-full shrink-0">{cards.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="text-center text-[11px] text-slate-600 py-6 select-none">vazio</div>
        )}
      </div>
    </div>
  );
}
