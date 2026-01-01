import { useSessionStore } from '@/lib/stores/sessionStore';
import { FocusSession } from '@/lib/types/session';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import React, { useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import * as THREE from 'three';

type PlanetStage = 0 | 1 | 2 | 3 | 4;

function getMidnight(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeDailyStreak(sessions: FocusSession[]): number {
  if (!sessions.length) return 0;

  const byDay = new Map<string, boolean>();
  sessions.forEach((s) => {
    const dayKey = getMidnight(new Date(s.started_at)).toISOString();
    byDay.set(dayKey, true);
  });

  let streak = 0;
  let cursor = getMidnight(new Date());

  // require at least one session today to start streak
  while (true) {
    const key = cursor.toISOString();
    if (!byDay.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function computeCurrentWeekMinutes(sessions: FocusSession[]): number {
  if (!sessions.length) return 0;

  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diffToMonday = (day + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  return (
    sessions
      .filter((s) => {
        const started = new Date(s.started_at);
        return started >= startOfWeek && started <= now;
      })
      .reduce((sum, s) => sum + s.duration_seconds, 0) / 60
  );
}

export function TerraformingPlanet() {
  const sessions = useSessionStore((state) => state.sessions);

  const dailyStreak = useMemo(
    () => computeDailyStreak(sessions),
    [sessions]
  );

  const weekMinutes = useMemo(
    () => computeCurrentWeekMinutes(sessions),
    [sessions]
  );

  const stage: PlanetStage = useMemo(() => {
    if (dailyStreak >= 21) return 4;
    if (dailyStreak >= 14) return 3;
    if (dailyStreak >= 7) return 2;
    if (dailyStreak >= 3) return 1;
    return 0;
  }, [dailyStreak]);

  const brightness = useMemo(() => {
    const target = 150; // minutes per week for full brightness
    const ratio = Math.max(0, Math.min(weekMinutes / target, 1));
    return 0.3 + ratio * 0.7; // 0.3–1.0
  }, [weekMinutes]);

  const stageLabel = useMemo(() => {
    switch (stage) {
      case 0:
        return 'Dead Rock';
      case 1:
        return 'Thin Atmosphere';
      case 2:
        return 'Emerging Seas';
      case 3:
        return 'Growing Cities';
      case 4:
        return 'Thriving World';
      default:
        return 'Dead Rock';
    }
  }, [stage]);

  const requestRef = useRef<number | null>(null);

  const handleContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientHeight: height,
        getContext: () => gl,
      } as any,
      context: gl,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(width, height);
    renderer.setClearColor(0x020617, 1);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 3.8);
    camera.lookAt(0, 0.1, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3 * brightness);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2 * brightness);
    keyLight.position.set(3, 3, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.4 * brightness);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 350;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      starPositions[i3] = (Math.random() - 0.5) * 12;
      starPositions[i3 + 1] = (Math.random() - 0.5) * 6;
      starPositions[i3 + 2] = - (Math.random() * 10 + 4);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x9ca3af,
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.65,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const planetGroup = new THREE.Group();
    scene.add(planetGroup);

    const planetGeometry = new THREE.SphereGeometry(1.0, 48, 48);
    const baseColor =
      stage >= 3
        ? 0x4ade80 // vibrant greens
        : stage >= 2
          ? 0x22c55e
          : stage >= 1
            ? 0x6b7280
            : 0x374151;

    const planetMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.1,
      roughness: stage === 0 ? 0.9 : 0.6,
    });

    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planetGroup.add(planet);

    const atmosphereGeometry = new THREE.SphereGeometry(1.08, 48, 48);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: stage >= 1 ? 0.25 * brightness : 0.04,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planetGroup.add(atmosphere);

    const waterGeometry = new THREE.SphereGeometry(0.98, 32, 32);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: stage >= 2 ? 0.9 : 0.0,
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    planetGroup.add(water);

    const cityGeometry = new THREE.BufferGeometry();
    const cityCount = 200;
    const cityPositions = new Float32Array(cityCount * 3);
    for (let i = 0; i < cityCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * (Math.PI / 2) + Math.PI / 4;
      const r = 1.01;
      cityPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      cityPositions[i3 + 1] = r * Math.cos(phi);
      cityPositions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    cityGeometry.setAttribute('position', new THREE.BufferAttribute(cityPositions, 3));
    const cityMaterial = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: stage >= 3 ? 0.85 * brightness : 0.0,
    });
    const cityLights = new THREE.Points(cityGeometry, cityMaterial);
    planetGroup.add(cityLights);

    const ringGeometry = new THREE.TorusGeometry(1.4, 0.05, 24, 80);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: stage >= 4 ? 0.6 : 0.0,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.2;
    planetGroup.add(ring);

    const moonGeometry = new THREE.SphereGeometry(0.16, 18, 18);
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xf9fafb,
      metalness: 0.2,
      roughness: 0.7,
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(1.8, 0.4, 0);
    const moon2 = moon.clone();
    moon2.scale.setScalar(0.8);
    moon2.position.set(-1.6, -0.3, -0.4);
    const moonGroup = new THREE.Group();
    moonGroup.add(moon);
    moonGroup.add(moon2);
    moonGroup.visible = stage >= 4;
    planetGroup.add(moonGroup);

    planetGroup.position.set(0, 0.1, 0);

    let lastTime = 0;

    const animate = (time: number) => {
      const t = time / 1000;
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      planetGroup.rotation.y += 0.15 * delta;

      const wobble = Math.sin(t * 1.2) * 0.03;
      planetGroup.rotation.z = wobble;

      const basePulse = 0.2 + Math.sin(t * 2.5) * 0.08;
      atmosphereMaterial.opacity =
        (stage >= 1 ? 0.18 : 0.04) * brightness + basePulse * 0.2;

      if (stage >= 3) {
        cityMaterial.opacity =
          0.65 * brightness + Math.sin(t * 8) * 0.15;
      }

      if (stage >= 4) {
        ring.rotation.z += 0.18 * delta;
        moonGroup.rotation.y += 0.4 * delta;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current != null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <View className="w-full">
      <View style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden' }}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={handleContextCreate}
        />
      </View>

      <View className="mt-3 px-1">
        <Text className="text-white font-primary-semibold text-sm">
          {stageLabel}
        </Text>
        <Text className="text-gray-400 font-primary-medium text-xs mt-1">
          Streak: {dailyStreak} day{dailyStreak === 1 ? '' : 's'} · This week: {Math.round(weekMinutes)} min focused
        </Text>
        <Text className="text-gray-500 font-primary-medium text-[11px] mt-1.5">
          Each day you focus, this world grows more alive. Keep your streak to terraform it into a thriving civilization.
        </Text>
      </View>
    </View>
  );
}

