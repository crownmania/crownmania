import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AdditiveBlending, Color, DoubleSide, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { HOLO_DEFAULT_COLOR } from './hologramShader';

const DurkModel = lazy(() => import('./DurkModel').then(module => ({ default: module.DurkModel })));

// Neutral studio image-based lighting, generated in-code from three's
// RoomEnvironment. This replaces the old potsdamer_platz HDRI — that one is a
// night-city scene, which lit the figure flat and dull. Generating the
// environment avoids a 1.5 MB download and the CSP issue that ruled out drei's
// remote `preset` environments.
//
// NOTE: RoomEnvironment is intentionally constructed without a renderer — with
// one it switches to intensity 900 (physical units) and blows out the figure.
function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envMap;

    return () => {
      scene.environment = null;
      envMap.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

// Containment rig under the figure while it is unclaimed: a projector grid
// plus two counter-rotating rings. Fades itself out once the figure has
// materialized so the Vault look is never contaminated.
function HoloStage({ active, color }) {
  const groupRef = useRef();
  const gridRef = useRef();
  const innerRingRef = useRef();
  const outerRingRef = useRef();
  const opacity = useRef(active ? 1 : 0);
  const holoColor = useMemo(() => new Color(color), [color]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    opacity.current += ((active ? 1 : 0) - opacity.current) * Math.min(1, delta * 2.2);
    groupRef.current.visible = opacity.current > 0.01;
    if (!groupRef.current.visible) return;

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z += delta * 0.35;
      innerRingRef.current.material.opacity = opacity.current * (0.45 + Math.sin(state.clock.elapsedTime * 1.6) * 0.15);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z -= delta * 0.22;
      outerRingRef.current.material.opacity = opacity.current * 0.3;
    }
    if (gridRef.current) gridRef.current.material.opacity = opacity.current * 0.22;
  });

  return (
    <group ref={groupRef} position={[0, -3.4, 0]}>
      <gridHelper ref={gridRef} args={[17, 17, holoColor, holoColor]} material-transparent material-opacity={0} material-depthWrite={false} />
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[3.0, 3.18, 96]} />
        <meshBasicMaterial color={holoColor} transparent opacity={0} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[4.1, 4.16, 128]} />
        <meshBasicMaterial color={holoColor} transparent opacity={0} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Three-point lighting. The lights are directional, so only their direction
// matters — the model is auto-scaled in DurkModel, and these stay correct at
// any scale.
//
// `hologram` is additive on top of this rig rather than a replacement for it:
// the moment the figure materializes it is lit by exactly the lighting the
// Vault uses, with no second code path to keep in sync.
const VaultModelViewer = ({
  isUnlocked,
  hologram = false,
  holoColor = HOLO_DEFAULT_COLOR,
  holoCharge = false,
  onMaterialized,
  showStage = false,
  autoRotateSpeed = 8.4,
  // The Vault panel is tall and narrow; the verify stage is wide and short,
  // so it needs the camera further back or the figure crops against the HUD.
  cameraDistance = 12,
}) => (
  <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.5, cameraDistance], fov: 50 }}>
    <StudioEnvironment />
    <ambientLight intensity={0.25} />
    <directionalLight position={[5.01, 4.73, 7.24]} intensity={2.2} castShadow />
    <directionalLight position={[-8.76, -1.01, 4.72]} intensity={0.8} color="#cfe0ff" />
    <directionalLight position={[-2.51, 2.2, -9.43]} intensity={1.6} />
    {showStage && <pointLight position={[0, -3, 3]} intensity={hologram ? 6 : 0} color={holoColor} distance={14} />}
    <Suspense fallback={null}>
      <group position={[0, -1.8, 0]}>
        <DurkModel
          isUnlocked={isUnlocked}
          hologram={hologram}
          holoColor={holoColor}
          holoCharge={holoCharge}
          onMaterialized={onMaterialized}
        />
      </group>
      {showStage && <HoloStage active={hologram} color={holoColor} />}
    </Suspense>
    <OrbitControls
      autoRotate={true}
      autoRotateSpeed={autoRotateSpeed}
      enableZoom={true}
      enablePan={false}
      minDistance={6}
      maxDistance={Math.max(22, cameraDistance + 8)}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.8}
    />
  </Canvas>
);

export default VaultModelViewer;
