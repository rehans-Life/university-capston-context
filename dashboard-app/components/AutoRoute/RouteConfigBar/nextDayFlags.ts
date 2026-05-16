import { SidebarValues } from 'lib/interfaces';
import { isTimeNextDay } from '../helper';

/**
 * Computes updated next-day flags for any time fields that changed.
 * Call this from onChange handlers when the user edits a time input.
 *
 * Pass the new time values (after the edit). Only the flags affected
 * by the changed fields are included in the returned partial update.
 */
export function getNextDayFlagUpdates(
  changedFields: Partial<Pick<SidebarValues, 'shiftStartTime' | 'deliveryEndTime' | 'shiftEndTime' | 'firstSubslotEndTime'>>,
  current: Pick<SidebarValues, 'shiftStartTime' | 'deliveryEndTime' | 'shiftEndTime' | 'firstSubslotEndTime'>
): Partial<SidebarValues> {
  // Merge changed fields on top of current to get the "after edit" state
  const next = { ...current, ...changedFields };
  const updates: Partial<SidebarValues> = {};

  // If shiftStartTime changed, all flags need recalculation
  const shiftStartChanged = 'shiftStartTime' in changedFields;

  if (shiftStartChanged || 'deliveryEndTime' in changedFields) {
    updates.isDeliveryEndTimeNextDay = isTimeNextDay(next.deliveryEndTime, next.shiftStartTime);
  }

  if (shiftStartChanged || 'shiftEndTime' in changedFields) {
    updates.isShiftEndTimeNextDay = isTimeNextDay(next.shiftEndTime, next.shiftStartTime);
  }

  if (shiftStartChanged || 'firstSubslotEndTime' in changedFields) {
    updates.isSubslotTimeNextDay = next.firstSubslotEndTime
      ? isTimeNextDay(next.firstSubslotEndTime, next.shiftStartTime)
      : false;
  }

  return updates;
}
