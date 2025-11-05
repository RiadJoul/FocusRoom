/**
 * Date utility functions for the FocusRoom app
 */

export const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Get the week dates starting from Sunday
 */
export function getWeekDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const weekDates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOfWeek + i);
    weekDates.push(date);
  }
  
  return { weekDates, todayIndex: dayOfWeek };
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
