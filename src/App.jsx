import { useCallback, useEffect, useRef, useState } from 'react'
import About from './About.jsx'
import OrbitScene from './scene/OrbitScene.jsx'

const FRAME = { width: 1440, height: 1024 }
const PHOTO = { x: 144, y: 128, width: 576, height: 768 }
const OPEN_EASE = 'cubic-bezier(0.77, 0, 0.18, 1)'

function measureFit() {
  const width = window.innerWidth
  const height = window.innerHeight
  const scale = Math.min(width / FRAME.width, height / FRAME.height)
  const x = (width - FRAME.width * scale) / 2
  const y = (height - FRAME.height * scale) / 2
  return {
    scale,
    x,
    y,
    ruleLeft: -x / scale,
    ruleWidth: width / scale,
    ruleTop: -y / scale,
    ruleHeight: height / scale,
  }
}

function photoRect(fit) {
  return {
    left: fit.x + PHOTO.x * fit.scale,
    top: fit.y + PHOTO.y * fit.scale,
    width: PHOTO.width * fit.scale,
    height: PHOTO.height * fit.scale,
  }
}

function circleRect(portrait) {
  return {
    left: portrait.cx - portrait.d / 2,
    top: portrait.cy - portrait.d / 2,
    width: portrait.d,
    height: portrait.d,
  }
}

export default function App() {
  const [dragging, setDragging] = useState(false)
  const [hintVisible, setHintVisible] = useState(true)
  const [portrait, setPortrait] = useState(null)
  const [resetId, setResetId] = useState(0)
  const [view, setView] = useState('home')
  const [entered, setEntered] = useState(false)
  const [fit, setFit] = useState(measureFit)
  const fitRef = useRef(fit)
  const portraitRef = useRef(portrait)
  const flyerRef = useRef(null)
  fitRef.current = fit
  portraitRef.current = portrait
  const hideHint = useCallback(() => setHintVisible(false), [])
  const placePortrait = useCallback((frame) => setPortrait(frame), [])
  const reducedMotion = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    const img = new Image()
    img.src = '/about-portrait.jpg'
  }, [])

  useEffect(() => {
    const onResize = () => setFit(measureFit())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (view === 'home' || view === 'closing') {
      setEntered(false)
      return
    }
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [view])

  useEffect(() => {
    if (view !== 'opening' && view !== 'closing') return undefined
    const face = portraitRef.current
    if (!face) return undefined
    if (reducedMotion()) {
      setView(view === 'opening' ? 'about' : 'home')
      return undefined
    }

    const flyer = flyerRef.current
    if (!flyer) return undefined

    const start = circleRect(face)
    const end = photoRect(fitRef.current)
    const opening = view === 'opening'
    const from = opening ? start : end
    const to = opening ? end : start
    const radius = `${start.width / 2}px`
    let cancelled = false

    const animation = flyer.animate(
      opening
        ? [
            { opacity: 0, borderRadius: radius, ...box(from) },
            { opacity: 1, borderRadius: radius, ...box(from), offset: 0.24 },
            { opacity: 1, borderRadius: '0px', ...box(to) },
          ]
        : [
            { opacity: 1, borderRadius: '0px', ...box(from) },
            { opacity: 1, borderRadius: radius, ...box(to), offset: 0.76 },
            { opacity: 0, borderRadius: radius, ...box(to) },
          ],
      {
        duration: opening ? 1120 : 980,
        easing: OPEN_EASE,
        fill: 'both',
      },
    )

    animation.onfinish = () => {
      if (!cancelled) setView(opening ? 'about' : 'home')
    }

    return () => {
      cancelled = true
      animation.cancel()
    }
  }, [view, reducedMotion])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && (view === 'about' || view === 'opening')) {
        setView('closing')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const openAbout = () => {
    if (view !== 'home' || !portrait) return
    setView(reducedMotion() ? 'about' : 'opening')
  }

  const closeAbout = () => {
    if (view !== 'about') return
    setView(reducedMotion() ? 'home' : 'closing')
  }

  const away = view === 'opening' || view === 'about'
  const showAbout = view !== 'home'
  const showFlyer = (view === 'opening' || view === 'closing') && portrait
  const flyerFrom = view === 'closing' && portrait ? photoRect(fit) : portrait ? circleRect(portrait) : null

  return (
    <main
      className={[
        'page',
        dragging && view === 'home' ? 'is-dragging' : '',
        away ? 'is-away' : '',
        view !== 'home' ? `is-${view}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="stage">
        <OrbitScene
          onDragChange={setDragging}
          onInteract={hideHint}
          onPortraitFrame={placePortrait}
          resetId={resetId}
          depart={away}
          interactive={view === 'home'}
        />
      </div>
      {portrait && view === 'home' && (
        <button
          type="button"
          className="portrait-hit"
          data-nodrag
          style={{
            left: portrait.cx,
            top: portrait.cy,
            width: portrait.d,
            height: portrait.d,
          }}
          aria-label="Who am I?"
          onClick={openAbout}
        />
      )}
      {portrait && view === 'home' && (
        <button
          type="button"
          className="reset"
          data-nodrag
          style={{
            left: portrait.cx,
            top: portrait.cy + portrait.d * 1.7,
          }}
          onClick={() => setResetId((id) => id + 1)}
        >
          reset
        </button>
      )}
      <h1 className="name" aria-hidden={view !== 'home'}>
        <span className="name-zh">李紫玄</span>
        <span className="name-en">Zixuan Li</span>
      </h1>
      <p className={hintVisible ? 'hint' : 'hint is-hidden'} aria-hidden={!hintVisible || view !== 'home'}>
        拖动旋转
      </p>
      {showAbout && (
        <div
          className="about-fit"
          style={{
            '--fit': fit.scale,
            '--rule-left': `${fit.ruleLeft}px`,
            '--rule-width': `${fit.ruleWidth}px`,
            '--rule-top': `${fit.ruleTop}px`,
            '--rule-height': `${fit.ruleHeight}px`,
          }}
        >
          <About entered={entered} settled={view === 'about'} onReturn={closeAbout} />
        </div>
      )}
      {showFlyer && flyerFrom && (
        <img
          ref={flyerRef}
          className="flyer"
          src="/about-portrait.jpg"
          alt=""
          style={{
            left: flyerFrom.left,
            top: flyerFrom.top,
            width: flyerFrom.width,
            height: flyerFrom.height,
            borderRadius: view === 'closing' ? 0 : flyerFrom.width / 2,
            opacity: view === 'opening' ? 0 : 1,
          }}
        />
      )}
    </main>
  )
}

function box(rect) {
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
}
