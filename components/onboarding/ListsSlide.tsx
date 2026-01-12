import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated as RNAnimated } from 'react-native';

  const chipLabels = [
    // Row 1
    { label: 'Study',     icon: 'book-outline',          color: '#A5B4FC', left: 0,  bottom: 60,  rotateFrom: '-22deg', rotateTo: '-10deg', wobbleX: -4 },
    { label: 'Deep work', icon: 'rocket-outline',        color: '#F97316', left: 110, bottom: 60,  rotateFrom: '18deg',  rotateTo: '8deg',   wobbleX: 3 },
    { label: 'Emails',    icon: 'mail-outline',          color: '#38BDF8', left: 255, bottom: 60,  rotateFrom: '8deg',   rotateTo: '3deg',   wobbleX: 2 },
    // Row 2
    { label: 'Write',     icon: 'pencil-outline',        color: '#6EE7B7', left: 30,  bottom: 135, rotateFrom: '-18deg', rotateTo: '-8deg',  wobbleX: -3 },
    { label: 'Research',  icon: 'bulb-outline',          color: '#EBF5DF', left: 130, bottom: 165, rotateFrom: '20deg',  rotateTo: '10deg',  wobbleX: 3 },
    { label: 'Meetings',  icon: 'people-outline',        color: '#C4B5FD', left: 245, bottom: 115, rotateFrom: '10deg',  rotateTo: '4deg',   wobbleX: 2 },
    // Row 3
    { label: 'Exercise',  icon: 'walk-outline',          color: '#22D3EE', left: 18,  bottom: 210, rotateFrom: '-24deg', rotateTo: '-12deg', wobbleX: -4 },
    { label: 'Read',      icon: 'reader-outline',        color: '#FBBF24', left: 150, bottom: 240, rotateFrom: '16deg',  rotateTo: '6deg',   wobbleX: 3 },
    { label: 'Planning',  icon: 'calendar-outline',      color: '#DB7F8E', left: 250, bottom: 290, rotateFrom: '-8deg',  rotateTo: '-3deg',  wobbleX: -2 },
    // Row 4
    { label: 'Create',    icon: 'color-palette-outline', color: '#4ADE80', left: 20,  bottom: 295, rotateFrom: '-14deg', rotateTo: '-6deg',  wobbleX: -3 },
    { label: 'Meditate',  icon: 'leaf-outline',          color: '#A855F7', left: 115, bottom: 335, rotateFrom: '18deg',  rotateTo: '9deg',   wobbleX: 3 },
    { label: 'Calls',     icon: 'call-outline',          color: '#EA3788', left: 265, bottom: 395, rotateFrom: '10deg',  rotateTo: '4deg',   wobbleX: 2 },
    { label: 'Code',      icon: 'code-slash-outline',    color: '#38BDF8', left: 15, bottom: 395, rotateFrom: '1deg',  rotateTo: '-4deg',   wobbleX: 2 },
  ];

export function ListsSlide() {
  const chipsAnimated = useRef(false);
  const chipAnims = useRef(chipLabels.map(() => new RNAnimated.Value(0))).current;

  useEffect(() => {
    if (chipsAnimated.current) return;
    chipsAnimated.current = true;

    const animations = chipAnims.map((val, i) =>
      RNAnimated.spring(val, {
        toValue: 1,
        friction: 6,
        tension: 50,
        delay: 80 * i,
        useNativeDriver: true,
      }),
    );

    RNAnimated.stagger(60, animations).start();
  }, [chipAnims]);

  return (
    <View className="flex-1 items-center justify-end">
      <View style={{ width: '100%', height: 260 }}>
        {chipLabels.map((chip, i) => {
          const anim = chipAnims[i];
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-120, 0],
          });
          const translateX = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, chip.wobbleX],
          });
          const rotate = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [chip.rotateFrom, chip.rotateTo],
          });

          return (
            // eslint-disable-next-line react/no-array-index-key
            <RNAnimated.View
              key={chip.label + i}
              style={{
                position: 'absolute',
                left: chip.left,
                bottom: chip.bottom,
                opacity: anim,
                transform: [{ translateY }, { translateX }, { rotate }],
              }}
              className="px-4 py-2 rounded-full flex-row items-center gap-2 bg-white/5"
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: `${chip.color}26` }}
              >
                <Ionicons name={chip.icon as any} size={15} color={chip.color} />
              </View>
              <Text
                className="font-primary-semibold text-base"
                style={{ color: chip.color }}
              >
                {chip.label}
              </Text>
            </RNAnimated.View>
          );
        })}
      </View>
    </View>
  );
}

