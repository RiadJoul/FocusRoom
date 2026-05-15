import { FocusSessionScreen } from '@/components/focus/FocusSessionScreen';
import { PlanetTrip } from '@/components/focus/PlanetTrips';
import { TaskSelectionModal } from '@/components/focus/TaskSelectionModal';
import { TicketAnimation } from '@/components/focus/TicketAnimation';
import { analytics, Events, Properties } from '@/lib/analytics';
import { useListStore } from '@/lib/stores/listStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { Task, useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { getIncompleteTasks } from '@/lib/utils/taskUtils';
import BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import {
  blockSelection,
  unblockSelection,
  getFamilyActivitySelectionId,
} from 'react-native-device-activity';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const PREFERRED_MODE_KEY = 'focus_preferred_mode';

export default function FocusTab() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const stats = useSessionStore((state) => state.stats);
  const sessions = useSessionStore((state) => state.sessions);
  const { fetchStats, fetchSessions, createSession } = useSessionStore();
  const lists = useListStore((state) => state.lists);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<PlanetTrip | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const distanceUnit = useUserStore((s) => s.distanceUnit);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [blockAppsEnabled, setBlockAppsEnabled] = useState(false);

  // Paywall presentation state
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);

  // session visual type (2D map or 3D cockpit)
  const [sessionType, setSessionType] = useState<'3d' | 'map'>('map');
  const [preferredMode, setPreferredMode] = useState<'3d' | 'map'>('map');

  const bottomSheetRef = useRef<BottomSheet>(null);

  // Load stats and sessions when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchStats(user.id);
      fetchSessions(user.id);
    }
  }, [user?.id, fetchStats, fetchSessions]);

  // Load preferred cockpit mode (2D vs 3D) from storage
  useEffect(() => {
    const loadPreferredMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFERRED_MODE_KEY);
        if (stored === 'map' || stored === '3d') {
          setPreferredMode(stored);
        }
      } catch {
        // ignore storage errors
      }
    };

    loadPreferredMode();
  }, []);


  // Track screen view once on mount
  useEffect(() => {
    analytics.track(Events.SCREEN_VIEW, {
      [Properties.SCREEN_NAME]: 'Focus',
    });
  }, []);

  // Keep blockAppsEnabled in sync whenever Focus tab comes into view
  useFocusEffect(
    useCallback(() => {
      const loadBlockSetting = async () => {
        try {
          const value = await AsyncStorage.getItem('block_apps_enabled');
          setBlockAppsEnabled(value === 'true');
        } catch (err) {
          console.warn('Failed to load block_apps_enabled in focus tab', err);
        }
      };

      loadBlockSetting();
    }, [])
  );

  // Hide/show tab bar based on session state
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: sessionActive
        ? { display: 'none' }
        : {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#262626',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
        },
    });
  }, [navigation, sessionActive, insets.bottom]);

  const incompleteTasks = useMemo(() => {
    return getIncompleteTasks(tasks);
  }, [tasks]);

  const [listFilter, setListFilter] = useState<3 | 7 | 31 | 90>(31);

  const listBreakdown = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - listFilter);
    const taskToListId = new Map(tasks.map((t) => [t.id, t.list_id]));
    const listIdToInfo = new Map(lists.map((l) => [l.id, l]));
    const listTaskCounts = new Map<string, number>();
    const listMinutes = new Map<string, number>();
    sessions.forEach((s) => {
      if (s.created_at && new Date(s.created_at) < cutoff) return;
      const ids: string[] = s.completed_task_ids || [];
      if (ids.length === 0) return;
      const minutesPerTask = s.duration_seconds / 60 / ids.length;
      ids.forEach((taskId) => {
        const listId = taskToListId.get(taskId);
        if (listId) {
          listTaskCounts.set(listId, (listTaskCounts.get(listId) ?? 0) + 1);
          listMinutes.set(listId, (listMinutes.get(listId) ?? 0) + minutesPerTask);
        }
      });
    });
    const total = Array.from(listMinutes.values()).reduce((a, b) => a + b, 0);
    return Array.from(listMinutes.entries())
      .map(([list_id, minutes]) => {
        const info = listIdToInfo.get(list_id);
        return {
          list_id,
          title: info?.title ?? 'Unknown',
          color: info?.color,
          icon: info?.icon,
          minutesFocused: Math.round(minutes),
          percentage: total > 0 ? Math.round((minutes / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.minutesFocused - a.minutesFocused);
  }, [sessions, tasks, lists, listFilter]);

  const handleOpenTaskSelection = useCallback(() => {
    bottomSheetRef.current?.expand();

    analytics.track(Events.TRIP_MODAL_OPENED, {
      [Properties.TASKS_COUNT]: incompleteTasks.length,
    });
  }, [incompleteTasks.length]);

  const handleStartSession = useCallback(
    (tasks: Task[], trip: PlanetTrip) => {
      // Start using the user's preferred mode, but force 2D if not premium.
      let mode: 'map' | '3d' = preferredMode;
      if (!user?.is_premium && mode === '3d') {
        mode = 'map';
      }

      setSelectedTasks(tasks);
      setSelectedTrip(trip);
      setSessionType(mode);
      setShowTicket(true);

      analytics.track(Events.TRIP_SELECTED, {
        [Properties.TRIP_ID]: trip.id,
        [Properties.TRIP_NAME]: `${trip.from} → ${trip.to}`,
        [Properties.TRIP_DESTINATION]: trip.to,
        [Properties.DURATION_MINUTES]: Math.floor(trip.duration / 60),
        [Properties.DISTANCE_KM]: trip.distance_km,
        [Properties.TASKS_COUNT]: tasks.length,
        session_type: mode,
      });
    },
    [preferredMode, user?.is_premium],
  );

  const handleTicketAnimationComplete = useCallback(() => {
    setShowTicket(false);
    setSessionActive(true);
    setSessionStartTime(new Date());

    if (blockAppsEnabled) {
      try {
        const selectionToken = getFamilyActivitySelectionId('focusroom_block_apps');
        if (selectionToken) {
          blockSelection(
            { activitySelectionId: 'focusroom_block_apps' },
            'focusSessionStarted',
          );
        }
      } catch (err) {
        console.warn('Failed to block apps for focus session', err);
      }
    }

    if (selectedTrip) {
      analytics.track(Events.SESSION_STARTED, {
        [Properties.TRIP_ID]: selectedTrip.id,
        [Properties.TRIP_NAME]: `${selectedTrip.from} → ${selectedTrip.to}`,
        [Properties.DURATION_SECONDS]: selectedTrip.duration,
        [Properties.DURATION_MINUTES]: Math.floor(selectedTrip.duration / 60),
        [Properties.DISTANCE_KM]: selectedTrip.distance_km,
        [Properties.TASKS_COUNT]: selectedTasks.length,
        session_type: sessionType === '3d' ? 'first_class' : 'economy',
      });
    }
  }, [selectedTrip, selectedTasks, sessionType, blockAppsEnabled]);

  const handleEndSession = useCallback(
    async (duration: number, completedTaskIds: string[]) => {
      if (!user?.id || !selectedTrip) return;

      // Actual traveled distance based on how long the session ran
      const progress =
        selectedTrip.duration > 0
          ? Math.min(1, Math.max(0, duration / selectedTrip.duration))
          : 0;
      const travelledDistanceKm = Math.round(selectedTrip.distance_km * progress);

      // Determine if this is the very first completed session (before saving).
      const wasFirstSession = !stats || stats.totalSessions === 0;

      try {
        // Track session completion
        analytics.track(Events.SESSION_COMPLETED, {
          [Properties.TRIP_ID]: selectedTrip.id,
          [Properties.TRIP_NAME]: `${selectedTrip.from} → ${selectedTrip.to}`,
          [Properties.SESSION_STATUS]: 'completed',
          [Properties.DURATION_SECONDS]: duration,
          [Properties.DURATION_MINUTES]: Math.floor(duration / 60),
          [Properties.DISTANCE_KM]: travelledDistanceKm,
          [Properties.TASKS_COMPLETED]: completedTaskIds.length,
          [Properties.TASKS_COUNT]: selectedTasks.length,
          session_type: sessionType === '3d' ? 'first_class' : 'economy',
          completed_percentage: Math.round(
            (completedTaskIds.length / selectedTasks.length) * 100
          ),
        });

        // Increment user stats
        analytics.incrementProperty('total_sessions', 1);
        analytics.incrementProperty('total_minutes', Math.floor(duration / 60));
        analytics.incrementProperty('total_distance_km', travelledDistanceKm);

        // Save session to database (also refreshes stats)
        await createSession({
          user_id: user.id,
          started_at: sessionStartTime?.toISOString() || new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          tasks_completed: completedTaskIds.length,
          trip_id: selectedTrip.id,
          trip_name: `${selectedTrip.from} → ${selectedTrip.to}`,
          distance_km: travelledDistanceKm,
          completed_task_ids: completedTaskIds,
        });

        // If this was their very first session, softly ask for an App Store review on iOS.
        if (wasFirstSession && Platform.OS === 'ios') {
          try {
            const available = await StoreReview.isAvailableAsync();
            if (available) {
              await StoreReview.requestReview();
            }
          } catch (err) {
            console.warn('App review prompt failed:', err);
          }
        }
      } catch (error) {
        console.error('Failed to save session:', error);
      }

      // Apps are already unblocked via onSessionTimerComplete — no-op here.
    },
    [user?.id, selectedTrip, sessionStartTime, createSession, selectedTasks, stats, sessionType]
  );

  const handleDismissSession = useCallback(() => {
    setSessionActive(false);
    setSelectedTasks([]);
    setSelectedTrip(null);
    setSessionStartTime(null);
  }, []);

  const handleUnblockApps = useCallback(() => {
    if (!blockAppsEnabled) return;
    try {
      const selectionToken = getFamilyActivitySelectionId('focusroom_block_apps');
      if (selectionToken) {
        unblockSelection(
          { activitySelectionId: 'focusroom_block_apps' },
          'focusSessionEnded',
        );
      }
    } catch (err) {
      console.warn('Failed to unblock apps after focus session', err);
    }
  }, [blockAppsEnabled]);

  const handleMarkTasksComplete = useCallback(async (taskIds: string[]) => {
    for (const taskId of taskIds) {
      await toggleComplete(taskId);
    }
  }, [toggleComplete]);

  async function presentPaywall(source: string = 'advanced_focus_stats'): Promise<boolean> {
    // Prevent re-entrancy
    if (isPresentingPaywall) return false;
    setIsPresentingPaywall(true);

    try {
      return await presentPaywallOnce({
        userId: user?.id,
        source,
      });
    } finally {
      setIsPresentingPaywall(false);
    }
  }

  const handleChangeMode = useCallback(
    async (next: 'map' | '3d') => {
      if (next === sessionType) return;

      // Going to 3D: require premium
      if (next === '3d') {
        if (!user?.is_premium) {
          const unlocked = await presentPaywall('focus_mode_3d_toggle');
          if (!unlocked && !useUserStore.getState().user?.is_premium) {
            return;
          }
        }
      }

      setSessionType(next);
      setPreferredMode(next);
      try {
        await AsyncStorage.setItem(PREFERRED_MODE_KEY, next);
      } catch {
        // ignore storage errors
      }
    },
    [sessionType, user?.is_premium],
  );


  if (sessionActive && selectedTrip) {
    return (
      <FocusSessionScreen
        tasks={selectedTasks}
        trip={selectedTrip}
        onEndSession={handleEndSession}
        onMarkTasksComplete={handleMarkTasksComplete}
        onDismiss={handleDismissSession}
        mode={sessionType}
        onChangeMode={handleChangeMode}
        onSessionTimerComplete={handleUnblockApps}
      />
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="pt-6 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image
                source={require('../../assets/icons/ios-light.png')}
                className="w-11 h-11 mr-4 rounded-2xl"
              />
              <View>
                <Text className="text-gray-400 font-primary-medium text-xs uppercase tracking-[0.16em]">
                  Focus Mission Control
                </Text>

              </View>
            </View>
          </View>

          <Text className="text-gray-400 font-primary-medium text-sm mt-3">
            Lock in and start your focus.
          </Text>
        </View>

        {/* Main Focus Card */}
        <View className="bg-card rounded-3xl px-5 py-6 mb-2 border border-white/5">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-gray-400 font-primary-medium text-xs uppercase tracking-[0.18em] mb-1">
                Next Mission
              </Text>
              <Text className="text-white font-primary-bold text-xl">
                Ready to focus?
              </Text>
            </View>
            <View className="bg-primary/20 border border-primary/40 rounded-full px-3 py-1">
              <Text className="text-primary font-primary-semibold text-xs uppercase tracking-wider">
                {incompleteTasks.length > 0
                  ? `${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's' : ''}`
                  : 'No tasks'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleOpenTaskSelection}
            disabled={incompleteTasks.length === 0}
            className={`flex-row justify-center w-full py-4 rounded-2xl items-center ${incompleteTasks.length > 0 ? 'bg-white' : 'bg-gray-800'
              }`}
            activeOpacity={0.85}
          >
            {
              incompleteTasks.length > 0 && (
                <MaterialIcons name="airplane-ticket" size={24} color="black" />
              )
            }
            <Text
              className={`pl-2 font-primary-bold text-base ${incompleteTasks.length > 0 ? 'text-background' : 'text-gray-600'
                }`}
            >
              {incompleteTasks.length > 0 ? 'Start Focus Session' : 'Add a task to begin'}
            </Text>
          </TouchableOpacity>

          {incompleteTasks.length === 0 && (
            <Text className="text-gray-500 font-primary-medium text-xs mt-3 text-center">
              You're all clear. Add a task to schedule your next focus trip.
            </Text>
          )}
        </View>

        {/* Focus by List */}
        <View className="mb-2">
          <View className="mb-3">
            <Text className="text-white font-primary-bold text-lg">Focus by List</Text>
          </View>
          <View className="flex-row gap-x-1.5">
              {([
                { days: 7, label: '7 Days' },
                { days: 31, label: '30 Days' },
                { days: 90, label: '90 Days' },
              ] as const).map(({ days, label }) => (
                <TouchableOpacity
                  key={days}
                  onPress={() => setListFilter(days)}
                  activeOpacity={0.7}
                  className="px-3 py-1 rounded-lg border"
                  style={{
                    backgroundColor: listFilter === days ? 'rgba(168,85,247,0.15)' : 'transparent',
                    borderColor: listFilter === days ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text
                    className="font-primary-semibold"
                    style={{ fontSize: 13, color: listFilter === days ? '#a855f7' : '#6b7280' }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          {listBreakdown.length > 0 ? (
              <View className="gap-y-1 mt-3">
                {listBreakdown.slice(0, 5).map((item) => {
                  const color = item.color ?? '#a855f7';
                  const hours = Math.floor(item.minutesFocused / 60);
                  const mins = item.minutesFocused % 60;
                  const timeLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;
                  return (
                    <View key={item.list_id} className="rounded-2xl px-1 py-3">
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View className="flex-row items-center gap-x-3 flex-1">
                          <View
                            className="w-10 h-10 rounded-xl items-center justify-center"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            {item.icon ? (
                              <Ionicons name={item.icon as any} size={18} color={color} />
                            ) : (
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                            )}
                          </View>
                          <Text className="font-primary-semibold text-sm flex-1" style={{ color: '#e5e7eb' }} numberOfLines={1}>
                            {item.title}
                          </Text>
                        </View>
                        <View className="items-end ml-3">
                          <Text className="font-primary-bold text-sm" style={{ color }}>{timeLabel}</Text>
                          <Text className="font-primary-medium text-[10px] text-white/80 mt-0.5">{item.percentage}%</Text>
                        </View>
                      </View>
                      <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${color}20` }}>
                        <View style={{ width: `${item.percentage}%`, height: '100%', borderRadius: 999, backgroundColor: color, opacity: 0.9 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-card rounded-2xl p-10 items-center">
                <Text className="text-gray-500 font-primary-medium text-sm text-center">
                  Complete sessions with tasks to see your focus breakdown.
                </Text>
              </View>
            )
          }
        </View>

      </ScrollView>

      {/* Task Selection Bottom Sheet */}
      <TaskSelectionModal
        bottomSheetRef={bottomSheetRef}
        tasks={incompleteTasks}
        onStartSession={handleStartSession}
      />

      {/* Ticket Animation */}
      {showTicket && selectedTrip && (
        <TicketAnimation
          visible={showTicket}
          trip={selectedTrip}
          tasks={selectedTasks}
          onAnimationComplete={handleTicketAnimationComplete}
        />
      )}
    </SafeAreaView>
  );
}
