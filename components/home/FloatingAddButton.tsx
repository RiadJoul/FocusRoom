import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface FloatingAddButtonProps {
  onPress: () => void;
}

export function FloatingAddButton({ onPress }: FloatingAddButtonProps) {
  return (
    <View className="absolute bottom-8 right-6">
      <TouchableOpacity 
        className="w-16 h-16 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/40"
        activeOpacity={0.8}
        onPress={onPress}
        style={{
          shadowColor: '#EA526F',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <FontAwesome5 name="plus" size={24} color="black" />
      </TouchableOpacity>
    </View>
  );
}
