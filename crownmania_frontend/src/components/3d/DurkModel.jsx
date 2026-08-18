import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import * as THREE from 'three';

// Shared loader instance to avoid re-creation on re-renders
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

const STORAGE_BASE =
  'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o';

const MODEL_URLS = [
  `${STORAGE_BASE}/models%2Fdurk-model2.glb?alt=media`,
  `${STORAGE_BASE}/models%2FDURK%20Action%20Figure%20Low%20Poly%20FINAL%20.glb?alt=media`,
  `${STORAGE_BASE}/models%2FLIL%20DURK%20HEAD%20and%20HAIR4%20.glb?alt=media`,
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
  const clonedRef = useRef(null);
  const unlockProgress = useRef(isUnlocked ? 1 : 0);

  useEffect(() => {
    if (!scene || !groupRef.current) return;
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          child.material = mats.map((m) => {
            const mat = m.clone();
            if (mat.color) {
              mat.userData.baseColor = mat.color.clone();
            }
            if (mat.emissive) {
              mat.userData.baseEmissive = mat.emissive.clone();
              mat.userData.baseEmissiveIntensity = mat.emissiveIntensity || 0;
            }
            return mat;
          });
          if (!Array.isArray(child.material)) {
            child.material = child.material[0];
          }
        }
      }
    });
    clonedRef.current = cloned;
    groupRef.current.add(cloned);
    return () => {
      if (groupRef.current && cloned) {
        groupRef.current.remove(cloned);
      }
      cloned.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current || !clonedRef.current) return;

    const target = isUnlocked ? 1 : 0;
    const rate = isUnlocked ? 0.03 : 0.08;
    unlockProgress.current += (target - unlockProgress.current) * rate;

    const speed = isUnlocked ? 1.0 : 0.5;
    groupRef.current.rotation.y += 0.01 * speed;
    groupRef.current.position.y = isUnlocked
      ? -0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      : -0.3;

    clonedRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          const progress = Math.max(0, Math.min(1, unlockProgress.current));

          if (mat.userData.baseColor) {
            const hsl = { h: 0, s: 0, l: 0 };
            mat.userData.baseColor.getHSL(hsl);
            mat.color.setHSL(hsl.h, hsl.s * progress, hsl.l);
          }

          if (mat.userData.baseEmissive) {
            const e = mat.userData.baseEmissive;
            const intensity = mat.userData.baseEmissiveIntensity * progress;
            mat.emissive.setRGB(e.r * progress, e.g * progress, e.b * progress);
            mat.emissiveIntensity = intensity;
          }
        });
      }
    });
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
    let cancelled = false;

    function tryLoad(index) {
      if (index >= MODEL_URLS.length) {
        if (import.meta.env.DEV) console.warn('All model URLs failed to load');
        setHasError(true);
        setIsLoading(false);
        return;
      }

      if (cancelled || !mounted.current) return;
      setModelUrl(MODEL_URLS[index]);

      gltfLoader.load(
        MODEL_URLS[index],
        (gltf) => {
          if (cancelled || !mounted.current) return;
          setScene(gltf.scene);
          setIsLoading(false);
        },
        undefined,
        (err) => {
          if (cancelled || !mounted.current) return;
          if (import.meta.env.DEV) console.warn(`GLTF load ${index} failed:`, err?.message);
          tryLoad(index + 1);
        }
      );
    }

    tryLoad(0);

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  if (hasError || usePlaceholder || !scene) {
    return <PlaceholderFigure isUnlocked={isUnlocked} />;
  }

  return <RealModel scene={scene} isUnlocked={isUnlocked} />;
}
