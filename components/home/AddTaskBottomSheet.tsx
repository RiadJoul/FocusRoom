import { TaskList } from '@/lib/stores/listStore';
import { formatDueDate, formatLocalDateKey } from '@/lib/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ListCreateModal } from './ListCreateModal';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AddTaskBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  lists: TaskList[];
  canCreateMoreLists: boolean;
  onAddTask: (title: string, priority: 'low' | 'medium' | 'high', listId: string, dueDate: string | null) => Promise<void>;
  onCreateList: (title: string, icon: string, color?: string) => Promise<TaskList | null>;
  onDeleteList: (listId: string, listTitle: string) => Promise<void>;
}

export function AddTaskBottomSheet({
  bottomSheetRef,
  lists,
  canCreateMoreLists,
  onAddTask,
  onCreateList,
  onDeleteList
}: AddTaskBottomSheetProps) {
  const snapPoints = useMemo(() => ['25%', '40%'], []);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showListCreator, setShowListCreator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set default list when lists change
  React.useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);



  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    Keyboard.dismiss();
    // Reset form states
    setTaskTitle('');
    setSelectedPriority('medium');
    setStep(1);
    setSelectedDueDate(new Date());
    setShowDatePicker(false);

  }, [bottomSheetRef]);

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

  const goToNextStep = () => {
    if (step === 1) {
      if (!taskTitle.trim() || !selectedListId) return;
      setStep(2);
      Keyboard.dismiss();
    } else if (step === 2) {
      setShowDatePicker(false);
      setStep(3);
      Keyboard.dismiss();
    }
  };

  const goToPreviousStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
      setShowDatePicker(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !selectedListId || !selectedDueDate || isSaving) return;
    setIsSaving(true);

    const dueDateStr = formatLocalDateKey(selectedDueDate);

    try {
      await onAddTask(taskTitle.trim(), selectedPriority, selectedListId, dueDateStr);
      handleCloseBottomSheet();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDueDate(today);
    setShowDatePicker(false);
  };

  const handleSetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setSelectedDueDate(tomorrow);
    setShowDatePicker(false);
  };

  const clampToTodayOrLater = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    if (candidate < today) {
      return today;
    }
    return candidate;
  };

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#0C0C0D' }}
        handleIndicatorStyle={{ backgroundColor: '#6B7280' }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white font-primary-bold text-xl">Add New Task</Text>
          <Text className="text-gray-500 font-primary-medium text-xs">
            Step {step} of 3
          </Text>
        </View>

        {/* STEP 1: Task Title + List */}
        {step === 1 && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} className="mb-6">
            <Text className="text-gray-500 font-primary-medium text-xs mb-1">
              What are you working on?
            </Text>
            <BottomSheetTextInput
              style={{
                backgroundColor: 'transparent',
                borderWidth: 0,
                borderBottomWidth: 1,
                borderBottomColor: '#1F2937',
                paddingHorizontal: 0,
                paddingVertical: 10,
                color: '#FFFFFF',
                fontSize: 20,
                fontWeight: '600',
              }}
              placeholder="Type a task…"
              placeholderTextColor="#4B5563"
              value={taskTitle}
              onChangeText={setTaskTitle}
              editable
            />

            


            {/* List selection inline with title */}
            <View className="mt-6">

              {lists.length === 0 && (
                <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-3">
                  <Text className="text-yellow-500 font-primary-semibold text-xs">
                    ⚠️ Create a list first to organize this task
                  </Text>
                </View>
              )}

            {/* List Selection Chips – match onboarding list chip style */}
            <View className="flex-row flex-wrap gap-x-1 gap-y-3 mt-4">
              {lists.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedListId(list.id);
                  }}
                  onLongPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onDeleteList(list.id, list.title);
                    if (selectedListId === list.id) {
                      const remainingLists = lists.filter(l => l.id !== list.id);
                      setSelectedListId(remainingLists[0]?.id ?? '');
                    }
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${
                    selectedListId === list.id ? 'bg-white/10' : 'bg-white/5'
                  }`}
                  activeOpacity={0.8}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${list.color}26` }}
                  >
                    <Ionicons
                      name={list.icon as any}
                      size={18}
                      color={list.color}
                    />
                  </View>
                  <Text
                    className="font-primary-semibold text-base"
                    style={{
                      color: list.color,
                      opacity: selectedListId === list.id ? 1 : 0.5,
                    }}
                  >
                    {list.title}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* New list pill */}
              <TouchableOpacity
                onPress={() => {
                  if (!canCreateMoreLists) {
                    presentPaywallOnce();
                    return;
                  }
                  setShowListCreator(true);
                }}
             
                className={`px-3 py-2 rounded-full flex-row items-center gap-2 border ${
                  canCreateMoreLists
                    ? 'bg-primary/10 border-dashed border-primary/60'
                    : 'bg-secondary/10 border-secondary'
                }`}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#E4F964" />
                
              </TouchableOpacity>
            </View>
            </View>
          </Animated.View>
        )}

        {/* STEP 2: Due Date */}
        {step === 2 && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} className="mb-6">
            <Text className="text-gray-400 font-primary-medium text-sm mb-3">
              When do you want this mission to land?
            </Text>

            {/* Quick picks as mission chips */}
            <View className="flex-row gap-3 mb-3">
              {/* Today */}
              <TouchableOpacity
                onPress={handleSetToday}
                activeOpacity={0.8}
                className={`flex-1 rounded-2xl px-3 py-3 flex-row items-center gap-2 border ${
                  selectedDueDate && formatDueDate(selectedDueDate) === 'Today'
                    ? 'bg-primary/15 border-primary'
                    : 'bg-gray-900/70 border-gray-800'
                }`}
              >
                <View className="w-9 h-9 rounded-xl bg-black/70 items-center justify-center">
                  <Ionicons
                    name="sunny-outline"
                    size={18}
                    color={selectedDueDate && formatDueDate(selectedDueDate) === 'Today' ? '#a855f7' : '#9CA3AF'}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-primary-semibold text-sm ${
                      selectedDueDate && formatDueDate(selectedDueDate) === 'Today'
                        ? 'text-white'
                        : 'text-gray-300'
                    }`}
                  >
                    Today
                  </Text>
                  <Text className="text-[11px] text-gray-500 font-primary-medium">
                    Lock it in before midnight.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Tomorrow */}
              <TouchableOpacity
                onPress={handleSetTomorrow}
                activeOpacity={0.8}
                className={`flex-1 rounded-2xl px-3 py-3 flex-row items-center gap-2 border ${
                  selectedDueDate && formatDueDate(selectedDueDate) === 'Tomorrow'
                    ? 'bg-primary/15 border-primary'
                    : 'bg-gray-900/70 border-gray-800'
                }`}
              >
                <View className="w-9 h-9 rounded-xl bg-black/70 items-center justify-center">
                  <Ionicons
                    name="moon-outline"
                    size={18}
                    color={selectedDueDate && formatDueDate(selectedDueDate) === 'Tomorrow' ? '#a855f7' : '#9CA3AF'}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-primary-semibold text-sm ${
                      selectedDueDate && formatDueDate(selectedDueDate) === 'Tomorrow'
                        ? 'text-white'
                        : 'text-gray-300'
                    }`}
                  >
                    Tomorrow
                  </Text>
                  <Text className="text-[11px] text-gray-500 font-primary-medium">
                    Give yourself one more orbit.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Custom date pill */}
            <TouchableOpacity
              onPress={() => setShowDatePicker(!showDatePicker)}
              activeOpacity={0.8}
              className={`mt-1 rounded-2xl px-3 py-3 flex-row items-center justify-between border ${
                selectedDueDate &&
                formatDueDate(selectedDueDate) !== 'Today' &&
                formatDueDate(selectedDueDate) !== 'Tomorrow'
                  ? 'bg-primary/15 border-primary'
                  : 'bg-gray-900/70 border-gray-800'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-black/70 items-center justify-center">
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={
                      selectedDueDate &&
                      formatDueDate(selectedDueDate) !== 'Today' &&
                      formatDueDate(selectedDueDate) !== 'Tomorrow'
                        ? '#a855f7'
                        : '#9CA3AF'
                    }
                  />
                </View>
                <View>
                  <Text className="text-gray-300 font-primary-semibold text-sm">
                    {selectedDueDate &&
                    formatDueDate(selectedDueDate) !== 'Today' &&
                    formatDueDate(selectedDueDate) !== 'Tomorrow'
                      ? formatDueDate(selectedDueDate)
                      : 'Pick a specific date'}
                  </Text>
                  <Text className="text-[11px] text-gray-500 font-primary-medium">
                    Drop this task on a future day.
                  </Text>
                </View>
              </View>
              <Ionicons
                name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Inline iOS-style date picker */}
            {showDatePicker && (
              <View className="mt-3 bg-gray-900/50 border border-gray-800 rounded-2xl px-3 py-2">
                <DateTimePicker
                  value={selectedDueDate ?? new Date()}
                  mode="date"
                  display="inline"
                  onChange={(_, date) => {
                    if (date) {
                      const clamped = clampToTodayOrLater(date);
                      setSelectedDueDate(clamped);
                    }
                  }}
                />
              </View>
            )}
          </Animated.View>
        )}

        {/* STEP 3: Priority */}
        {step === 3 && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} className="mb-4">
            {/* Priority Selection */}
            <View className="mb-4">
              <Text className="text-gray-400 font-primary-medium text-sm mb-2">
                Priority
              </Text>
              <View className="flex-row gap-3">
                {(['low', 'medium', 'high'] as const).map((priority) => {
                  const isSelected = selectedPriority === priority;
                  const colors =
                    priority === 'high'
                      ? { bg: 'bg-red-500/15', border: 'border-red-500/60', icon: '#f87171', label: 'Deep work' }
                      : priority === 'medium'
                      ? { bg: 'bg-yellow-500/15', border: 'border-yellow-500/60', icon: '#facc15', label: 'Important' }
                      : { bg: 'bg-green-500/15', border: 'border-green-500/60', icon: '#4ade80', label: 'Light lift' };

                  const iconName =
                    priority === 'high'
                      ? 'flame-outline'
                      : priority === 'medium'
                      ? 'rocket-outline'
                      : 'leaf-outline';

                  return (
                    <TouchableOpacity
                      key={priority}
                      onPress={() => setSelectedPriority(priority)}
                      disabled={lists.length === 0}
                      activeOpacity={0.8}
                      className={`flex-1 rounded-2xl px-3 py-3 border ${
                        isSelected ? `${colors.bg} ${colors.border}` : 'bg-gray-900/70 border-gray-800'
                      }`}
                    >
                      <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-xl bg-black/70 items-center justify-center">
                          <Ionicons
                            name={iconName as any}
                            size={18}
                            color={isSelected ? colors.icon : '#9CA3AF'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`font-primary-semibold capitalize text-sm ${
                              isSelected ? 'text-white' : 'text-gray-300'
                            }`}
                          >
                            {priority}
                          </Text>
                          <Text className="text-[11px] text-gray-500 font-primary-medium">
                            {colors.label}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-auto pb-2">
          {step === 1 && (
            <>
              <TouchableOpacity
                onPress={goToNextStep}
                disabled={!taskTitle.trim() || !selectedListId}
                className={`flex-1 py-4 rounded-xl items-center ${
                  taskTitle.trim() && selectedListId ? 'bg-white' : 'bg-white/50'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-primary-bold text-base ${
                    taskTitle.trim() && selectedListId ? 'text-background' : 'text-gray-600'
                  }`}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <TouchableOpacity
                onPress={goToPreviousStep}
                className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-700 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-gray-400 font-primary-semibold text-base">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goToNextStep}
                className="flex-1 py-4 rounded-xl items-center bg-white"
                activeOpacity={0.8}
              >
                <Text className="font-primary-bold text-base text-background">
                  Next
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <TouchableOpacity
                onPress={goToPreviousStep}
                className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-800 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-gray-400 font-primary-semibold text-base">
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddTask}
                disabled={
                  isSaving ||
                  !taskTitle.trim() ||
                  !selectedListId ||
                  !selectedDueDate
                }
                className={`flex-1 py-4 rounded-xl items-center ${
                  isSaving
                    ? 'bg-white/60'
                    : taskTitle.trim() && selectedListId && selectedDueDate
                    ? 'bg-white'
                    : 'bg-white/50'
                }`}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text
                    className={`font-primary-bold text-base ${
                      taskTitle.trim() && selectedListId && selectedDueDate
                        ? 'text-background'
                        : 'text-gray-600'
                    }`}
                  >
                    Add Task
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
        </BottomSheetView>
      </BottomSheet>

      <ListCreateModal
        visible={showListCreator}
        onClose={() => setShowListCreator(false)}
        onCreate={async (title, icon, color) => {
          const newList = await onCreateList(title, icon, color);
          if (newList) {
            setSelectedListId(newList.id);
          }
        }}
      />
    </>
  );
}

// Attach fun list creator modal to reuse in parent screens if needed
export { LIST_ICONS } from './listIcons';
