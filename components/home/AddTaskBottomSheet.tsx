import { TaskList } from '@/lib/stores/listStore';
import { formatDueDate, getFutureDates } from '@/lib/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ListCreateModal } from './ListCreateModal';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';

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
    if (!taskTitle.trim() || !selectedListId || !selectedDueDate) return;

    const dueDateStr = selectedDueDate.toISOString().split('T')[0];

    await onAddTask(taskTitle.trim(), selectedPriority, selectedListId, dueDateStr);
    handleCloseBottomSheet();
  };

  const handleSetToday = () => {
    setSelectedDueDate(new Date());
    setShowDatePicker(false);
  };

  const handleSetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDueDate(tomorrow);
    setShowDatePicker(false);
  };



  const futureDates = useMemo(() => getFutureDates(14), []);

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

            {/* List Selection Chips – wrap like pills */}
            <View className="flex-row flex-wrap gap-3 mt-4">
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
                  className="px-4 py-3 rounded-full flex-row items-center gap-2"
                  style={{
                    backgroundColor: `${list.color}4D`,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={list.icon as any}
                    size={18}
                    color={list.color}
                    style={{
                      opacity: selectedListId === list.id ? 1 : 0.5,
                    }}
                  />
                  <Text
                    className="font-primary-semibold text-lg"
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
             
                className={`px-4 py-3 rounded-full flex-row items-center gap-2 border ${
                  canCreateMoreLists
                    ? 'bg-primary/10 border-dashed border-primary/60'
                    : 'bg-secondary/10 border-secondary'
                }`}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#E4F964" />
                <Text className="text-primary font-primary-semibold text-base">
                  New
                </Text>
              </TouchableOpacity>
            </View>
            </View>
          </Animated.View>
        )}

        {/* STEP 2: Due Date */}
        {step === 2 && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} className="mb-6">
            <Text className="text-gray-400 font-primary-medium text-sm mb-2">
              When do you want to do it?
            </Text>
            <View className="flex-row gap-2">
              {/* Today Button */}
              <TouchableOpacity
                onPress={handleSetToday}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  selectedDueDate && formatDueDate(selectedDueDate) === 'Today'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-gray-900/50 border-gray-800'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-primary-semibold text-sm ${
                    selectedDueDate && formatDueDate(selectedDueDate) === 'Today'
                      ? 'text-primary'
                      : 'text-gray-400'
                  }`}
                >
                  📅 Today
                </Text>
              </TouchableOpacity>

              {/* Tomorrow Button */}
              <TouchableOpacity
                onPress={handleSetTomorrow}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  selectedDueDate && formatDueDate(selectedDueDate) === 'Tomorrow'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-gray-900/50 border-gray-800'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-primary-semibold text-sm ${
                    selectedDueDate && formatDueDate(selectedDueDate) === 'Tomorrow'
                      ? 'text-primary'
                      : 'text-gray-400'
                  }`}
                >
                  🗓️ Tomorrow
                </Text>
              </TouchableOpacity>

              {/* Custom Date Button */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(!showDatePicker)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  selectedDueDate &&
                  formatDueDate(selectedDueDate) !== 'Today' &&
                  formatDueDate(selectedDueDate) !== 'Tomorrow'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-gray-900/50 border-gray-800'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-primary-semibold text-sm ${
                    selectedDueDate &&
                    formatDueDate(selectedDueDate) !== 'Today' &&
                    formatDueDate(selectedDueDate) !== 'Tomorrow'
                      ? 'text-primary'
                      : 'text-gray-400'
                  }`}
                >
                  {selectedDueDate &&
                  formatDueDate(selectedDueDate) !== 'Today' &&
                  formatDueDate(selectedDueDate) !== 'Tomorrow'
                    ? formatDueDate(selectedDueDate)
                    : '📆 Other'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
              <View className="mt-3 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <Text className="text-white font-primary-semibold text-sm mb-3">
                  Select Date
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {futureDates.map((date, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedDueDate(date);
                        setShowDatePicker(false);
                      }}
                      className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700"
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-300 font-primary-medium text-xs">
                        {date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    onPress={() => setSelectedPriority(priority)}
                    disabled={lists.length === 0}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      selectedPriority === priority
                        ? priority === 'high'
                          ? 'bg-red-500/10 border-red-500'
                          : priority === 'medium'
                          ? 'bg-yellow-500/10 border-yellow-500'
                          : 'bg-green-500/10 border-green-500'
                        : 'bg-gray-900/50 border-gray-800'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`font-primary-semibold capitalize ${
                        selectedPriority === priority
                          ? priority === 'high'
                            ? 'text-red-500'
                            : priority === 'medium'
                            ? 'text-yellow-500'
                            : 'text-green-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                  taskTitle.trim() && selectedListId ? 'bg-secondary' : 'bg-gray-800'
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
                className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-800 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-gray-400 font-primary-semibold text-base">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goToNextStep}
                className="flex-1 py-4 rounded-xl items-center bg-secondary"
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
                disabled={!taskTitle.trim() || !selectedListId || !selectedDueDate}
                className={`flex-1 py-4 rounded-xl items-center ${
                  taskTitle.trim() && selectedListId && selectedDueDate
                    ? 'bg-secondary'
                    : 'bg-gray-800'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-primary-bold text-base ${
                    taskTitle.trim() && selectedListId && selectedDueDate
                      ? 'text-background'
                      : 'text-gray-600'
                  }`}
                >
                  Add Task
                </Text>
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
