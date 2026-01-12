import React, { useEffect, useRef } from 'react';
import {  View, Animated } from 'react-native';
import { ListsSlide } from './ListsSlide';

const listGroups = [
  {
    title: 'School',
    color: '#38BDF8',
    items: [
      { label: 'Maths', icon: 'calculator-outline' },
      { label: 'Biology', icon: 'flask-outline' },
      { label: 'Revision', icon: 'book-outline' },
    ],
  },
  {
    title: 'Work',
    color: '#A855F7',
    items: [
      { label: 'Meetings', icon: 'people-outline' },
      { label: 'Calls', icon: 'call-outline' },
      { label: 'Deep Work', icon: 'rocket-outline' },
    ],
  },
  {
    title: 'Personal',
    color: '#22C55E',
    items: [
      { label: 'Fitness', icon: 'barbell-outline' },
      { label: 'Ideas', icon: 'bulb-outline' },
      { label: 'Errands', icon: 'cart-outline' },
    ],
  },
];

export function PremiumListsSlide() {
  const totalChips = listGroups.reduce((sum, g) => sum + g.items.length, 0);
  const chipAnims = useRef(Array.from({ length: totalChips }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = chipAnims.map((val, index) =>
      Animated.spring(val, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
        delay: index * 90,
      }),
    );

    Animated.stagger(70, animations).start();
  }, [chipAnims]);

  return (
    <View className="flex-1 justify-center">
      <ListsSlide/>
    </View>
  );
}
