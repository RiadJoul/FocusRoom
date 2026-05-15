import { Task } from '@/lib/stores/taskStore';
import { useListStore } from '@/lib/stores/listStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Platform, Image, useWindowDimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { MissionShareCard, SHARE_CARD_WIDTH } from '@/components/shared/MissionShareCard';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Model3DViewer } from './Space3DViewer';
import { SpaceMapViewer } from './SpaceMapViewer';
import { PlanetTrip } from './PlanetTrips';
import * as Notifications from 'expo-notifications';
import { formatDueDate } from '@/lib/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '@/lib/stores/userStore';
import { formatDistanceWithUnit } from '@/lib/utils/distance';
import { clearMissionState, updateMissionState, updateMissionProgress } from '@/lib/missionState';

interface FocusSessionScreenProps {
  tasks: Task[];
  trip: PlanetTrip;
  onEndSession: (duration: number, tasksCompleted: string[]) => void;
  onMarkTasksComplete: (taskIds: string[]) => void;
  onDismiss: () => void;
  mode?: '3d' | 'map';
  onChangeMode?: (mode: '3d' | 'map') => void;
  onSessionTimerComplete?: () => void;
}


export function FocusSessionScreen({
  tasks,
  trip,
  onEndSession,
  onMarkTasksComplete,
  onDismiss,
  mode = '3d',
  onChangeMode,
  onSessionTimerComplete,
}: FocusSessionScreenProps) {
  type AmbientSoundKey = 'space-rumble' | 'rain-drops';

  const lists = useListStore((state) => state.lists);
  const [remainingSeconds, setRemainingSeconds] = useState(trip.duration);
  const [isPaused, setIsPaused] = useState(false);
  const [mapZoomedOut, setMapZoomedOut] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [completionStep, setCompletionStep] = useState<1 | 2>(1);
  const [, setSessionFailed] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const [ambientSoundKey, setAmbientSoundKey] = useState<AmbientSoundKey>('space-rumble');
  const DEFAULT_VOLUME = 0.35;
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [sessionEndTimestamp, setSessionEndTimestamp] = useState<number>(
    () => Date.now() + trip.duration * 1000
  );
  const notificationIdRef = useRef<string | null>(null);
  const lastMissionProgressBucketRef = useRef(0);
  const distanceUnit = useUserStore((s) => s.distanceUnit);
  const user = useUserStore((s) => s.user);

  // Share-after-session
  const shareCardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const handleShare = async () => {
    if (!shareCardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      // user cancelled or share failed — silently ignore
    } finally {
      setIsSharing(false);
    }
  };

  // Load preferred ambient sound from storage
  useEffect(() => {
    const loadPreferredSound = async () => {
      try {
        const stored = await AsyncStorage.getItem('focus_ambient_sound');
        if (stored === 'space-rumble' || stored === 'rain-drops') {
          setAmbientSoundKey(stored);
        }
      } catch {
        // ignore storage errors
      }
    };

    loadPreferredSound();
  }, []);

  // Start Live Activity for premium users on iOS when the session begins.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!user?.is_premium) return;

    const liveTitle = `${trip.from} → ${trip.to}`;

    updateMissionState({
      title: liveTitle,
      endTimestampSeconds: Math.floor(sessionEndTimestamp / 1000),
      progress: 0,
    }).catch(() => { });

    return () => {
      clearMissionState().catch(() => { });
    };
    // We intentionally run this only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup and play ambient sound
  useEffect(() => {
    let cancelled = false;

    const loadSoundForKey = (key: AmbientSoundKey) => {
      if (key === 'rain-drops') {
        return require('@/assets/sounds/rain-drops.mp3');
      }
      return require('@/assets/sounds/space-rumble.mp3');
    };

    const setupSound = async () => {
      try {
        // Set audio mode for ambient playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        // Clean up any previous sound instance
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
          } catch {
            // ignore
          }
          try {
            await soundRef.current.unloadAsync();
          } catch {
            // ignore
          }
          soundRef.current = null;
        }

        // Try to load the selected ambient sound
        try {
          const { sound: loadedSound } = await Audio.Sound.createAsync(
            loadSoundForKey(ambientSoundKey),
            {
              isLooping: true,
              volume: DEFAULT_VOLUME,
            },
            null,
            true
          );

          if (cancelled) {
            await loadedSound.unloadAsync();
            return;
          }

          soundRef.current = loadedSound;
          if (!isPaused && !isMuted && !sessionEnded) {
            await loadedSound.playAsync();
          }
        } catch (soundError) {
          console.warn(
            '⚠️ Ambient sound file not found. Ensure space-rumble.mp3 and rain-drops.mp3 exist in assets/sounds/',
            soundError
          );
          console.warn('The focus session will work without sound.');
        }
      } catch (error) {
        console.error('Failed to setup audio:', error);
      }
    };

    setupSound();

    return () => {
      // Cleanup sound on unmount
      if (soundRef.current) {
        soundRef.current
          .unloadAsync()
          .catch(() => {
            // ignore unload errors if sound was never fully loaded
          });
        soundRef.current = null;
      }
      cancelled = true;
    };
  }, [ambientSoundKey]);

  // Handle pause/resume of sound
  useEffect(() => {
    if (soundRef.current) {
      if (isPaused || isMuted) {
        soundRef.current.pauseAsync();
      } else if (!sessionEnded) {
        soundRef.current.playAsync();
      }
    }
  }, [isPaused, sessionEnded, isMuted]);

  // Stop (and unload) sound when session ends so debrief is quiet.
  useEffect(() => {
    if (!sessionEnded) return;

    const stopSound = async () => {
      if (!soundRef.current) return;
      try {
        await soundRef.current.stopAsync();
      } catch {
        // ignore if already stopped
      }
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore if not fully loaded
      }
      soundRef.current = null;
    };

    stopSound();

    // End any active Live Activity as soon as the session ends so the
    // lock‑screen card disappears instead of lingering until we leave
    // the debrief screen.
    if (Platform.OS === 'ios') {
      clearMissionState().catch(() => { });
    }
  }, [sessionEnded]);

  // Schedule a completion notification once, based on the expected end time.
  // The OS will deliver it at the absolute fire date, even if the app is
  // backgrounded. We cancel and reschedule whenever the end timestamp changes
  // (for example when pausing/resuming), or when the session ends early.
  useEffect(() => {
    const schedule = async () => {
      // Clear any existing scheduled notification first
      if (notificationIdRef.current) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        } catch {
          // ignore
        }
        notificationIdRef.current = null;
      }

      if (sessionEnded || isPaused) return;

      const fireTime = sessionEndTimestamp;
      if (fireTime <= Date.now()) return;

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Journey complete ✨',
            body: `Your focus session from ${trip.from} to ${trip.to} has finished.`,
            sound: true,
            data: { type: 'focus_session_complete' },
          },
          // Use an absolute fire date trigger (new API shape).
          trigger: {
            type: 'date',
            date: new Date(fireTime),
          } as Notifications.NotificationTriggerInput,
        });
        notificationIdRef.current = id;
      } catch (err) {
        console.error('Failed to schedule session completion notification:', err);
      }
    };

    schedule();

    // Cleanup on unmount
    return () => {
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(
          () => { },
        );
        notificationIdRef.current = null;
      }
    };
  }, [sessionEndTimestamp, isPaused, sessionEnded, trip.from, trip.to]);

  // Countdown timer based on absolute end timestamp.
  // This keeps the session progressing correctly even if the app is backgrounded.
  useEffect(() => {
    if (isPaused || sessionEnded) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const remainingMs = sessionEndTimestamp - Date.now();
      if (remainingMs <= 0) {
        if (!sessionEnded) {
          setRemainingSeconds(0);
          setSessionEnded(true);
          onSessionTimerComplete?.();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        const nextRemainingSeconds = Math.ceil(remainingMs / 1000);
        setRemainingSeconds(nextRemainingSeconds);

        // Update Live Activity progress in coarse steps (every 10%) for
        // premium iOS users while the app is in the foreground.
        if (Platform.OS === 'ios' && user?.is_premium) {
          const fraction = 1 - nextRemainingSeconds / trip.duration;
          const clamped = Math.max(0, Math.min(1, fraction));
          // Bucket into 10% steps: 0.0, 0.1, 0.2, ...
          const bucket = Math.floor(clamped * 10) / 10;
          if (bucket > lastMissionProgressBucketRef.current) {
            lastMissionProgressBucketRef.current = bucket;
            updateMissionProgress(bucket).catch(() => { });
          }
        }
      }
    };

    // Run once immediately to sync after resume, then every second.
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, sessionEnded, sessionEndTimestamp]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRemainingTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hrs > 0) {
      if (mins > 0) {
        return `${hrs}h${mins}min`;
      }
      return `${hrs}h`;
    }
    return `${mins}min`;
  };

  // Calculate remaining distance based on progress
  const remainingDistance = Math.floor((remainingSeconds / trip.duration) * trip.distance_km);



  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowGiveUpMenu(false);
    setIsPaused((prev) => {
      const next = !prev;

      if (next) {
        // Pausing: stop the Live Activity so the lock‑screen card
        // does not keep counting down while the session is paused.
        if (Platform.OS === 'ios' && user?.is_premium) {
          clearMissionState().catch(() => { });
        }
      } else {
        // Resuming: recompute the end timestamp from the *current*
        // remaining seconds and restart the Live Activity with that
        // updated end time.
        const newEnd = Date.now() + remainingSeconds * 1000;
        setSessionEndTimestamp(newEnd);

        if (Platform.OS === 'ios' && user?.is_premium) {
          const liveTitle = `${trip.from} → ${trip.to}`;
          updateMissionState({
            title: liveTitle,
            endTimestampSeconds: Math.floor(newEnd / 1000),
            progress: 1 - remainingSeconds / trip.duration,
          }).catch(() => { });
        }
      }

      return next;
    });
  };

  const handleMuteToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
  };

  const handleToggleTaskComplete = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };



  const handleFinishAndMarkComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const completedIds = Array.from(completedTaskIds);
    const elapsedSeconds = trip.duration - remainingSeconds;
    onMarkTasksComplete(completedIds);
    onEndSession(elapsedSeconds, completedIds);
    setCompletionStep(2);
  };

  const handleFinishWithoutMarking = () => {
    const elapsedSeconds = trip.duration - remainingSeconds;
    onEndSession(elapsedSeconds, []);
    onDismiss();
  };

  const [showGiveUpMenu, setShowGiveUpMenu] = useState(false);
  const giveUpProgress = useSharedValue(0);
  const giveUpHapticsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const giveUpCompletedRef = useRef(false);
  const giveUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopGiveUpHaptics = () => {
    if (giveUpHapticsRef.current) {
      clearInterval(giveUpHapticsRef.current);
      giveUpHapticsRef.current = null;
    }
    if (giveUpTimeoutRef.current) {
      clearTimeout(giveUpTimeoutRef.current);
      giveUpTimeoutRef.current = null;
    }
  };

  const handleGiveUpConfirmed = () => {
    if (giveUpCompletedRef.current) return;
    giveUpCompletedRef.current = true;
    stopGiveUpHaptics();
    setShowGiveUpMenu(false);
    setSessionFailed(true);
    setSessionEnded(true);
    onSessionTimerComplete?.();

    // Stop any ambient sounds immediately to avoid audio glitches
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => { });
      soundRef.current.unloadAsync().catch(() => { });
      soundRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleGiveUpHoldStart = () => {
    // Continuous light haptics while holding.
    giveUpCompletedRef.current = false;
    stopGiveUpHaptics();
    giveUpHapticsRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }, 10);

    giveUpProgress.value = 0;
    giveUpProgress.value = withTiming(1, { duration: 1300 });

    // JS timeout mirrors the animation duration to finalize give up
    giveUpTimeoutRef.current = setTimeout(() => {
      if (giveUpCompletedRef.current) return;
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => { });
      handleGiveUpConfirmed();
    }, 1300);
  };

  const handleGiveUpHoldCancel = () => {
    if (giveUpCompletedRef.current) return;
    stopGiveUpHaptics();
    giveUpProgress.value = withTiming(0, { duration: 180 });
  };

  const giveUpFillStyle = useAnimatedStyle(() => ({
    width: `${giveUpProgress.value * 100}%`,
  }));
  const giveUpTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      giveUpProgress.value,
      [0, 1],
      ['#000000', '#ffffff'],
    ),
  }));

  if (sessionEnded) {
    const elapsedSeconds = trip.duration - remainingSeconds;
    const progress =
      trip.duration > 0 ? Math.min(1, Math.max(0, elapsedSeconds / trip.duration)) : 0;
    const travelledDistanceKm = Math.floor(trip.distance_km * progress);
    const tasksCompletedCount = completedTaskIds.size;
    const totalTasks = tasks.length;

    if (completionStep === 2) {
      return (
        <SafeAreaView className="flex-1 bg-black">
          <TouchableOpacity
            onPress={() => setCompletionStep(1)}
            activeOpacity={0.7}
            className="px-5 pt-2 pb-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Animated.View
            entering={FadeIn.duration(400)}
            className="flex-1 items-center justify-center px-6"
          >
            <Animated.View entering={FadeInDown.delay(100)} className="items-center mb-8">
              <Text className="text-white font-primary-bold text-2xl text-center mb-2">
                Share your mission
              </Text>
              <Text className="text-gray-500 font-primary-medium text-sm text-center">
                Show the world what you accomplished.
              </Text>
            </Animated.View>

            {/* Card preview */}
            <Animated.View entering={FadeInDown.delay(200)} style={{
              transform: [{ scale: (screenWidth - 48) / SHARE_CARD_WIDTH }],
              marginBottom: -((SHARE_CARD_WIDTH - (screenWidth - 48)) * 0.3),
            }}>
              <MissionShareCard
                ref={shareCardRef}
                trip={trip}
                elapsedSeconds={trip.duration - remainingSeconds}
                completedTasks={tasks.filter(t => completedTaskIds.has(t.id))}
                totalTasks={tasks.length}
                date={new Date()}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300)} className="w-full gap-3 mt-6">
              <TouchableOpacity
                onPress={handleShare}
                disabled={isSharing}
                activeOpacity={0.85}
                className="bg-white rounded-2xl py-4 items-center flex-row justify-center gap-2"
                style={{ opacity: isSharing ? 0.6 : 1 }}
              >
                <Ionicons name="share-social-outline" size={20} color="#000" />
                <Text className="font-primary-bold text-base text-black">
                  {isSharing ? 'Preparing…' : 'Share'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text className="text-gray-300 font-primary-medium text-base text-center py-2">
                  Skip
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView className="flex-1 bg-black">
        <Animated.View
          entering={FadeIn.duration(600)}
          className="flex-1 items-center justify-center px-6"
        >
          {/* Mission debrief */}
          <Animated.View
            entering={FadeInDown.delay(180)}
            className="w-full mb-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-secondary/95 border border-white/10 px-5 py-6"
          >
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 items-center justify-center mb-3">
                <MaterialCommunityIcons name="rocket-launch-outline" size={30} color="#a855f7" />
              </View>
              <Text className="text-gray-400 font-primary-medium text-[11px] uppercase tracking-[0.16em]">
                Journey complete
              </Text>
              <Text className="text-white font-primary-bold text-3xl mt-2 text-center">
                Mission debrief
              </Text>
              <Text className="text-gray-400 font-primary-medium text-base mt-2 text-center">
                {trip.from} → {trip.to}
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-4">
              <View className="flex-1 mr-2 rounded-xl bg-black/80 border border-white/30 px-3 py-2">
                <Text className="text-gray-400 font-primary-medium text-[11px] tracking-[0.14em] uppercase">
                  Distance flown
                </Text>
                <View className="flex-row items-center mt-1.5">
                  <MaterialCommunityIcons name="rocket" size={18} color="#818CF8" />
                  <Text className="text-primary font-primary-bold text-lg ml-1.5">
                    {formatDistanceWithUnit(travelledDistanceKm, distanceUnit)}
                  </Text>
                </View>
              </View>
              <View className="flex-1 ml-2 rounded-xl bg-black/80 border border-white/30 px-3 py-2">
                <Text className="text-gray-400 font-primary-medium text-[11px] tracking-[0.14em] uppercase">
                  Time in orbit
                </Text>
                <View className="flex-row items-center mt-1.5">
                  <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                  <Text className="text-gray-100 font-primary-bold text-lg ml-1.5">
                    {formatTime(elapsedSeconds)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-4 rounded-xl bg-black/80 border border-white/30 px-3 py-4 flex-row items-center justify-between">
              <View>
                <Text className="text-gray-400 font-primary-medium text-sm tracking-[0.16em] uppercase">
                  Mission tasks
                </Text>
              </View>
              <View>
                <Text className="text-gray-100 font-primary-semibold text-sm">
                  {tasksCompletedCount}/{totalTasks} completed
                </Text>
              </View>

            </View>
          </Animated.View>

          {/* Tasks Summary */}
          <Animated.View entering={FadeInDown.delay(360)} className="w-full mb-8">
            <Text className="text-white font-primary-semibold text-lg mb-2">
              Log what you finished
            </Text>
            <Text className="text-gray-500 font-primary-medium text-xs mb-4">
              Tap tasks you actually completed during this flight.
            </Text>
            {tasks.map((task) => {
              const isCompleted = completedTaskIds.has(task.id);
              const list = lists.find((l) => l.id === task.list_id);

              return (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => handleToggleTaskComplete(task.id)}
                  className={`mb-3 p-4 rounded-2xl`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start">
                    {/* Completion ring, matching TaskList style */}
                    <View
                      style={{
                        borderColor: '#9CA3AF',
                        borderWidth: 2,
                      }}
                      className="w-6 h-6 rounded-lg mr-3 items-center justify-center overflow-hidden"
                    >
                      {isCompleted && (
                        <View style={{ backgroundColor: list?.color || '#4B5563' }} className="absolute inset-0 items-center justify-center">
                          <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                      )}
                    </View>

                    {/* Task content */}
                    <View className="flex-1">
                      <Text
                        className={`font-primary-semibold text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-white'
                          }`}
                        numberOfLines={2}
                      >
                        {task.title}
                      </Text>

                      <View className="flex-row items-center mt-1 flex-wrap">
                        {/* List badge */}
                        {list && (
                          <View
                            className="flex-row items-center px-2 py-0.5 rounded-full mr-2"
                            style={{
                              backgroundColor: `${list.color ?? '#4B5563'}33`,
                            }}
                          >
                            {list.icon && (
                              <Ionicons
                                name={list.icon as any}
                                size={11}
                                color={list.color || '#E5E7EB'}
                              />
                            )}
                            <Text
                              className="ml-1 text-[10px] font-primary-medium"
                              style={{
                                color: list.color || '#E5E7EB',
                              }}
                            >
                              {list.title}
                            </Text>
                          </View>
                        )}
                        {/* Priority badge */}
                        <View
                          className={`flex-row items-center  py-0.5 rounded-full mr-2`}
                        >
                          <Text
                            className="text-[10px] font-primary-medium capitalize"
                            style={{
                              color:
                                task.priority === 'high'
                                  ? '#ef4444'
                                  : task.priority === 'medium'
                                    ? '#eab308'
                                    : task.priority === 'low'
                                      ? '#22c55e'
                                      : '#9CA3AF',
                            }}
                          >
                            {task.priority}
                          </Text>
                        </View>




                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.delay(520)} className="w-full gap-3">
            <TouchableOpacity
              onPress={handleFinishAndMarkComplete}
              className="py-4 rounded-2xl items-center bg-white"
              activeOpacity={0.8}
            >
              <Text className="font-primary-bold text-base text-black">
                Save journey & tasks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFinishWithoutMarking}
              activeOpacity={0.8}
            >
              <Text className="text-gray-300 font-primary-medium text-base text-center py-2">
                Skip
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1">
        {/* Background visual (3D or space map) */}
        {mode === 'map' ? (
          <View className="absolute inset-0">
            <SpaceMapViewer
              progress={
                trip.duration > 0
                  ? Math.min(1, Math.max(0, (trip.duration - remainingSeconds) / trip.duration))
                  : 0
              }
              duration={trip.duration}
              zoomedOut={mapZoomedOut}
            />
          </View>
        ) : (
          <Animated.View
            entering={FadeIn.delay(300)}
            className="absolute inset-0"
            style={{ width: '100%', height: '100%' }}
          >
            <Model3DViewer autoRotate={!isPaused} timerSeconds={remainingSeconds} />
          </Animated.View>
        )}

        {/* UI Overlay */}
        <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>



          {/* Header with Timer */}
          <Animated.View entering={FadeInDown} className="px-6 py-4">
            <View className="flex-row items-star justify-between">
              {/* Left Side - Pause, Mute and Exit */}
              <View className="flex-col gap-2">
                <TouchableOpacity
                  onPress={handlePause}
                  className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Timer Display */}
              <View className="flex-1 items-center">
                <View className="bg-black/60 px-8 py-3 rounded-2xl">
                  <Text className="text-white font-primary-bold text-xl tracking-wider">
                    Arriving in {formatRemainingTime(remainingSeconds)}
                  </Text>
                  <Text className="text-gray-300 font-primary-medium text-sm mt-1 text-center">
                    {isPaused ? 'PAUSED' : trip.to.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Right Side - Toggle 3D/2D */}
              <View>
                <TouchableOpacity
                  onPress={() => {
                    const next = mode === 'map' ? '3d' : 'map';
                    onChangeMode?.(next);
                  }}
                  activeOpacity={0.8}
                  className="flex-col items-center rounded-xl bg-gray-200 px-1.5 py-1 border-2 border-gray-700"
                >
                  
                  {
                    mode === 'map' ?
                      <Image
                        source={require('@/assets/icons/cockpit.png')}
                        style={{ width: 25, height: 25  }}
                      /> :
                      <Image
                        source={require('@/assets/icons/rocket.png')}
                        style={{ width: 25, height: 25 }}
                      />

                  }
                  <Text className="text-xs font-primary-medium text-gray-800 ">
                    {mode === 'map' ? '3D' : '2D'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Zoom toggle — bottom-right, only in map mode */}
          {mode === 'map' && (
            <TouchableOpacity
              onPress={() => setMapZoomedOut(v => !v)}
              activeOpacity={0.7}
              className="absolute bottom-8 right-6 w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Ionicons name={mapZoomedOut ? 'contract' : 'expand'} size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}

          {/* Distance Remaining - Bottom Left */}
          <Animated.View
            entering={FadeIn.delay(300)}
            className="absolute bottom-8 left-6"
          >
            <View className="bg-black/60 px-4 py-2 rounded-xl border border-gray-700/30">
              <Text className="text-gray-400 font-primary-medium text-xs">
                Distance Left
              </Text>
              <Text className="text-white font-primary-bold text-lg mt-1">
                {formatDistanceWithUnit(remainingDistance, distanceUnit)}
              </Text>
            </View>
          </Animated.View>



          {/* Paused overlay – blur only, no extra color */}
          {isPaused && !sessionEnded && (
            <Animated.View
              entering={FadeIn.duration(500)}
              exiting={FadeOut.duration(250)}
              className="absolute inset-0"
              pointerEvents="box-none"
            >
              <BlurView intensity={45} tint="dark" className="flex-1 bg-transparent">
                <SafeAreaView className="flex-1">
                  {/* Top row: left resume, right menu */}
                  <View className="flex-row items-center justify-between px-5 pt-4">
                    <View className="flex-row items-center gap-x-3">
                      <TouchableOpacity
                        onPress={handlePause}
                        activeOpacity={0.8}
                        className="w-[52px] h-[52px] rounded-2xl bg-white/80 items-center justify-center"
                      >
                        <Ionicons name="play" size={24} color="#000000" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => { });
                          setShowSoundPicker((prev) => !prev);
                        }}
                        onLongPress={handleMuteToggle}
                        activeOpacity={0.8}
                        className="w-[52px] h-[52px] rounded-2xl bg-white/80 items-center justify-center"
                      >
                        <Ionicons
                          name={isMuted ? 'volume-mute' : 'volume-medium'}
                          size={22}
                          color="#000000"
                        />
                      </TouchableOpacity>
                    </View>

                    {
                      showGiveUpMenu ? (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPressIn={handleGiveUpHoldStart}
                          onPressOut={handleGiveUpHoldCancel}
                        >
                          <View className="rounded-full overflow-hidden bg-white">
                            <Animated.View
                              className="absolute top-0 bottom-0 left-0 bg-red-400"
                              style={giveUpFillStyle}
                            />
                            <View className="px-5 py-3 items-center justify-center">
                              <Animated.Text
                                className="font-primary-semibold text-lg"
                                style={giveUpTextStyle}
                              >
                                Hold to give up
                              </Animated.Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ) : <TouchableOpacity
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => { });
                          setShowGiveUpMenu((prev) => !prev);
                        }}
                        activeOpacity={0.8}
                        className="w-[50px] h-[50px] rounded-2xl bg-red-500/80 items-center justify-center"
                      >
                        <Ionicons name="exit-outline" size={28} color="#ffffff" />
                      </TouchableOpacity>
                    }

                  </View>

                  {/* Sound picker */}
                  {showSoundPicker && (
                    <View className="px-5 pt-5">
                      {/* Mute + volume pill */}
                      <View className="flex-row items-center justify-between mb-5">
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => { });
                            setIsMuted((prev) => !prev);
                          }}
                          activeOpacity={0.8}
                          className="flex-row items-center rounded-xl bg-black/60 px-3 py-1.5 border border-gray-700"
                        >
                          <Ionicons
                            name={isMuted ? 'volume-mute' : 'volume-medium'}
                            size={16}
                            color="#e5e7eb"
                          />
                          <Text className="ml-2 text-sm font-primary-medium text-gray-200">
                            {isMuted ? 'Turn on sound' : 'Turn off sound'}
                          </Text>
                        </TouchableOpacity>

                        {/* Volume slider removed per latest request */}
                      </View>

                      <View className="flex-row gap-x-3">
                        {/* Space rumble card */}
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={async () => {
                            Haptics.selectionAsync().catch(() => { });
                            setAmbientSoundKey('space-rumble');
                            setIsMuted(false);
                            try {
                              await AsyncStorage.setItem(
                                'focus_ambient_sound',
                                'space-rumble'
                              );
                            } catch {
                              // ignore
                            }
                          }}
                          className={`flex-1 rounded-2xl border px-3 py-3 flex-row items-center justify-between ${ambientSoundKey === 'space-rumble'
                            ? 'bg-white border-white'
                            : 'bg-black/60 border-gray-700'
                            }`}
                        >
                          <View className="flex-row items-center gap-x-2">
                            <View className="w-8 h-8 rounded-xl bg-black/80 items-center justify-center">
                              <MaterialCommunityIcons
                                name="rocket-launch-outline"
                                size={18}
                                color={ambientSoundKey === 'space-rumble' ? '#ffffff' : '#9CA3AF'}
                              />
                            </View>
                            <View>
                              <Text
                                className={`font-primary-semibold text-xs ${ambientSoundKey === 'space-rumble'
                                  ? 'text-black'
                                  : 'text-gray-200'
                                  }`}
                              >
                                Space flight
                              </Text>
                              <Text
                                className={`font-primary-medium text-[11px] ${ambientSoundKey === 'space-rumble'
                                  ? 'text-gray-700'
                                  : 'text-gray-400'
                                  }`}
                              >
                                cabin rumble
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center px-2 py-1 rounded-full bg-black/10">
                            <Text
                              className={`text-[11px] font-primary-semibold ${ambientSoundKey === 'space-rumble'
                                ? 'text-black'
                                : 'text-gray-400'
                                }`}
                            >
                              {ambientSoundKey === 'space-rumble' ? 'ON' : 'OFF'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Rain drops card */}
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={async () => {
                            Haptics.selectionAsync().catch(() => { });
                            setAmbientSoundKey('rain-drops');
                            setIsMuted(false);
                            try {
                              await AsyncStorage.setItem(
                                'focus_ambient_sound',
                                'rain-drops'
                              );
                            } catch {
                              // ignore
                            }
                          }}
                          className={`flex-1 rounded-2xl border px-3 py-6 flex-row items-center justify-between ${ambientSoundKey === 'rain-drops'
                            ? 'bg-white border-white'
                            : 'bg-black/60 border-gray-700'
                            }`}
                        >
                          <View className="flex-row items-center gap-x-2">
                            <View className="w-8 h-8 rounded-xl bg-black/80 items-center justify-center">
                              <MaterialCommunityIcons
                                name="weather-rainy"
                                size={18}
                                color={ambientSoundKey === 'rain-drops' ? '#ffffff' : '#9CA3AF'}
                              />
                            </View>
                            <View>
                              <Text
                                className={`font-primary-semibold text-xs ${ambientSoundKey === 'rain-drops'
                                  ? 'text-black'
                                  : 'text-gray-200'
                                  }`}
                              >
                                Rain drift
                              </Text>
                              <Text
                                className={`font-primary-medium text-[11px] ${ambientSoundKey === 'rain-drops'
                                  ? 'text-gray-700'
                                  : 'text-gray-400'
                                  }`}
                              >
                                Soft rainfall
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center px-2 py-1 rounded-full bg-black/10">
                            <Text
                              className={`text-[11px] font-primary-semibold ${ambientSoundKey === 'rain-drops'
                                ? 'text-black'
                                : 'text-gray-400'
                                }`}
                            >
                              {ambientSoundKey === 'rain-drops' ? 'ON' : 'OFF'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        
                      </View>
                    </View>
                  )}

                  {/* Center message */}
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-300 font-primary-semibold text-base mb-1">
                      Paused
                    </Text>
                    <Text className="text-white font-primary-bold text-3xl">
                      {formatTime(remainingSeconds)}
                    </Text>
                  </View>

                  {/* Tasks overview while paused */}
                  <View className="px-6 pb-4 max-h-56">
                    <Text className="text-gray-400 font-primary-medium text-xs mb-2">
                      Mission objectives ({tasks.length})
                    </Text>
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 4 }}
                    >
                      {tasks.map((task) => {
                        const isCompleted = completedTaskIds.has(task.id);
                        const list = lists.find((l) => l.id === task.list_id);
                        const dueLabel = task.due_date
                          ? formatDueDate(new Date(task.due_date))
                          : null;

                        return (
                          <TouchableOpacity
                            key={task.id}
                            onPress={() => handleToggleTaskComplete(task.id)}
                            activeOpacity={0.8}
                            className="mb-2 px-3 py-3 rounded-2xl bg-black/50 border border-gray-700/60"
                          >
                            <View className="flex-row items-start">
                              <View
                                className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 items-center justify-center ${isCompleted ? 'border-primary bg-primary' : 'border-gray-600'
                                  }`}
                              >
                                {isCompleted && (
                                  <Text className="text-background font-primary-bold text-xs">
                                    ✓
                                  </Text>
                                )}
                              </View>
                              <View className="flex-1">
                                <Text
                                  className={`font-primary-semibold text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-white'
                                    }`}
                                  numberOfLines={2}
                                >
                                  {task.title}
                                </Text>
                                <View className="flex-row items-center mt-1">
                                  {list && (
                                    <View
                                      className="flex-row items-center px-2 py-0.5 rounded-full mr-2"
                                      style={{
                                        backgroundColor: `${list.color ?? '#4B5563'}33`,
                                      }}
                                    >
                                      {list.icon && (
                                        <Ionicons
                                          name={list.icon as any}
                                          size={11}
                                          color={list.color || '#E5E7EB'}
                                        />
                                      )}
                                      <Text
                                        className="ml-1 text-[10px] font-primary-medium"
                                        style={{
                                          color: list.color || '#E5E7EB',
                                        }}
                                      >
                                        {list.title}
                                      </Text>
                                    </View>
                                  )}
                                  {dueLabel && (
                                    <View className="flex-row items-center">
                                      <Ionicons
                                        name="time-outline"
                                        size={11}
                                        color="#9CA3AF"
                                      />
                                      <Text className="ml-1 text-[10px] font-primary-medium text-gray-400">
                                        {dueLabel}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Bottom metrics */}
                  <View className="px-6 pb-8">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-gray-400 font-primary-medium text-xs mb-1">
                          Time Remaining
                        </Text>
                        <Text className="text-white font-primary-bold text-2xl">
                          {Math.max(0, Math.floor(remainingSeconds / 60))}{' '}
                          <Text className="text-gray-300 text-base">min</Text>
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-gray-400 font-primary-medium text-xs mb-1">
                          Distance Remaining
                        </Text>
                        <Text className="text-white font-primary-bold text-2xl">
                          {formatDistanceWithUnit(remainingDistance, distanceUnit)}
                        </Text>
                      </View>
                    </View>
                  </View>


                </SafeAreaView>
              </BlurView>
            </Animated.View>
          )}

        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}
