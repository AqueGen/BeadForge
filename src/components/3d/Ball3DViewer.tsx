'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { BeadPattern, BallPattern } from '@/types';
import type { ColorMapping } from '@/types/colorMapping';
import { SKIP_COLOR_INDEX, EMPTY_COLOR_INDEX } from '@/types';

interface Ball3DViewerProps {
  pattern: BeadPattern | BallPattern;
  colorMappings?: ColorMapping[];
  autoRotate?: boolean;
  className?: string;
}

interface BeadMeshProps {
  position: [number, number, number];
  color: string;
  radius?: number;
}

function BeadMesh({ position, color, radius = 0.15 }: BeadMeshProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 12, 12]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

interface BallSphereProps {
  pattern: BeadPattern | BallPattern;
  colorMappings?: ColorMapping[];
  autoRotate?: boolean;
}

function BallSphere({ pattern, colorMappings, autoRotate = true }: BallSphereProps) {
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

  const { beadData, beadRadius } = useMemo(() => {
    const beads: { position: [number, number, number]; color: string }[] = [];
    const { width, height, field, colors } = pattern;

    // Parameters for tight packing (same as rope viewer)
    const bRadius = 0.4;
    const beadSpacing = bRadius * 2.1;

    // First pass: collect visible beads per row
    const rowBeads: { colorHex: string }[][] = [];
    let maxBeadsInRow = 0;

    for (let row = 0; row < height; row++) {
      const visibleInRow: { colorHex: string }[] = [];

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

        const colorHex = `rgb(${beadColor.r}, ${beadColor.g}, ${beadColor.b})`;
        visibleInRow.push({ colorHex });
      }

      rowBeads.push(visibleInRow);
      maxBeadsInRow = Math.max(maxBeadsInRow, visibleInRow.length);
    }

    // Calculate sphere radius for tight packing
    // Horizontal: circumference = maxBeads * beadSpacing => 2*PI*R = maxBeads * beadSpacing
    const radiusFromHorizontal = (maxBeadsInRow * beadSpacing) / (2 * Math.PI);

    // Vertical: arc from pole to pole = height * beadSpacing => PI*R = height * beadSpacing * verticalFactor
    // Use a factor to account for brick pattern offset
    const verticalFactor = 0.8; // Same as rope heightStep factor
    const radiusFromVertical = (height * beadSpacing * verticalFactor) / Math.PI;

    // Use the larger radius to ensure beads don't overlap
    const sRadius = Math.max(radiusFromHorizontal, radiusFromVertical);

    // Second pass: distribute visible beads evenly around sphere circumference per row
    for (let row = 0; row < height; row++) {
      const visibleInRow = rowBeads[row];
      const count = visibleInRow.length;

      if (count === 0) continue;

      // Latitude (polar angle) from row position
      // row 0 = top pole (theta = 0)
      // row height/2 = equator (theta = PI/2)
      // row height = bottom pole (theta = PI)
      const theta = (row / (height - 1)) * Math.PI;

      for (let i = 0; i < count; i++) {
        // Distribute beads evenly around the circumference
        const phi = (i / count) * Math.PI * 2;

        // Convert to Cartesian coordinates
        const x = sRadius * Math.sin(theta) * Math.cos(phi);
        const y = sRadius * Math.cos(theta);
        const z = sRadius * Math.sin(theta) * Math.sin(phi);

        beads.push({
          position: [x, y, z],
          color: visibleInRow[i].colorHex,
        });
      }
    }

    return { beadData: beads, beadRadius: bRadius };
  }, [pattern, skippedColorIndices]);

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {beadData.map((bead, i) => (
        <BeadMesh key={i} position={bead.position} color={bead.color} radius={beadRadius} />
      ))}
    </group>
  );
}

export function Ball3DViewer({ pattern, colorMappings, autoRotate = true, className = '' }: Ball3DViewerProps) {
  // Calculate camera distance based on estimated sphere radius
  const cameraDistance = useMemo(() => {
    // Use same parameters as BallSphere for consistent sizing
    const beadSpacing = 0.4 * 2.1;
    const maxBeadsEstimate = pattern.width; // Approximate max beads in a row
    const radiusFromHorizontal = (maxBeadsEstimate * beadSpacing) / (2 * Math.PI);
    const radiusFromVertical = (pattern.height * beadSpacing * 0.8) / Math.PI;
    const sphereRadius = Math.max(radiusFromHorizontal, radiusFromVertical);
    return sphereRadius * 3;
  }, [pattern.width, pattern.height]);

  return (
    <div className={`w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg ${className}`}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[cameraDistance, cameraDistance * 0.3, cameraDistance]} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <pointLight position={[0, 10, 0]} intensity={0.5} />

        {/* Ball visualization */}
        <BallSphere pattern={pattern} colorMappings={colorMappings} autoRotate={autoRotate} />
      </Canvas>
    </div>
  );
}

export default Ball3DViewer;
