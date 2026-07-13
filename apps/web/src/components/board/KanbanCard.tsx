import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils.js';
import { useUIStore } from '../../store/ui.js';
import {
  PILLAR_LABELS,
  PILLAR_BADGE,
  PILLAR_BORDER,
  CLASS_BADGE,
  VERDICT_BADGE,
  publicationFormatLabel,
  publicationFormatGlyph,
} from '../../lib/labels.js';
import type { CardSummary } from '../../hooks/useBoard.js';

interface Props {
  card: CardSummary;
  dragging?: boolean;
}

export default function KanbanCard({ card, dragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const setOpenCard = useUIStore((s) => s.setOpenCard);

  const style = { transform: CSS.Transform.toString(transform), transition };
  const pillarEdge = card.pillar ? PILLAR_BORDER[card.pillar] : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setOpenCard(card.id)}
      className={cn(
        'group bg-surface-800/90 backdrop-blur-sm rounded-xl border border-white/[0.06] border-l-[3px] p-3 cursor-pointer select-none',
        'shadow-card hover:-translate-y-0.5 hover:shadow-card-hover hover:border-brand-400/40 transition-all duration-200',
        pillarEdge ?? 'border-l-white/[0.08]',
        (isDragging || dragging) && 'opacity-90 border-brand-400 shadow-glow rotate-2',
      )}
    >
      <p className="text-[13px] font-medium text-slate-100 line-clamp-2 mb-2 leading-snug">{card.title}</p>

      <div className="flex flex-wrap gap-1">
        {/* Formato da publicação (PRD-011) */}
        <span className="badge bg-white/[0.05] text-slate-300">
          <span className="text-[8px] mr-1 opacity-70">{publicationFormatGlyph(card)}</span>
          {publicationFormatLabel(card)}
        </span>
        {card.isAd && (
          <span className="badge bg-amber-500/15 text-amber-300 ring-amber-500/40">📣 Anúncio</span>
        )}
        {card.pillar && (
          <span className={cn('badge', PILLAR_BADGE[card.pillar] ?? 'bg-white/[0.05] text-slate-400')}>
            {PILLAR_LABELS[card.pillar] ?? card.pillar}
          </span>
        )}
        {card.validation && (
          <span className={cn('badge', VERDICT_BADGE[card.validation.verdict] ?? 'bg-white/[0.05] text-slate-400')}>
            {card.validation.total}/18
          </span>
        )}
        {card.contentClass && (
          <span className={cn('badge', CLASS_BADGE[card.contentClass] ?? 'bg-white/[0.05] text-slate-400')}>
            {card.contentClass}
          </span>
        )}
      </div>

      {card.assignee && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/[0.05]">
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-brand-500/25 ring-1 ring-brand-400/40 text-brand-200 text-[8px] font-bold">
            {card.assignee.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-[10px] text-slate-500">{card.assignee.name}</span>
        </div>
      )}
    </div>
  );
}
