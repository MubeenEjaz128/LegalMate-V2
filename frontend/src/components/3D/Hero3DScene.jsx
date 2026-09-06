// 3D Floating legal scales scene for hero section
// Lazy-loaded, performance-safe, works on low-end devices
import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Torus } from '@react-three/drei'
import * as THREE from 'three'

function GlowingSphere({ position, color, size = 1, speed = 1, distort = 0.3 }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.2
      meshRef.current.rotation.y += 0.003 * speed
    }
  })

  return (
    <Float speed={speed * 1.5} rotationIntensity={0.4} floatIntensity={0.8}>
      <Sphere ref={meshRef} args={[size, 64, 64]} position={position}>
        <MeshDistortMaterial
          color={color}
          roughness={0.1}
          metalness={0.8}
          distort={distort}
          speed={speed * 2}
          transparent
          opacity={0.7}
        />
      </Sphere>
    </Float>
  )
}

function FloatingRing({ position, color, size = 1, speed = 1 }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.5 + 0.5
      meshRef.current.rotation.z += 0.005 * speed
    }
  })

  return (
    <Float speed={speed} rotationIntensity={0.6} floatIntensity={0.5}>
      <Torus ref={meshRef} args={[size, size * 0.08, 32, 64]} position={position}>
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          metalness={0.9}
          transparent
          opacity={0.5}
        />
      </Torus>
    </Float>
  )
}

function ParticleField({ count = 80 }) {
  const points = useRef()

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 12
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return positions
  }, [count])

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.02
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.1
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particlePositions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#34d399"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

function Scene() {
  return (
    <>
      {/* Ambient + directional lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#d1fae5" />
      <directionalLight position={[-3, -2, 4]} intensity={0.4} color="#fbbf24" />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#10b981" />

      {/* Main emerald sphere */}
      <GlowingSphere
        position={[0, 0.3, 0]}
        color="#059669"
        size={1.4}
        speed={0.6}
        distort={0.25}
      />

      {/* Accent gold sphere */}
      <GlowingSphere
        position={[2.5, -0.8, -1]}
        color="#f59e0b"
        size={0.5}
        speed={1.2}
        distort={0.4}
      />

      {/* Small teal sphere */}
      <GlowingSphere
        position={[-2.2, 1, -0.5]}
        color="#34d399"
        size={0.35}
        speed={0.9}
        distort={0.3}
      />

      {/* Floating rings */}
      <FloatingRing position={[0, 0, -1]} color="#10b981" size={2.2} speed={0.4} />
      <FloatingRing position={[1.5, 1, -2]} color="#fbbf24" size={0.8} speed={0.7} />

      {/* Particle field */}
      <ParticleField count={60} />
    </>
  )
}

const Hero3DScene = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: 'none' }}>
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          style={{ background: 'transparent' }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  )
}

export default Hero3DScene
