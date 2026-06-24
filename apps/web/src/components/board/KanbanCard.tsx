import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils.js';
import { useUIStore } from '../../store/ui.js';
import { PILLAR_LABELS, PILLAR_BADGE, CLASS_BADGE, VERDICT_BADGE } from '../../lib/labels.js';
import type { CardSummary } from '../../hooks/useBoard.js';

interface Props {
  card: CardSummary;
  dragging?: boolean;
}

export default function KanbanCard({ card, dragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const setOpenCard = useUIStore((s) => s.setOpenCard);

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setOpenCard(card.id)}
      className={cn(
        'group bg-surface-800 rounded-lg border border-surface-700 p-3 cursor-pointer select-none',
        'hover:border-brand-500/60 hover:bg-surface-700/60 transition-all',
        (isDragging || dragging) && 'opacity-90 border-brand-500 shadow-glow rotate-1',
      )}
    >
      <p className="text-[13px] font-medium text-slate-100 line-clamp-2 mb-2 leading-snug">{card.title}</p>

      <div className="flex flex-wrap gap-1">
        {card.pillar && (
          <span className={cn('badge', PILLAR_BADGE[card.pillar] ?? 'bg-surface-700 text-slate-400')}>
            {PILLAR_LABELS[card.pillar] ?? card.pillar}
          </span>
        )}
        {card.validation && (
          <span className={cn('badge', VERDICT_BADGE[card.validation.verdict] ?? 'bg-surface-700 text-slate-400')}>
            {card.validation.total}/18
          </span>
        )}
        {card.contentClass && (
          <span className={cn('badge', CLASS_BADGE[card.contentClass] ?? 'bg-surface-700 text-slate-400')}>
            {card.contentClass}
          </span>
        )}
      </div>

      {card.assignee && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-surface-700/60">
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-brand-600/30 text-brand-300 text-[8px] font-bold">
            {card.assignee.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-[10px] text-slate-500">{card.assignee.name}</span>
        </div>
      )}
    </div>
  );
}
