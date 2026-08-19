import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import * as THREE from 'three';

// Shared loader instance with Draco decoder from gstatic CDN (same as original code)
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder, not WASM, to avoid worker/blob issues
gltfLoader.setDRACOLoader(dracoLoader);

const STORAGE_BASE =
  'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o';

// The original scan was 3.5M triangles (~293 MB GPU memory) which crashed
// mobile browsers even when Draco-compressed to 10 MB, because Draco only
// shrinks the download — the decoded mesh is identical. DURK_Model_mobile.glb
// is decimated to ~210k triangles (334 KB file, a few MB GPU memory) and is
// safe on all devices. The old model is kept only as a desktop fallback.
const MODEL_URLS = [
  `${STORAGE_BASE}/models%2FDURK_Model_mobile.glb?alt=media`,
  `${STORAGE_BASE}/models%2FDURK_Model_compressed.glb?alt=media`,
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
  const unlockProgress = useRef(isUnlocked ? 1 : 0);

  // Auto-center and auto-scale the scene
  useEffect(() => {
    if (!scene || !groupRef.current) return;

    // The scan is Z-up (lying flat on its back). If the longest axis is Z
    // instead of Y, rotate the model upright before measuring/centering.
    const preBox = new THREE.Box3().setFromObject(scene);
    const preSize = new THREE.Vector3();
    preBox.getSize(preSize);
    if (preSize.z > preSize.y && preSize.z >= preSize.x) {
      scene.rotation.x = Math.PI / 2;
      scene.updateMatrixWorld(true);
    }

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 6.5;
    const autoScale = targetSize / maxDim;

    // Apply centering offset and scale to the group
    groupRef.current.scale.setScalar(autoScale);
    scene.position.x = -center.x;
    scene.position.y = -center.y;
    scene.position.z = -center.z;

    let meshCount = 0;
    scene.traverse((child) => {
      if (child.isMesh) {
        meshCount++;
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if (m.color) m.userData.baseColor = m.color.clone();
            if (m.emissive) {
              m.userData.baseEmissive = m.emissive.clone();
              m.userData.baseEmissiveIntensity = m.emissiveIntensity || 0;
            }
          });
        }
      }
    });

    console.log(`DurkModel: ${meshCount} meshes, size=(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}), scale=${autoScale.toFixed(6)}`);
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const target = isUnlocked ? 1 : 0;
    const rate = isUnlocked ? 0.03 : 0.08;
    unlockProgress.current += (target - unlockProgress.current) * rate;

    const speed = isUnlocked ? 1.0 : 0.5;
    groupRef.current.rotation.y += 0.01 * speed;
    groupRef.current.position.y = isUnlocked
      ? 2.0 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      : 2.0;

    scene.traverse((child) => {
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
            mat.emissive.setRGB(e.r * progress, e.g * progress, e.b * progress);
            mat.emissiveIntensity = mat.userData.baseEmissiveIntensity * progress;
          }
        });
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
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
        console.warn('DurkModel: All model URLs failed to load, showing placeholder');
        setHasError(true);
        setIsLoading(false);
        return;
      }

      if (cancelled || !mounted.current) return;
      const url = MODEL_URLS[index];
      setModelUrl(url);
      console.log(`DurkModel: Attempting to load model ${index}: ${url}`);

      const timeout = setTimeout(() => {
        if (cancelled || !mounted.current) return;
        console.warn(`DurkModel: Model ${index} timed out after 60s`);
        tryLoad(index + 1);
      }, 60000);

      gltfLoader.load(
        url,
        (gltf) => {
          clearTimeout(timeout);
          if (cancelled || !mounted.current) return;
          console.log(`DurkModel: Model ${index} loaded successfully`);
          // The optimized model ships without normals to keep it small —
          // compute smooth vertex normals here for correct lighting.
          gltf.scene.traverse((child) => {
            if (child.isMesh && child.geometry && !child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
          });
          setScene(gltf.scene);
          setIsLoading(false);
        },
        (xhr) => {
          if (xhr.total > 0 && !cancelled) {
            const pct = Math.round((xhr.loaded / xhr.total) * 100);
            if (pct % 25 === 0) console.log(`DurkModel: Model ${index} loading: ${pct}%`);
          }
        },
        (err) => {
          clearTimeout(timeout);
          if (cancelled || !mounted.current) return;
          console.warn(`DurkModel: GLTF load ${index} failed:`, err?.message || err);
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
