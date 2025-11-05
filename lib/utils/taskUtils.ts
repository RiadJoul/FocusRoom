/**
 * Task utility functions for the FocusRoom app
 */

import { Task } from '../stores/taskStore';
import { isSameDay } from './dateUtils';

/**
 * Get priority border and background color classes
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'border-red-500/30 bg-red-500/5';
    case 'medium': return 'border-yellow-500/30 bg-yellow-500/5';
    case 'low': return 'border-green-500/30 bg-green-500/5';
    default: return 'border-gray-500/30 bg-gray-500/5';
  }
}

/**
 * Get priority dot color class
 */
export function getPriorityDot(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}

/**
 * Filter tasks for a specific day
 * - Tasks with no due date only show on today
 * - Tasks with due date show on that specific date
 */
export function getTasksForDay(tasks: Task[], selectedDay: Date, today: Date): Task[] {
  return tasks.filter(t => {
    if (!t.due_date) {
      return isSameDay(selectedDay, today);
    }
    
    const taskDueDate = new Date(t.due_date);
    return isSameDay(taskDueDate, selectedDay);
  });
}

/**
 * Get incomplete tasks from a task list
 */
export function getIncompleteTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.status !== 'completed');
}

/**
 * Get top priority tasks (sorted by priority)
 */
export function getTopPriorityTasks(tasks: Task[]): Task[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  
  return tasks
    .sort((a, b) => {
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    })
}

/**
 * Get count of completed tasks
 */
export function getCompletedCount(tasks: Task[]): number {
  return tasks.filter(t => t.status === 'completed').length;
}
