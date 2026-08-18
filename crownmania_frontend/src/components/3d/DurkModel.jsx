import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { storage } from '../../config/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import * as THREE from 'three';

// Shared loader instance to avoid re-creation on re-renders
const gltfLoader = new GLTFLoader();

const MODEL_PATHS = [
  'models/DURK Action Figure Low Poly FINAL .glb',
  'models/LIL DURK HEAD and HAIR4 .glb',
];

function Loader() {
  const mesh = useRef();
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta;
      mesh.current.rotation.y += delta;
    }
  });
  return (
    <mesh ref={mesh} visible position={[0, 0, 0]} rotation={[0, 0, 0]} castShadow>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="#333333" wireframe />
    </mesh>
  );
}

function RealModel({ scene, isUnlocked }) {
  const groupRef = useRef();

  useEffect(() => {
    if (!scene || !groupRef.current) return;
    // Clone so we don’t share the same scene across renders
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    groupRef.current.add(cloned);
    return () => {
      groupRef.current.remove(cloned);
      cloned.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [scene]);

  useFrame((state) => {
    if (groupRef.current) {
      const speed = isUnlocked ? 1.0 : 0.5;
      groupRef.current.rotation.y += 0.01 * speed;
      groupRef.current.position.y = isUnlocked
        ? -0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.05
        : -0.3;
    }
  });

  return (
    <group ref={groupRef} scale={[0.018, 0.018, 0.018]} position={[0, 0, 0]} />
  );
}

function PlaceholderFigure({ isUnlocked = false }) {
  const groupRef = useRef();
  const [unlockProgress, setUnlockProgress] = useState(isUnlocked ? 1 : 0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Unlock color transition
  useEffect(() => {
    if (isUnlocked && !isAnimating) {
      setIsAnimating(true);
      const startTime = performance.now();
      const duration = 2000;

      let rafId;
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setUnlockProgress(progress);

        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      rafId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafId);
    }
  }, [isUnlocked, isAnimating]);

  useFrame((state) => {
    if (groupRef.current) {
      const rotationSpeed = isUnlocked ? 1.0 : 0.5;
      groupRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed;
      groupRef.current.position.y = isUnlocked
        ? -0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05
        : -0.5;
    }
  });

  const getMaterialProps = (baseColor, emissiveColor = null, emissiveIntensity = 0) => {
    const baseColorObj = new THREE.Color(baseColor);
    const baseHSL = { h: 0, s: 0, l: 0 };
    baseColorObj.getHSL(baseHSL);

    const currentS = baseHSL.s * unlockProgress;
    const interpolatedColor = new THREE.Color().setHSL(baseHSL.h, currentS, baseHSL.l);

    return {
      color: interpolatedColor,
      emissive: emissiveColor
        ? new THREE.Color(emissiveColor).multiplyScalar(unlockProgress)
        : undefined,
      emissiveIntensity: emissiveIntensity * unlockProgress,
    };
  };

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Base/Pedestal */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.3, 32]} />
        <meshStandardMaterial
          {...getMaterialProps('#1a1a2e', '#00ff88', 0.1)}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
        <meshStandardMaterial
          {...getMaterialProps('#0f0f23')}
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          {...getMaterialProps('#0f0f23')}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Crown accent */}
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[0.25, 0.05, 16, 32]} />
        <meshStandardMaterial
          {...getMaterialProps('#ffd700', '#ffa500', 0.3)}
          metalness={1}
          roughness={0.2}
        />
      </mesh>

      {/* Crown spikes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 0.2;
        const z = Math.sin(angle) * 0.2;
        return (
          <mesh key={i} position={[x, 1.6, z]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.05, 0.2, 8]} />
            <meshStandardMaterial
              {...getMaterialProps('#ffd700', '#ffa500', 0.3)}
              metalness={1}
              roughness={0.2}
            />
          </mesh>
        );
      })}

      {/* Glow ring around base */}
      <mesh position={[0, -1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.03, 16, 64]} />
        <meshStandardMaterial
          {...getMaterialProps('#00c8ff', '#00c8ff', 0.8)}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Unlock particle effects - subtle ring */}
      {isUnlocked && unlockProgress >= 0.8 && (
        <group>
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * 2,
                  0,
                  Math.sin(angle) * 2,
                ]}
                scale={[0.05, 0.05, 0.05]}
              >
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial
                  color="#00ff88"
                  transparent
                  opacity={0.8 - i * 0.04}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

export function DurkModel({ usePlaceholder = false, isUnlocked = false }) {
  const [modelUrl, setModelUrl] = useState(null);
  const [scene, setScene] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (usePlaceholder) {
      setHasError(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadModel() {
      try {
        if (!storage) throw new Error('Firebase storage not available');

        let url = null;
        for (const path of MODEL_PATHS) {
          try {
            const modelRef = ref(storage, path);
            url = await getDownloadURL(modelRef);
            break;
          } catch {
            // Try next path
          }
        }

        if (!url) throw new Error('Model not found in Firebase Storage');

        if (cancelled || !mounted.current) return;

        setModelUrl(url);

        gltfLoader.load(
          url,
          (gltf) => {
            if (cancelled || !mounted.current) return;
            setScene(gltf.scene);
            setIsLoading(false);
          },
          undefined,
          (err) => {
            if (cancelled || !mounted.current) return;
            if (import.meta.env.DEV) console.warn('GLTF load failed:', err?.message);
            setHasError(true);
            setIsLoading(false);
          }
        );
      } catch (err) {
        if (cancelled || !mounted.current) return;
        if (import.meta.env.DEV) console.warn('Model URL resolve failed:', err?.message);
        setHasError(true);
        setIsLoading(false);
      }
    }

    loadModel();

    return () => {
      cancelled = true;
    };
  }, [usePlaceholder]);

  if (isLoading) {
    return <Loader />;
  }

  if (hasError || usePlaceholder || !scene) {
    return <PlaceholderFigure isUnlocked={isUnlocked} />;
  }

  return <RealModel scene={scene} isUnlocked={isUnlocked} />;
}
