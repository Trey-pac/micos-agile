import { useMemo } from 'react';
import {
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
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
