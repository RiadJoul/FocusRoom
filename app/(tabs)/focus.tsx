import { FocusSessionScreen } from '@/components/focus/FocusSessionScreen';
import { PlanetTrip } from '@/components/focus/PlanetTrips';
import { TaskSelectionModal } from '@/components/focus/TaskSelectionModal';
import { TicketAnimation } from '@/components/focus/TicketAnimation';
import { analytics, Events, Properties } from '@/lib/analytics';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { Task, useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { formatDistanceWithUnit } from '@/lib/utils/distance';
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
import { SimpleLineIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function FocusTab() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const stats = useSessionStore((state) => state.stats);
  const fetchSessions = useSessionStore((state) => state.fetchSessions);


  //stats
  const { fetchStats, createSession } = useSessionStore();
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<PlanetTrip | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const distanceUnit = useUserStore((s) => s.distanceUnit);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [blockAppsEnabled, setBlockAppsEnabled] = useState(false);

  // Paywall presentation state
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);

  // session visual type
  const [sessionType, setSessionType] = useState<'3d' | 'map'>('map');

  const bottomSheetRef = useRef<BottomSheet>(null);

  // Load stats and sessions when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchStats(user.id);
      fetchSessions(user.id);
    }
  }, [user?.id, fetchStats, fetchSessions]);


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

  const handleOpenTaskSelection = useCallback(() => {
    bottomSheetRef.current?.expand();

    analytics.track(Events.TRIP_MODAL_OPENED, {
      [Properties.TASKS_COUNT]: incompleteTasks.length,
    });
  }, [incompleteTasks.length]);

  const handleStartSession = useCallback((tasks: Task[], trip: PlanetTrip, mode: 'map' | '3d') => {
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
  }, []);

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
        });

        // If this was their very first session, softly ask for an App Store review on iOS.
        if (wasFirstSession && Platform.OS === 'ios') {
          try {
            const alreadyPrompted = await AsyncStorage.getItem('has_app_review_prompted');
            if (!alreadyPrompted) {
              const available = await StoreReview.isAvailableAsync();
              if (available) {
                await StoreReview.requestReview();
                await AsyncStorage.setItem('has_app_review_prompted', 'true');
              }
            }
          } catch (err) {
            console.warn('App review prompt failed:', err);
          }
        }
      } catch (error) {
        console.error('Failed to save session:', error);
      }

      // Unblock apps when focus session ends (if we enabled blocking)
      if (blockAppsEnabled) {
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
      }

      setSessionActive(false);
      setSelectedTasks([]);
      setSelectedTrip(null);
      setSessionStartTime(null);
    },
    [user?.id, selectedTrip, sessionStartTime, createSession, selectedTasks, stats, sessionType]
  );

  const handleMarkTasksComplete = useCallback(async (taskIds: string[]) => {
    for (const taskId of taskIds) {
      await toggleComplete(taskId);
    }
  }, [toggleComplete]);

  async function presentPaywall(): Promise<boolean> {
    // Prevent re-entrancy
    if (isPresentingPaywall) return false;
    setIsPresentingPaywall(true);

    try {
      return await presentPaywallOnce({
        userId: user?.id,
        source: 'focus_screen',
      });
    } finally {
      setIsPresentingPaywall(false);
    }
  }


  if (sessionActive && selectedTrip) {
    return (
      <FocusSessionScreen
        tasks={selectedTasks}
        trip={selectedTrip}
        onEndSession={handleEndSession}
        onMarkTasksComplete={handleMarkTasksComplete}
        mode={sessionType}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
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
            className={`w-full py-4 rounded-2xl items-center ${incompleteTasks.length > 0 ? 'bg-white' : 'bg-gray-800'
              }`}
            activeOpacity={0.85}
          >
            <Text
              className={`font-primary-bold text-base ${incompleteTasks.length > 0 ? 'text-background' : 'text-gray-600'
                }`}
            >
              {incompleteTasks.length > 0 ? 'Start Focus Session' : 'Add a task to begin'}
            </Text>
          </TouchableOpacity>

          {incompleteTasks.length === 0 && (
            <Text className="text-gray-500 font-primary-medium text-xs mt-3 text-center">
              You’re all clear. Add a task to schedule your next focus trip.
            </Text>
          )}
        </View>


        {/* Terraforming planet progression */}
        {/* Focus Stats */}
        {stats && stats.totalSessions > 0 ? (
          <View className="pb-6">
            <Text className="text-lg font-primary-bold text-white ml-2 my-4">
              Focus Statistics
            </Text>

            <View className="flex-row flex-wrap gap-3">
              {/* Total Sessions */}
              <View className="w-[48%] bg-card rounded-2xl p-4 items-start justify-between">
                <View className="flex-row items-center gap-x-2 mb-3">
                  <View className="w-8 h-8 rounded-2xl bg-indigo-500/20 items-center justify-center">
                    <SimpleLineIcons name="rocket" size={18} color="#818CF8" />
                  </View>
                  <Text className="text-gray-400 font-primary-medium text-xs">
                    Total Sessions
                  </Text>
                </View>
                <Text className="text-white font-primary-bold text-2xl">
                  {stats.totalSessions}
                </Text>
              </View>

              {/* Total Focus Time */}
              <View className="w-[48%] bg-card rounded-2xl p-4 items-start justify-between">
                <View className="flex-row items-center gap-x-2 mb-3">
                  <View className="w-8 h-8 rounded-2xl bg-emerald-500/20 items-center justify-center">
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={18}
                      color="#34D399"
                    />
                  </View>
                  <Text className="text-gray-400 font-primary-medium text-xs">
                    Total Focus Time
                  </Text>
                </View>
                <Text className="text-white font-primary-bold text-2xl">
                  {stats.totalMinutes}m
                </Text>
              </View>

              {/* Average Session (premium) */}
              <TouchableOpacity
                onPress={() => !user?.is_premium && presentPaywall()}
                activeOpacity={user?.is_premium ? 1 : 0.8}
                className="w-[48%]"
              >
                <View
                  className={`rounded-2xl p-4 items-start justify-between bg-card ${user?.is_premium ? '' : 'opacity-60'
                    }`}
                >
                  <View className="flex-row items-center gap-x-2 mb-3">
                    <View className="w-8 h-8 rounded-2xl bg-blue-500/20 items-center justify-center">
                      <Ionicons name="stats-chart-outline" size={18} color="#60A5FA" />
                    </View>
                    <Text className="text-gray-400 font-primary-medium text-xs">
                      Average Session
                    </Text>
                  </View>

                  {user?.is_premium ? (
                    <Text className="text-white font-primary-bold text-2xl">
                      {stats.averageSessionLength}m
                    </Text>
                  ) : (
                    <View className="flex-row items-center gap-x-1 mt-1">
                      <Text className="text-gray-500 font-primary-bold text-lg">
                        •••
                      </Text>
                      <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Focus Health (premium) */}
              <TouchableOpacity
                onPress={() => !user?.is_premium && presentPaywall()}
                activeOpacity={user?.is_premium ? 1 : 0.8}
                className="w-[48%]"
              >
                <View
                  className={`rounded-2xl p-4 items-start justify-between bg-card ${user?.is_premium ? '' : 'opacity-60'
                    }`}
                >
                  <View className="flex-row items-center gap-x-2 mb-3">
                    <View className="w-8 h-8 rounded-2xl bg-pink-500/20 items-center justify-center">
                      <Ionicons name="fitness" size={18} color="#FB7185" />
                    </View>
                    <Text className="text-gray-400 font-primary-medium text-xs">
                      Focus Health
                    </Text>
                  </View>

                  {user?.is_premium ? (
                    <View className="flex-row items-center">
                      <Text className="text-white font-primary-bold text-2xl mr-2">
                        {stats.focusHealthScore}
                      </Text>
                      <View
                        className={`px-2 py-1 rounded-full ${stats.focusHealthScore >= 80
                          ? 'bg-green-500/20'
                          : stats.focusHealthScore >= 60
                            ? 'bg-yellow-500/20'
                            : stats.focusHealthScore >= 40
                              ? 'bg-orange-500/20'
                              : 'bg-red-500/20'
                          }`}
                      >
                        <Text
                          className={`text-[10px] font-primary-bold ${stats.focusHealthScore >= 80
                            ? 'text-green-400'
                            : stats.focusHealthScore >= 60
                              ? 'text-yellow-400'
                              : stats.focusHealthScore >= 40
                                ? 'text-orange-400'
                                : 'text-red-400'
                            }`}
                        >
                          {stats.focusHealthScore >= 80
                            ? 'Excellent'
                            : stats.focusHealthScore >= 60
                              ? 'Good'
                              : stats.focusHealthScore >= 40
                                ? 'Fair'
                                : 'Needs Work'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-x-1 mt-1">
                      <Text className="text-gray-500 font-primary-bold text-lg">
                        •••
                      </Text>
                      <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Deep Focus Days (premium) */}
              <TouchableOpacity
                onPress={() => !user?.is_premium && presentPaywall()}
                activeOpacity={user?.is_premium ? 1 : 0.8}
                className="w-[48%]"
              >
                <View
                  className={`rounded-2xl p-4 items-start justify-between bg-card ${user?.is_premium ? '' : 'opacity-60'
                    }`}
                >
                  <View className="flex-row items-center gap-x-2 mb-3">
                    <View className="w-8 h-8 rounded-2xl bg-sky-500/20 items-center justify-center">
                      <Ionicons name="moon-outline" size={18} color="#38BDF8" />
                    </View>
                    <Text className="text-gray-400 font-primary-medium text-xs">
                      Deep Focus Days
                    </Text>
                  </View>

                  {user?.is_premium ? (
                    <View>
                      <Text className="text-white font-primary-bold text-2xl">
                        {stats.deepFocusDays}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-x-1 mt-1">
                      <Text className="text-gray-500 font-primary-bold text-lg">
                        •••
                      </Text>
                      <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Distance Traveled (premium) */}
              <TouchableOpacity
                onPress={() => !user?.is_premium && presentPaywall()}
                activeOpacity={user?.is_premium ? 1 : 0.8}
                className="w-[48%]"
              >
                <View
                  className={`rounded-2xl p-4 items-start justify-between bg-card ${user?.is_premium ? '' : 'opacity-60'
                    }`}
                >
                  <View className="flex-row items-center gap-x-2 mb-3">
                    <View className="w-8 h-8 rounded-2xl bg-purple-500/20 items-center justify-center">
                      <Ionicons name="planet-outline" size={18} color="#A78BFA" />
                    </View>
                    <Text className="text-gray-400 font-primary-medium text-xs">
                      Distance Traveled
                    </Text>
                  </View>

                  {user?.is_premium ? (
                    <Text className="text-white font-primary-bold text-2xl">
                      {formatDistanceWithUnit(stats.totalDistanceKm, distanceUnit)}
                    </Text>
                  ) : (
                    <View className="flex-row items-center gap-x-1 mt-1">
                      <Text className="text-gray-500 font-primary-bold text-lg">
                        •••
                      </Text>
                      <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="pb-6">
            <Text className="text-lg font-primary-bold text-white mb-4">
              Focus Statistics
            </Text>
            <View className="bg-card rounded-2xl p-12 gap-y-5 items-center">
              <Text className="text-gray-200 text-lg text-center font-primary-medium">
                No stats available yet
              </Text>
            </View>
          </View>
        )}
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
