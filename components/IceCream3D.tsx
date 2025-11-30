import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { Mesh, Group, MeshBasicMaterial } from 'three';
import { Container, Flavor, Topping } from '../types';
import { FLAVOR_COLORS } from '../constants';

interface IceCream3DProps {
  container: Container;
  layers: Flavor[];
  topping: Topping;
  isAnimating?: boolean;
  isSuccess?: boolean;
}

const Cone = () => (
  // Rotated 180 degrees on X axis so the wide part is up
  <mesh position={[0, -1.5, 0]} rotation={[Math.PI, 0, 0]}>
    <coneGeometry args={[0.8, 3, 32]} />
    <meshStandardMaterial color="#F4A460" roughness={0.6} />
  </mesh>
);

const Cup = () => (
  <group position={[0, -1.5, 0]}>
    <mesh position={[0, 0, 0]}>
      <cylinderGeometry args={[1, 0.7, 1.5, 32]} />
      <meshStandardMaterial color="#E0E0E0" />
    </mesh>
    <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.95, 0.65, 1.45, 32]} />
        <meshStandardMaterial color="#FFFFFF" side={2} /> {/* Double side */}
    </mesh>
  </group>
);

interface ScoopProps { 
  flavor: Flavor; 
  position: [number, number, number];
  scale?: number 
}

const Shockwave = ({ color }: { color: string }) => {
  const ref = useRef<Mesh>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.scale.x += delta * 4;
      ref.current.scale.y += delta * 4;
      const mat = ref.current.material as MeshBasicMaterial;
      mat.opacity -= delta * 2;
      if (mat.opacity <= 0) mat.opacity = 0;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
      <ringGeometry args={[0.5, 0.7, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
};

const ScoopBurst = ({ color }: { color: string }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <group>
      <Sparkles count={20} scale={1.5} size={6} speed={2} opacity={1} color={color} noise={0.5} />
      <Shockwave color={color} />
    </group>
  );
};

const Scoop: React.FC<ScoopProps> = ({ flavor, position, scale = 1 }) => {
  const meshRef = useRef<Mesh>(null);
  const time = useRef(0);

  useFrame((state, delta) => {
    // Add delta time
    time.current += delta;
    
    if (meshRef.current) {
        // Elastic bounce animation: 
        // Starts at 0, overshoots 1, oscillates and settles at 1
        // Formula: 1 - exp(-decay * t) * cos(freq * t)
        
        let bounce = 1;
        
        // Only calculate for first 2 seconds to save perf
        if (time.current < 2.0) {
            // Decay: 5, Frequency: 15
            bounce = 1 - Math.exp(-time.current * 5) * Math.cos(time.current * 15);
            // Clamp lower bound to 0 to avoid negative scale glitches in first frame
            if (bounce < 0) bounce = 0;
        }

        const final = scale * bounce;
        meshRef.current.scale.set(final, final, final);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} scale={[0, 0, 0]}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial color={FLAVOR_COLORS[flavor]} roughness={0.8} metalness={0.1} />
      </mesh>
      <ScoopBurst color={FLAVOR_COLORS[flavor]} />
    </group>
  );
};

const ToppingMesh = ({ type, position }: { type: Topping; position: [number, number, number] }) => {
  const groupRef = useRef<Group>(null);
  const anim = useRef(0);

  useFrame((state, delta) => {
    if (anim.current < 1 && groupRef.current) {
      anim.current += delta * 4;
      if (anim.current > 1) anim.current = 1;
      const s = anim.current;
      // Simple easing
      const scale = 1 - Math.pow(1 - s, 3);
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  if (type === Topping.NONE) return null;

  return (
    <group position={position} ref={groupRef} scale={[0,0,0]}>
      {/* Visual Burst for Topping */}
      <Sparkles count={10} scale={1} size={3} speed={1.5} opacity={0.8} color="#FFF" />
      
      {type === Topping.CHERRY && (
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#D50000" roughness={0.1} metalness={0.2} />
        </mesh>
      )}

      {type === Topping.SPRINKLES && (
        <group>
            {Array.from({ length: 30 }).map((_, i) => {
                const phi = Math.acos(-1 + (2 * i) / 30);
                const theta = Math.sqrt(30 * Math.PI) * phi;
                const x = 0.9 * Math.cos(theta) * Math.sin(phi);
                const y = 0.5 * Math.cos(phi) + 0.5; // Offset slightly up
                const z = 0.9 * Math.sin(theta) * Math.sin(phi);
                const color = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'][i % 4];
                
                return (
                    <mesh key={i} position={[x, y, z]} rotation={[Math.random(), Math.random(), Math.random()]}>
                        <capsuleGeometry args={[0.03, 0.15, 4, 8]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                )
            })}
        </group>
      )}
    </group>
  );
};

export const IceCream3D: React.FC<IceCream3DProps> = ({ container, layers, topping, isAnimating, isSuccess }) => {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
        // Idle animation
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        
        if (isAnimating) {
            groupRef.current.rotation.y += 0.15;
        }
    }
  });

  // Calculate scoop positions (stacking)
  const scoopSpacing = 1.0;
  // Adjusted startY because cone is now flipped. 
  // Flipped cone top is at world Y=0 (since pos is -1.5 and height is 3)
  const startY = container === Container.CONE ? 0.2 : 0.8;

  return (
    <group ref={groupRef}>
      {container === Container.CONE ? <Cone /> : <Cup />}
      
      {layers.map((flavor, index) => (
        <Scoop 
            key={index} 
            flavor={flavor} 
            position={[0, startY + (index * scoopSpacing), 0]} 
            scale={1 - (index * 0.05)} // Slight taper for stacked scoops
        />
      ))}

      {layers.length > 0 && (
          <ToppingMesh 
            type={topping} 
            position={[0, startY + ((layers.length - 1) * scoopSpacing) + 0.8, 0]} 
          />
      )}

      {isSuccess && (
        <>
          <Sparkles count={50} scale={4} size={6} speed={0.4} opacity={1} color="#FFD700" />
          <Sparkles count={30} scale={3} size={4} speed={0.8} opacity={0.8} color="#FFFFFF" />
        </>
      )}
    </group>
  );
};