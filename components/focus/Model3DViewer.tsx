import { Asset } from 'expo-asset';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

interface Model3DViewerProps {
  width?: number;
  height?: number;
  autoRotate?: boolean;
  timerSeconds?: number;
}

export function Model3DViewer({ 
  width, 
  height,
  autoRotate = false,
  timerSeconds = 0
}: Model3DViewerProps) {
  const requestRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const timeRef = useRef<number>(0);
  const steamParticlesRef = useRef<THREE.Points | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const planetsRef = useRef<THREE.Mesh[]>([]);
  const digitalClockDigitsRef = useRef<THREE.Mesh[][]>([]);
  const timerSecondsRef = useRef<number>(timerSeconds);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
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
    renderer.setClearColor(0x000000, 1); // Dark space background
    renderer.shadowMap.enabled = false;
    
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 20, 50); // Deep space fog
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.01,
      100
    );
    camera.position.set(0, 2.5, 8.5);
    camera.lookAt(0, 0.3, -4);
    cameraRef.current = camera;

    const ambientLight = new THREE.AmbientLight(0x404060, 0.8); // Dimmer, bluish ambient
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x6A7BFF, 0xFF6B9D, 0.6); // Space colors
    scene.add(hemisphereLight);

    // Add directional light for better definition
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    directionalLight.position.set(5, 8, 5);
    scene.add(directionalLight);

    const deskGroup = new THREE.Group();

    // Clean wooden desk
    const deskGeometry = new THREE.BoxGeometry(5, 0.1, 3);
    const deskMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xC9A87C
    });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.y = 0;
    deskGroup.add(desk);

    // Minimalist wood grain
    for (let i = 0; i < 6; i++) {
      const grainGeometry = new THREE.BoxGeometry(4.8, 0.002, 0.015);
      const grainMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xB8956A,
        transparent: true,
        opacity: 0.4
      });
      const grain = new THREE.Mesh(grainGeometry, grainMaterial);
      grain.position.set(0, 0.052, -1.2 + i * 0.45);
      deskGroup.add(grain);
    }

    // TEXTBOOK (open, center-left)
    const textbookLeftPageGeometry = new THREE.BoxGeometry(0.55, 0.004, 0.7);
    const textbookPageMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFFAF0
    });
    const textbookLeftPage = new THREE.Mesh(textbookLeftPageGeometry, textbookPageMaterial);
    textbookLeftPage.position.set(-0.5, 0.058, 0.2);
    textbookLeftPage.rotation.y = -0.15;
    deskGroup.add(textbookLeftPage);

    const textbookRightPage = new THREE.Mesh(textbookLeftPageGeometry, textbookPageMaterial);
    textbookRightPage.position.set(-0.05, 0.058, 0.25);
    textbookRightPage.rotation.y = 0.15;
    deskGroup.add(textbookRightPage);

    // Textbook spine/binding (center)
    const spineGeometry = new THREE.BoxGeometry(0.02, 0.01, 0.7);
    const spineMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const spine = new THREE.Mesh(spineGeometry, spineMaterial);
    spine.position.set(-0.275, 0.062, 0.225);
    deskGroup.add(spine);

    // Text on left page (paragraphs and diagrams)
    for (let i = 0; i < 10; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.45, 0.001, 0.008);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(-0.5, 0.063, -0.1 + i * 0.05);
      line.rotation.y = -0.15;
      deskGroup.add(line);
    }

    // Diagram on left page (box with lines)
    const diagramBoxGeometry = new THREE.BoxGeometry(0.25, 0.001, 0.2);
    const diagramMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x3498db,
      transparent: true,
      opacity: 0.3
    });
    const diagramBox = new THREE.Mesh(diagramBoxGeometry, diagramMaterial);
    diagramBox.position.set(-0.5, 0.063, 0.5);
    diagramBox.rotation.y = -0.15;
    deskGroup.add(diagramBox);

    // Text on right page
    for (let i = 0; i < 11; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.48, 0.001, 0.008);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(-0.05, 0.063, -0.12 + i * 0.05);
      line.rotation.y = 0.15;
      deskGroup.add(line);
    }

    // NOTEBOOK (right side, organized)
    const notebookGeometry = new THREE.BoxGeometry(0.5, 0.02, 0.65);
    const notebookMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x34495e
    });
    const notebook = new THREE.Mesh(notebookGeometry, notebookMaterial);
    notebook.position.set(0.65, 0.06, 0.35);
    notebook.rotation.y = -0.05;
    deskGroup.add(notebook);

    // Notebook pages edge
    const pagesGeometry = new THREE.BoxGeometry(0.49, 0.018, 0.64);
    const pagesMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFFAF0
    });
    const pages = new THREE.Mesh(pagesGeometry, pagesMaterial);
    pages.position.set(0.65, 0.07, 0.35);
    pages.rotation.y = -0.05;
    deskGroup.add(pages);

    // Notebook spiral binding
    for (let i = 0; i < 15; i++) {
      const spiralGeometry = new THREE.TorusGeometry(0.008, 0.003, 8, 16);
      const spiralMaterial = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
      const spiral = new THREE.Mesh(spiralGeometry, spiralMaterial);
      spiral.position.set(0.4, 0.075, 0.05 + i * 0.04);
      spiral.rotation.y = Math.PI / 2 - 0.05;
      spiral.rotation.z = Math.PI / 2;
      deskGroup.add(spiral);
    }

    // HIGHLIGHTERS (organized in a row, back right)
    const highlighterColors = [0xffeb3b, 0xff9800, 0x4caf50, 0x2196f3];
    highlighterColors.forEach((color, i) => {
      const highlighterGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8);
      const highlighterMaterial = new THREE.MeshLambertMaterial({ color });
      const highlighter = new THREE.Mesh(highlighterGeometry, highlighterMaterial);
      highlighter.position.set(0.85 + i * 0.03, 0.063, -0.4);
      highlighter.rotation.z = Math.PI / 2;
      deskGroup.add(highlighter);
    });

    // PEN (on notebook, ready to write)
    const penBodyGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 16);
    const penBodyMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1a1a2e
    });
    const penBody = new THREE.Mesh(penBodyGeometry, penBodyMaterial);
    penBody.position.set(0.7, 0.085, 0.55);
    penBody.rotation.z = Math.PI / 2;
    penBody.rotation.y = 0.2;
    deskGroup.add(penBody);

    // Pen clip
    const penClipGeometry = new THREE.BoxGeometry(0.006, 0.08, 0.012);
    const penClipMaterial = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
    const penClip = new THREE.Mesh(penClipGeometry, penClipMaterial);
    penClip.position.set(0.8, 0.095, 0.55);
    penClip.rotation.z = Math.PI / 2;
    deskGroup.add(penClip);

    // PENCILS (in a pencil holder, back left)
    const pencilHolderGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.25, 32);
    const pencilHolderMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xECEFF1
    });
    const pencilHolder = new THREE.Mesh(pencilHolderGeometry, pencilHolderMaterial);
    pencilHolder.position.set(-1.2, 0.18, -0.5);
    deskGroup.add(pencilHolder);

    // Pencils in holder
    const pencilPositions = [
      { x: -0.02, z: -0.02, rot: 0.1 },
      { x: 0.02, z: -0.02, rot: -0.1 },
      { x: -0.02, z: 0.02, rot: 0.15 },
      { x: 0.02, z: 0.02, rot: -0.15 },
      { x: 0, z: 0, rot: 0 }
    ];

    pencilPositions.forEach(pos => {
      const pencilGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.4, 8);
      const pencilMaterial = new THREE.MeshLambertMaterial({ 
        color: [0xf4c430, 0x90EE90, 0x87CEEB, 0xFF6B6B][Math.floor(Math.random() * 4)]
      });
      const pencil = new THREE.Mesh(pencilGeometry, pencilMaterial);
      pencil.position.set(-1.2 + pos.x, 0.4, -0.5 + pos.z);
      pencil.rotation.z = pos.rot;
      deskGroup.add(pencil);

      // Pencil eraser top
      const eraserGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.03, 8);
      const eraserMaterial = new THREE.MeshLambertMaterial({ color: 0xFF69B4 });
      const eraser = new THREE.Mesh(eraserGeometry, eraserMaterial);
      eraser.position.set(-1.2 + pos.x, 0.6, -0.5 + pos.z);
      eraser.rotation.z = pos.rot;
      deskGroup.add(eraser);
    });

    // STICKY NOTE PAD (organized stack, left)
    const stickyNotePadGeometry = new THREE.BoxGeometry(0.2, 0.04, 0.2);
    const stickyNotePadMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xfff59d
    });
    const stickyNotePad = new THREE.Mesh(stickyNotePadGeometry, stickyNotePadMaterial);
    stickyNotePad.position.set(-1.1, 0.075, 0.3);
    deskGroup.add(stickyNotePad);

    // CALCULATOR (scientific, organized placement)
    const calculatorGeometry = new THREE.BoxGeometry(0.18, 0.015, 0.28);
    const calculatorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x263238
    });
    const calculator = new THREE.Mesh(calculatorGeometry, calculatorMaterial);
    calculator.position.set(1.1, 0.062, 0.0);
    calculator.rotation.y = -0.1;
    deskGroup.add(calculator);

    // Calculator screen
    const calcScreenGeometry = new THREE.BoxGeometry(0.15, 0.001, 0.08);
    const calcScreenMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x9CCC65,
      transparent: true,
      opacity: 0.8
    });
    const calcScreen = new THREE.Mesh(calcScreenGeometry, calcScreenMaterial);
    calcScreen.position.set(1.1, 0.07, -0.08);
    calcScreen.rotation.y = -0.1;
    deskGroup.add(calcScreen);

    // Calculator buttons (grid)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const buttonGeometry = new THREE.BoxGeometry(0.025, 0.003, 0.025);
        const buttonMaterial = new THREE.MeshLambertMaterial({ 
          color: row === 0 ? 0x546E7A : 0x37474F
        });
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        const xOffset = -0.045 + col * 0.032;
        const zOffset = 0.015 + row * 0.032;
        button.position.set(1.1 + xOffset * Math.cos(-0.1), 0.072, zOffset);
        button.rotation.y = -0.1;
        deskGroup.add(button);
      }
    }

    // DESK LAMP (modern, minimal)
    const lampBaseGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.06, 32);
    const lampMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xECEFF1
    });
    const lampBase = new THREE.Mesh(lampBaseGeometry, lampMaterial);
    lampBase.position.set(-1.5, 0.085, -0.8);
    deskGroup.add(lampBase);

    const armSegment1Geometry = new THREE.CylinderGeometry(0.015, 0.015, 0.6);
    const armSegment1 = new THREE.Mesh(armSegment1Geometry, lampMaterial);
    armSegment1.position.set(-1.5, 0.4, -0.8);
    armSegment1.rotation.z = -0.2;
    deskGroup.add(armSegment1);

    const armSegment2Geometry = new THREE.CylinderGeometry(0.015, 0.015, 0.45);
    const armSegment2 = new THREE.Mesh(armSegment2Geometry, lampMaterial);
    armSegment2.position.set(-1.62, 0.75, -0.8);
    armSegment2.rotation.z = 0.35;
    deskGroup.add(armSegment2);

    const jointGeometry = new THREE.SphereGeometry(0.025, 16, 16);
    const joint1 = new THREE.Mesh(jointGeometry, lampMaterial);
    joint1.position.set(-1.5, 0.68, -0.8);
    deskGroup.add(joint1);

    const joint2 = new THREE.Mesh(jointGeometry, lampMaterial);
    joint2.position.set(-1.7, 0.98, -0.8);
    deskGroup.add(joint2);

    const lampShadeGeometry = new THREE.ConeGeometry(0.18, 0.22, 32);
    const lampShadeMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFFFFF
    });
    const lampShade = new THREE.Mesh(lampShadeGeometry, lampShadeMaterial);
    lampShade.position.set(-1.75, 1.12, -0.8);
    lampShade.rotation.z = Math.PI + 0.3;
    deskGroup.add(lampShade);

    // Lamp glow
    const lampGlowGeometry = new THREE.CircleGeometry(0.15, 32);
    const lampGlowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFF9E6,
      transparent: true,
      opacity: 0.7
    });
    const lampGlow = new THREE.Mesh(lampGlowGeometry, lampGlowMaterial);
    lampGlow.position.set(-1.72, 1.0, -0.8);
    lampGlow.rotation.z = Math.PI + 0.3;
    lampGlow.rotation.y = Math.PI / 2;
    deskGroup.add(lampGlow);

    // WATER BOTTLE (minimal, clean)
    const bottleBodyGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 32);
    const bottleMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xB0BEC5,
      transparent: true,
      opacity: 0.9
    });
    const bottleBody = new THREE.Mesh(bottleBodyGeometry, bottleMaterial);
    bottleBody.position.set(1.4, 0.31, 0.5);
    deskGroup.add(bottleBody);

    const bottleCapGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.06, 32);
    const bottleCapMaterial = new THREE.MeshLambertMaterial({ color: 0x90A4AE });
    const bottleCap = new THREE.Mesh(bottleCapGeometry, bottleCapMaterial);
    bottleCap.position.set(1.4, 0.59, 0.5);
    deskGroup.add(bottleCap);

    // COFFEE MUG (white, minimal)
    const cupGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.28, 32);
    const cupMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFFFFF
    });
    const cup = new THREE.Mesh(cupGeometry, cupMaterial);
    cup.position.set(1.3, 0.19, -0.3);
    deskGroup.add(cup);

    const handleGeometry = new THREE.TorusGeometry(0.07, 0.018, 12, 24, Math.PI);
    const handle = new THREE.Mesh(handleGeometry, cupMaterial);
    handle.position.set(1.42, 0.19, -0.3);
    handle.rotation.y = Math.PI / 2;
    handle.rotation.z = Math.PI / 2;
    deskGroup.add(handle);

    const coffeeGeometry = new THREE.CylinderGeometry(0.11, 0.095, 0.24, 32);
    const coffeeMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4a3428
    });
    const coffee = new THREE.Mesh(coffeeGeometry, coffeeMaterial);
    coffee.position.set(1.3, 0.21, -0.3);
    deskGroup.add(coffee);

    // Coffee surface
    const coffeeSurfaceGeometry = new THREE.CircleGeometry(0.11, 32);
    const coffeeSurfaceMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x3a2418
    });
    const coffeeSurface = new THREE.Mesh(coffeeSurfaceGeometry, coffeeSurfaceMaterial);
    coffeeSurface.position.set(1.3, 0.331, -0.3);
    coffeeSurface.rotation.x = -Math.PI / 2;
    deskGroup.add(coffeeSurface);

    // Steam
    const steamParticleCount = 25;
    const steamGeometry = new THREE.BufferGeometry();
    const steamPositions = new Float32Array(steamParticleCount * 3);
    
    for (let i = 0; i < steamParticleCount; i++) {
      steamPositions[i * 3] = 1.3 + (Math.random() - 0.5) * 0.08;
      steamPositions[i * 3 + 1] = 0.33 + Math.random() * 0.4;
      steamPositions[i * 3 + 2] = -0.3 + (Math.random() - 0.5) * 0.08;
    }
    
    steamGeometry.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
    const steamMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending
    });
    
    const steamParticles = new THREE.Points(steamGeometry, steamMaterial);
    steamParticlesRef.current = steamParticles;
    deskGroup.add(steamParticles);

    // COASTER under mug
    const coasterGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.008, 32);
    const coasterMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xD7CCC8
    });
    const coaster = new THREE.Mesh(coasterGeometry, coasterMaterial);
    coaster.position.set(1.3, 0.059, -0.3);
    deskGroup.add(coaster);

    // BOOKMARKS (sticking out of textbook)
    const bookmarkColors = [0xe74c3c, 0x3498db, 0x2ecc71];
    bookmarkColors.forEach((color, i) => {
      const bookmarkGeometry = new THREE.BoxGeometry(0.015, 0.001, 0.3);
      const bookmarkMaterial = new THREE.MeshLambertMaterial({ color });
      const bookmark = new THREE.Mesh(bookmarkGeometry, bookmarkMaterial);
      bookmark.position.set(-0.275 + i * 0.02, 0.065, 0.5);
      deskGroup.add(bookmark);
    });

    // RULER (on desk, organized)
    const rulerGeometry = new THREE.BoxGeometry(0.8, 0.002, 0.05);
    const rulerMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9
    });
    const ruler = new THREE.Mesh(rulerGeometry, rulerMaterial);
    ruler.position.set(0.15, 0.057, -0.5);
    ruler.rotation.y = -0.05;
    deskGroup.add(ruler);

    // Ruler markings
    for (let i = 0; i < 16; i++) {
      const markGeometry = new THREE.BoxGeometry(0.001, 0.001, i % 5 === 0 ? 0.02 : 0.01);
      const markMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const mark = new THREE.Mesh(markGeometry, markMaterial);
      mark.position.set(-0.25 + i * 0.05, 0.058, -0.5);
      mark.rotation.y = -0.05;
      deskGroup.add(mark);
    }

    // DIGITAL TIMER DISPLAY
    const digitalClockGroup = new THREE.Group();
    digitalClockGroup.position.set(0, 0.58, -0.5);
    digitalClockGroup.rotation.x = -Math.PI / 6;
    
    const digitalClockBaseGeometry = new THREE.BoxGeometry(0.7, 0.22, 0.02);
    const digitalClockBaseMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x37474F
    });
    const digitalClockBase = new THREE.Mesh(digitalClockBaseGeometry, digitalClockBaseMaterial);
    digitalClockGroup.add(digitalClockBase);
    
    const digitalClockScreenGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.025);
    const digitalClockScreenMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0a0a0a
    });
    const digitalClockScreen = new THREE.Mesh(digitalClockScreenGeometry, digitalClockScreenMaterial);
    digitalClockScreen.position.set(0, 0, 0.013);
    digitalClockGroup.add(digitalClockScreen);
    
    const createDigitSegments = (xOffset: number) => {
      const segments: THREE.Mesh[] = [];
      const segmentMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00e676,
        transparent: true,
        opacity: 0.9
      });
      
      const segmentWidth = 0.035;
      const segmentHeight = 0.007;
      
      const horizontalGeometry = new THREE.BoxGeometry(segmentWidth, segmentHeight, 0.001);
      const verticalGeometry = new THREE.BoxGeometry(segmentHeight, segmentWidth, 0.001);
      
      const seg0 = new THREE.Mesh(horizontalGeometry, segmentMaterial.clone());
      seg0.position.set(xOffset, 0.025, 0.026);
      digitalClockGroup.add(seg0);
      segments.push(seg0);
      
      const seg1 = new THREE.Mesh(verticalGeometry, segmentMaterial.clone());
      seg1.position.set(xOffset + 0.02, 0.008, 0.026);
      digitalClockGroup.add(seg1);
      segments.push(seg1);
      
      const seg2 = new THREE.Mesh(verticalGeometry, segmentMaterial.clone());
      seg2.position.set(xOffset + 0.02, -0.008, 0.026);
      digitalClockGroup.add(seg2);
      segments.push(seg2);
      
      const seg3 = new THREE.Mesh(horizontalGeometry, segmentMaterial.clone());
      seg3.position.set(xOffset, -0.025, 0.026);
      digitalClockGroup.add(seg3);
      segments.push(seg3);
      
      const seg4 = new THREE.Mesh(verticalGeometry, segmentMaterial.clone());
      seg4.position.set(xOffset - 0.02, -0.008, 0.026);
      digitalClockGroup.add(seg4);
      segments.push(seg4);
      
      const seg5 = new THREE.Mesh(verticalGeometry, segmentMaterial.clone());
      seg5.position.set(xOffset - 0.02, 0.008, 0.026);
      digitalClockGroup.add(seg5);
      segments.push(seg5);
      
      const seg6 = new THREE.Mesh(horizontalGeometry, segmentMaterial.clone());
      seg6.position.set(xOffset, 0, 0.026);
      digitalClockGroup.add(seg6);
      segments.push(seg6);
      
      return segments;
    };
    
    const digit1Segments = createDigitSegments(-0.18);
    const digit2Segments = createDigitSegments(-0.08);
    const digit3Segments = createDigitSegments(0.06);
    const digit4Segments = createDigitSegments(0.16);
    
    digitalClockDigitsRef.current = [
      digit1Segments,
      digit2Segments,
      digit3Segments,
      digit4Segments
    ];
    
    const colonDotGeometry = new THREE.CircleGeometry(0.005, 8);
    const colonDotMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00e676,
      transparent: true,
      opacity: 0.9
    });
    
    const colonDot1 = new THREE.Mesh(colonDotGeometry, colonDotMaterial);
    colonDot1.position.set(-0.01, 0.012, 0.026);
    digitalClockGroup.add(colonDot1);
    
    const colonDot2 = new THREE.Mesh(colonDotGeometry, colonDotMaterial);
    colonDot2.position.set(-0.01, -0.012, 0.026);
    digitalClockGroup.add(colonDot2);
    
    deskGroup.add(digitalClockGroup);

    // DESK ORGANIZER (back right, tidy)
    const organizerBaseGeometry = new THREE.BoxGeometry(0.4, 0.08, 0.15);
    const organizerMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xCFD8DC
    });
    const organizerBase = new THREE.Mesh(organizerBaseGeometry, organizerMaterial);
    organizerBase.position.set(1.35, 0.095, -0.65);
    deskGroup.add(organizerBase);

    // Compartment dividers
    const dividerGeometry = new THREE.BoxGeometry(0.38, 0.07, 0.002);
    const divider1 = new THREE.Mesh(dividerGeometry, organizerMaterial);
    divider1.position.set(1.35, 0.095, -0.7);
    deskGroup.add(divider1);

    const divider2 = new THREE.Mesh(dividerGeometry, organizerMaterial);
    divider2.position.set(1.35, 0.095, -0.6);
    deskGroup.add(divider2);

    // Erasers in organizer
    const eraserGeometry = new THREE.BoxGeometry(0.08, 0.03, 0.04);
    const eraserMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const eraser1 = new THREE.Mesh(eraserGeometry, eraserMaterial);
    eraser1.position.set(1.25, 0.125, -0.65);
    deskGroup.add(eraser1);

    const eraserMaterial2 = new THREE.MeshLambertMaterial({ color: 0xFF6B9D });
    const eraser2 = new THREE.Mesh(eraserGeometry, eraserMaterial2);
    eraser2.position.set(1.35, 0.125, -0.65);
    deskGroup.add(eraser2);

    // Small clips in organizer
    for (let i = 0; i < 4; i++) {
      const clipGeometry = new THREE.TorusGeometry(0.01, 0.002, 8, 16);
      const clipMaterial = new THREE.MeshLambertMaterial({ color: 0x607D8B });
      const clip = new THREE.Mesh(clipGeometry, clipMaterial);
      clip.position.set(1.42, 0.125, -0.68 + i * 0.015);
      clip.rotation.x = Math.PI / 2;
      deskGroup.add(clip);
    }

    // PLANT (small succulent, organized corner)
    const plantPotGeometry = new THREE.CylinderGeometry(0.075, 0.06, 0.12, 16);
    const plantPotMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xE0E0E0
    });
    const plantPot = new THREE.Mesh(plantPotGeometry, plantPotMaterial);
    plantPot.position.set(-1.45, 0.11, 0.7);
    deskGroup.add(plantPot);

    const soilGeometry = new THREE.CircleGeometry(0.073, 16);
    const soilMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x5D4E37
    });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.set(-1.45, 0.17, 0.7);
    soil.rotation.x = -Math.PI / 2;
    deskGroup.add(soil);

    const createSucculentLayer = (radius: number, count: number, yPos: number, rotation: number) => {
      const leafGeometry = new THREE.BoxGeometry(0.02, 0.012, 0.055);
      const leafMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x7CB342
      });
      
      for (let i = 0; i < count; i++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / count) * Math.PI * 2 + rotation;
        leaf.position.set(
          -1.45 + Math.cos(angle) * radius,
          yPos,
          0.7 + Math.sin(angle) * radius
        );
        leaf.rotation.y = angle;
        leaf.rotation.x = -0.4;
        deskGroup.add(leaf);
      }
    };

    createSucculentLayer(0.05, 10, 0.19, 0);
    createSucculentLayer(0.035, 8, 0.22, 0.3);
    createSucculentLayer(0.02, 6, 0.25, 0.15);

    // CLEAN DESK MAT (subtle, organized)
    const deskMatGeometry = new THREE.BoxGeometry(2.8, 0.006, 2);
    const deskMatMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8F8F8F
    });
    const deskMat = new THREE.Mesh(deskMatGeometry, deskMatMaterial);
    deskMat.position.set(0, 0.058, 0.3);
    deskGroup.add(deskMat);

    // SPACE BACKGROUND
    // Create starfield
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50 - 10;
      starPositions.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ 
      color: 0xFFFFFF, 
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    starsRef.current = stars;
    scene.add(stars);

    // Helper function to load GLB models
    const loadGLBModel = async (modelPath: any): Promise<THREE.Object3D | null> => {
      try {
        console.log('Loading GLB model...');
        // Load asset
        const asset = Asset.fromModule(modelPath);
        await asset.downloadAsync();
        
        if (!asset.localUri) {
          console.error('Failed to load asset');
          return null;
        }

        console.log('Fetching GLB from:', asset.localUri);
        // Fetch the GLB file
        const response = await fetch(asset.localUri);
        const arrayBuffer = await response.arrayBuffer();
        
        console.log('Parsing GLB, size:', arrayBuffer.byteLength);
        // Parse GLB using GLTFLoader
        const loader = new GLTFLoader();
        
        return new Promise((resolve, reject) => {
          loader.parse(
            arrayBuffer,
            '',
            (gltf) => {
              console.log('GLB loaded successfully!', gltf.scene);
              console.log('Scene children:', gltf.scene.children.length);
              
              // Make sure materials are set up for mobile rendering
              gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  console.log('Found mesh:', child.name || 'unnamed');
                  if (child.material) {
                    // Replace with a simple basic material (even simpler than Lambert)
                    const newMaterial = new THREE.MeshBasicMaterial({
                      color: 0xFFFFFF, // White
                      wireframe: false,
                    });
                    child.material = newMaterial;
                    child.material.needsUpdate = true;
                    console.log('Replaced material with MeshBasicMaterial (white)');
                  }
                }
              });
              
              resolve(gltf.scene);
            },
            (error) => {
              console.error('Error parsing GLB:', error);
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error('Error loading GLB model:', error);
        return null;
      }
    };

    // Function to spawn a random planet occasionally
    const spawnPlanet = () => {
      const planetTypes = [
        { 
          name: 'Earth-like',
          size: 0.8, 
          color: 0x2E5F8F, 
          emissive: 0x1A3A5F, 
          intensity: 0.15,
          roughness: 0.8,
          metalness: 0.1
        },
        { 
          name: 'Mars',
          size: 1.2, 
          color: 0xCD5C3C, 
          emissive: 0x5C2812, 
          intensity: 0.2,
          roughness: 0.9,
          metalness: 0.0
        },
        { 
          name: 'Jupiter',
          size: 0.5, 
          color: 0xC88B3A, 
          emissive: 0x8B5A2B, 
          intensity: 0.25,
          roughness: 0.6,
          metalness: 0.2
        },
        { 
          name: 'Moon',
          size: 1.5, 
          color: 0xB8B8B8, 
          emissive: 0x4A4A4A, 
          intensity: 0.15,
          roughness: 1.0,
          metalness: 0.0
        },
        { 
          name: 'Venus',
          size: 1.0, 
          color: 0xFFC649, 
          emissive: 0xCC8833, 
          intensity: 0.3,
          roughness: 0.7,
          metalness: 0.1
        },
        { 
          name: 'Neptune',
          size: 0.3, 
          color: 0x4169E1, 
          emissive: 0x2C4C9A, 
          intensity: 0.2,
          roughness: 0.5,
          metalness: 0.3
        },
      ];

      const type = planetTypes[Math.floor(Math.random() * planetTypes.length)];
      
      // Create procedural sphere planet with better materials
      const geometry = new THREE.SphereGeometry(type.size, 64, 64);
      
      // Use MeshStandardMaterial for more realistic rendering
      const material = new THREE.MeshStandardMaterial({ 
        color: type.color,
        emissive: type.emissive,
        emissiveIntensity: type.intensity,
        roughness: type.roughness,
        metalness: type.metalness,
        flatShading: false,
      });
      
      // Add subtle random color variations to vertices for more realism
      const colors = [];
      const positionAttribute = geometry.attributes.position;
      for (let i = 0; i < positionAttribute.count; i++) {
        const variation = 0.85 + Math.random() * 0.15; // Random variation 85-100%
        colors.push(variation, variation, variation);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      material.vertexColors = true;
      
      const planet = new THREE.Mesh(geometry, material);
      
      // Random starting position far away
      const side = Math.random() > 0.5 ? 1 : -1;
      planet.position.set(
        side * (3 + Math.random() * 4), // Random x position
        -2 + Math.random() * 4, // Random y position
        -30 - Math.random() * 10 // Start far back
      );
      
      scene.add(planet);
      planetsRef.current.push(planet);
    };

    // Spawn initial planets occasionally (every 3-5 minutes)
    let nextPlanetSpawn = Math.random() * 120000 + 180000; // Random between 3-5 minutes (180000-300000ms)
    let lastSpawnTime = 0;

    

    meshRef.current = deskGroup;
    scene.add(deskGroup);

    const updateDigit = (segments: THREE.Mesh[], digit: number) => {
      const digitPatterns: boolean[][] = [
        [true, true, true, true, true, true, false],
        [false, true, true, false, false, false, false],
        [true, true, false, true, true, false, true],
        [true, true, true, true, false, false, true],
        [false, true, true, false, false, true, true],
        [true, false, true, true, false, true, true],
        [true, false, true, true, true, true, true],
        [true, true, true, false, false, false, false],
        [true, true, true, true, true, true, true],
        [true, true, true, true, false, true, true],
      ];
      
      const pattern = digitPatterns[digit] || digitPatterns[0];
      segments.forEach((seg, i) => {
        if (seg.material instanceof THREE.MeshBasicMaterial) {
          seg.material.opacity = pattern[i] ? 0.9 : 0.1;
        }
      });
    };

    const render = () => {
      requestRef.current = requestAnimationFrame(render);
      timeRef.current += 0.01;

      const currentTimerSeconds = timerSecondsRef.current;
      const minutes = Math.floor(currentTimerSeconds / 60);
      const seconds = currentTimerSeconds % 60;
      
      const minuteTens = Math.floor(minutes / 10);
      const minuteOnes = minutes % 10;
      const secondTens = Math.floor(seconds / 10);
      const secondOnes = seconds % 10;
      
      if (digitalClockDigitsRef.current.length === 4) {
        updateDigit(digitalClockDigitsRef.current[0], minuteTens);
        updateDigit(digitalClockDigitsRef.current[1], minuteOnes);
        updateDigit(digitalClockDigitsRef.current[2], secondTens);
        updateDigit(digitalClockDigitsRef.current[3], secondOnes);
      }

      // Animate stars moving towards camera (traveling through space effect)
      if (starsRef.current) {
        const positions = starsRef.current.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < positions.length / 3; i++) {
          // Move stars towards camera (positive Z direction)
          positions[i * 3 + 2] += 0.05;
          
          // Reset star position when it passes the camera
          if (positions[i * 3 + 2] > 10) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 2] = -40;
          }
        }
        
        starsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Move planets towards camera and remove when passed
      const currentTime = Date.now();
      if (currentTime - lastSpawnTime > nextPlanetSpawn && planetsRef.current.length < 2) {
        spawnPlanet();
        lastSpawnTime = currentTime;
        nextPlanetSpawn = Math.random() * 120000 + 180000; // Random between 3-5 minutes (180000-300000ms)
      }

      // Update planet positions
      for (let i = planetsRef.current.length - 1; i >= 0; i--) {
        const planet = planetsRef.current[i];
        planet.position.z += 0.08; // Move towards camera
        planet.rotation.y += 0.005; // Slow rotation
        
        // Remove planet when it passes the camera
        if (planet.position.z > 15) {
          sceneRef.current?.remove(planet);
          
          // Dispose geometry and materials properly
          planet.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) {
                child.geometry.dispose();
              }
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(material => material.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
          
          planetsRef.current.splice(i, 1);
        }
      }

      if (meshRef.current) {
        if (cameraRef.current) {
          cameraRef.current.position.x = Math.sin(timeRef.current * 0.15) * 0.012;
          cameraRef.current.position.y = 2.5 + Math.sin(timeRef.current * 0.25) * 0.006;
          cameraRef.current.position.z = 4.5 + Math.sin(timeRef.current * 0.18) * 0.008;
        }

        if (steamParticlesRef.current) {
          const positions = steamParticlesRef.current.geometry.attributes.position.array as Float32Array;
          
          for (let i = 0; i < steamParticleCount; i++) {
            positions[i * 3 + 1] += 0.002;
            
            if (positions[i * 3 + 1] > 0.75) {
              positions[i * 3 + 1] = 0.33;
              positions[i * 3] = 1.3 + (Math.random() - 0.5) * 0.08;
              positions[i * 3 + 2] = -0.3 + (Math.random() - 0.5) * 0.08;
            }
            
            positions[i * 3] += Math.sin(timeRef.current * 2 + i) * 0.0004;
            positions[i * 3 + 2] += Math.cos(timeRef.current * 2 + i) * 0.0004;
          }
          
          steamParticlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      gl.endFrameEXP();
    };

    render();
  };

  useEffect(() => {
    timerSecondsRef.current = timerSeconds;
  }, [timerSeconds]);

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <GLView
      style={[
        styles.glView, 
        width && height ? { width, height } : { flex: 1 }
      ]}
      onContextCreate={onContextCreate}
    />
  );
}

const styles = StyleSheet.create({
  glView: {
    borderRadius: 0,
  },
});