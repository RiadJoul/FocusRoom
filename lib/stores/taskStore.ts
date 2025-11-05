import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../supabase';

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
};

type TaskState = {
  tasks: Task[];
  loading: boolean;
  addTask: (listId: string, title: string, priority?: 'low' | 'medium' | 'high', dueDate?: string | null) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
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
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          set({ tasks: get().tasks.filter((t) => t.id !== id) });
        } catch (error) {
          console.error('Error removing task:', error);
        }
      },
      
      toggleComplete: async (id: string) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        await get().updateTask(id, { status: newStatus });
      },
      
      tasksByList: (listId: string) => get().tasks.filter((t) => t.list_id === listId),
      setTasks: (tasks: Task[]) => set({ tasks }),
    }),
    { name: 'tasks-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
