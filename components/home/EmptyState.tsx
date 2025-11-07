import { isSameDay } from '@/lib/utils/dateUtils';
import React from 'react';
import { Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

interface EmptyStateProps {
  selectedDay: Date;
  today: Date;
}

export function EmptyState({ selectedDay, today }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-10">

      <Text className="text-white font-primary-bold text-2xl mt-6 mb-2">
        No Tasks {isSameDay(selectedDay, today) ? 'Today' : 'for This Day'}
      </Text>
      <Text className="text-gray-400 font-primary-medium text-center px-8">
        {isSameDay(selectedDay, today)
          ? 'Ready for liftoff? Add tasks to begin your focus journey to space'
          : 'Prepare for takeoff! Add tasks to explore the universe on this day'}
      </Text>
      <View className='w-52 h-52 mt-5'>
        <LottieView
          source={require("../../assets/illustrations/lottie-add-animation.json")}
          style={{ width: "100%", height: "100%" }}
          autoPlay
          loop
        />
      </View>

    </View>
  );
}
