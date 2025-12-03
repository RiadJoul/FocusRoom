import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export function SpaceMapViewer() {
  const { width, height } = Dimensions.get('window');

  // 0 → 1 looping value that drives continuous travel
  const travelAnim = useRef(new Animated.Value(0)).current;
  const planetRotation = useRef(new Animated.Value(0)).current;

  // Map dimensions (larger than screen for panning)
  const mapHeight = height * 3;
  const totalHeight = mapHeight * 2;

  // Stable random positions for stars / nebulas / asteroids
  const starPositionsRef = useRef<{ x: number; y: number; size: number }[] | null>(null);
  const nebulasRef = useRef<{ x: number; y: number; size: number; color: string }[] | null>(null);
  const asteroidsRef = useRef<{ x: number; y: number; size: number; rotation: string }[] | null>(null);

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

  const planetRotationInterpolate = planetRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Generate stars across the entire map once
  if (!starPositionsRef.current) {
    starPositionsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * width,
      y: Math.random() * mapHeight,
      size: 1 + Math.random() * 2,
    }));
  }
  const starPositions = starPositionsRef.current;


  // Nebula positions (scattered across map)
  if (!nebulasRef.current) {
    nebulasRef.current = [
      { x: width * 0.2, y: mapHeight * 0.2, size: 150, color: '#000000' },
      { x: width * 0.7, y: mapHeight * 0.35, size: 120, color: '#000000' },
      { x: width * 0.3, y: mapHeight * 0.55, size: 140, color: '#000000' },
      { x: width * 0.6, y: mapHeight * 0.7, size: 130, color: '#000000' },
      { x: width * 0.25, y: mapHeight * 0.85, size: 110, color: '#000000' },
    ];
  }
  const nebulas = nebulasRef.current;

  // Asteroid positions
  if (!asteroidsRef.current) {
    asteroidsRef.current = [
      { x: width * 0.15, y: mapHeight * 0.15, size: 8, rotation: '45deg' },
      { x: width * 0.8, y: mapHeight * 0.28, size: 6, rotation: '30deg' },
      { x: width * 0.4, y: mapHeight * 0.42, size: 10, rotation: '60deg' },
      { x: width * 0.65, y: mapHeight * 0.58, size: 7, rotation: '15deg' },
      { x: width * 0.2, y: mapHeight * 0.72, size: 9, rotation: '75deg' },
      { x: width * 0.75, y: mapHeight * 0.88, size: 8, rotation: '40deg' },
    ];
  }
  const asteroids = asteroidsRef.current;

  const renderLayer = (offsetY: number) => (
    <View
      style={{
        position: 'absolute',
        top: offsetY,
        left: 0,
        width,
        height: mapHeight,
      }}
    >
      {/* Stars (static brightness, only map moves) */}
      {starPositions.map((star, index) => (
        <View
          key={`${offsetY}-star-${index}`}
          className="absolute bg-white rounded-full"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
          }}
        />
      ))}

      {/* Milky Way Effects */}
      <View
        className="absolute w-[300px] h-[800px] bg-black rounded-[1000px]"
        style={{
          left: width * 0.3,
          top: mapHeight * 0.2,
          transform: [{ rotate: '-25deg' }],
        }}
      />
      <View
        className="absolute w-[250px] h-[600px] bg-black rounded-[1000px]"
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
          className="absolute rounded-full opacity-15"
          style={{
            left: nebula.x,
            top: nebula.y,
            width: nebula.size,
            height: nebula.size,
            backgroundColor: nebula.color,
          }}
        />
      ))}

      {/* Floating Asteroids */}
      {asteroids.map((asteroid, index) => (
        <View
          key={`${offsetY}-asteroid-${index}`}
          className="absolute bg-[#666]"
          style={{
            left: asteroid.x,
            top: asteroid.y,
            width: asteroid.size,
            height: asteroid.size,
            transform: [{ rotate: asteroid.rotation }],
          }}
        />
      ))}

      

    
    </View>
  );

  return (
    <View
      className="flex-1 bg-black"
      style={{
        // Rotate the whole scene slightly and scale up
        transform: [{ rotate: '15deg' }, { scale: 1.3 }],
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
        <View style={{ width, height: totalHeight}}>
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
       
        }}
      >
        {/* Rocket Exhaust/Trail */}
  
        {/* Rocket */}
        <View className="w-[50px] h-[50px] rounded-full  justify-center items-center  shadow-lg">
          <MaterialCommunityIcons name="rocket" size={34} color="white" />
        </View>

        
      </View>
    </View>
  );
}
