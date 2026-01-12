import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome } from '@expo/vector-icons';

export function SpaceMapViewer() {
  const { width, height } = Dimensions.get('window');

  // 0 → 1 looping value that drives continuous travel
  const travelAnim = useRef(new Animated.Value(0)).current;
  const planetRotation = useRef(new Animated.Value(0)).current;

  // Map dimensions (larger than screen for panning)
  const mapHeight = height * 3;
  const totalHeight = mapHeight * 2;

  // Stable random positions for stars / nebulas / asteroids
  const starPositionsRef = useRef<{ x: number; y: number; size: number; color: string }[] | null>(null);
  const nebulasRef = useRef<{ x: number; y: number; size: number; color: string }[] | null>(null);
  const asteroidsRef = useRef<{ x: number; y: number; size: number; rotation: string }[] | null>(null);
  const planetsRef = useRef<{ x: number; y: number; size: number; color: string }[] | null>(null);

  // Rocket stays centered on screen
  const rocketX = width / 2;
  const rocketY = height / 2;

  // Map translate based on continuous travel loop (smooth, continuous).
  // We move one full mapHeight over the loop while the content is duplicated,
  // so when the animation resets there is no visible "jump".
  const mapTranslateY = travelAnim.interpolate({
    inputRange: [0, 1],
    // Move background "downwards" relative to rocket
    outputRange: [-mapHeight, 0],
  });

  // Planet rotation animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(planetRotation, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, [planetRotation]);

  // Continuous travel loop, independent of session timer
  useEffect(() => {
    const loopAnim = Animated.loop(
      Animated.timing(travelAnim, {
        toValue: 1,
        duration: 30000, // 30s for a full journey loop
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loopAnim.start();

    return () => {
      loopAnim.stop();
    };
  }, [travelAnim]);


  // Generate stars across the entire map once
  if (!starPositionsRef.current) {
    const starColors = ['#FFFFFF', '#FACC15', '#60A5FA', '#A855F7'];
    starPositionsRef.current = Array.from({ length: 110 }, () => ({
      x: Math.random() * width,
      y: Math.random() * mapHeight,
      size: 1 + Math.random() * 2.2,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));
  }
  const starPositions = starPositionsRef.current;


  // Nebula positions (scattered across map)
  if (!nebulasRef.current) {
    nebulasRef.current = [
      { x: width * 0.15, y: mapHeight * 0.18, size: 180, color: '#312E81' },
      { x: width * 0.7, y: mapHeight * 0.32, size: 150, color: '#1E3A8A' },
      { x: width * 0.25, y: mapHeight * 0.55, size: 170, color: '#4C1D95' },
      { x: width * 0.65, y: mapHeight * 0.7, size: 160, color: '#0F172A' },
      { x: width * 0.3, y: mapHeight * 0.85, size: 140, color: '#0369A1' },
    ];
  }
  const nebulas = nebulasRef.current;

  // Asteroid positions
  if (!asteroidsRef.current) {
    asteroidsRef.current = [
      { x: width * 0.12, y: mapHeight * 0.16, size: 9, rotation: '35deg' },
      { x: width * 0.8, y: mapHeight * 0.28, size: 7, rotation: '20deg' },
      { x: width * 0.42, y: mapHeight * 0.44, size: 11, rotation: '55deg' },
      { x: width * 0.68, y: mapHeight * 0.6, size: 8, rotation: '10deg' },
      { x: width * 0.2, y: mapHeight * 0.74, size: 10, rotation: '70deg' },
      { x: width * 0.78, y: mapHeight * 0.88, size: 9, rotation: '40deg' },
    ];
  }
  const asteroids = asteroidsRef.current;

  if (!planetsRef.current) {
    planetsRef.current = [
      { x: width * 0.18, y: mapHeight * 0.25, size: 40, color: '#F97316' },
      { x: width * 0.75, y: mapHeight * 0.5, size: 48, color: '#38BDF8' },
      { x: width * 0.3, y: mapHeight * 0.78, size: 36, color: '#22C55E' },
    ];
  }
  const planets = planetsRef.current;

  const renderLayer = (offsetY: number) => (
    <View
      style={{
        position: 'absolute',
        top: offsetY,
        left: 0,
        width: width,
        height: mapHeight,
      }}
    >
      {/* Stars (static brightness, only map moves) */}
      {starPositions.map((star, index) => (
        <View
          key={`${offsetY}-star-${index}`}
          className="absolute rounded-full"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            backgroundColor: star.color,
            opacity: 0.9,
          }}
        />
      ))}

      {/* Milky Way streaks */}
      <View
        className="absolute w-[320px] h-[820px] bg-black rounded-[1000px] opacity-60"
        style={{
          left: width * 0.3,
          top: mapHeight * 0.2,
          transform: [{ rotate: '-25deg' }],
        }}
      />
      <View
        className="absolute w-[260px] h-[620px] bg-black rounded-[1000px] opacity-50"
        style={{
          left: width * 0.5,
          top: mapHeight * 0.6,
          transform: [{ rotate: '35deg' }],
        }}
      />

      {/* Nebula Clouds */}
      {nebulas.map((nebula, index) => (
        <View
          key={`${offsetY}-nebula-${index}`}
          className="absolute rounded-full"
          style={{
            left: nebula.x,
            top: nebula.y,
            width: nebula.size,
            height: nebula.size,
            backgroundColor: '#000000',
            opacity: 0.22,
          }}
        />
      ))}

      {/* Floating Asteroids */}
      {asteroids.map((asteroid, index) => (
        <View
          key={`${offsetY}-asteroid-${index}`}
          className="absolute bg-[#6B7280]"
          style={{
            left: asteroid.x,
            top: asteroid.y,
            width: asteroid.size,
            height: asteroid.size,
            borderRadius: asteroid.size / 2,
            transform: [{ rotate: asteroid.rotation }],
          }}
        />
      ))}

      {/* Slow‑spinning distant planets */}
      {planets.map((planet, index) => (
        <Animated.View
          key={`${offsetY}-planet-${index}`}
          className="absolute items-center justify-center"
          style={{
            left: planet.x,
            top: planet.y,
            width: planet.size,
            height: planet.size,
            borderRadius: planet.size / 2,
            borderWidth: 1,
            borderColor: '#1F2937',
            backgroundColor: '#020617',
            transform: [
              {
                rotate: planetRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <View
            className="w-[80%] h-[80%] rounded-full"
            style={{ backgroundColor: planet.color }}
          />
        </Animated.View>
      ))}

    
    </View>
  );

  return (
    <View
      className="flex-1 bg-black"
      style={{
        // Rotate the whole scene slightly and scale up
        transform: [{ rotate: '15deg' }, { scale: 1.5 }],
      }}
    >
      {/* Space Map Background */}
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateY: mapTranslateY }],
          
        }}
      >
        {/* Duplicated space background for seamless looping */}
        <View style={{ width: width, height: totalHeight}}>
          {renderLayer(0)}
          {renderLayer(mapHeight)}
        </View>
      </Animated.View>

      {/* Fixed Rocket in Center (doesn't move with map) */}
      <View
        className="absolute"
        style={{
          left: rocketX - 25,
          top: rocketY - 25,
          pointerEvents: 'none',
          transform: [{ rotate: '-90deg' }],
        }}
      >
        {/* Rocket */}
        <View className="w-[56px] h-[56px]  justify-center items-center shadow-2xl shadow-black">
          <FontAwesome name="space-shuttle" size={28} color="#8F8F8F" />
          
        </View>
      </View>
    </View>
  );
}
