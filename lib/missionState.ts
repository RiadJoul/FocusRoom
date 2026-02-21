import { NativeModules, Platform } from 'react-native';

type MissionStateNativeType = {
  // Today tasks snapshot for Home Screen widget
  setTodayTasks(titles: string[]): void | Promise<void>;
  // Habit heatmap snapshot for Habit widget
  setHabitSnapshot(levels: number[]): void | Promise<void>;
  // Live Activity control
  startLiveActivity?(title: string, endTimestampSeconds: number): void | Promise<void>;
  updateLiveActivityProgress?(progress: number): void | Promise<void>;
  endLiveActivities?(): void | Promise<void>;
};

const native: MissionStateNativeType | undefined =
  (NativeModules as any).MissionStateModule ??
  (NativeModules as any).MissionState;

function getNative(): MissionStateNativeType | null {
  if (Platform.OS !== 'ios') return null;
  if (!native) {
    console.warn('[missionState] native module not available');
    return null;
  }
  return native;
}

export type TodayWidgetState = 'no_user' | 'non_premium' | 'tasks';

export async function updateTodayTasksSnapshot(payload: { titles: string[]; state: TodayWidgetState }) {
  const mod = getNative();
  if (!mod) return;
  try {
    let toStore: string[];

    switch (payload.state) {
      case 'no_user':
        // Sentinel value meaning user not logged in / onboarded.
        toStore = ['__NO_USER__'];
        break;
      case 'non_premium':
        // Sentinel for logged-in but free users.
        toStore = ['__NON_PREMIUM__'];
        break;
      case 'tasks':
      default: {
        // Clamp to max 5 titles for layout.
        const trimmed = payload.titles.slice(0, 5);
        toStore = trimmed;
        break;
      }
    }

    await Promise.resolve(mod.setTodayTasks(toStore));
  } catch (e) {
    console.warn('[missionState] failed to update today tasks snapshot', e);
  }
}

export async function updateMissionState(options: {
  title: string;
  endTimestampSeconds: number;
  progress: number;
}) {
  const mod = getNative();
  if (!mod || !mod.startLiveActivity) return;
  try {
    await Promise.resolve(
      mod.startLiveActivity(options.title, options.endTimestampSeconds),
    );
  } catch (e) {
    console.warn('[missionState] failed to start live activity', e);
  }
}

export async function clearMissionState() {
  const mod = getNative();
  if (!mod || !mod.endLiveActivities) return;
  try {
    await Promise.resolve(mod.endLiveActivities());
  } catch (e) {
    console.warn('[missionState] failed to end live activities', e);
  }
}

export async function updateHabitSnapshot(levels: number[]) {
  const mod = getNative();
  if (!mod) return;
  try {
    await Promise.resolve(mod.setHabitSnapshot(levels));
  } catch (e) {
    console.warn('[missionState] failed to update habit snapshot', e);
  }
}

export async function updateMissionProgress(progress: number) {
  const mod = getNative();
  if (!mod || !mod.updateLiveActivityProgress) return;

  const clamped = Math.max(0, Math.min(1, progress));

  try {
    await Promise.resolve(mod.updateLiveActivityProgress(clamped));
  } catch (e) {
    console.warn('[missionState] failed to update mission progress', e);
  }
}
