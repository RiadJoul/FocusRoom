import { Task } from '@/lib/stores/taskStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeOutLeft,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Model3DViewer } from './Space3DViewer';
import { SpaceMapViewer } from './SpaceMapViewer';
import { PlanetTrip, formatDistance } from './PlanetTrips';
import * as Notifications from 'expo-notifications';

interface FocusSessionScreenProps {
  tasks: Task[];
  trip: PlanetTrip;
  onEndSession: (duration: number, tasksCompleted: string[]) => void;
  onMarkTasksComplete: (taskIds: string[]) => void;
  mode?: '3d' | 'map';
}


export function FocusSessionScreen({
  tasks,
  trip,
  onEndSession,
  onMarkTasksComplete,
  mode = '3d',
}: FocusSessionScreenProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(trip.duration);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const [allTasksSwiped, setAllTasksSwiped] = useState(false);
  const [showTaskOverlay, setShowTaskOverlay] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [sessionEndTimestamp, setSessionEndTimestamp] = useState<number>(
    () => Date.now() + trip.duration * 1000
  );
  const pauseStartedAtRef = useRef<number | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  // Setup and play ambient sound
  useEffect(() => {
    let sound: Audio.Sound | null = null;

    const setupSound = async () => {
      try {
        // Set audio mode for ambient playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        // Try to load the deep ambient sound
        try {
          const { sound: loadedSound } = await Audio.Sound.createAsync(
            require('@/assets/sounds/space-rumble.mp3'),
            {
              isLooping: true,
              volume: 0.3,
            },
            null,
            true
          );

          sound = loadedSound;
          soundRef.current = loadedSound;
          await loadedSound.playAsync();
        } catch (soundError) {
          console.warn('⚠️ Space rumble sound file not found. Add space-rumble.mp3 to assets/sounds/');
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
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
    };
  }, []);

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

  // Stop sound when session ends
  useEffect(() => {
    if (sessionEnded && soundRef.current) {
      soundRef.current.stopAsync();
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
          // Use an absolute fire date to avoid any ambiguity with relative seconds.
          trigger: new Date(fireTime),
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
          () => {},
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setRemainingSeconds(Math.ceil(remainingMs / 1000));
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
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        // Pausing: remember when we paused so we can shift end time on resume.
        pauseStartedAtRef.current = Date.now();
      } else if (pauseStartedAtRef.current) {
        // Resuming: push the end timestamp forward by the paused duration.
        const pauseDuration = Date.now() - pauseStartedAtRef.current;
        setSessionEndTimestamp((prevEnd) => prevEnd + pauseDuration);
        pauseStartedAtRef.current = null;
      }
      return next;
    });
  };

  const handleMuteToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
  };

  const handleEndSession = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'End Session?',
      'Are you sure you want to end your focus session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            setSessionEnded(true);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          },
        },
      ]
    );
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

  const handleCompleteTask = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCompletedTaskIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(taskId);

      // If every task for this session has been swiped right, trigger finish
      if (newSet.size === tasks.length) {
        setAllTasksSwiped(true);
      }

      return newSet;
    });
  };

  // Finish session in a side-effect when all tasks have been swiped
  useEffect(() => {
    if (!allTasksSwiped) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const completedIds = Array.from(completedTaskIds);
    const elapsedSeconds = trip.duration - remainingSeconds;
    onMarkTasksComplete(completedIds);
    onEndSession(elapsedSeconds, completedIds);
    setSessionEnded(true);
    router.back();
  }, [allTasksSwiped]);

  const handleFinishAndMarkComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const completedIds = Array.from(completedTaskIds);
    const elapsedSeconds = trip.duration - remainingSeconds;
    onMarkTasksComplete(completedIds);
    onEndSession(elapsedSeconds, completedIds);
    router.back();
  };

  const handleFinishWithoutMarking = () => {
    const elapsedSeconds = trip.duration - remainingSeconds;
    onEndSession(elapsedSeconds, []);
    router.back();
  };

  if (sessionEnded) {
    const elapsedSeconds = trip.duration - remainingSeconds;
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Animated.View entering={FadeIn.duration(600)} className="flex-1 items-center justify-center px-6">
          {/* Completion Animation */}
          <Animated.View entering={FadeInDown.delay(200)} className="items-center mb-8">
            <View className="mb-6">
              <Image
                source={require('../../assets/icons/ios-light.png')}
                style={{ width: 60, height: 60 }}
               
              />
            </View>
            <Text className="text-white font-primary-bold text-3xl mb-3 text-center">
              Journey Complete!
            </Text>
            <Text className="text-gray-400 font-primary-medium text-lg text-center">
              {trip.from} → {trip.to}
            </Text>
            <View className="flex-row items-center justify-center mt-3 gap-4">
              <View className="flex-row items-center bg-primary/10 border border-primary/30 px-4 py-2 rounded-xl">
                <MaterialCommunityIcons name="rocket" size={20} color="#818CF8" />
                <Text className="text-primary font-primary-bold text-base ml-2">
                  {formatDistance(trip.distance_km)}
                </Text>
              </View>
              <View className="flex-row items-center bg-primary/10 border border-primary/30 px-4 py-2 rounded-xl">
                <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                <Text className="text-gray-300 font-primary-bold text-base ml-2">
                  {formatTime(elapsedSeconds)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Tasks Summary */}
          <Animated.View entering={FadeInDown.delay(400)} className="w-full mb-8">
            <Text className="text-white font-primary-semibold text-lg mb-4">
              Mark tasks as complete ({completedTaskIds.size}/{tasks.length})
            </Text>
            {tasks.map((task) => {
              const isCompleted = completedTaskIds.has(task.id);
              return (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => handleToggleTaskComplete(task.id)}
                  className={`mb-3 p-4 rounded-xl border flex-row items-center ${
                    isCompleted ? 'bg-primary/10 border-primary' : 'bg-gray-900/50 border-gray-800'
                  }`}
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                      isCompleted ? 'border-primary bg-primary' : 'border-gray-700'
                    }`}
                  >
                    {isCompleted && (
                      <Text className="text-background font-primary-bold text-sm">✓</Text>
                    )}
                  </View>
                  <Text className={`flex-1 font-primary-medium ${isCompleted ? 'text-white' : 'text-gray-400'}`}>
                    {task.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.delay(600)} className="w-full gap-3">
            <TouchableOpacity
              onPress={handleFinishAndMarkComplete}
              disabled={completedTaskIds.size === 0}
              className={`py-4 rounded-xl items-center ${
                completedTaskIds.size > 0 ? 'bg-primary' : 'bg-gray-800'
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-primary-bold text-base ${
                  completedTaskIds.size > 0 ? 'text-background' : 'text-gray-600'
                }`}
              >
                Mark Complete & Finish
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFinishWithoutMarking}
              className="py-4 rounded-xl items-center bg-gray-900/50 border border-gray-800"
              activeOpacity={0.8}
            >
              <Text className="text-gray-400 font-primary-semibold text-base">Finish Without Marking</Text>
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
            <SpaceMapViewer />
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
        
        {/* Progress Track - Right Side */}
        <View className="absolute right-6 top-28 bottom-16" style={{ width: 4 }}>
          {/* Track Background */}
          <View className="absolute inset-0 bg-gray-800/50 rounded-full" />
          
          {/* Progress Fill */}
          <Animated.View 
            className="absolute bottom-0 left-0 right-0 bg-primary rounded-full"
            style={{
              height: `${((trip.duration - remainingSeconds) / trip.duration) * 100}%`,
            }}
          />
          
          {/* Rocket Icon */}
          <Animated.View 
            className="absolute -left-3"
            style={{
              bottom: `${((trip.duration - remainingSeconds) / trip.duration) * 100}%`,
              transform: [{ translateY: 10 }],
            }}
          >
            <Text className="text-3xl pr-12">
              <MaterialCommunityIcons name="rocket-outline" size={24} color="white" />
            </Text>
          </Animated.View>
          
          {/* Start Point */}
          <View className="" />
          
          {/* End Point */}
          <View className="">
            <Text className="absolute -top-7 -left-3 text-xl pr-12">
              <Ionicons name="planet-outline" size={24} color="white" />
            </Text>
          </View>
        </View>
        
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
              
              <TouchableOpacity
                onPress={handleMuteToggle}
                className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isMuted ? 'volume-mute' : 'volume-medium'} 
                  size={24} 
                  color={isMuted ? '#9CA3AF' : '#FFFFFF'} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowTaskOverlay((prev) => !prev)}
                className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showTaskOverlay ? 'eye' : 'eye-off'}
                  size={22}
                  color={showTaskOverlay ? '#FFFFFF' : '#9CA3AF'}
                />
              </TouchableOpacity>
              
              {isPaused && (
                <TouchableOpacity
                  onPress={handleEndSession}
                  className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={28} color="#EF4444" />
                </TouchableOpacity>
              )}
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

            {/* Right Side - Empty for balance */}
            <View className="w-12" />
          </View>
        </Animated.View>

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
              {formatDistance(remainingDistance)}
            </Text>
          </View>
        </Animated.View>

        {/* Tasks drawer - swipe right to complete */}
        {tasks.length > 0 && showTaskOverlay && (
          <Animated.View
            entering={FadeInLeft.delay(300)}
            exiting={FadeOutLeft.duration(200)}
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{ width: 260 }}
          >
            <View
              className="rounded-r-lg rounded-l-none px-3 py-3 border border-primary/40 border-l-0"
              style={{
                backgroundColor: '#020617EE',
                shadowColor: '#4F46E5',
                shadowOpacity: 0.35,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center mr-2">
                    <MaterialCommunityIcons
                      name="gesture-swipe-right"
                      size={16}
                      color="#E5E7EB"
                    />
                  </View>
                  <View>
                    <Text className="text-gray-100 font-primary-semibold text-xs tracking-widest">
                      MISSION TASKS
                    </Text>
                    <Text className="text-gray-500 font-primary-medium text-[10px]">
                      Swipe right to confirm
                    </Text>
                  </View>
                </View>
                <View className="px-2 py-1 rounded-lg bg-primary/15 border border-primary/40">
                  <Text className="text-primary font-primary-semibold text-[10px]">
                    {completedTaskIds.size}/{tasks.length}
                  </Text>
                </View>
              </View>

              <View style={{ maxHeight: 150 }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 4 }}
                >
                  {tasks.map((task) => {
                    const isCompleted = completedTaskIds.has(task.id);
                    if (isCompleted) return null;

                    return (
                      <Swipeable
                        key={task.id}
                        overshootLeft={false}
                        overshootRight={false}
                        onSwipeableOpen={() => handleCompleteTask(task.id)}
                        renderLeftActions={() => (
                          <View className="flex-1 bg-primary/40 justify-center rounded-lg ml-1 h-8">
                            <Text className="text-background font-primary-bold text-xs pl-4 tracking-wide">
                              Complete
                            </Text>
                          </View>
                        )}
                      >
                        <View className="mb-2 px-3 py-2 rounded-lg bg-slate-900/95 border border-slate-700/80 flex-row items-center">
                          <View
                            className="w-3 h-3 rounded-lg mr-2 bg-secondary/60"
                            
                          />
                          <View className="flex-1">
                            <Text
                              className="text-white font-primary-medium text-xs"
                              numberOfLines={1}
                            >
                              {task.title}
                            </Text>
                          </View>
                        </View>
                      </Swipeable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Animated.View>
        )}

        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}
