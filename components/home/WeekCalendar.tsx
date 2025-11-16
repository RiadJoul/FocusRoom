import { getWeekDates, isSameDay, WEEK_DAYS } from '@/lib/utils/dateUtils';
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface WeekCalendarProps {
  selectedDay: Date;
  today: Date;
  onDaySelect: (date: Date) => void;
}

export function WeekCalendar({ selectedDay, today, onDaySelect }: WeekCalendarProps) {
  const { weekDates, todayIndex: TODAY_INDEX } = useMemo(() => getWeekDates(), []);

  return (
    <View className="pt-5">
      <View className="flex-row justify-between items-center">
        {weekDates.map((date, index) => {
          const isToday = index === TODAY_INDEX;
          const isSelected = isSameDay(date, selectedDay);
          const isPast = date < today && !isToday;
          
          // Pre-calculate className strings to avoid nested ternaries
          const dayColor = isSelected ? '#8F8F8F' : '#ffffff';
          const containerStyle = isSelected 
            ? '#8F8F8F' 
            : isPast 
              ? '#000000' 
              : 'transparent';

          const textColor = isSelected 
            ? '#0A0A0A' 
            : isPast 
              ? '#6B7280' 
              : '#9CA3AF';
          
          return (
            <TouchableOpacity 
              key={index} 
              className="items-center"
              activeOpacity={0.7}
              onPress={() => onDaySelect(new Date(date.getTime()))}
            >
              <Text 
                className="text-xs font-primary-semibold mb-2"
                style={{ color: dayColor }}
              >
                {WEEK_DAYS[index]}
              </Text>
              <View 
                className="w-14 h-16 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: containerStyle,
                  
                  shadowColor: isSelected ? '#8F8F8F' : undefined,
                  shadowOpacity: isSelected ? 0.2 : 0,
                  shadowRadius: isSelected ? 8 : 0,
                  elevation: isSelected ? 8 : 0,
                }}
              >
                <Text 
                  className="text-base font-primary-bold"
                  style={{ color: textColor }}
                >
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
