import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils.js';
import { useUIStore } from '../../store/ui.js';
import type { CardSummary } from '../../hooks/useBoard.js';

const VERDICT_COLOR: Record<string, string> = {
  SEGUIR_ROTEIRO: 'bg-green-100 text-green-700',
  MELHORAR_ANGULO: 'bg-amber-100 text-amber-700',
  DESCARTAR: 'bg-red-100 text-red-700',
};

const CLASS_COLOR: Record<string, string> = {
  VIRAL: 'bg-purple-100 text-purple-700',
  AUTORIDADE: 'bg-blue-100 text-blue-700',
  VENDEDOR: 'bg-green-100 text-green-700',
  FRACO: 'bg-gray-100 text-gray-500',
};

interface Props {
  card: CardSummary;
}

export default function KanbanCard({ card }: Props) {
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
        'bg-white rounded-lg border border-gray-200 p-3 cursor-pointer select-none hover:border-brand-300 hover:shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{card.title}</p>

      <div className="flex flex-wrap gap-1">
        {card.pillar && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
            {card.pillar.replace(/_/g, ' ')}
          </span>
        )}
        {card.validation && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', VERDICT_COLOR[card.validation.verdict] ?? 'bg-gray-100 text-gray-600')}>
            {card.validation.total}/18
          </span>
        )}
        {card.contentClass && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', CLASS_COLOR[card.contentClass] ?? '')}>
            {card.contentClass}
          </span>
        )}
      </div>

      {card.assignee && (
        <p className="text-[10px] text-gray-400 mt-1.5">{card.assignee.name}</p>
      )}
    </div>
  );
}
