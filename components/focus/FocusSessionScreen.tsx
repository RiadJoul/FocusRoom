import { Task } from '@/lib/stores/taskStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Model3DViewer } from './Model3DViewer';
import { PlanetTrip, formatDistance } from './PlanetTrips';

interface FocusSessionScreenProps {
  tasks: Task[];
  trip: PlanetTrip;
  onEndSession: (duration: number, tasksCompleted: string[]) => void;
  onMarkTasksComplete: (taskIds: string[]) => void;
}


export function FocusSessionScreen({ tasks, trip, onEndSession, onMarkTasksComplete }: FocusSessionScreenProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(trip.duration);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!isPaused && !sessionEnded) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            // Timer reached zero
            setSessionEnded(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
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
      <SafeAreaView className="flex-1 bg-midnight-black">
        <Animated.View entering={FadeIn.duration(600)} className="flex-1 items-center justify-center px-6">
          {/* Completion Animation */}
          <Animated.View entering={FadeInDown.delay(200)} className="items-center mb-8">
            <View className="mb-6">
              <Image
                source={require('../../assets/images/logo.png')}
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
            timerSeconds={remainingSeconds}
          />
        </Animated.View>

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
            {/* Left Side - Pause and Exit */}
            <View className="flex-col gap-2">
              <TouchableOpacity
                onPress={handlePause}
                className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color="#FFFFFF" />
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
            <Text className="text-gray-400 font-primary-medium text-xs">Distance Left</Text>
            <Text className="text-white font-primary-bold text-lg mt-1">
              {formatDistance(remainingDistance)}
            </Text>
          </View>
        </Animated.View>

      </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}
