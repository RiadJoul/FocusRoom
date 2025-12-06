import { useSessionStore } from '@/lib/stores/sessionStore';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import React, { useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import * as THREE from 'three';

type UpgradeLevel = 0 | 1 | 2 | 3;

export default function SpaceStation() {
  const stats = useSessionStore((state) => state.stats);

  const totalMinutes = stats?.totalMinutes ?? 0;

  const level: UpgradeLevel = useMemo(() => {
    if (totalMinutes >= 600) return 3; // 10+ hours
    if (totalMinutes >= 180) return 2; // 3–10 hours
    if (totalMinutes >= 60) return 1;  // 1–3 hours
    return 0;
  }, [totalMinutes]);

  const levelLabel = useMemo(() => {
    switch (level) {
      case 0:
        return 'Rookie Shuttle';
      case 1:
        return 'Explorer Class';
      case 2:
        return 'Commander Cruiser';
      case 3:
        return 'Flagship Aurora';
      default:
        return 'Rookie Shuttle';
    }
  }, [level]);

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
    // Match the deep space background used in Space3DViewer
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 4.5);
    camera.lookAt(0, 0.2, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x8fd5ff, 1.3);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6d28d9, 0.9);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    // Starfield backdrop
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      starPositions[i3] = (Math.random() - 0.5) * 12;
      starPositions[i3 + 1] = (Math.random() - 0.5) * 6 + 1;
      starPositions[i3 + 2] = - (Math.random() * 10 + 3);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x9ca3af,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Holographic dock / base ring
    const dockGeometry = new THREE.RingGeometry(0.9, 1.3, 64);
    const dockMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const dock = new THREE.Mesh(dockGeometry, dockMaterial);
    dock.rotation.x = -Math.PI / 2;
    dock.position.y = -0.5;
    scene.add(dock);

    // Spaceship group
    const ship = new THREE.Group();
    scene.add(ship);

    // Core hull – shape/color subtly depend on level so upgrades feel dramatic.
    const hullGeometry = new THREE.CylinderGeometry(
      level >= 2 ? 0.32 : 0.24,
      level >= 2 ? 0.5 : 0.34,
      level >= 2 ? 2.2 : 1.6,
      28
    );
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: level >= 2 ? 0x020617 : 0x1f2937,
      metalness: 0.8,
      roughness: level >= 2 ? 0.25 : 0.4,
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    ship.add(hull);

    // Cockpit – brighter, larger glow at higher levels.
    const cockpitGeometry = new THREE.SphereGeometry(
      level >= 2 ? 0.34 : 0.26,
      24,
      24
    );
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: level >= 2 ? 0.6 : 0.35,
      metalness: 0.35,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0.2, 0.12, 0);
    ship.add(cockpit);

    // Forward nose cone – gets longer and sharper with levels.
    const noseGeometry = new THREE.ConeGeometry(
      level >= 2 ? 0.18 : 0.14,
      level >= 2 ? 0.7 : 0.45,
      26
    );
    const noseMaterial = new THREE.MeshStandardMaterial({
      color: 0xf9fafb,
      metalness: 0.9,
      roughness: 0.18,
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(level >= 2 ? 1.2 : 1.0, 0, 0);
    nose.rotation.z = Math.PI / 2;
    ship.add(nose);

    const upgradeParts: { level: UpgradeLevel; mesh: THREE.Object3D }[] = [];

    // Level 1: primary wings (big jump from level 0 – wide, swept wings).
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      metalness: 0.7,
      roughness: 0.35,
    });
    const wingGeometry = new THREE.BoxGeometry(0.14, 1.3, 0.55);
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0, 0.08, 0.9);
    leftWing.rotation.x = Math.PI / 10;
    leftWing.rotation.z = Math.PI / 16;
    const rightWing = leftWing.clone();
    rightWing.position.z = -0.9;
    rightWing.rotation.z = -Math.PI / 16;
    ship.add(leftWing);
    ship.add(rightWing);
    upgradeParts.push({ level: 1, mesh: leftWing }, { level: 1, mesh: rightWing });

    // Small dorsal fin – level 1+.
    const finGeometry = new THREE.ConeGeometry(0.16, 0.5, 18);
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.6,
      roughness: 0.3,
    });
    const dorsalFin = new THREE.Mesh(finGeometry, finMaterial);
    dorsalFin.position.set(0.2, 0.7, 0);
    dorsalFin.rotation.x = Math.PI;
    ship.add(dorsalFin);
    upgradeParts.push({ level: 1, mesh: dorsalFin });

    // Level 2: heavy side boosters + stabilizer fins (dramatic silhouette change).
    const boosterGeometry = new THREE.CylinderGeometry(0.25, 0.22, 1.4, 22);
    const boosterMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.8,
      roughness: 0.25,
    });
    const boosterLeft = new THREE.Mesh(boosterGeometry, boosterMaterial);
    boosterLeft.rotation.z = Math.PI / 2;
    boosterLeft.position.set(-0.2, -0.1, 1.1);
    const boosterRight = boosterLeft.clone();
    boosterRight.position.z = -1.1;
    ship.add(boosterLeft);
    ship.add(boosterRight);
    upgradeParts.push({ level: 2, mesh: boosterLeft }, { level: 2, mesh: boosterRight });

    const stabilizerGeometry = new THREE.BoxGeometry(0.08, 0.6, 0.3);
    const stabilizerMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.7,
      roughness: 0.35,
    });
    const stabilizerTop = new THREE.Mesh(stabilizerGeometry, stabilizerMaterial);
    stabilizerTop.position.set(-0.5, 0.55, 0);
    stabilizerTop.rotation.x = Math.PI / 8;
    ship.add(stabilizerTop);
    upgradeParts.push({ level: 2, mesh: stabilizerTop });

    // Level 3: halo ring + antenna + crown panels (big “flagship” upgrade).
    const haloGeometry = new THREE.TorusGeometry(1.2, 0.06, 20, 80);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.4,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.05;
    ship.add(halo);
    upgradeParts.push({ level: 3, mesh: halo });

    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 12);
    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xf97316,
      emissiveIntensity: 0.7,
      metalness: 0.7,
      roughness: 0.2,
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 0.9, 0);
    ship.add(antenna);
    upgradeParts.push({ level: 3, mesh: antenna });

    // Crown panels orbiting the hull
    const crownPanelGeometry = new THREE.BoxGeometry(0.16, 0.06, 0.4);
    const crownPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.2,
    });
    const crownPanels: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const panel = new THREE.Mesh(crownPanelGeometry, crownPanelMaterial);
      const angle = (i / 4) * Math.PI * 2;
      panel.position.set(Math.cos(angle) * 1.4, 0.1 + (i % 2 === 0 ? 0.15 : -0.1), Math.sin(angle) * 0.6);
      ship.add(panel);
      crownPanels.push(panel);
      upgradeParts.push({ level: 3, mesh: panel });
    }

    // Engine core + thruster glow
    const engineGeometry = new THREE.CylinderGeometry(
      level >= 2 ? 0.26 : 0.18,
      level >= 2 ? 0.3 : 0.22,
      level >= 2 ? 0.55 : 0.35,
      24
    );
    const engineMaterial = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.9,
      roughness: 0.1,
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.set(-0.95, 0, 0);
    engine.rotation.z = Math.PI / 2;
    ship.add(engine);

    const thrusterGeometry = new THREE.ConeGeometry(
      level >= 2 ? 0.26 : 0.16,
      level >= 2 ? 0.8 : 0.5,
      24
    );
    const thrusterMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.7,
    });
    const thrusterFlame = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    thrusterFlame.position.set(-1.25, 0, 0);
    thrusterFlame.rotation.z = -Math.PI / 2;
    ship.add(thrusterFlame);

    // Upgrade visibility based on current level
    const applyUpgradeVisibility = () => {
      upgradeParts.forEach(({ level: required, mesh }) => {
        mesh.visible = level >= required;
      });
    };
    applyUpgradeVisibility();

    // Initial ship transform
    ship.position.set(0, 0.1, 0);
    ship.rotation.y = -Math.PI / 8;
    const baseScale = 0.8;
    const scaleBoost = 0.25 * level;
    ship.scale.setScalar(baseScale + scaleBoost);

    let lastTime = 0;

    const animate = (time: number) => {
      const t = time / 1000;
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Gentle rotation and bobbing
      ship.rotation.y += 0.25 * delta;
      ship.position.y = 0.1 + Math.sin(t * 1.6) * 0.08;

      // Thruster pulsing stronger at higher levels
      const basePulse = 0.35 + Math.sin(t * 6) * 0.15;
      const levelBoost = level * 0.2;
      thrusterFlame.scale.setScalar(1 + levelBoost);
      (thrusterFlame.material as THREE.MeshBasicMaterial).opacity = Math.min(
        0.2 + basePulse + levelBoost,
        1
      );

      // Halo + crown rotation (only visible at level 3)
      halo.rotation.z += 0.5 * delta;
      crownPanels.forEach((panel, index) => {
        panel.rotation.y += (index % 2 === 0 ? 1 : -1) * 0.6 * delta;
      });

      // Dock ripple
      dockMaterial.opacity = 0.18 + Math.sin(t * 1.5) * 0.06;

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

      <View className="mt-3 flex-row items-center justify-between px-2">
        <View>
          <Text className="text-white font-primary-semibold text-sm">
            {levelLabel}
          </Text>
          <Text className="text-gray-400 font-primary-medium text-xs mt-1">
            Total focused: {totalMinutes} min
          </Text>
        </View>
        <View className="bg-primary/20 border border-primary/40 rounded-full px-3 py-1">
          <Text className="text-primary font-primary-semibold text-xs uppercase tracking-wider">
            Level {level}
          </Text>
        </View>
      </View>
    </View>
  );
}
