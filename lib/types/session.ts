export interface FocusSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  tasks_completed: number;
  trip_id: string;
  trip_name: string;
  distance_km: number;
  created_at: string;
  completed_task_ids: string[] | null;
}

export interface ListFocusStat {
  list_id: string;
  title: string;
  color?: string;
  icon?: string;
  tasksCompleted: number;
  minutesFocused: number;
  percentage: number;
}

export interface FocusStats {
  totalSessions: number;
  totalMinutes: number;
  tasksCompleted: number;
  averageSessionLength: number;
  focusHealthScore: number;
  totalDistanceKm: number;
  deepFocusDays: number;
  listBreakdown: ListFocusStat[];
}

export interface SessionCreateInput {
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  tasks_completed: number;
  trip_id: string;
  trip_name: string;
  distance_km: number;
  completed_task_ids: string[];
}
