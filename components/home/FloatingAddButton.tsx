import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface FloatingAddButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
}

export function FloatingAddButton({ onPress, onLongPress }: FloatingAddButtonProps) {
  const [expanded, setExpanded] = useState(false);
  
  const handleMainPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onLongPress) {
      setExpanded(!expanded);
    } else {
      onPress();
    }
  };
  
  const handleQuickAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(false);
    onPress();
  };
  
  const handleRecurring = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(false);
    onLongPress?.();
  };
  
  return (
    <View className="absolute bottom-8 right-6">
      <View className="items-end">
        {/* Expanded Options - Stack upward */}
        {expanded && (
          <View className="mb-3 gap-3">
            {/* Recurring Task Button */}
            <Animated.View 
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
            >
              <TouchableOpacity 
                className="bg-gray-800 rounded-2xl px-5 py-4 flex-row items-center border-2 border-gray-700"
                activeOpacity={0.8}
                onPress={handleRecurring}
                style={{
                  minWidth: 200,
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
                  <MaterialCommunityIcons name="repeat" size={22} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-primary-bold text-base">Recurring Task</Text>
                  <Text className="text-blue-100 font-primary-regular text-xs mt-0.5">
                    Repeat daily, weekly...
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Quick Add Button */}
            <Animated.View 
              entering={FadeIn.duration(200).delay(50)}
              exiting={FadeOut.duration(150)}
            >
              <TouchableOpacity 
                className="bg-gray-800 rounded-2xl px-5 py-4 flex-row items-center border-2 border-gray-700"
                activeOpacity={0.8}
                onPress={handleQuickAdd}
                style={{
                  minWidth: 200,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
                  <FontAwesome5 name="plus" size={18} color="#E4F964" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-primary-bold text-base">Quick Add</Text>
                  <Text className="text-gray-400 font-primary-regular text-xs mt-0.5">
                    One-time task
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
        
        {/* Main Add Button */}
        <TouchableOpacity 
          className={`w-16 h-16 rounded-full items-center justify-center ${
            expanded ? 'bg-gray-800' : 'bg-primary'
          }`}
          activeOpacity={0.8}
          onPress={handleMainPress}
          style={{
            shadowColor: expanded ? '#000' : '#E4F964',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <FontAwesome5 
            name={expanded ? 'times' : 'plus'} 
            size={24} 
            color={expanded ? 'white' : 'black'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
