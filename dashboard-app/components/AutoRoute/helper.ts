import { getHours, getMinutes, parse } from 'date-fns';
import { SidebarValues } from 'lib/interfaces';

export function timeStringToISO(timeStr: string): string {
  const date = parse(timeStr, 'HH:mm', new Date());
  return date.toISOString();
}

// Format minutes (can be decimal) to 'HH:MM'
export function formatMinutesToHM(minutesInput: number | string): string {
  const totalMinutes = typeof minutesInput === 'string' ? parseFloat(minutesInput) : minutesInput;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// Convert time strings (HH:MM) to minutes since midnight for comparison
function timeToMinutes(timeStr: string): number {
  const date = parse(timeStr, 'HH:mm', new Date());
  return getHours(date) * 60 + getMinutes(date);
}

/**
 * Checks if a specific time wraps to the next day based on shift start time.
 * Returns true if the time is before the shift start time in 24-hour format.
 */
export function isTimeNextDay(time: string, shiftStartTime: string): boolean {
  const timeMinutes = timeToMinutes(time);
  const shiftStartMinutes = timeToMinutes(shiftStartTime);
  return timeMinutes < shiftStartMinutes;
}

/**
 * Validates that time constraints follow the rule:
 * shift start <= delivery start <= delivery end <= shift end
 * Takes into account next day flags for proper time comparison
 */
export function validateTimeConstraints(values: SidebarValues): { isValid: boolean; errorMessage?: string } {
  // Get base time values
  const shiftStart = timeToMinutes(values.shiftStartTime);
  const deliveryStart = timeToMinutes(values.deliveryStartTime);
  const deliveryEnd = timeToMinutes(values.deliveryEndTime);
  const shiftEnd = timeToMinutes(values.shiftEndTime);

  // Adjust times for next day (add 24 hours worth of minutes)
  const MINUTES_IN_DAY = 24 * 60;
  const adjustedDeliveryEnd = values.isDeliveryEndTimeNextDay ? deliveryEnd + MINUTES_IN_DAY : deliveryEnd;
  const adjustedShiftEnd = values.isShiftEndTimeNextDay ? shiftEnd + MINUTES_IN_DAY : shiftEnd;

  // Validate: shift start <= delivery start
  if (shiftStart > deliveryStart) {
    return {
      isValid: false,
      errorMessage: 'Shift start time must be before or equal to delivery start time'
    };
  }

  // Validate: delivery start <= delivery end (considering next day)
  if (deliveryStart > adjustedDeliveryEnd) {
    return {
      isValid: false,
      errorMessage: 'Delivery start time must be before or equal to delivery end time'
    };
  }

  // Validate: delivery end <= shift end (considering next day)
  if (adjustedDeliveryEnd > adjustedShiftEnd) {
    return {
      isValid: false,
      errorMessage: 'Delivery end time must be before or equal to shift end time'
    };
  }

  // Validate subslot time if it exists
  if (values.firstSubslotEndTime) {
    const subslotEnd = timeToMinutes(values.firstSubslotEndTime);
    const adjustedSubslotEnd = values.isSubslotTimeNextDay ? subslotEnd + MINUTES_IN_DAY : subslotEnd;

    if (adjustedSubslotEnd > adjustedDeliveryEnd) {
      return {
        isValid: false,
        errorMessage: 'First subslot end time must be before or equal to delivery end time'
      };
    }
  }

  return { isValid: true };
}
