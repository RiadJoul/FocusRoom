/**
 * Date utility functions for the FocusRoom app
 */

export const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Get the week dates with today at the second position (index 1)
 */
export function getWeekDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDates: Date[] = [];
  
  // Today will be at index 1 (second position)
  // So we need dates from yesterday to 5 days ahead
  for (let i = -1; i < 6; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    weekDates.push(date);
  }
  
  return { weekDates, todayIndex: 1 };
}

/**
 * Format a Date into a local YYYY-MM-DD string (no timezone conversion).
 * This is used for storing due_date in Supabase in a timezone-safe way.
 */
export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date at local midnight.
 * This avoids JS treating date-only strings as UTC.
 */
export function parseLocalDateKey(value: string): Date {
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Format a due date as "Today", "Tomorrow", or a formatted date string
 */
export function formatDueDate(date: Date | null): string | null {
  if (!date) return null;
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format selected date for display (handles "Tomorrow's" vs regular date)
 */
export function formatSelectedDate(selectedDay: Date, today: Date): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (isSameDay(selectedDay, tomorrow)) {
    return "Tomorrow's";
  }
  
  return selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get time-based greeting
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Get an array of future dates for date picker (starting from 2 days ahead)
 */
export function getFutureDates(count: number = 14): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 2);
    return date;
  });
}
