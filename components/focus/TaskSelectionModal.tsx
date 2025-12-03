import { Task } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { analytics, Events } from '@/lib/analytics';
import { formatDueDate } from '@/lib/utils/dateUtils';
import { getPriorityColor } from '@/lib/utils/taskUtils';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import { PLANET_TRIPS, PlanetTrip, formatDistance, formatDuration } from './PlanetTrips';

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
  const [remaining3DTrials, setRemaining3DTrials] = useState<number | null>(null);
  const snapPoints = useMemo(() => ['75%', '90%'], []);

  useEffect(() => {
    const loadTrials = async () => {
      try {
        const storageKey = `free_3d_sessions_${user?.id || 'guest'}`;
        const stored = await AsyncStorage.getItem(storageKey);
        const used = stored ? parseInt(stored, 10) || 0 : 0;
        setRemaining3DTrials(Math.max(0, 2 - used));
      } catch {
        setRemaining3DTrials(null);
      }
    };

    loadTrials();
  }, [user?.id]);

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
      // Ensure the sheet is fully expanded so all trips are visible
      bottomSheetRef.current?.snapToIndex(1);
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
    bottomSheetRef.current?.close();
  };

  async function presentPaywall(): Promise<boolean> {
    if (isPresentingPaywall) return false;
    setIsPresentingPaywall(true);

    try {
      return await presentPaywallOnce({
        userId: user?.id,
        source: 'task_selection_modal',
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
      try {
        const storageKey = `free_3d_sessions_${user?.id || 'guest'}`;
        const stored = await AsyncStorage.getItem(storageKey);
        const used = stored ? parseInt(stored, 10) || 0 : 0;

        if (used < 2) {
          const nextUsed = used + 1;
          await AsyncStorage.setItem(storageKey, String(nextUsed));
          setRemaining3DTrials(Math.max(0, 2 - nextUsed));
        } else {
          const unlocked = await presentPaywall();
          // If purchase not completed/restored, do not start 3D session
          if (!unlocked && !useUserStore.getState().user?.is_premium) {
            return;
          }
        }
      } catch (err) {
        console.error('3D free sessions tracking error:', err);
        const unlocked = await presentPaywall();
        if (!unlocked && !useUserStore.getState().user?.is_premium) {
          return;
        }
      }
    }

    onStartSession(selectedTasks, selectedTrip, mode);
    setSelectedTaskIds(new Set());
    setStep('tasks');
    setSelectedTrip(null);
    bottomSheetRef.current?.close();
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  //today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter only incomplete tasks and tasks due today
  const tasksToShow = tasks.filter(
    (task) =>
      task.status !== 'completed' &&
      (!task.due_date ||
        new Date(task.due_date).setHours(0, 0, 0, 0) === today.getTime())
  );

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

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#0C0C0D' }}
        handleIndicatorStyle={{ backgroundColor: '#6B7280' }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
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
                <BottomSheetScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1, marginBottom: 20 }}
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
                                <View className="flex-row items-center ml-2">
                                  <Text className="text-xs font-primary-medium text-gray-500">
                                    🕒 {formatDueDate(new Date(task.due_date))}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </BottomSheetScrollView>

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
                <Text className="text-white font-primary-bold text-2xl mb-2">
                  Choose Session Type
                </Text>
                <Text className="text-gray-400 font-primary-medium text-sm mb-3">
                  How do you want to fly from {selectedTrip.from} to {selectedTrip.to}?
                </Text>

                {!user?.is_premium && (
                  <Text className="text-xs font-primary-medium text-secondary mb-5">
                    {remaining3DTrials === null
                      ? 'Checking your free 3D sessions...'
                      : remaining3DTrials > 0
                      ? `${remaining3DTrials} free 3D session${remaining3DTrials > 1 ? 's' : ''} left`
                      : 'No free 3D sessions left • 3D requires First Class'}
                  </Text>
                )}

                <View className="mb-6 p-4 rounded-2xl bg-card border border-gray-800/60">
                  <Text className="text-white font-primary-semibold text-base mb-1">
                    {selectedTrip.from} → {selectedTrip.to}
                  </Text>
                  <Text className="text-gray-400 font-primary-medium text-sm">
                    {selectedTrip.description} • {formatDuration(selectedTrip.duration)}
                  </Text>
                </View>

                <View className="flex flex-row w-full justify-between px-2">
                  <TouchableOpacity
                    onPress={() => handleStartWithMode('map')}
                    className={`py-4 px-4 rounded-xl items-center bg-black`}
                  >
                    <Image
                      source={require('../../assets/images/session-map.png')}
                      style={{ width: 140, height: 180 }}
                      contentFit="contain"
                      className='rounded-lg'
                    />
                    <Text className="text-white font-primary-bold text-xl mt-3">
                      2D
                    </Text>
                  </TouchableOpacity>



                  <TouchableOpacity
                    onPress={() => handleStartWithMode('3d')}
                    className={`py-4 px-4 rounded-xl items-center bg-black ${
                      !user?.is_premium && 'border border-secondary'
                    }`}

                  >
                    
                    <Image
                      source={require('../../assets/images/session-3d.png')}
                      style={{ width: 140, height: 180, borderRadius: 8 }}
                      contentFit="fill"
                      className='rounded-lg'
                    />
                    <Text
                      className="text-white font-primary-bold text-xl mt-3"
                    >
                      3D
                    </Text>
                    {!user?.is_premium && remaining3DTrials !== null && (
                      <Text className="text-sm font-primary-medium text-gray-400 mt-1">
                        {remaining3DTrials > 0
                          && `${remaining3DTrials} free left`}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}
