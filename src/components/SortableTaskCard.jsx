import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';

export default function SortableTaskCard({ task, isDragOverlay, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Overlay version: rendered inside DragOverlay, no sortable behavior
  if (isDragOverlay) {
    return (
      <div className="rotate-2 shadow-2xl scale-105">
        <TaskCard task={task} {...props} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription="sortable task card"
    >
      <TaskCard task={task} {...props} />
    </div>
  );
}
