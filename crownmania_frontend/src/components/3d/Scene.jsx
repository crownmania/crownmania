import { Canvas } from '@react-three/fiber';
import { 
  PresentationControls,
  Environment,
  ContactShadows,
  Float,
  Stars
} from '@react-three/drei';
import CollectibleModel from './CollectibleModel';

export default function Scene({ isHovered }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 50 }}
      style={{ 
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    >
      <color attach="background" args={['#001428']} />
      <ambientLight intensity={0.5} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        intensity={1}
      />

      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      <Float
        speed={1.5}
        rotationIntensity={1}
        floatIntensity={2}
        floatingRange={[-.1, .1]}
      >
        <PresentationControls
          global
          config={{ mass: 2, tension: 500 }}
          snap={{ mass: 4, tension: 1500 }}
          rotation={[0, 0.3, 0]}
          polar={[-Math.PI / 3, Math.PI / 3]}
          azimuth={[-Math.PI / 1.4, Math.PI / 2]}
        >
          <CollectibleModel isHovered={isHovered} />
        </PresentationControls>
      </Float>

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={5}
        blur={2.4}
      />
      
      <Environment preset="night" />
    </Canvas>
  );
}
