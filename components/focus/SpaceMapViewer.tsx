import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface SpaceMapViewerProps {
  progress?: number; // 0 → 1 (session completion)
  duration?: number; // total session duration in seconds
  zoomedOut?: boolean;
}

// Fixed-time phase durations (seconds) — same regardless of session length
const LAUNCH_DURATION_S = 10;
const LAND_DURATION_S   = 10;

// Destination planet layout constants (screen coordinates)
const PLANET_RIGHT  = 40;  // px from right edge
const PLANET_TOP    = 70;  // px from top edge
const PLANET_RADIUS = 55;  // half of planet illustration size (110px planet)

// Launch Earth layout constants (bottom-left corner)
const EARTH_SIZE   = 220;
const EARTH_LEFT   = -15;  // partially off-screen left
const EARTH_BOTTOM = -50;  // partially off-screen bottom

// ── Earth illustration ────────────────────────────────────────────────────────

function EarthIllustration({ size = 200 }: { size?: number }) {
  const r = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: '#1565c0',
        overflow: 'hidden',
        shadowColor: '#4fc3f7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 32,
      }}
    >
      {/* Ocean depth */}
      <View style={{ position: 'absolute', width: size * 1.4, height: size * 1.4, borderRadius: size, backgroundColor: '#0d47a1', top: -size * 0.2, left: -size * 0.2, opacity: 0.5 }} />
      {/* Americas */}
      <View style={{ position: 'absolute', width: size * 0.28, height: size * 0.55, borderRadius: size * 0.09, backgroundColor: '#2e7d32', left: size * 0.1, top: size * 0.18, transform: [{ rotate: '12deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.15, height: size * 0.22, borderRadius: size * 0.06, backgroundColor: '#388e3c', left: size * 0.18, top: size * 0.58, transform: [{ rotate: '-8deg' }] }} />
      {/* Europe/Africa */}
      <View style={{ position: 'absolute', width: size * 0.22, height: size * 0.48, borderRadius: size * 0.07, backgroundColor: '#388e3c', left: size * 0.52, top: size * 0.08, transform: [{ rotate: '-8deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.20, height: size * 0.28, borderRadius: size * 0.07, backgroundColor: '#43a047', left: size * 0.54, top: size * 0.48, transform: [{ rotate: '5deg' }] }} />
      {/* Clouds */}
      <View style={{ position: 'absolute', width: size * 0.75, height: size * 0.12, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.38)', left: size * 0.08, top: size * 0.28, transform: [{ rotate: '-6deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.55, height: size * 0.09, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.28)', left: size * 0.2, top: size * 0.62, transform: [{ rotate: '8deg' }] }} />
      {/* Specular */}
      <View style={{ position: 'absolute', width: size * 0.35, height: size * 0.35, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.12)', left: size * 0.08, top: size * 0.06 }} />
      {/* Atmosphere rim */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: r, borderWidth: 4, borderColor: 'rgba(120,200,255,0.45)' }} />
    </View>
  );
}

// ── Destination planet — dark gray rocky world ────────────────────────────────

function DestinationPlanet({ size = 110 }: { size?: number }) {
  const r = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: '#2e2e2e',
        overflow: 'hidden',
        shadowColor: '#aaaaaa',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      }}
    >
      {/* Darker crater regions */}
      <View style={{ position: 'absolute', width: size * 0.42, height: size * 0.28, borderRadius: size * 0.1, backgroundColor: '#1a1a1a', left: size * 0.38, top: size * 0.26, opacity: 0.85, transform: [{ rotate: '-12deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.32, height: size * 0.2, borderRadius: size * 0.08, backgroundColor: '#111', left: size * 0.06, top: size * 0.56, opacity: 0.75, transform: [{ rotate: '8deg' }] }} />
      {/* Lighter gray highland region */}
      <View style={{ position: 'absolute', width: size * 0.58, height: size * 0.18, borderRadius: size, backgroundColor: '#4a4a4a', left: size * 0.06, top: size * 0.38, opacity: 0.55, transform: [{ rotate: '-4deg' }] }} />
      {/* Small bright crater */}
      <View style={{ position: 'absolute', width: size * 0.12, height: size * 0.12, borderRadius: size, backgroundColor: '#5a5a5a', left: size * 0.6, top: size * 0.55 }} />
      {/* Specular highlight */}
      <View style={{ position: 'absolute', width: size * 0.28, height: size * 0.28, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.07)', left: size * 0.08, top: size * 0.06 }} />
      {/* Subtle gray atmosphere rim */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: r, borderWidth: 2, borderColor: 'rgba(180,180,180,0.3)' }} />
    </View>
  );
}


// ── Main component ────────────────────────────────────────────────────────────

export function SpaceMapViewer({ progress = 0, duration = 1800, zoomedOut = false }: SpaceMapViewerProps) {
  const { width, height } = Dimensions.get('window');

  // Fixed-time phase boundaries — launch and land always take the same wall-clock time
  const LAUNCH_END  = Math.min(LAUNCH_DURATION_S / duration, 0.25);
  const LAND_START  = Math.max(1 - LAND_DURATION_S / duration, LAUNCH_END + 0.1);

  // Scale uses native driver (GPU-smooth zoom); cross-fade uses JS driver (lets layout props update)
  const zoomAnim      = useRef(new Animated.Value(0)).current;
  const crossFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(zoomAnim, {
        toValue: zoomedOut ? 1 : 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
      Animated.spring(crossFadeAnim, {
        toValue: zoomedOut ? 1 : 0,
        useNativeDriver: false,
        tension: 60,
        friction: 10,
      }),
    ]).start();
  }, [zoomedOut, zoomAnim, crossFadeAnim]);

  const travelAnim     = useRef(new Animated.Value(0)).current;
  const planetRotation = useRef(new Animated.Value(0)).current;
  const progressAnim   = useRef(new Animated.Value(0)).current;

  const mapHeight   = height * 3;
  const totalHeight = mapHeight * 2;

  // Map content (stable, generated once)
  const starPositionsRef = useRef<{ x: number; y: number; size: number; color: string }[] | null>(null);
  const nebulasRef       = useRef<{ x: number; y: number; size: number; color: string }[] | null>(null);
  const asteroidsRef     = useRef<{ x: number; y: number; size: number; rotation: string }[] | null>(null);
  const planetsRef       = useRef<{ x: number; y: number; size: number; color: string }[] | null>(null);

  // Ship sits at screen center
  const shipCenterX = width  / 2;
  const shipCenterY = height / 2;

  // ── Destination planet (top-right) ───────────────────────────────────────────
  // JSX positions planet with `right: PLANET_RIGHT - PLANET_RADIUS` which puts the
  // planet's visual center at (width - PLANET_RIGHT, PLANET_TOP).
  const planetCenterX = width  - PLANET_RIGHT;
  const planetCenterY = PLANET_TOP;

  // Vector from ship center → planet (landing travel vector)
  const travelDX = planetCenterX - shipCenterX;  // positive = rightward
  const travelDY = planetCenterY - shipCenterY;  // negative = upward

  // Ship always faces toward destination planet (space-shuttle icon points right by default)
  const shipAngleDeg = Math.atan2(travelDY, travelDX) * (180 / Math.PI);

  // ── Launch Earth (bottom-left) ────────────────────────────────────────────────
  // Earth center in screen coordinates, given bottom-left positioning
  const earthCenterX = EARTH_LEFT + EARTH_SIZE / 2;
  const earthCenterY = height - EARTH_BOTTOM - EARTH_SIZE / 2;

  // Ship offset at launch = distance from screen center to Earth center
  const launchOffsetX = earthCenterX - shipCenterX;
  const launchOffsetY = earthCenterY - shipCenterY;

  // ── Sync progressAnim with progress prop ─────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 950,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [progress, progressAnim]);

  // ── Continuous background scroll ────────────────────────────────────────────
  const mapTranslateY = travelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-mapHeight, 0],
  });

  useEffect(() => {
    Animated.loop(
      Animated.timing(planetRotation, { toValue: 1, duration: 20000, useNativeDriver: true })
    ).start();
  }, [planetRotation]);

  useEffect(() => {
    if (zoomedOut) {
      travelAnim.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(travelAnim, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [travelAnim, zoomedOut]);

  // ── Phase-driven ship transforms (all in screen coordinates) ─────────────────

  // X: starts at Earth (bottom-left offset), cruises at center, lands at planet
  const shipTranslateX = progressAnim.interpolate({
    inputRange: [0, LAUNCH_END, LAND_START, 1],
    outputRange: [launchOffsetX, 0, 0, travelDX],
    extrapolate: 'clamp',
  });

  // Y: starts at Earth (below-left of center), rises to center, descends toward planet
  const shipTranslateY = progressAnim.interpolate({
    inputRange: [0, LAUNCH_END, LAND_START, 1],
    outputRange: [launchOffsetY, 0, 0, travelDY],
    extrapolate: 'clamp',
  });

  // Rotation: always points toward the destination planet (top-right)
  const shipRotation = `${shipAngleDeg}deg`;

  // Engine flame: on during launch ignition, off during cruise, on again for approach burn
  const flameIgnite  = LAUNCH_END * 0.2;
  const flameApproach = LAND_START + (1 - LAND_START) * 0.5;
  const flameOpacity = progressAnim.interpolate({
    inputRange: [0, flameIgnite, LAUNCH_END, LAND_START, flameApproach, 1],
    outputRange: [0, 1, 0, 0, 1, 0],
    extrapolate: 'clamp',
  });

  // ── Launch Earth — slides off to bottom-left as ship takes off ──────────────
  const earthTranslateX = progressAnim.interpolate({
    inputRange: [0, LAUNCH_END],
    outputRange: [0, -300],
    extrapolate: 'clamp',
  });

  const earthTranslateY = progressAnim.interpolate({
    inputRange: [0, LAUNCH_END],
    outputRange: [0, 300],
    extrapolate: 'clamp',
  });

  // ── Destination planet — off-screen top-right until landing, slides into view ──
  const destPlanetTranslateX = progressAnim.interpolate({
    inputRange: [0, LAND_START, 1],
    outputRange: [200, 200, 0],
    extrapolate: 'clamp',
  });

  const destPlanetTranslateY = progressAnim.interpolate({
    inputRange: [0, LAND_START, 1],
    outputRange: [-200, -200, 0],
    extrapolate: 'clamp',
  });

  const destPlanetScale = progressAnim.interpolate({
    inputRange: [LAND_START, 1],
    outputRange: [0.5, 2.4],
    extrapolate: 'clamp',
  });

  // ── Zoom helpers ──────────────────────────────────────────────────────────────
  // Scale 0.55 — shows both Earth and planet on screen at all journey stages
  // Ship is ALWAYS at screen center in the zoomed layer (same as normal view) so
  // scale always zooms in/out centered on the ship — no jarring position jump.
  const wrapperScale  = zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  const normalOpacity = crossFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const zoomedOpacity = crossFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // World-space centers (must match JSX positioning exactly)
  const earthCX  = EARTH_LEFT + EARTH_SIZE / 2;            // -15 + 110 = 95
  const earthCY  = height - EARTH_BOTTOM - EARTH_SIZE / 2; // height + 50 - 110
  const planetCX = width - PLANET_RIGHT;                    // width - 40
  const planetCY = PLANET_TOP;                              // 70

  // Ship world position along the straight Earth→planet path (JS value, updates each render)
  const shipWorldX = earthCX + (planetCX - earthCX) * progress;
  const shipWorldY = earthCY + (planetCY - earthCY) * progress;

  // In the zoomed layer the ship stays at screen center (shipCenterX, shipCenterY).
  // Earth and planet are offset from center by their distance to the ship in world space.
  const mapEarthLeft   = shipCenterX + (earthCX  - shipWorldX) - EARTH_SIZE / 2;
  const mapEarthTop    = shipCenterY + (earthCY  - shipWorldY) - EARTH_SIZE / 2;
  const mapPlanetLeft  = shipCenterX + (planetCX - shipWorldX) - PLANET_RADIUS;
  const mapPlanetTop   = shipCenterY + (planetCY - shipWorldY) - PLANET_RADIUS;

  // Dotted path from Earth center → planet center (ship-relative coordinates)
  const PATH_DOTS = 18;
  const pathDots = Array.from({ length: PATH_DOTS }, (_, i) => {
    const t = i / (PATH_DOTS - 1);
    return {
      x: shipCenterX + (earthCX + (planetCX - earthCX) * t - shipWorldX),
      y: shipCenterY + (earthCY + (planetCY - earthCY) * t - shipWorldY),
    };
  });

  // ── Map content generation ───────────────────────────────────────────────────

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

  if (!nebulasRef.current) {
    nebulasRef.current = [
      { x: width * 0.15, y: mapHeight * 0.18, size: 180, color: '#312E81' },
      { x: width * 0.70, y: mapHeight * 0.32, size: 150, color: '#1E3A8A' },
      { x: width * 0.25, y: mapHeight * 0.55, size: 170, color: '#4C1D95' },
      { x: width * 0.65, y: mapHeight * 0.70, size: 160, color: '#0F172A' },
      { x: width * 0.30, y: mapHeight * 0.85, size: 140, color: '#0369A1' },
    ];
  }
  const nebulas = nebulasRef.current;

  if (!asteroidsRef.current) {
    asteroidsRef.current = [
      { x: width * 0.12, y: mapHeight * 0.16, size: 9,  rotation: '35deg' },
      { x: width * 0.80, y: mapHeight * 0.28, size: 7,  rotation: '20deg' },
      { x: width * 0.42, y: mapHeight * 0.44, size: 11, rotation: '55deg' },
      { x: width * 0.68, y: mapHeight * 0.60, size: 8,  rotation: '10deg' },
      { x: width * 0.20, y: mapHeight * 0.74, size: 10, rotation: '70deg' },
      { x: width * 0.78, y: mapHeight * 0.88, size: 9,  rotation: '40deg' },
    ];
  }
  const asteroids = asteroidsRef.current;

  if (!planetsRef.current) {
    planetsRef.current = [
      { x: width * 0.18, y: mapHeight * 0.25, size: 40, color: '#F97316' },
      { x: width * 0.75, y: mapHeight * 0.50, size: 48, color: '#38BDF8' },
      { x: width * 0.30, y: mapHeight * 0.78, size: 36, color: '#22C55E' },
    ];
  }
  const planets = planetsRef.current;

  // ── Render layers ────────────────────────────────────────────────────────────

  const renderLayer = (offsetY: number) => (
    <View style={{ position: 'absolute', top: offsetY, left: 0, width, height: mapHeight }}>
      {/* Stars */}
      {starPositions.map((star, i) => (
        <View
          key={`${offsetY}-star-${i}`}
          style={{
            position: 'absolute',
            left: star.x, top: star.y,
            width: star.size, height: star.size,
            borderRadius: star.size,
            backgroundColor: star.color,
            opacity: 0.9,
          }}
        />
      ))}

      {/* Milky Way streaks */}
      <View style={{ position: 'absolute', width: 320, height: 820, borderRadius: 1000, backgroundColor: '#000', opacity: 0.6, left: width * 0.3, top: mapHeight * 0.2, transform: [{ rotate: '-25deg' }] }} />
      <View style={{ position: 'absolute', width: 260, height: 620, borderRadius: 1000, backgroundColor: '#000', opacity: 0.5, left: width * 0.5, top: mapHeight * 0.6, transform: [{ rotate: '35deg' }] }} />

      {/* Nebulas */}
      {nebulas.map((nebula, i) => (
        <View key={`${offsetY}-nebula-${i}`} style={{ position: 'absolute', left: nebula.x, top: nebula.y, width: nebula.size, height: nebula.size, borderRadius: nebula.size / 2, backgroundColor: '#000', opacity: 0.22 }} />
      ))}

      {/* Asteroids */}
      {asteroids.map((asteroid, i) => (
        <View key={`${offsetY}-asteroid-${i}`} style={{ position: 'absolute', left: asteroid.x, top: asteroid.y, width: asteroid.size, height: asteroid.size, borderRadius: asteroid.size / 2, backgroundColor: '#6B7280', transform: [{ rotate: asteroid.rotation }] }} />
      ))}

      {/* Distant planets */}
      {planets.map((planet, i) => (
        <Animated.View
          key={`${offsetY}-planet-${i}`}
          style={{
            position: 'absolute',
            left: planet.x, top: planet.y,
            width: planet.size, height: planet.size,
            borderRadius: planet.size / 2,
            borderWidth: 1, borderColor: '#1F2937',
            backgroundColor: '#020617',
            alignItems: 'center', justifyContent: 'center',
            transform: [{ rotate: planetRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
          }}
        >
          <View style={{ width: '80%', height: '80%', borderRadius: planet.size, backgroundColor: planet.color }} />
        </Animated.View>
      ))}
    </View>
  );

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]}>

      {/* Full-screen static star field — fills black gaps when zoomed out */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {starPositions.map((star, i) => (
          <View
            key={`bg-star-${i}`}
            style={{
              position: 'absolute',
              left: star.x, top: (star.y % height),
              width: star.size, height: star.size,
              borderRadius: star.size,
              backgroundColor: star.color,
              opacity: 0.5,
            }}
          />
        ))}
      </View>

      {/* Scaled content wrapper */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { transform: [{ scale: wrapperScale }] }]}
      >
        {/* Scrolling space background */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', transform: [{ rotate: '15deg' }, { scale: 1.5 }] }]}>
          <Animated.View style={{ flex: 1, transform: [{ translateY: mapTranslateY }] }}>
            <View style={{ width, height: totalHeight }}>
              {renderLayer(0)}
              {renderLayer(mapHeight)}
            </View>
          </Animated.View>
        </View>

        {/* ── Normal layer — cross-fades out when zooming (JS driver opacity so layout updates work) ── */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: normalOpacity }]}>
          {/* Earth */}
          <Animated.View
            style={{
              position: 'absolute', left: EARTH_LEFT, bottom: EARTH_BOTTOM,
              transform: [{ translateX: earthTranslateX }, { translateY: earthTranslateY }],
            }}
          >
            <EarthIllustration size={220} />
          </Animated.View>

          {/* Destination planet */}
          <Animated.View
            style={{
              position: 'absolute',
              right: PLANET_RIGHT - PLANET_RADIUS,
              top: PLANET_TOP - PLANET_RADIUS,
              transform: [{ translateX: destPlanetTranslateX }, { translateY: destPlanetTranslateY }, { scale: destPlanetScale }],
            }}
          >
            <DestinationPlanet size={PLANET_RADIUS * 1} />
          </Animated.View>

          {/* Ship */}
          <Animated.View
            style={{
              position: 'absolute', left: shipCenterX - 28, top: shipCenterY - 68,
              transform: [{ translateX: shipTranslateX }, { translateY: shipTranslateY }],
            }}
          >
            <View style={{ alignItems: 'center', transform: [{ rotate: shipRotation }] }}>
              <View style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center' }}>
                <FontAwesome name="space-shuttle" size={38} color="#8F8F8F" />
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* ── Zoomed layer — cross-fades in, ship moves along Earth→planet path ── */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: zoomedOpacity }]}>
          {/* Dotted path */}
          {pathDots.map((dot, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: dot.x - 3, top: dot.y - 3,
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'transparent',
              }}
            />
          ))}

          {/* Earth — offset from screen center by its distance to the ship */}
          <View style={{ position: 'absolute', left: mapEarthLeft, top: mapEarthTop }}>
            <EarthIllustration size={EARTH_SIZE} />
          </View>

          {/* Planet — offset from screen center by its distance to the ship */}
          <View style={{ position: 'absolute', left: mapPlanetLeft, top: mapPlanetTop }}>
            <DestinationPlanet size={PLANET_RADIUS * 2} />
          </View>

          {/* Ship — always at screen center so zoom pivots on the ship */}
          <View
            style={{
              position: 'absolute',
              left: shipCenterX - 28,
              top:  shipCenterY - 68,
            }}
          >
            <View style={{ alignItems: 'center', transform: [{ rotate: shipRotation }] }}>
              <View style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center' }}>
                <FontAwesome name="space-shuttle" size={38} color="#8F8F8F" />
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

    </View>
  );
}
