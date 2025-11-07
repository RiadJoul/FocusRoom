import { supabase } from '@/lib/supabase';
import { FocusSession, FocusStats, SessionCreateInput } from '@/lib/types/session';
import { create } from 'zustand';

interface SessionState {
  sessions: FocusSession[];
  stats: FocusStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchSessions: (userId: string) => Promise<void>;
  fetchStats: (userId: string) => Promise<void>;
  createSession: (session: SessionCreateInput) => Promise<void>;
  calculateFocusHealthScore: (userId: string) => Promise<number>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchSessions: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ sessions: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchStats: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('duration_seconds, tasks_completed, distance_km')
        .eq('user_id', userId);

      if (error) throw error;

      const sessions = data || [];
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60;
      const tasksCompleted = sessions.reduce((sum, s) => sum + s.tasks_completed, 0);
      const totalDistanceKm = sessions.reduce((sum, s) => sum + (s.distance_km || 0), 0);
      const averageSessionLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;

      // Calculate focus health score
      const focusHealthScore = await get().calculateFocusHealthScore(userId);

      set({
        stats: {
          totalSessions,
          totalMinutes: Math.floor(totalMinutes),
          tasksCompleted,
          averageSessionLength: Math.floor(averageSessionLength),
          focusHealthScore,
          totalDistanceKm: Math.floor(totalDistanceKm),
        },
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createSession: async (session: SessionCreateInput) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('focus_sessions')
        .insert([session]);

      if (error) throw error;

      // Refresh sessions and stats
      await get().fetchSessions(session.user_id);
      await get().fetchStats(session.user_id);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  calculateFocusHealthScore: async (userId: string) => {
    try {
      // Get sessions from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('duration_seconds, tasks_completed, created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error) throw error;

      const sessions = data || [];
      
      if (sessions.length === 0) return 0;

      // Calculate score based on:
      // 1. Consistency (sessions per day) - 40 points
      // 2. Total focus time - 30 points
      // 3. Task completion - 30 points

      // 1. Consistency Score (0-40)
      const daysWithSessions = new Set(
        sessions.map(s => new Date(s.created_at).toDateString())
      ).size;
      const consistencyScore = Math.min((daysWithSessions / 7) * 40, 40);

      // 2. Focus Time Score (0-30)
      const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60;
      const targetMinutes = 7 * 60; // 1 hour per day for 7 days
      const focusTimeScore = Math.min((totalMinutes / targetMinutes) * 30, 30);

      // 3. Task Completion Score (0-30)
      const totalTasksCompleted = sessions.reduce((sum, s) => sum + s.tasks_completed, 0);
      const targetTasks = 21; // 3 tasks per day for 7 days
      const taskScore = Math.min((totalTasksCompleted / targetTasks) * 30, 30);

      const totalScore = Math.round(consistencyScore + focusTimeScore + taskScore);
      
      return Math.min(totalScore, 100);
    } catch (error) {
      console.error('Error calculating focus health score:', error);
      return 0;
    }
  },
}));
