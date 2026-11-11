import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

const WIDTH = { line: 0.8, faint: 0.6, zhu: 1.4 }

function build(geometry) {
  const items = []
  geometry.rings.forEach((ring) => {
    const geo = new LineGeometry()
    const pts = [...ring.points, ring.points[0]].flat()
    geo.setPositions(pts)
    const mat = new LineMaterial({ linewidth: WIDTH[ring.tone] ?? 0.8, transparent: true })
    items.push({ object: new Line2(geo, mat), tone: ring.tone })
  })
  geometry.ticks.forEach((set) => {
    const geo = new LineSegmentsGeometry()
    geo.setPositions(set.segments.flat(2))
    const mat = new LineMaterial({ linewidth: WIDTH[set.tone] ?? 0.6, transparent: true })
    items.push({ object: new LineSegments2(geo, mat), tone: set.tone })
  })
  geometry.dots.forEach((set) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(set.points.flat(), 3))
    const mat = new THREE.PointsMaterial({ size: set.size, sizeAttenuation: false })
    items.push({ object: new THREE.Points(geo, mat), tone: set.tone })
  })
  return items
}

function Scene({ engine, colors, onFrame, onReady, onSlow }) {
  const { camera, gl, scene, size } = useThree()
  const outer = useRef(null)
  const inner = useRef(null)
  const items = useMemo(() => build(engine.geometry), [engine])
  const perf = useRef({ n: 0, sum: 0, ready: false, judged: false })

  const sync = () => {
    const v = engine.view
    camera.position.set(v.camX, v.camY, v.camZ)
    camera.rotation.set(0, 0, 0)
    camera.fov = (engine.fov * 180) / Math.PI
    camera.near = 0.05
    camera.far = 400
    camera.setViewOffset(size.width, size.height, size.width / 2 - v.cx, size.height / 2 - v.cy, size.width, size.height)
    if (outer.current) outer.current.rotation.z = engine.cfg.roll ?? 0
    if (inner.current) inner.current.rotation.set(engine.pitch, engine.yaw, 0)
  }

  // Theme changes repaint in the same task, so the circular reveal captures the new palette.
  useLayoutEffect(() => {
    items.forEach(({ object, tone }) => object.material.color.set(colors[tone] ?? colors.line))
    sync()
    gl.render(scene, camera)
  }, [colors, items]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(
    () => () => items.forEach(({ object }) => {
      object.geometry.dispose()
      object.material.dispose()
    }),
    [items],
  )

  useFrame((_, delta) => {
    engine.step(Math.min(delta, 0.05))
    sync()
    onFrame()
    const p = perf.current
    p.n += 1
    if (p.n === 2 && !p.ready) {
      p.ready = true
      onReady()
    }
    // Judge speed on frames 10 to 40. Under ~22fps the static orbit takes over.
    if (!p.judged && p.n > 10) {
      p.sum += delta
      if (p.n === 40) {
        p.judged = true
        if (p.sum / 30 > 0.045) onSlow()
      }
    }
  })

  return (
    <group ref={outer}>
      <group ref={inner}>
        {items.map(({ object }, i) => (
          <primitive key={i} object={object} />
        ))}
      </group>
    </group>
  )
}

export default function LiveOrbit({ engine, colors, onFrame, onReady, onSlow }) {
  return (
    <Canvas
      className="orbit-canvas"
      dpr={[1, engine.lite ? 1.5 : 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.05, far: 400, position: [0, 0, 30] }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
        gl.toneMapping = THREE.NoToneMapping
      }}
    >
      <Scene engine={engine} colors={colors} onFrame={onFrame} onReady={onReady} onSlow={onSlow} />
    </Canvas>
  )
}
