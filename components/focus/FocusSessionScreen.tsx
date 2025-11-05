import { Task } from '@/lib/stores/taskStore';
import { getPriorityColor } from '@/lib/utils/taskUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    FadeIn,
    FadeInDown,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Model3DViewer } from './Model3DViewer';

interface FocusSessionScreenProps {
  tasks: Task[];
  onEndSession: (duration: number, tasksCompleted: string[]) => void;
  onMarkTasksComplete: (taskIds: string[]) => void;
}

interface FocusTaskItemProps {
  task: Task;
  index: number;
  onComplete: (taskId: string) => void;
}

function FocusTaskItem({ task, index, onComplete }: FocusTaskItemProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const isCompleting = useSharedValue(false);

  const SWIPE_THRESHOLD = 100;

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(task.id);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow right swipe
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        
        // Scale effect based on swipe progress
        const progress = Math.min(event.translationX / SWIPE_THRESHOLD, 1);
        scale.value = 1 - progress * 0.05;
      }
    })
    .onEnd((event) => {
      // Right swipe - Complete task
      if (event.translationX > SWIPE_THRESHOLD && !isCompleting.value) {
        isCompleting.value = true;
        translateX.value = withTiming(400, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 300 }, () => {
          runOnJS(handleComplete)();
        });
      }
      // Spring back to original position
      else {
        translateX.value = withTiming(0, { duration: 200 });
        scale.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const checkIconStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.5, 1.2]) },
      ],
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress * 0.3,
    };
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(600 + index * 100)}
      className="mb-3"
    >
      {/* Background Indicator */}
      <Animated.View 
        style={backgroundStyle}
        className="absolute left-0 top-0 bottom-0 w-24 bg-primary rounded-xl flex items-center justify-center"
      >
        <Animated.View style={checkIconStyle}>
          <Text className="text-3xl">✓</Text>
        </Animated.View>
      </Animated.View>

      {/* Task Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={animatedStyle}
          className={`p-4 rounded-xl border bg-black/40 ${getPriorityColor(task.priority)}`}
        >
          <Text className="text-white font-primary-semibold text-base leading-tight">
            {task.title}
          </Text>
          <View className="flex-row items-center mt-2">
            <Text className="text-xs font-primary-medium capitalize" style={{
              color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#eab308' : '#22c55e'
            }}>
              {task.priority} priority
            </Text>
            <Text className="text-gray-400 text-xs font-primary-medium ml-3">
              👉 Swipe right to complete
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export function FocusSessionScreen({ tasks, onEndSession, onMarkTasksComplete }: FocusSessionScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer
  useEffect(() => {
    if (!isPaused && !sessionEnded) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, sessionEnded]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(!isPaused);
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
    setCompletedTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.add(taskId);
      
      // Check if all tasks are now completed
      if (newSet.size === tasks.length) {
        // Auto-end session after a short delay
        setTimeout(() => {
          setSessionEnded(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }, 500);
      }
      
      return newSet;
    });
  };

  const handleFinishAndMarkComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const completedIds = Array.from(completedTaskIds);
    onMarkTasksComplete(completedIds);
    onEndSession(elapsedSeconds, completedIds);
    router.back();
  };

  const handleFinishWithoutMarking = () => {
    onEndSession(elapsedSeconds, []);
    router.back();
  };

  if (sessionEnded) {
    return (
      <SafeAreaView className="flex-1 bg-midnight-black">
        <Animated.View entering={FadeIn.duration(600)} className="flex-1 items-center justify-center px-6">
          {/* Completion Animation */}
          <Animated.View entering={FadeInDown.delay(200)} className="items-center mb-8">
            <View className="w-32 h-32 rounded-full bg-primary/10 items-center justify-center mb-6">
              <Text className="text-6xl">🔓</Text>
            </View>
            <Text className="text-white font-primary-bold text-3xl mb-3 text-center">
              Session Complete!
            </Text>
            <Text className="text-gray-400 font-primary-medium text-lg text-center">
              You focused for {formatTime(elapsedSeconds)}
            </Text>
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
                      <Text className="text-midnight-black font-primary-bold text-sm">✓</Text>
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
                  completedTaskIds.size > 0 ? 'text-midnight-black' : 'text-gray-600'
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
        {/* 3D Scene - Fullscreen Background */}
        <Animated.View 
          entering={FadeIn.delay(300)} 
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        >
          <Model3DViewer 
            width={undefined}
            height={undefined}
            autoRotate={!isPaused}
            timerSeconds={elapsedSeconds}
          />
        </Animated.View>

        {/* UI Overlay */}
        <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
        {/* Header with Timer */}
        <Animated.View entering={FadeInDown} className="px-6 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleEndSession}
              className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color="#EF4444" />
            </TouchableOpacity>

            {/* Timer Display */}
            <View className="flex-1 items-center">
              <View className="bg-black/60 px-8 py-3 rounded-2xl">
                <Text className="text-white font-primary-bold text-4xl tracking-wider">
                  {formatTime(elapsedSeconds)}
                </Text>
                <Text className="text-gray-300 font-primary-medium text-sm mt-1 text-center">
                  {isPaused ? 'PAUSED' : 'FOCUS MODE'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePause}
              className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Spacer to push tasks to bottom */}
        <View className="flex-1" />

        {/* Task Cards at Bottom */}
        <Animated.View entering={FadeInDown.delay(500)} className="px-6 pb-6">
          <View className="bg-black/60 backdrop-blur-lg rounded-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-primary-semibold text-lg">
                Working on
              </Text>
              <Text className="text-primary font-primary-bold text-base">
                {completedTaskIds.size}/{tasks.length} completed
              </Text>
            </View>
            <View>
              {tasks.filter(task => !completedTaskIds.has(task.id)).map((task, index) => (
                <FocusTaskItem
                  key={task.id}
                  task={task}
                  index={index}
                  onComplete={handleCompleteTask}
                />
              ))}
              {tasks.filter(task => !completedTaskIds.has(task.id)).length === 0 && (
                <Animated.View entering={FadeInDown} className="items-center py-8">
                  <Text className="text-6xl mb-3">🎉</Text>
                  <Text className="text-white font-primary-semibold text-xl">
                    All tasks completed!
                  </Text>
                  <Text className="text-gray-400 font-primary-medium text-sm mt-2">
                    Ending session...
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}
