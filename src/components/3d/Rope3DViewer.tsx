'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { BeadPattern } from '@/types';
import type { ColorMapping } from '@/types/colorMapping';
import { SKIP_COLOR_INDEX, EMPTY_COLOR_INDEX } from '@/types';

interface Rope3DViewerProps {
  pattern: BeadPattern;
  colorMappings?: ColorMapping[];
  autoRotate?: boolean;
  className?: string;
}

interface BeadMeshProps {
  position: [number, number, number];
  color: string;
  radius?: number;
}

function BeadMesh({ position, color, radius = 0.4 }: BeadMeshProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

interface RopeHelixProps {
  pattern: BeadPattern;
  colorMappings?: ColorMapping[];
  autoRotate?: boolean;
}

function RopeHelix({ pattern, colorMappings, autoRotate = true }: RopeHelixProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Build a set of color indices that are marked as "skip" in color mappings
  const skippedColorIndices = useMemo(() => {
    const skipped = new Set<number>();
    if (colorMappings) {
      for (const mapping of colorMappings) {
        if (mapping.mappedColorIndex === SKIP_COLOR_INDEX) {
          skipped.add(mapping.originalIndex);
        }
      }
    }
    return skipped;
  }, [colorMappings]);

  const beadData = useMemo(() => {
    const beads: { position: [number, number, number]; color: string }[] = [];
    const { width, height, field, colors } = pattern;

    // Parameters for helix
    const beadRadius = 0.4;
    const beadSpacing = beadRadius * 2.1;
    const helixRadius = (width * beadSpacing) / (2 * Math.PI);
    const heightStep = beadSpacing * 0.8;

    // Calculate center offset
    const totalHeight = height * heightStep;
    const yOffset = -totalHeight / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = row * width + col;
        const colorIndex = field[index];

        // Skip empty and skip cells
        if (colorIndex === SKIP_COLOR_INDEX || colorIndex === EMPTY_COLOR_INDEX) {
          continue;
        }

        // Skip colors marked as "skip" in color mappings
        if (skippedColorIndices.has(colorIndex)) {
          continue;
        }

        // Get color
        const beadColor = colors[colorIndex];
        if (!beadColor) continue;

        // Calculate position on helix
        const angle = ((col + row * 0.5) / width) * Math.PI * 2;
        const x = Math.cos(angle) * helixRadius;
        const z = Math.sin(angle) * helixRadius;
        const y = row * heightStep + yOffset;

        const colorHex = `rgb(${beadColor.r}, ${beadColor.g}, ${beadColor.b})`;
        beads.push({
          position: [x, y, z],
          color: colorHex,
        });
      }
    }

    return beads;
  }, [pattern, skippedColorIndices]);

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {beadData.map((bead, i) => (
        <BeadMesh key={i} position={bead.position} color={bead.color} />
      ))}
    </group>
  );
}

export function Rope3DViewer({ pattern, colorMappings, autoRotate = true, className = '' }: Rope3DViewerProps) {
  // Calculate camera distance based on pattern size
  const cameraDistance = useMemo(() => {
    const beadSpacing = 0.8;
    const helixRadius = (pattern.width * beadSpacing) / (2 * Math.PI);
    const totalHeight = pattern.height * beadSpacing * 0.8;
    return Math.max(helixRadius * 3, totalHeight * 0.8, 10);
  }, [pattern.width, pattern.height]);

  return (
    <div className={`w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg ${className}`}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[cameraDistance, cameraDistance * 0.5, cameraDistance]} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <pointLight position={[0, 10, 0]} intensity={0.5} />

        {/* Rope visualization */}
        <RopeHelix pattern={pattern} colorMappings={colorMappings} autoRotate={autoRotate} />
      </Canvas>
    </div>
  );
}

export default Rope3DViewer;
