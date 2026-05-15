import { Task } from '@/lib/stores/taskStore';
import { useListStore } from '@/lib/stores/listStore';
import { formatDueDate, parseLocalDateKey } from '@/lib/utils/dateUtils';
import type BottomSheet from '@gorhom/bottom-sheet';
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { PLANET_TRIPS, PlanetTrip, formatDuration } from './PlanetTrips';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getPriorityColor } from '@/lib/utils/taskUtils';

const SLIDER_ITEM_WIDTH = 56;

interface TaskSelectionModalProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  tasks: Task[];
  onStartSession: (selectedTasks: Task[], trip: PlanetTrip) => void;
}

export function TaskSelectionModal({ bottomSheetRef, tasks, onStartSession }: TaskSelectionModalProps) {
  const lists = useListStore((state) => state.lists);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'tasks' | 'planet'>('tasks');
  const [selectedTrip, setSelectedTrip] = useState<PlanetTrip | null>(PLANET_TRIPS[0] ?? null);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const shipProgress = useRef(new Animated.Value(0)).current;
  const [orbitLayout, setOrbitLayout] = useState<{ width: number; height: number } | null>(null);
  const [sliderWidth, setSliderWidth] = useState(0);

  // Precompute min/max duration so orbits feel physically “near” vs “far”
  const durations = PLANET_TRIPS.map((t) => t.duration);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

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

  const handleSelectTrip = () => {
    if (!selectedTrip || selectedTaskIds.size === 0) return;

    const selectedTasks = tasks.filter((task) =>
      selectedTaskIds.has(task.id),
    );

    onStartSession(selectedTasks, selectedTrip);
    setSelectedTaskIds(new Set());
    setStep('tasks');
    setSelectedTrip(null);
    setIsTaskModalVisible(false);
  };

  const handleSliderMomentumEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x ?? 0;
    const interval = SLIDER_ITEM_WIDTH;
    const rawIndex = Math.round(x / interval);
    const clampedIndex = Math.max(0, Math.min(PLANET_TRIPS.length - 1, rawIndex));
    const trip = PLANET_TRIPS[clampedIndex];
    setSelectedTrip(trip);
  };

  const handleClose = () => {
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

  // Simple looping ship animation for the orbit view
  useEffect(() => {
    if (step !== 'planet') return;

    shipProgress.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shipProgress, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(shipProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [step, shipProgress]);

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
            Pick a destination
          </Text>
          <Text className="text-gray-400 font-primary-medium text-sm mb-6">
            Each planet is a different focus length.
          </Text>

          {/* Orbit style selector */}
          <View className="items-center mt-2 mb-6">
            <View
              className="w-[400px] h-[355px] rounded-[16px] bg-black overflow-hidden border border-white/10"
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setOrbitLayout({ width, height });
              }}
            >
              {/* Starfield */}
              <View className="absolute inset-0">
                {Array.from({ length: 32 }).map((_, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <View
                    key={idx}
                    className="absolute w-[2px] h-[2px] rounded-full bg-white/60"
                    style={{
                      opacity: 0.3 + (idx % 4) * 0.15,
                      top: `${(idx * 19) % 95}%`,
                      left: `${(idx * 27) % 95}%`,
                    }}
                  />
                ))}
              </View>

              {/* Orbits */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-40 h-40 rounded-full border border-white/10" />
                <View className="w-56 h-56 rounded-full border border-white/10 absolute" />
              </View>

              {/* Origin planet */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-10 h-10 rounded-full bg-blue-800 border border-indigo-200 items-center justify-center">
                  <Ionicons name="earth-outline" size={20} color="#ffffff" />
                </View>
                <View className="mt-1 items-center">
                  <Text className="text-xs text-white font-primary-bold">Earth</Text>
                </View>
              </View>

              {/* Destination planets on orbit – distance based on duration */}
              {orbitLayout &&
                PLANET_TRIPS.map((trip, index) => {
                  const isSelected = selectedTrip?.id === trip.id;
                  const total = PLANET_TRIPS.length;
                  const angle = (2 * Math.PI * index) / total - Math.PI / 2;

                  const maxOrbitRadius = Math.min(orbitLayout.width, orbitLayout.height) * 0.38;
                  const minOrbitRadius = maxOrbitRadius * 0.7;

                  // Normalised 0–1 based on duration (shorter = closer, longer = farther)
                  const norm =
                    maxDuration === minDuration
                      ? 0
                      : (trip.duration - minDuration) / (maxDuration - minDuration);

                  const radius =
                    minOrbitRadius + norm * (maxOrbitRadius - minOrbitRadius);

                  const centerX = orbitLayout.width / 2;
                  const centerY = orbitLayout.height / 2;

                  const planetCenterX = centerX + radius * Math.cos(angle);
                  const planetCenterY = centerY + radius * Math.sin(angle);

                  

                  const planetRadiusOuter = 24; // half of 48

                  const planetNode = (
                    <View
                      key={trip.id}
                      style={{
                        position: 'absolute',
                        left: planetCenterX - planetRadiusOuter,
                        top: planetCenterY - planetRadiusOuter,
                      }}
                    >
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: `${trip.color}33`,
                          borderWidth: isSelected ? 3 : 1,
                          borderColor: isSelected ? '#ffffff' : `${trip.color}80`,
                          shadowColor: isSelected ? trip.color : 'transparent',
                          shadowOpacity: isSelected ? 0.7 : 0,
                          shadowRadius: isSelected ? 10 : 0,
                        }}
                      >
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{ backgroundColor: trip.color }}
                        >
                          <Ionicons name="planet-outline" size={28} color="#000000" />
                        </View>
                      </View>
                      <View className="items-center mt-1">
                        <Text className="text-xs text-center font-primary-semibold text-gray-100">
                         {trip.to}
                        </Text>
                        
                      </View>
                    </View>
                  );

                  return planetNode;
                })}

            </View>
          </View>

          {/* Duration slider + Check-in */}
          <View className="mt-4">

            {/* Center pointer — sits above the slider, perfectly centred */}
            <View className="items-center mb-1">
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 7,
                  borderRightWidth: 7,
                  borderTopWidth: 10,
                  borderStyle: 'solid',
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#ffffff',
                }}
              />
            </View>

            <View
              className="py-1"
              onLayout={(e) => {
                setSliderWidth(e.nativeEvent.layout.width);
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SLIDER_ITEM_WIDTH}
                decelerationRate="fast"
                onMomentumScrollEnd={handleSliderMomentumEnd}
                contentContainerStyle={{
                  paddingHorizontal:
                    sliderWidth > 0
                      ? Math.max(0, (sliderWidth - SLIDER_ITEM_WIDTH) / 2)
                      : 0,
                  alignItems: 'flex-end',
                }}
              >
                {PLANET_TRIPS.map((trip, index) => {
                  const isActive = selectedTrip?.id === trip.id;
                  return (
                    <View
                      key={`${trip.id}-slider`}
                      style={{ width: SLIDER_ITEM_WIDTH , alignItems: 'center' }}
                      className="items-center"
                    >
                      <View
                        className={`w-[4px] rounded-full ${
                          isActive ? 'bg-white' : 'bg-gray-600'
                        }`}
                        style={{ height: 22 + index * 3 }}
                      />
                      <Text
                        className={`mt-1 text-[10px] font-primary-medium ${
                          isActive ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {formatDuration(trip.duration)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View className="mt-4 items-center">
              <TouchableOpacity
                disabled={!selectedTrip || selectedTaskIds.size === 0}
                onPress={handleSelectTrip}
                activeOpacity={0.9}
                className={`flex-row justify-center w-full py-3.5 rounded-2xl items-center ${
                  selectedTrip && selectedTaskIds.size > 0
                    ? 'bg-white'
                    : 'bg-gray-700'
                }`}
              >
              <MaterialIcons name="airplane-ticket" size={24} color="black" />
                <Text
                  className={`font-primary-bold text-base pl-1 ${
                    selectedTrip && selectedTaskIds.size > 0 ? 'text-black' : 'text-gray-300'
                  }`}
                >
                  Check in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
              <View className="bg-background rounded-t-3xl px-5 pt-4 pb-2 max-h-[85%]">
                {step === 'tasks' && (
                  <View style={{ flexShrink: 1, maxHeight: '100%' }}>
                    <Text className="text-white font-primary-bold text-2xl mb-2">Select Tasks</Text>
                    <Text className="text-gray-400 font-primary-medium text-sm mb-4">
                      Choose up to 3 tasks to focus on ({selectedTaskIds.size}/3 selected)
                    </Text>

                    {tasksToShow.length === 0 ? (
                      <View className="flex-1 items-center justify-center py-8">
                        <Text className="text-gray-500 font-primary-medium text-center">
                          No tasks available. Add some tasks first!
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={{ maxHeight: '72%' }}>
                          <ScrollView
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={{ paddingBottom: 16 }}
                          >
                            {tasksToShow.map((task) => {
                              const list = lists.find((l) => l.id === task.list_id);
                              const isSelected = selectedTaskIds.has(task.id);
                              const canSelect = selectedTaskIds.size < 3 || isSelected;

                              return (
                                <TouchableOpacity
                                  key={task.id}
                                  onPress={() => handleToggleTask(task.id)}
                                  disabled={!canSelect && !isSelected}
                                  className={`mb-3 rounded-2xl ${canSelect || isSelected ? '' : 'opacity-40'}`}
                                  activeOpacity={0.7}
                                >
                                  <View className="p-4 flex-row items-start">
                                    {/* Completion ring (used here as selection ring) */}
                                    <View className="mr-4">
                                      <View
                                        style={{
                                          borderColor: '#9CA3AF',
                                          borderWidth: 2,
                                        }}
                                        className="w-6 h-6 rounded-lg items-center justify-center overflow-hidden"
                                      >
                                        {isSelected && (
                                          <View
                                            className="absolute inset-0"
                                            style={{ backgroundColor: list?.color || '#9CA3AF' }}
                                          />
                                        )}
                                        {isSelected && (
                                          <Ionicons name="checkmark" size={16} color="white" />
                                        )}
                                      </View>
                                    </View>

                                    {/* Task Content */}
                                    <View className="flex-1">
                                      <View>
                                        <Text
                                          className={`font-primary-semibold text-base leading-tight ${
                                            canSelect ? 'text-white' : 'text-gray-600'
                                          }`}
                                        >
                                          {task.title}
                                        </Text>
                                      </View>

                                      <View className="flex-row items-center mt-2 flex-wrap">
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
                                          className={`flex-row items-center py-0.5 px-2 rounded-full mr-2 ${getPriorityColor(
                                            task.priority,
                                          )}`}
                                        >
                                          <Text
                                            className="text-[10px] font-primary-medium capitalize"
                                            style={{
                                              color:
                                                task.priority === 'high'
                                                  ? '#ef4444'
                                                  : task.priority === 'medium'
                                                  ? '#eab308'
                                                  : '#22c55e',
                                            }}
                                          >
                                            {task.priority}
                                          </Text>
                                        </View>

                                        {/* Due Date */}
                                        {task.due_date && (
                                          <View className="flex-row items-center mt-1">
                                            <Ionicons name="time-outline" size={12} color="#6b7280" />
                                            <Text className="ml-1 text-[11px] font-primary-medium text-gray-500">
                                              {formatDueDate(new Date(task.due_date))}
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

                        {/* Action Buttons */}
                        <View className="flex-row gap-3 pt-2 pb-4">
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
                            className={`flex-1 py-4 rounded-xl items-center ${selectedTaskIds.size > 0 ? 'bg-white' : 'bg-primary'
                              }`}
                            activeOpacity={0.8}
                          >
                            <Text
                              className={`font-primary-bold text-base ${selectedTaskIds.size > 0 ? 'text-black' : 'text-black'
                                }`}
                            >
                              Next
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ) }
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
