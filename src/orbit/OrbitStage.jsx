import { Suspense, forwardRef, lazy, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { OrbitEngine } from './engine.js'

const LiveOrbit = lazy(() => import('./LiveOrbit.jsx'))

// WebGL is used only when a real GPU is behind it. Software renderers
// (SwiftShader, llvmpipe) are always too slow, so they get the static orbit.
function canRunLive() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('static')) return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    if (params.has('live')) return true
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer)
  } catch {
    return false
  }
}

const OrbitStage = forwardRef(function OrbitStage(
  { cfg, sections, colors, hovered, labelled, selected, onHover, onSelect, onPortrait, idle, reduced, onFrame },
  ref,
) {
  const engine = useMemo(() => {
    const e = new OrbitEngine(cfg, window.innerWidth < 720)
    e.resize(window.innerWidth, window.innerHeight)
    return e
  }, [cfg])
  const [svg, setSvg] = useState(() => engine.svg())
  const [mode, setMode] = useState(() => (canRunLive() ? 'loading' : 'static'))
  const [introDone, setIntroDone] = useState(reduced)
  const [moved, setMoved] = useState(false)
  const [dragging, setDragging] = useState(false)
  const nodeRefs = useRef([])
  const tap = useRef('open')
  const portraitRef = useRef(null)
  const live = mode === 'live' && introDone
  const liveRef = useRef(live)
  liveRef.current = live
  engine.paused = !live
  const idleRef = useRef(idle)
  idleRef.current = idle
  const onHoverRef = useRef(onHover)
  onHoverRef.current = onHover
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  const apply = () => {
    const fr = engine.frame()
    fr.planets.forEach((p, i) => {
      const el = nodeRefs.current[i]
      if (!el) return
      el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`
      el.style.setProperty('--d', `${(p.r * 2).toFixed(2)}px`)
      el.style.visibility = p.visible ? '' : 'hidden'
      // Labels open away from the portrait, unless that runs off the screen.
      let side = p.x >= fr.portrait.x ? 'right' : 'left'
      if (side === 'right' && p.x > engine.w - 170) side = 'left'
      if (side === 'left' && p.x < 170) side = 'right'
      if (el.dataset.side !== side) el.dataset.side = side
    })
    const el = portraitRef.current
    if (el) {
      el.style.transform = `translate3d(${fr.portrait.x.toFixed(2)}px, ${fr.portrait.y.toFixed(2)}px, 0)`
      el.style.setProperty('--d', `${(fr.portrait.r * 2).toFixed(2)}px`)
      el.style.visibility = fr.portrait.visible ? '' : 'hidden'
    }
    onFrameRef.current?.(fr, engine)
    if (engine.moved !== movedRef.current) {
      movedRef.current = engine.moved
      setMoved(engine.moved)
    }
  }
  const movedRef = useRef(false)

  useLayoutEffect(() => {
    apply()
  }) // cheap: four nodes and a portrait

  useEffect(() => {
    const onResize = () => {
      engine.resize(window.innerWidth, window.innerHeight)
      setSvg(engine.svg())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [engine])

  // Let the hairlines finish drawing before three.js takes over.
  useEffect(() => {
    if (reduced) return undefined
    const id = setTimeout(() => setIntroDone(true), 2100)
    return () => clearTimeout(id)
  }, [reduced])

  // Orbits hold still while a node is hovered or focused, so the target does not drift away.
  useEffect(() => {
    engine.targetSpeed = hovered == null ? 1 : 0
  }, [engine, hovered])

  useEffect(() => {
    const onDown = (event) => {
      const el = event.target instanceof Element ? event.target : null
      if (event.pointerType === 'touch' && !el?.closest('.node, .index')) onHoverRef.current(null)
      if (!liveRef.current || !idleRef.current) return
      if (event.button !== undefined && event.button !== 0) return
      if (event.target instanceof Element && event.target.closest('[data-nodrag]')) return
      engine.dragging = true
      engine.vYaw = 0
      engine.vPitch = 0
      last = { x: event.clientX, y: event.clientY, t: performance.now() }
      setDragging(true)
    }
    const onMove = (event) => {
      if (!engine.dragging) return
      const now = performance.now()
      const dt = Math.max(16, now - last.t) / 1000
      engine.drag(event.clientX - last.x, event.clientY - last.y, dt)
      last = { x: event.clientX, y: event.clientY, t: now }
    }
    const onUp = () => {
      if (!engine.dragging) return
      engine.dragging = false
      setDragging(false)
    }
    let last = { x: 0, y: 0, t: 0 }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [engine])

  useImperativeHandle(
    ref,
    () => ({
      // Camera eases into a planet (index) or the portrait (-1), then calls back.
      flyTo(index, onDone) {
        if (!liveRef.current || reduced) return onDone()
        const { w, h } = engine
        const short = Math.min(w, h)
        if (index < 0) engine.flyTo([0, 0, 0], cfg.portrait ?? 1, short * 0.62, w / 2, h / 2, 1.0, onDone)
        else engine.flyTo(engine.planetWorld(index), cfg.rings[index].size, short * 0.34, w / 2, h / 2, 1.15, onDone)
        return undefined
      },
      flyBack(onDone) {
        if (!engine.flight) return onDone()
        engine.flyBack(reduced ? 0.001 : 0.95, onDone)
        return undefined
      },
    }),
    [engine, cfg, reduced],
  )

  const goStatic = () => {
    engine.flight = null
    engine.resize(window.innerWidth, window.innerHeight)
    engine.reset()
    engine.pitch = engine.targetPitch
    engine.yaw = engine.targetYaw
    setSvg(engine.svg())
    setMode('static')
  }

  return (
    <div
      className={['stage', live ? 'is-live' : 'is-static', dragging ? 'is-dragging' : '', introDone ? 'is-settled' : ''].join(' ')}
      data-mode={mode}
    >
      <svg className="orbit-static" aria-hidden="true" width="100%" height="100%">
        {svg.rings.map((ring, i) => (
          <path key={`r${i}`} className={`os-ring tone-${ring.tone}`} d={ring.d} pathLength="1" style={{ '--i': i }} />
        ))}
        {svg.ticks.map((set, i) => (
          <path key={`t${i}`} className={`os-ticks tone-${set.tone}`} d={set.d} />
        ))}
        {svg.dots.map((set, i) => (
          <path key={`d${i}`} className={`os-dots tone-${set.tone}`} d={set.d} style={{ strokeWidth: set.size }} />
        ))}
      </svg>

      {mode !== 'static' && (
        <Suspense fallback={null}>
          <LiveOrbit
            engine={engine}
            colors={colors}
            onFrame={apply}
            onReady={() => setMode('live')}
            onSlow={goStatic}
          />
        </Suspense>
      )}

      <button
        ref={portraitRef}
        type="button"
        className="portrait"
        data-nodrag
        aria-label="Who am I?"
        onClick={onPortrait}
        tabIndex={idle ? 0 : -1}
      >
        <img src={`${import.meta.env.BASE_URL}portrait-480.webp`} alt="" width="480" height="480" decoding="async" fetchPriority="high" draggable="false" />
      </button>

      {sections.map((section, i) => (
        <button
          key={section.id}
          ref={(el) => {
            nodeRefs.current[i] = el
          }}
          type="button"
          className={['node', cfg.rings[i].look === 'hollow' ? 'is-hollow' : '', hovered === i || selected === i ? 'is-on' : '', labelled === i ? 'is-labelled' : ''].join(' ')}
          style={{ '--i': i }}
          data-nodrag
          tabIndex={idle ? 0 : -1}
          onPointerEnter={(e) => {
            if (e.pointerType !== 'mouse') return
            const active = document.activeElement
            if (active && active !== e.currentTarget && active.matches?.('.index-row, .node')) active.blur()
            onHover(i)
          }}
          onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
          onPointerDown={(e) => {
            // Touch has no hover: the first tap names the planet, the second opens it.
            tap.current = e.pointerType === 'touch' && hovered !== i ? 'name' : 'open'
          }}
          onFocus={() => onHover(i)}
          onBlur={() => onHover(null)}
          onClick={() => {
            if (tap.current === 'name') onHover(i)
            else onSelect(i)
            tap.current = 'open'
          }}
        >
          <span className="node-dot" />
          <span className="node-label">
            <span className="node-name">{section.title}</span>
            <span className="px node-count">{section.countLabel}</span>
            <span className="px node-open">tap to open</span>
          </span>
        </button>
      ))}

      <div className="hint" data-nodrag>
        {mode === 'static' && introDone ? (
          <span className="hint-text">Select a planet to open a section</span>
        ) : moved ? (
          <button type="button" className="hint-reset" onClick={() => engine.reset()} tabIndex={idle ? 0 : -1}>
            Reset view
          </button>
        ) : (
          <span className="hint-text">
            <svg viewBox="0 0 28 12" width="28" height="12" aria-hidden="true">
              <path d="M5 2 1 6l4 4M23 2l4 4-4 4M1 6h26" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
            <span className="hint-fine">Drag to rotate</span>
            <span className="hint-coarse">Drag to rotate. Tap a planet.</span>
          </span>
        )}
      </div>
    </div>
  )
})

export default OrbitStage
