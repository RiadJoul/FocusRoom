import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../supabase';

export type TaskList = {
  id: string;
  user_id: string;
  title: string;
  icon?: string;
  created_at: string;
};

type ListState = {
  lists: TaskList[];
  loading: boolean;
  addList: (title: string, icon?: string) => Promise<TaskList | null>;
  removeList: (id: string) => Promise<void>;
  updateList: (id: string, title: string) => Promise<void>;
  setLists: (lists: TaskList[]) => void;
  fetchLists: (userId: string) => Promise<void>;
};

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
      lists: [],
      loading: false,
      
      fetchLists: async (userId: string) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
          
          if (error) throw error;
          set({ lists: data || [], loading: false });
        } catch (error) {
          console.error('Error fetching lists:', error);
          set({ loading: false });
        }
      },
      
      addList: async (title: string, icon?: string) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user');
          
          const newList = {
            user_id: user.id,
            title,
            icon: icon || 'list-outline',
            created_at: new Date().toISOString(),
          };
          
          const { data, error } = await supabase
            .from('lists')
            .insert([newList])
            .select()
            .single();
          
          if (error) throw error;
          
          set({ lists: [...get().lists, data] });
          return data;
        } catch (error) {
          console.error('Error adding list:', error);
          return null;
        }
      },
      
      removeList: async (id: string) => {
        try {
          const { error } = await supabase
            .from('lists')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          set({ lists: get().lists.filter((l) => l.id !== id) });
        } catch (error) {
          console.error('Error removing list:', error);
        }
      },
      
      updateList: async (id: string, title: string) => {
        try {
          const { error } = await supabase
            .from('lists')
            .update({ title })
            .eq('id', id);
          
          if (error) throw error;
          
          set({ lists: get().lists.map((l) => (l.id === id ? { ...l, title } : l)) });
        } catch (error) {
          console.error('Error updating list:', error);
        }
      },
      
      setLists: (lists: TaskList[]) => set({ lists }),
    }),
    { name: 'lists-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
