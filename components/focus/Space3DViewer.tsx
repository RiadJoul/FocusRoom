import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';

interface Model3DViewerProps {
  autoRotate?: boolean;
  timerSeconds?: number;
}

export function Model3DViewer({
  autoRotate = false,
  timerSeconds = 0,
}: Model3DViewerProps) {
  const requestRef      = useRef<number | null>(null);
  const sceneRef        = useRef<THREE.Scene | null>(null);
  const cameraRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef     = useRef<any>(null);
  const timeRef         = useRef<number>(0);
  const starsRef        = useRef<THREE.Points | null>(null);
  const starVelRef      = useRef<Float32Array | null>(null);
  const timerSecondsRef = useRef<number>(timerSeconds);
  const destGroupRef    = useRef<THREE.Group | null>(null);
  const destPlanetRef   = useRef<THREE.Mesh | null>(null);
  const moonRef         = useRef<THREE.Mesh | null>(null);

  const onContextCreate = useCallback(async (gl: ExpoWebGLRenderingContext) => {
    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientHeight: gl.drawingBufferHeight,
        getContext: () => gl,
      } as any,
      context: gl,
      alpha: false,
      antialias: false,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'default',
    });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x00000a, 1);
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x00000a, 40, 130);
    sceneRef.current = scene;

    // ── Camera ────────────────────────────────────────────────────────────────
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const camera = new THREE.PerspectiveCamera(62, aspect, 0.01, 200);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    cameraRef.current = camera;

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x111133, 2.0));
    const blueRim = new THREE.DirectionalLight(0x2244cc, 0.6);
    blueRim.position.set(-5, 3, 2);
    scene.add(blueRim);

    // ── Starfield (colored, warp-speed) ───────────────────────────────────────
    const STAR_COUNT = 1800;
    const starPalette = [
      0xffffff, 0xffffff, 0xffffff,
      0x88aaff, 0x99bbff,
      0xffeebb, 0xffddaa,
      0xff9977, 0xffaacc,
    ];
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starCol = new Float32Array(STAR_COUNT * 3);
    const starVel = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 100;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPos[i * 3 + 2] = -Math.random() * 100;
      starVel[i] = 0.06 + Math.random() * 0.14;
      const c = new THREE.Color(starPalette[Math.floor(Math.random() * starPalette.length)]);
      starCol[i * 3] = c.r; starCol[i * 3 + 1] = c.g; starCol[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color',    new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 0.07, vertexColors: true, transparent: true, opacity: 0.92,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    starsRef.current = stars;
    starVelRef.current = starVel;
    scene.add(stars);

    // ── Destination planet with rings + moon ──────────────────────────────────
    const destGroup = new THREE.Group();
    destGroup.position.set(1.5, 0.8, -100);
    destGroup.visible = false;
    destGroupRef.current = destGroup;

    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 32, 32),
      new THREE.MeshLambertMaterial({ color: 0x2244aa, emissive: 0x0a1544, emissiveIntensity: 0.4 }),
    );
    destPlanetRef.current = planetMesh;
    destGroup.add(planetMesh);

    [0x1a3388, 0x3355bb, 0x112266, 0x2255aa].forEach(col => {
      const patch = new THREE.Mesh(
        new THREE.SphereGeometry(3.22, 8, 8),
        new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.55 }),
      );
      patch.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0);
      patch.scale.set(0.35 + Math.random() * 0.3, 0.12 + Math.random() * 0.1, 0.35 + Math.random() * 0.3);
      destGroup.add(patch);
    });

    destGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(3.7, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x2255ee, transparent: true, opacity: 0.10, side: THREE.BackSide }),
    ));

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.8, 1.6, 3, 80),
      new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
    );
    outerRing.rotation.x = Math.PI / 3.2;
    destGroup.add(outerRing);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.5, 3, 80),
      new THREE.MeshBasicMaterial({ color: 0xaabbee, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    );
    innerRing.rotation.x = Math.PI / 3.2;
    destGroup.add(innerRing);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 16, 16),
      new THREE.MeshLambertMaterial({ color: 0x8899aa }),
    );
    moon.position.set(7, 0, 0);
    moonRef.current = moon;
    destGroup.add(moon);

    const planetLight = new THREE.PointLight(0x3366ff, 1.5, 25);
    destGroup.add(planetLight);
    scene.add(destGroup);

    // ── Render loop ───────────────────────────────────────────────────────────
    const render = () => {
      requestRef.current = requestAnimationFrame(render);
      timeRef.current += 0.01;
      const t = timeRef.current;

      // Warp stars toward camera
      if (starsRef.current && starVelRef.current) {
        const pos = starsRef.current.geometry.attributes.position.array as Float32Array;
        const vel = starVelRef.current;
        for (let i = 0; i < STAR_COUNT; i++) {
          pos[i * 3 + 2] += vel[i];
          if (pos[i * 3 + 2] > 5) {
            pos[i * 3]     = (Math.random() - 0.5) * 100;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
            pos[i * 3 + 2] = -100;
          }
        }
        starsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Destination planet approach
      if (destGroupRef.current) {
        const remaining = timerSecondsRef.current;
        const FIVE_MIN  = 300;
        if (remaining > 0 && remaining <= FIVE_MIN) {
          destGroupRef.current.visible = true;
          const p = (FIVE_MIN - remaining) / FIVE_MIN;
          destGroupRef.current.position.set(1.5 - p * 1.0, 0.8 - p * 0.3, -100 + p * 86);
          if (destPlanetRef.current) destPlanetRef.current.rotation.y += 0.004;
          if (moonRef.current) {
            moonRef.current.position.x = Math.cos(t * 0.45) * 7;
            moonRef.current.position.y = Math.sin(t * 0.45) * 1.8;
            moonRef.current.position.z = Math.sin(t * 0.45) * 4;
          }
        } else {
          destGroupRef.current.visible = false;
        }
      }

      // Subtle camera drift
      if (cameraRef.current) {
        cameraRef.current.position.x = Math.sin(t * 0.13) * 0.014;
        cameraRef.current.position.y = Math.sin(t * 0.19) * 0.009;
        cameraRef.current.lookAt(Math.sin(t * 0.07) * 0.02, Math.sin(t * 0.11) * 0.01, -1);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      gl.endFrameEXP();
    };

    render();
  }, []);

  useEffect(() => { timerSecondsRef.current = timerSeconds; }, [timerSeconds]);
  useEffect(() => {
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  return <GLView style={styles.glView} onContextCreate={onContextCreate} />;
}

const styles = StyleSheet.create({
  glView: { flex: 1, borderRadius: 0 },
});