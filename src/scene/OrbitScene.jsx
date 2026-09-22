import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const INK = '#3a3a3a'
const PAPER = '#FDFDFD'

const ORBIT = 0.04

const RINGS = [
  {
    id: 'inner',
    radius: 1.74,
    tube: 0.058,
    tilt: 0.07,
    yaw: 0,
    roll: 0,
  },
  {
    id: 'inner-dash',
    radius: 1.951,
    tube: 0.0045,
    tilt: 0.07,
    yaw: 0,
    roll: 0,
    dashed: true,
    dash: 0.13,
    gap: 0.085,
  },
  {
    id: 'dashed',
    radius: 2.16,
    tube: 0.009,
    tilt: 0.07,
    yaw: 0,
    roll: 0,
    dashed: true,
    dash: 0.78,
    gap: 0.32,
    markers: [
      { angle: (62 * Math.PI) / 180, kind: 'light', size: 0.065, speed: ORBIT },
      { angle: (18 * Math.PI) / 180, kind: 'light', size: 0.058, speed: ORBIT },
      { angle: (248 * Math.PI) / 180, kind: 'light', size: 0.058, speed: ORBIT },
      { angle: (198 * Math.PI) / 180, kind: 'light', size: 0.055, speed: ORBIT },
    ],
  },
  {
    id: 'thin',
    radius: 2.75,
    tube: 0.009,
    tilt: 0.82,
    yaw: 0.18,
    roll: -0.35,
    markers: [
      { angle: (194 * Math.PI) / 180, kind: 'dark', size: 0.055, speed: ORBIT },
      { angle: (354 * Math.PI) / 180, kind: 'dark', size: 0.05, speed: ORBIT },
    ],
  },
  {
    id: 'saturn',
    radius: 3.9,
    tube: 0.026,
    tilt: 1.12,
    yaw: 0,
    roll: (32 * Math.PI) / 180,
    markers: [
      { angle: (8 * Math.PI) / 180, kind: 'dark', size: 0.11, speed: ORBIT },
      { angle: (8 * Math.PI) / 180 + Math.PI, kind: 'light', size: 0.18, speed: ORBIT },
    ],
  },
]

function dashStarts(dash, gap) {
  const starts = []
  const turn = Math.PI * 2
  for (let angle = 0; angle < turn - gap * 0.45; angle += dash + gap) {
    starts.push(angle)
  }
  return starts
}

function OrbitingMarker({ marker, radius, resetId }) {
  const group = useRef(null)
  const angle = useRef(marker.angle)
  const reduced = useRef(false)
  const light = marker.kind === 'light'
  const position = [Math.cos(marker.angle) * radius, Math.sin(marker.angle) * radius, 0]

  useEffect(() => {
    angle.current = marker.angle
    group.current?.position.set(position[0], position[1], 0)
  }, [resetId, marker.angle, position[0], position[1]])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      reduced.current = media.matches
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useFrame((_, delta) => {
    if (!group.current || reduced.current) return
    angle.current += marker.speed * Math.min(delta, 0.05)
    group.current.position.set(Math.cos(angle.current) * radius, Math.sin(angle.current) * radius, 0)
  })

  if (light) {
    return (
      <group ref={group} position={position}>
        <mesh>
          <sphereGeometry args={[marker.size, 48, 32]} />
          <meshBasicMaterial color={PAPER} />
        </mesh>
        <mesh scale={1.16}>
          <sphereGeometry args={[marker.size, 48, 32]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={group} position={position}>
      <mesh>
        <sphereGeometry args={[marker.size, 48, 32]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  )
}

function RingMesh({ ring, resetId }) {
  const starts = ring.dashed ? dashStarts(ring.dash, ring.gap) : null
  const segments = ring.dashed ? Math.max(10, Math.round(ring.dash * 28)) : 180

  return (
    <group rotation={[0, 0, ring.roll]}>
      <group rotation={[0, ring.yaw, 0]}>
        <group rotation={[ring.tilt, 0, 0]}>
          {ring.dashed
            ? starts.map((angle) => (
                <mesh key={angle} rotation={[0, 0, angle]}>
                  <torusGeometry args={[ring.radius, ring.tube, 8, segments, ring.dash]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
              ))
            : (
                <mesh>
                  <torusGeometry args={[ring.radius, ring.tube, 16, segments]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
              )}
          {(ring.markers ?? []).map((marker, index) => (
            <OrbitingMarker key={index} marker={marker} radius={ring.radius} resetId={resetId} />
          ))}
        </group>
      </group>
    </group>
  )
}

function PortraitDisc() {
  const texture = useLoader(THREE.TextureLoader, '/portrait.jpg')

  useEffect(() => {
    const cropTop = 168
    const crop = 768
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 16
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.repeat.set(1, crop / 1024)
    texture.offset.set(0, (1024 - cropTop - crop) / 1024)
    texture.needsUpdate = true
  }, [texture])

  return (
    <group>
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[1.026, 64]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  )
}

function PortraitFrame({ onChange }) {
  const { camera, size } = useThree()
  const last = useRef({ cx: 0, cy: 0, d: 0 })

  useFrame(() => {
    const center = new THREE.Vector3(0, 0, 0)
    const edge = new THREE.Vector3(1, 0, 0)
    center.project(camera)
    edge.project(camera)
    const cx = (center.x * 0.5 + 0.5) * size.width
    const cy = (1 - (center.y * 0.5 + 0.5)) * size.height
    const d = Math.abs((edge.x * 0.5 + 0.5) * size.width - cx) * 2
    const prev = last.current
    if (
      Math.abs(prev.cx - cx) < 0.5 &&
      Math.abs(prev.cy - cy) < 0.5 &&
      Math.abs(prev.d - d) < 0.5
    ) {
      return
    }
    last.current = { cx, cy, d }
    onChange({ cx, cy, d })
  })

  return null
}

function FrameCamera() {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const fov = 30
    camera.fov = fov
    const ringDiameter = 8.9
    const visibleWidth = ringDiameter / (aspect < 0.9 ? 0.55 : 0.36)
    const visibleHeight = visibleWidth / aspect
    camera.position.z = visibleHeight / (2 * Math.tan((fov * Math.PI) / 360))
    camera.updateProjectionMatrix()
  }, [camera, size])

  return null
}

function DraggableSystem({ onDragChange, onInteract, resetId, depart, interactive }) {
  const group = useRef(null)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0, t: 0 })
  const target = useRef({ x: 0, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const departAmt = useRef(0)

  useEffect(() => {
    if (!interactive) {
      dragging.current = false
      onDragChange(false)
      return
    }

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return
      if (event.target instanceof Element && event.target.closest('[data-nodrag]')) return
      dragging.current = true
      last.current = { x: event.clientX, y: event.clientY, t: performance.now() }
      velocity.current.x = 0
      velocity.current.y = 0
      onDragChange(true)
      onInteract()
    }

    const onPointerMove = (event) => {
      if (!dragging.current) return
      const now = performance.now()
      const dt = Math.max(16, now - last.current.t) / 1000
      const yaw = (event.clientX - last.current.x) * 0.0075
      const pitch = (event.clientY - last.current.y) * 0.005
      target.current.y += yaw
      target.current.x = THREE.MathUtils.clamp(target.current.x + pitch, -1.05, 1.05)
      velocity.current.y = yaw / dt
      velocity.current.x = pitch / dt
      last.current = { x: event.clientX, y: event.clientY, t: now }
    }

    const onPointerUp = () => {
      if (!dragging.current) return
      dragging.current = false
      onDragChange(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [interactive, onDragChange, onInteract])

  useEffect(() => {
    target.current.x = 0
    target.current.y = 0
    velocity.current.x = 0
    velocity.current.y = 0
    dragging.current = false
    onDragChange(false)
    if (group.current) {
      group.current.rotation.x = 0
      group.current.rotation.y = 0
    }
  }, [resetId, onDragChange])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    if (!dragging.current) {
      target.current.y += velocity.current.y * dt
      target.current.x = THREE.MathUtils.clamp(
        target.current.x + velocity.current.x * dt,
        -1.05,
        1.05,
      )
      const decay = Math.exp(-2.6 * dt)
      velocity.current.x *= decay
      velocity.current.y *= decay
    }

    const rig = group.current
    if (!rig) return
    rig.rotation.x = THREE.MathUtils.damp(rig.rotation.x, target.current.x, 7, dt)
    rig.rotation.y = THREE.MathUtils.damp(rig.rotation.y, target.current.y, 7, dt)

    departAmt.current = THREE.MathUtils.damp(departAmt.current, depart ? 1 : 0, 3.2, dt)
    if (!depart && departAmt.current < 0.004) departAmt.current = 0
    if (depart && departAmt.current > 0.996) departAmt.current = 1
    rig.scale.setScalar(1 + departAmt.current * 0.32)
    const fade = 1 - departAmt.current
    rig.traverse((obj) => {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      materials.forEach((material) => {
        if (!material || material.opacity === undefined) return
        material.opacity = fade
        material.transparent = fade < 0.999
      })
    })
  })

  return (
    <group ref={group}>
      {RINGS.map((ring) => (
        <RingMesh key={ring.id} ring={ring} resetId={resetId} />
      ))}
    </group>
  )
}

export default function OrbitScene({
  onDragChange,
  onInteract,
  onPortraitFrame,
  resetId,
  depart = false,
  interactive = true,
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 32], fov: 30, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping }}
      onCreated={({ gl }) => {
        gl.setClearColor(PAPER)
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <FrameCamera />
      <PortraitDisc />
      <DraggableSystem
        onDragChange={onDragChange}
        onInteract={onInteract}
        resetId={resetId}
        depart={depart}
        interactive={interactive}
      />
      <PortraitFrame onChange={onPortraitFrame} />
    </Canvas>
  )
}
