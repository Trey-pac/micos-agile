import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PlanningTaskCard from './PlanningTaskCard';

export default function SortablePlanningCard({ task, isDragOverlay, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'planning-task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  };

  // Overlay version: rendered inside DragOverlay, no sortable behavior
  if (isDragOverlay) {
    return (
      <div className="rotate-2 shadow-2xl scale-105">
        <PlanningTaskCard task={task} {...props} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
      aria-roledescription="sortable planning card"
      data-planning-card
    >
      <PlanningTaskCard task={task} {...props} />
    </div>
  );
}
