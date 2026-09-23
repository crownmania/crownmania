import { Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

const DurkModel = lazy(() => import('./DurkModel').then(module => ({ default: module.DurkModel })));

const VaultModelViewer = ({ isUnlocked }) => (
  <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.5, 12], fov: 50 }}>
    <ambientLight intensity={0.7} />
    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.2} castShadow />
    <pointLight position={[-10, -10, -10]} intensity={0.5} />
    <pointLight position={[0, 5, 5]} intensity={0.3} />
    <Suspense fallback={null}>
      <group position={[0, -1.8, 0]}>
        <DurkModel isUnlocked={isUnlocked} />
      </group>
      {/* Self-hosted HDRI — the "city" preset fetches from raw.githack.com at
          runtime, which the hosting CSP blocks. */}
      <Environment files="/hdri/potsdamer_platz_1k.hdr" />
    </Suspense>
    <OrbitControls
      autoRotate={true}
      autoRotateSpeed={28.0}
      enableZoom={true}
      enablePan={false}
      minDistance={6}
      maxDistance={22}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.8}
    />
  </Canvas>
);

export default VaultModelViewer;
