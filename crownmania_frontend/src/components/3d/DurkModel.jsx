import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import * as THREE from 'three';
import {
  HOLO_DEFAULT_COLOR,
  createHologramUniforms,
  patchHologramMaterial,
  setHologramRenderState,
  forEachMaterial,
} from './hologramShader';

// Shared loader instance. The decoder is served from our own /draco/ folder
// rather than the gstatic CDN: it saves a cross-origin round trip and cannot
// break if the CDN version moves.
//
// No decoderConfig.type is set, so DRACOLoader picks the WASM decoder and only
// falls back to the JS build where WebAssembly is unavailable. The JS decoder
// was previously forced here, and decoding a few hundred thousand triangles
// with it cost seconds on mobile — the single biggest chunk of vault load time.
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

const STORAGE_BASE =
  'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o';

// The original scans were multi-million-triangle meshes (~200-300 MB GPU
// memory) which crashed mobile browsers even when Draco-compressed, because
// Draco only shrinks the download — the decoded mesh is identical.
// DURK_Colored_v2.glb is the FINAL COLORED action figure at ~450k triangles
// with a 2048 baseColor texture (1.9 MB file, ~37 MB GPU memory), safe on all
// devices. The older grayscale models are kept as fallbacks.
//
// Versioned filename: the bucket serves these immutable with a one-year
// max-age, so a changed model must get a new name rather than overwrite one a
// browser may already have cached.
const MODEL_URLS = [
  `${STORAGE_BASE}/models%2FDURK_Colored_v2.glb?alt=media`,
  `${STORAGE_BASE}/models%2FDURK_Model_mobile.glb?alt=media`,
  `${STORAGE_BASE}/models%2FDURK_Model_compressed.glb?alt=media`,
];

// Materialization timeline, in seconds from the moment `hologram` goes false.
// Phase 1 is the glitch/shatter burst, phase 2 is the scan-line sweep that
// resolves real textures behind it, and they overlap so the figure is still
// shuddering as the first band of real material appears.
const MAT_GLITCH_END = 0.6;
const MAT_SWEEP_START = 0.45;
const MAT_SWEEP_END = 3.0;
const MAT_END = 3.5;

const smoothstep01 = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

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

function RealModel({ scene, isUnlocked, hologram, holoColor, holoCharge, onMaterialized }) {
  const outerRef = useRef();
  const groupRef = useRef();
  const sweepRingRef = useRef();
  const shockRingRef = useRef();
  const unlockProgress = useRef(isUnlocked ? 1 : 0);

  const holo = useMemo(() => createHologramUniforms(holoColor), [holoColor]);
  // 'hologram' | 'materializing' | 'real'
  const phase = useRef(hologram ? 'hologram' : 'real');
  const materializeStart = useRef(0);
  // Fires onMaterialized exactly once, no matter which path (cinematic sweep,
  // instant fadeout, or mounting already-real) lands the figure on 'real'.
  // Callers rely on it to enable post-reveal behaviours like hover inspection.
  const reportedReal = useRef(false);
  const bounds = useRef(null);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);
  const onMaterializedRef = useRef(onMaterialized);
  onMaterializedRef.current = onMaterialized;

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
      }
    });

    forEachMaterial(scene, (m) => {
      if (m.color) m.userData.baseColor = m.color.clone();
      if (m.emissive) {
        m.userData.baseEmissive = m.emissive.clone();
        m.userData.baseEmissiveIntensity = m.emissiveIntensity || 0;
      }
      patchHologramMaterial(m, holo);
    });

    console.log(`DurkModel: ${meshCount} meshes, size=(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}), scale=${autoScale.toFixed(6)}`);
  }, [scene, holo]);

  // Enter hologram, or kick off the materialization when it is switched off.
  useEffect(() => {
    if (!scene) return;

    if (hologram) {
      phase.current = 'hologram';
      holo.uHologram.value = 1;
      holo.uReveal.value = 0;
      holo.uGlitch.value = 0;
      forEachMaterial(scene, (m) => setHologramRenderState(m, true));
    } else if (phase.current === 'hologram') {
      phase.current = 'materializing';
      materializeStart.current = -1; // stamped on the next frame
      // The ghost is depthWrite-off so it reads X-ray — but during the sweep
      // that lets the figure's interior show through dissolving regions (the
      // "skull under the hair" artifact). While materializing the surface
      // writes depth again, so the shell occludes itself and dissolves clean.
      forEachMaterial(scene, (m) => { m.depthWrite = true; });
    } else {
      phase.current = 'real';
      holo.uHologram.value = 0;
      forEachMaterial(scene, (m) => setHologramRenderState(m, false));
    }
  }, [hologram, scene, holo]);

  // Never leave the shared materials in ghost state if we unmount mid-sweep —
  // the GLTF scene object is reused by whoever mounts next.
  useEffect(() => () => {
    if (!scene) return;
    holo.uHologram.value = 0;
    forEachMaterial(scene, (m) => setHologramRenderState(m, false));
  }, [scene, holo]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const target = isUnlocked ? 1 : 0;
    const rate = isUnlocked ? 0.03 : 0.08;
    unlockProgress.current += (target - unlockProgress.current) * rate;

    const speed = isUnlocked ? 1.0 : 0.5;
    groupRef.current.rotation.y += 0.003 * speed;
    groupRef.current.position.y = isUnlocked
      ? 2.0 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      : 2.0;

    // World-space bounds drive the scan line and the rings. Measured on the
    // first frame rather than in the layout effect, because the group's Y
    // position is only set above.
    if (!bounds.current) {
      groupRef.current.updateWorldMatrix(true, true);
      const worldBox = new THREE.Box3().setFromObject(groupRef.current);
      if (!worldBox.isEmpty()) {
        const worldSize = new THREE.Vector3();
        worldBox.getSize(worldSize);
        bounds.current = {
          minY: worldBox.min.y,
          maxY: worldBox.max.y,
          radius: Math.max(worldSize.x, worldSize.z) * 0.72,
        };
        holo.uHoloMinY.value = bounds.current.minY;
        holo.uHoloMaxY.value = bounds.current.maxY;
      }
    }

    holo.uTime.value = state.clock.elapsedTime;

    // While a claim is in flight the ghost gets a restless shimmer, so the
    // figure visibly reacts the moment CLAIM is pressed instead of sitting
    // still through the signature + API round trip.
    if (phase.current === 'hologram') {
      holo.uGlitch.value = holoCharge
        ? 0.05 + Math.max(0, Math.sin(state.clock.elapsedTime * 9)) * 0.1
        : 0;
    }

    if (phase.current === 'materializing') {
      if (materializeStart.current < 0) materializeStart.current = state.clock.elapsedTime;
      const t = state.clock.elapsedTime - materializeStart.current;

      holo.uGlitch.value = t < MAT_GLITCH_END
        ? Math.sin((t / MAT_GLITCH_END) * Math.PI)
        : Math.max(0, 0.3 * (1 - (t - MAT_GLITCH_END) / (MAT_END - MAT_GLITCH_END)));

      holo.uReveal.value = smoothstep01((t - MAT_SWEEP_START) / (MAT_SWEEP_END - MAT_SWEEP_START));

      if (t >= MAT_END) {
        phase.current = 'real';
        holo.uHologram.value = 0;
        holo.uGlitch.value = 0;
        holo.uReveal.value = 1;
        forEachMaterial(scene, (m) => setHologramRenderState(m, false));
      }
    }

    if (phase.current === 'real' && !reportedReal.current) {
      reportedReal.current = true;
      if (onMaterializedRef.current) onMaterializedRef.current();
    }

    // Sweep ring rides the materialization line; shockwave fires as it clears
    // the top of the figure.
    const b = bounds.current;
    const materializing = phase.current === 'materializing';
    if (sweepRingRef.current && outerRef.current) {
      sweepRingRef.current.visible = materializing && !!b;
      if (materializing && b) {
        const reveal = holo.uReveal.value;
        const lineY = THREE.MathUtils.lerp(b.minY - (b.maxY - b.minY) * 0.08, b.maxY + (b.maxY - b.minY) * 0.08, reveal);
        tmpVec.set(0, lineY, 0);
        outerRef.current.worldToLocal(tmpVec);
        sweepRingRef.current.position.y = tmpVec.y;
        const pulse = 4 * reveal * (1 - reveal);
        sweepRingRef.current.scale.setScalar(b.radius * (1 + pulse * 0.06));
        sweepRingRef.current.material.opacity = 0.25 + pulse * 0.75;
        sweepRingRef.current.rotation.z += 0.02;
      }
    }
    if (shockRingRef.current && outerRef.current && b) {
      const t = materializing ? state.clock.elapsedTime - materializeStart.current : Infinity;
      const shock = (t - MAT_SWEEP_END + 0.15) / 0.9;
      const active = shock > 0 && shock < 1;
      shockRingRef.current.visible = active;
      if (active) {
        tmpVec.set(0, (b.minY + b.maxY) * 0.5, 0);
        outerRef.current.worldToLocal(tmpVec);
        shockRingRef.current.position.y = tmpVec.y;
        shockRingRef.current.scale.setScalar(b.radius * (0.4 + shock * 3.2));
        shockRingRef.current.material.opacity = (1 - shock) * 0.8;
      }
    }

    holo.uSaturation.value = Math.max(0, Math.min(1, unlockProgress.current));

    forEachMaterial(scene, (mat) => {
      const progress = holo.uSaturation.value;
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
  });

  return (
    <group ref={outerRef}>
      <group ref={groupRef} position={[0, 0, 0]}>
        <primitive object={scene} />
      </group>

      {/* Materialization scan line */}
      <mesh ref={sweepRingRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[1, 0.012, 8, 96]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Shockwave as the sweep clears the crown */}
      <mesh ref={shockRingRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.86, 1, 96]} />
        <meshBasicMaterial
          color={holoColor || HOLO_DEFAULT_COLOR}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function PlaceholderFigure({ isUnlocked = false, hologram = false, holoColor = HOLO_DEFAULT_COLOR }) {
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
    // The placeholder is low-poly, so unlike the real figure it can afford a
    // genuine wireframe material for the hologram state.
    if (hologram) {
      return {
        color: holoColor,
        emissive: new THREE.Color(holoColor),
        emissiveIntensity: 0.8,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      };
    }

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
      {isUnlocked && !hologram && unlockProgress >= 0.8 && (
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

export function DurkModel({
  usePlaceholder = false,
  isUnlocked = false,
  hologram = false,
  holoColor = HOLO_DEFAULT_COLOR,
  holoCharge = false,
  onMaterialized,
}) {
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
    return <PlaceholderFigure isUnlocked={isUnlocked} hologram={hologram} holoColor={holoColor} />;
  }

  return (
    <RealModel
      scene={scene}
      isUnlocked={isUnlocked}
      hologram={hologram}
      holoColor={holoColor}
      holoCharge={holoCharge}
      onMaterialized={onMaterialized}
    />
  );
}
