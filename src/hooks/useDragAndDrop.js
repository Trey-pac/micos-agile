import {
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Shared DnD sensor configuration for Kanban + Planning boards.
 * - PointerSensor: 8px activation distance (distinguish click from drag)
 * - TouchSensor: 200ms delay + 5px tolerance (allow scrolling on mobile)
 * - KeyboardSensor: arrow keys with sortable coordinates
 */
export function useDragSensors() {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  return useSensors(pointerSensor, touchSensor, keyboardSensor);
}

/**
 * Custom collision detection for multi-container Kanban / Planning boards.
 *
 * Priority:
 * 1. pointerWithin  — pointer is directly inside a droppable → most precise
 * 2. rectIntersection — dragged rect overlaps a droppable → good fallback
 *
 * closestCorners is deliberately avoided because it can return the wrong
 * container when adjacent column cards are geometrically close.
 */
export function kanbanCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
}
