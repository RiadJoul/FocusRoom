import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { analytics, Events, Properties } from '../analytics';
import { supabase } from '../supabase';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type Task = {
  id: string;
  user_id: string;
  list_id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  status: 'pending' | 'completed' | 'archived';
  created_at: string;
  updated_at?: string;
  // Recurring task fields
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType | null;
  recurrence_interval?: number; // e.g., every 2 weeks
  recurrence_days?: number[]; // For weekly: [1] = Monday, [1,3,5] = Mon/Wed/Fri
  recurrence_end_date?: string | null;
  parent_task_id?: string | null; // Reference to recurring task template
  last_occurrence_date?: string | null;
};

type TaskState = {
  tasks: Task[];
  loading: boolean;
  addTask: (listId: string, title: string, priority?: 'low' | 'medium' | 'high', dueDate?: string | null) => Promise<Task | null>;
  addRecurringTask: (
    listId: string,
    title: string,
    recurrenceType: RecurrenceType,
    recurrenceDays?: number[],
    priority?: 'low' | 'medium' | 'high',
    dueDate?: string | null,
    interval?: number,
    endDate?: string | null
  ) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  generateRecurringTaskOccurrences: () => Promise<void>;
  tasksByList: (listId: string) => Task[];
  setTasks: (tasks: Task[]) => void;
  fetchTasks: (userId: string) => Promise<void>;
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      loading: false,
      
      fetchTasks: async (userId: string) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          set({ tasks: data || [], loading: false });
        } catch (error) {
          console.error('Error fetching tasks:', error);
          set({ loading: false });
        }
      },
      
      addTask: async (listId: string, title: string, priority?: 'low' | 'medium' | 'high', dueDate?: string | null) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user');
          
          const newTask = {
            user_id: user.id,
            list_id: listId,
            title,
            priority: priority || 'medium',
            due_date: dueDate || null,
            status: 'pending' as const,
          };
          
          const { data, error } = await supabase
            .from('tasks')
            .insert([newTask])
            .select()
            .single();
          
          if (error) throw error;
          
          // Track task creation
          analytics.track(Events.TASK_CREATED, {
            [Properties.TASK_ID]: data.id,
            [Properties.TASK_PRIORITY]: data.priority,
            has_due_date: !!data.due_date,
          });
          
          analytics.incrementProperty('total_tasks_created', 1);
          
          set({ tasks: [...get().tasks, data] });
          return data;
        } catch (error) {
          console.error('Error adding task:', error);
          return null;
        }
      },
      
      updateTask: async (id: string, patch: Partial<Task>) => {
        try {
          const { error } = await supabase
            .from('tasks')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', id);
          
          if (error) throw error;
          
          set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
        } catch (error) {
          console.error('Error updating task:', error);
        }
      },
      
      removeTask: async (id: string) => {
        try {
          const task = get().tasks.find((t) => t.id === id);
          
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          // Track task deletion
          if (task) {
            analytics.track(Events.TASK_DELETED, {
              [Properties.TASK_ID]: task.id,
              [Properties.TASK_PRIORITY]: task.priority,
              [Properties.TASK_STATUS]: task.status,
            });
          }
          
          set({ tasks: get().tasks.filter((t) => t.id !== id) });
        } catch (error) {
          console.error('Error removing task:', error);
        }
      },
      
      toggleComplete: async (id: string) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        
        // Track task completion
        if (newStatus === 'completed') {
          analytics.track(Events.TASK_COMPLETED, {
            [Properties.TASK_ID]: task.id,
            [Properties.TASK_PRIORITY]: task.priority,
          });
          
          analytics.incrementProperty('total_tasks_completed', 1);
        }
        
        await get().updateTask(id, { status: newStatus });
      },
      
      addRecurringTask: async (
        listId: string,
        title: string,
        recurrenceType: RecurrenceType,
        recurrenceDays?: number[],
        priority?: 'low' | 'medium' | 'high',
        dueDate?: string | null,
        interval?: number,
        endDate?: string | null
      ) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user');
          
          const newTask = {
            user_id: user.id,
            list_id: listId,
            title,
            priority: priority || 'medium',
            due_date: dueDate || null,
            status: 'pending' as const,
            is_recurring: true,
            recurrence_type: recurrenceType,
            recurrence_interval: interval || 1,
            recurrence_days: recurrenceDays || null,
            recurrence_end_date: endDate || null,
          };
          
          const { data, error } = await supabase
            .from('tasks')
            .insert([newTask])
            .select()
            .single();
          
          if (error) throw error;
          
          // Track recurring task creation
          analytics.track(Events.TASK_CREATED, {
            [Properties.TASK_ID]: data.id,
            [Properties.TASK_PRIORITY]: data.priority,
            has_due_date: !!data.due_date,
            is_recurring: true,
            recurrence_type: recurrenceType,
          });
          
          analytics.incrementProperty('total_tasks_created', 1);
          
          set({ tasks: [...get().tasks, data] });
          return data;
        } catch (error) {
          console.error('Error adding recurring task:', error);
          return null;
        }
      },
      
      generateRecurringTaskOccurrences: async () => {
        try {
          // Call the Supabase function to generate recurring task occurrences
          const { data, error } = await supabase.rpc('check_and_generate_recurring_tasks');
          
          if (error) throw error;
          
          console.log(`Generated ${data} recurring task occurrences`);
          
          // Refresh tasks to show new occurrences
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await get().fetchTasks(user.id);
          }
        } catch (error) {
          console.error('Error generating recurring task occurrences:', error);
        }
      },
      
      tasksByList: (listId: string) => get().tasks.filter((t) => t.list_id === listId),
      setTasks: (tasks: Task[]) => set({ tasks }),
    }),
    { name: 'tasks-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
