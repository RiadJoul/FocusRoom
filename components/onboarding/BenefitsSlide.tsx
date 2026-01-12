import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated } from 'react-native';

type Side = 'left' | 'right';

const benefits: {
  text: string;
  highlight: string;
  color: string;
  icon: string;
  side: Side;
}[] = [
  {
    text: 'Complete 50% more tasks during focused work sessions.',
    highlight: '50%',
    color: '#F97316',
    icon: 'folder-outline',
    side: 'left',
  },
  {
    text: 'Stay fully distraction-free for up to 90% of your session time.',
    highlight: '90%',
    color: '#22C55E',
    icon: 'reload-circle-outline',
    side: 'right',
  },
  {
    text: 'Extend your deep focus time by 60% with structured sessions.',
    highlight: '60%',
    color: '#F97373',
    icon: 'hourglass-outline',
    side: 'left',
  },
  {
    text: 'Build habits that help you reclaim 40% more time every month.',
    highlight: '40%',
    color: '#3B82F6',
    icon: 'trophy-outline',
    side: 'right',
  },
];


export function BenefitsSlide() {
  const anims = useRef(benefits.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((val, index) =>
      Animated.spring(val, {
        toValue: 1,
        friction: 7,
        tension: 60,
        delay: 500 * index,
        useNativeDriver: true,
      }),
    );

    Animated.stagger(90, animations).start();
  }, [anims]);

  return (
    <View className="flex-1 justify-center space-y-5 mt-4">
      {benefits.map((b, i) => {
        const val = anims[i];
        const fromX = b.side === 'left' ? -80 : 80;
        const translateX = val.interpolate({
          inputRange: [0, 1],
          outputRange: [fromX, 0],
        });
        const translateY = val.interpolate({
          inputRange: [0, 1],
          outputRange: [15, 0],
        });
        const rotate = val.interpolate({
          inputRange: [0, 1],
          outputRange: [b.side === 'left' ? '-4deg' : '4deg', '0deg'],
        });

        const [before, after] = b.text.split(b.highlight);

        return (
          // eslint-disable-next-line react/no-array-index-key
          <Animated.View
            key={b.text + i}
            style={{
              opacity: val,
              transform: [{ translateX }, { translateY }, { rotate }],
              alignSelf: b.side === 'left' ? 'flex-start' : 'flex-end',
            }}
            className="max-w-[86%] px-4 py-3 rounded-3xl bg-black/80 flex-row items-center"
          >
            <View
              className="w-8 h-8 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: `${b.color}24` }}
            >
              <Ionicons name={b.icon as any} size={18} color={b.color} />
            </View>
            <Text className="flex-1 text-lg font-primary-medium text-gray-200">
              {before}
              <Text style={{ color: b.color, fontWeight: '700' }}>{b.highlight}</Text>
              {after}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

