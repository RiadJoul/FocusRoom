import { Task } from '@/lib/stores/taskStore';
import { formatDueDate } from '@/lib/utils/dateUtils';
import { getPriorityColor } from '@/lib/utils/taskUtils';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { PLANET_TRIPS, PlanetTrip, formatDistance, formatDuration } from './PlanetTrips';

interface TaskSelectionModalProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  tasks: Task[];
  onStartSession: (selectedTasks: Task[], trip: PlanetTrip) => void;
}

export function TaskSelectionModal({ bottomSheetRef, tasks, onStartSession }: TaskSelectionModalProps) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'tasks' | 'planet'>('tasks');
  const [selectedTrip, setSelectedTrip] = useState<PlanetTrip | null>(null);
  const snapPoints = useMemo(() => ['75%', '90%'], []);

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
    const selectedTasks = tasks.filter(task => selectedTaskIds.has(task.id));
    onStartSession(selectedTasks, trip);
    setSelectedTaskIds(new Set());
    setStep('tasks');
    setSelectedTrip(null);
    bottomSheetRef.current?.close();
  };

  const handleClose = () => {
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
  const tasksToShow = tasks.filter(task => task.status !== 'completed' && (!task.due_date || new Date(task.due_date).setHours(0,0,0,0) === today.getTime()));

  return (
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
                    className={`mb-3 p-4 rounded-2xl border ${
                      isSelected
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
                        className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-gray-700'
                        }`}
                      >
                        {isSelected && (
                          <Text className="text-background font-primary-bold text-sm">✓</Text>
                        )}
                      </View>

                      {/* Task Content */}
                      <View className="flex-1">
                        <Text
                          className={`font-primary-semibold text-base leading-tight ${
                            canSelect ? 'text-white' : 'text-gray-600'
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
                className={`flex-1 py-4 rounded-xl items-center ${
                  selectedTaskIds.size > 0 ? 'bg-primary' : 'bg-gray-800'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-primary-bold text-base ${
                    selectedTaskIds.size > 0 ? 'text-background' : 'text-gray-600'
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
            <TouchableOpacity onPress={() => setStep('tasks')} className="mb-4">
              <Text className="text-primary font-primary-semibold text-sm">← Back to Tasks</Text>
            </TouchableOpacity>

            <Text className="text-white font-primary-bold text-2xl mb-2">Choose Your Trip</Text>
            <Text className="text-gray-400 font-primary-medium text-sm mb-6">
              Select your journey duration
            </Text>

            <BottomSheetScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {PLANET_TRIPS.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => handleSelectTrip(trip)}
                  className="mb-4 p-5 rounded-3xl"
                  activeOpacity={0.7}
                  style={{ backgroundColor: trip.color + '15' }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
    
                      <View>
                        <Text className="text-white font-primary-bold text-xl">
                          {trip.from} → {trip.to}
                        </Text>
                        <Text className="text-gray-400 font-primary-medium text-sm mt-1">
                          {trip.description} • 🚀 {formatDistance(trip.distance_km)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center justify-between pt-3 border-t border-gray-800/50">
                    <View className="flex-row items-center">
                      <Text className="text-gray-400 font-primary-medium text-sm mr-2">Trip Time:</Text>
                      <Text className="text-white font-primary-bold text-lg">
                        {formatDuration(trip.duration)}
                      </Text>
                    </View>
                    <View className="bg-primary px-4 py-2 rounded-xl">
                      <Text className="text-background font-primary-bold text-sm">
                        Board Now →
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </BottomSheetScrollView>
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
