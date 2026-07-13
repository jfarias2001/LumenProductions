import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '../../lib/utils.js';
import KanbanCard from './KanbanCard.js';
import { STAGE_ACCENT } from '../../lib/labels.js';
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
  const accent = STAGE_ACCENT[stage] ?? { dot: 'bg-slate-500', bar: 'from-slate-500/70' };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[256px] max-w-[256px] rounded-2xl border overflow-hidden transition-all duration-200',
        isOver
          ? 'border-brand-400/60 bg-brand-500/[0.06] shadow-glow'
          : 'border-white/[0.05] bg-white/[0.02]',
      )}
    >
      {/* Hairline de acento do estágio */}
      <div className={cn('h-px bg-gradient-to-r to-transparent shrink-0', accent.bar)} />

      <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', accent.dot)} />
          <span className="text-xs font-semibold text-slate-300 truncate">{STAGE_LABELS[stage]}</span>
          {isGate && <span className="text-amber-400/90 text-[10px] shrink-0" title="Gate de qualidade">⬡</span>}
        </div>
        <span className="text-[10px] text-slate-400 font-display font-semibold tabular-nums bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded-full shrink-0">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div
            className={cn(
              'text-center text-[11px] py-6 select-none rounded-xl border border-dashed transition-colors',
              isOver ? 'border-brand-400/50 text-brand-300' : 'border-white/[0.06] text-slate-600',
            )}
          >
            {isOver ? 'solte aqui' : 'vazio'}
          </div>
        )}
      </div>
    </div>
  );
}
