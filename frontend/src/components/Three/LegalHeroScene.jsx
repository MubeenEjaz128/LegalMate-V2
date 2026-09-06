import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'

const RotatingMark = () => {
  const markRef = useRef(null)

  useFrame((_, delta) => {
    if (!markRef.current) return
    markRef.current.rotation.y += delta * 0.4
    markRef.current.rotation.x += delta * 0.15
  })

  return (
    <Float speed={1.2} floatIntensity={0.7} rotationIntensity={0.45}>
      <group ref={markRef}>
        <mesh>
          <icosahedronGeometry args={[1.2, 2]} />
          <meshStandardMaterial
            color="#2f9f8d"
            metalness={0.45}
            roughness={0.22}
            emissive="#1d665c"
            emissiveIntensity={0.24}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.8, 0, 0]} scale={1.65}>
          <torusGeometry args={[1.4, 0.08, 20, 120]} />
          <meshStandardMaterial color="#ee8620" metalness={0.75} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  )
}

const LegalHeroScene = () => {
  return (
    <div className="h-[280px] w-full sm:h-[340px] lg:h-[400px]">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 4.8], fov: 45 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight intensity={1.1} position={[2, 3, 3]} />
        <pointLight intensity={0.8} position={[-3, -2, 2]} color="#ee8620" />

        <Suspense fallback={null}>
          <RotatingMark />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default LegalHeroScene
