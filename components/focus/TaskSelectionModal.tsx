import { Task } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { formatDueDate, parseLocalDateKey } from '@/lib/utils/dateUtils';
import { getPriorityColor } from '@/lib/utils/taskUtils';
import type BottomSheet from '@gorhom/bottom-sheet';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { Image } from 'expo-image';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import { PLANET_TRIPS, PlanetTrip, formatDistance, formatDuration } from './PlanetTrips';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

interface TaskSelectionModalProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  tasks: Task[];
  onStartSession: (selectedTasks: Task[], trip: PlanetTrip, mode: 'map' | '3d') => void;
}

export function TaskSelectionModal({ bottomSheetRef, tasks, onStartSession }: TaskSelectionModalProps) {
  const user = useUserStore((state) => state.user);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'tasks' | 'planet' | 'mode'>('tasks');
  const [selectedTrip, setSelectedTrip] = useState<PlanetTrip | null>(null);
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const cinematicVideoRef = useRef<Video | null>(null);

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        // Max 3 tasks
        if (newSet.size < 3) {
          newSet.add(taskId);
        }
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (selectedTaskIds.size > 0) {
      setStep('planet');
    }
  };

  const handleSelectTrip = (trip: PlanetTrip) => {
    setSelectedTrip(trip);
    setStep('mode');
  };

  const handleClose = () => {
    setSelectedTaskIds(new Set());
    setStep('tasks');
    setSelectedTrip(null);
    setIsTaskModalVisible(false);
  };

  async function presentPaywall(): Promise<boolean> {
    if (isPresentingPaywall) return false;
    setIsPresentingPaywall(true);

    try {
      return await presentPaywallOnce({
        userId: user?.id,
        source: 'Trip Type Selection Modal',
      });
    } finally {
      setIsPresentingPaywall(false);
    }
  }

  const handleStartWithMode = async (mode: 'map' | '3d') => {
    if (!selectedTrip) return;
    const selectedTasks = tasks.filter(task => selectedTaskIds.has(task.id));
    if (selectedTasks.length === 0) return;

    if (mode === '3d' && !user?.is_premium) {
      const unlocked = await presentPaywall();
      // If purchase not completed/restored, do not start 3D session
      if (!unlocked && !useUserStore.getState().user?.is_premium) {
        return;
      }
    }

    onStartSession(selectedTasks, selectedTrip, mode);
    setSelectedTaskIds(new Set());
    setStep('tasks');
    setSelectedTrip(null);
    setIsTaskModalVisible(false);
  };

  //today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter only incomplete tasks and tasks due today (using local date parsing)
  const tasksToShow = tasks.filter((task) => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return true;

    const taskDate = parseLocalDateKey(task.due_date);
    return taskDate.getTime() === today.getTime();
  });

  useEffect(() => {
    if (!bottomSheetRef) return;

    (bottomSheetRef as any).current = {
      expand: () => {
        setIsTaskModalVisible(true);
        setStep('tasks');
      },
      close: () => {
        setSelectedTaskIds(new Set());
        setStep('tasks');
        setSelectedTrip(null);
        setIsTaskModalVisible(false);
      },
      snapToIndex: () => {
        // No-op for modal; kept for compatibility
      },
    };

    return () => {
      (bottomSheetRef as any).current = null;
    };
  }, [bottomSheetRef]);

  // Ensure the 3D preview video auto-plays and loops while on the mode step
  useEffect(() => {
    if (step === 'mode' && isTaskModalVisible && cinematicVideoRef.current) {
      cinematicVideoRef.current.playAsync().catch(() => { });
    }
  }, [step, isTaskModalVisible]);

  return (
    <>
      {/* Fullscreen Trip Selection Modal */}
      <Modal
        visible={step === 'planet'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStep('tasks')}
      >
        <View className="flex-1 bg-background px-5 pt-6 pb-4">
          <TouchableOpacity onPress={() => setStep('tasks')} className="mb-4">
            <Text className="text-primary font-primary-semibold text-sm">
              ← Back to Tasks
            </Text>
          </TouchableOpacity>

          <Text className="text-white font-primary-bold text-2xl mb-2">
            Choose Your Trip
          </Text>
          <Text className="text-gray-400 font-primary-medium text-sm mb-6">
            Select your journey duration
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {PLANET_TRIPS.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                onPress={() => handleSelectTrip(trip)}
                className="mb-4 rounded-3xl overflow-hidden"

              >
                <View className="relative">
                  {/* Background image */}
                  <Image
                    source={trip.image}
                    style={{ width: '100%', height: 160 }}
                    contentFit="cover"
                  />
                  {/* Dark overlay for text readability */}
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: '#000000CC',
                    }}
                  />

                  {/* Content */}
                  <View className="absolute inset-0 p-5 flex justify-between">
                    <View>
                      <Text className="text-white font-primary-bold text-xl">
                        {trip.from} → {trip.to}
                      </Text>
                      <Text className="text-gray-200 font-primary-medium text-sm mt-1">
                        {trip.description} • 🚀 {formatDistance(trip.distance_km)}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between pt-3 border-t border-white/10 mt-3">
                      <View className="flex-row items-center">
                        <Text className="text-gray-200 font-primary-medium text-base mr-2">
                          Trip Time:
                        </Text>
                        <Text className="text-white font-primary-bold text-base">
                          {formatDuration(trip.duration)}
                        </Text>
                      </View>
                      <View className="bg-primary px-4 py-1.5 rounded-xl">
                        <Text className="text-background font-primary-bold text-sm">
                          Board Now →
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={isTaskModalVisible && step !== 'planet'}
        animationType="slide"
        transparent
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View className="flex-1 justify-end bg-black/50">
            <TouchableWithoutFeedback>
              <View className="bg-background rounded-t-3xl px-5 pt-4 pb-2 min-h-[70%]">
                {step === 'tasks' ? (
                  <>
                    <Text className="text-white font-primary-bold text-2xl mb-2">Select Tasks</Text>
                    <Text className="text-gray-400 font-primary-medium text-sm mb-6">
                      Choose up to 3 tasks to focus on ({selectedTaskIds.size}/3 selected)
                    </Text>

                    {tasksToShow.length === 0 ? (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-gray-500 font-primary-medium text-center">
                          No tasks available. Add some tasks first!
                        </Text>
                      </View>
                    ) : (
                      <>
                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          style={{ marginBottom: 20 }}
                        >
                          {tasksToShow.map((task) => {
                            const isSelected = selectedTaskIds.has(task.id);
                            const canSelect = selectedTaskIds.size < 3 || isSelected;

                            return (
                              <TouchableOpacity
                                key={task.id}
                                onPress={() => handleToggleTask(task.id)}
                                disabled={!canSelect && !isSelected}
                                className={`mb-3 p-4 rounded-2xl border ${isSelected
                                  ? 'bg-primary/10 border-primary'
                                  : canSelect
                                    ? 'bg-card border-gray-800'
                                    : 'bg-card-dark border-gray-800/50'
                                  }`}
                                activeOpacity={0.7}
                              >
                                <View className="flex-row items-center">
                                  {/* Checkbox */}
                                  <View
                                    className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-gray-700'
                                      }`}
                                  >
                                    {isSelected && (
                                      <Text className="text-background font-primary-bold text-sm">✓</Text>
                                    )}
                                  </View>

                                  {/* Task Content */}
                                  <View className="flex-1">
                                    <Text
                                      className={`font-primary-semibold text-base leading-tight ${canSelect ? 'text-white' : 'text-gray-600'
                                        }`}
                                    >
                                      {task.title}
                                    </Text>
                                    <View className="flex-row items-center mt-2">
                                      {/* Priority Badge */}
                                      <View className={`flex-row items-center px-2 py-1 rounded-md ${getPriorityColor(task.priority)}`}>
                                        <Text
                                          className="text-xs font-primary-medium capitalize"
                                          style={{
                                            color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#eab308' : '#22c55e'
                                          }}
                                        >
                                          {task.priority}
                                        </Text>
                                      </View>

                                      {/* Due Date */}
                                      {task.due_date && (
                                        <View className="flex-row items-center">
                                          <Text className="flex items-center text-xs font-primary-medium text-gray-500">
                                            <Ionicons name='time-outline' /> {formatDueDate(new Date(task.due_date))}
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

                        {/* Action Buttons */}
                        <View className="flex-row gap-3 pb-4">
                          <TouchableOpacity
                            onPress={handleClose}
                            className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-800 items-center"
                            activeOpacity={0.8}
                          >
                            <Text className="text-gray-400 font-primary-semibold text-base">Cancel</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={handleNext}
                            disabled={selectedTaskIds.size === 0}
                            className={`flex-1 py-4 rounded-xl items-center ${selectedTaskIds.size > 0 ? 'bg-primary' : 'bg-gray-800'
                              }`}
                            activeOpacity={0.8}
                          >
                            <Text
                              className={`font-primary-bold text-base ${selectedTaskIds.size > 0 ? 'text-background' : 'text-gray-600'
                                }`}
                            >
                              Next: Choose Trip
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setStep('planet')}
                      className="mb-4"
                    >
                      <Text className="text-primary font-primary-semibold text-sm">
                        ← Back to Trips
                      </Text>
                    </TouchableOpacity>

                    {selectedTrip && (
                      <>
                        <Text className="text-xs tracking-[2px] text-primary font-primary-semibold uppercase mb-1">
                          Flight Mode
                        </Text>
                        <Text className="text-white font-primary-bold text-2xl mb-1">
                          Choose your cockpit view
                        </Text>
                        <Text className="text-gray-400 font-primary-medium text-sm mb-4">
                          How do you want to fly from {selectedTrip.from} to {selectedTrip.to} today?
                        </Text>

                        <View className="mb-6 p-4 rounded-2xl bg-card border border-gray-800/60">
                          <View className="flex-row items-center justify-between mb-3">
                            <View>
                              <Text className="text-white font-primary-semibold text-base mb-1">
                                {selectedTrip.from} → {selectedTrip.to}
                              </Text>
                              <Text className="text-gray-400 font-primary-medium text-xs">
                                {selectedTrip.description}
                              </Text>
                            </View>
                            <View className="ml-3 rounded-full bg-primary/15 px-3 py-1">
                              <Text className="text-primary font-primary-semibold text-xs">
                                {formatDistance(selectedTrip.distance_km)}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row gap-2">
                            <View className="flex-row items-center rounded-full bg-gray-900/80 px-2.5 py-1">
                              <Ionicons name="time-outline" size={14} color="#9ca3af" />
                              <Text className="text-gray-300 font-primary-medium text-xs ml-1.5">
                                {formatDuration(selectedTrip.duration)}
                              </Text>
                            </View>
                            <View className="flex-row items-center rounded-full bg-gray-900/80 px-2.5 py-1">
                              <Ionicons name="sparkles-outline" size={14} color="#a855f7" />
                            </View>
                          </View>
                        </View>

                        <View className="flex-row w-full px-1 gap-x-5">
                          <TouchableOpacity
                            onPress={() => handleStartWithMode('map')}
                            className="flex-1 rounded-2xl bg-black/80 border border-gray-900 overflow-hidden"
                            activeOpacity={0.9}
                          >
                            <View className="relative">
                              <Image
                                source={require('../../assets/images/session-map.png')}
                                style={{ width: '100%', height: 220 }}
                                contentFit="cover"
                              />
                              <View className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1">
                                <Text className="text-xs font-primary-semibold text-gray-200">
                                  Smooth 2D Map
                                </Text>
                              </View>
                            </View>
                            <View className="px-3 pt-3 pb-3">
                              <Text className="text-white text-center font-primary-bold text-lg">
                                Economy
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleStartWithMode('3d')}
                            className={`flex-1 rounded-3xl overflow-hidden border-2 border-secondary bg-secondary/10`}
                            activeOpacity={0.9}
                          >
                            <View className="relative">
                              <Video
                                ref={cinematicVideoRef}
                                source={require('../../assets/videos/session-3d.mp4')}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay
                                isLooping
                                isMuted
                                
                                style={{ width: '100%', height: 220 }}
                              />



                              {!user?.is_premium && (
                                <View className="absolute bottom-3 right-3 rounded-full bg-secondary px-2.5 py-1.5">
                                  <Text className="text-[11px] font-primary-semibold text-black">
                                    Upgrade to unlock
                                  </Text>
                                </View>
                              )}

                              <View className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1">
                                <Text className="text-xs font-primary-semibold text-gray-200">
                                  Cinematic 3D
                                </Text>
                              </View>
                            </View>
                            <View className="px-3 pt-3 pb-3 border-t border-secondary/40 bg-black/70">
                              <View style={{
                                backgroundColor: '#A78BFA',
                                paddingHorizontal: 12,
                                paddingVertical: 3,
                                borderRadius: 6,
                                shadowColor: '#A78BFA',
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.7,
                                shadowRadius: 10,
                                elevation: 10,
                              }}>
                                <Text className="text-white font-primary-bold text-base text-center tracking-wider">FIRST CLASS</Text>
                              </View>

                            </View>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
