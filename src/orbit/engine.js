// One source of truth for the orbit system. Both renderers read from it:
// the static SVG (first paint, WebGL fallback) and the three.js scene.
// The camera never rotates. It looks down -z and moves; the scene centre is
// placed on screen with a lens shift (cx, cy), so there is no off-axis skew.

export const TAU = Math.PI * 2
const FOV = (30 * Math.PI) / 180

const rx = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)]
const ry = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)]
const rz = ([x, y, z], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z]

// A point on a circle of radius r lying in the given plane (system-local space).
export function planePoint(plane, r, angle) {
  const p = [r * Math.cos(angle), r * Math.sin(angle), 0]
  return rz(ry(rx(p, plane.tilt ?? 0), plane.yaw ?? 0), plane.roll ?? 0)
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export class OrbitEngine {
  constructor(cfg, lite = false) {
    this.cfg = cfg
    this.lite = lite
    this.pitch = cfg.pitch ?? 0
    this.yaw = cfg.yaw ?? 0
    this.targetPitch = this.pitch
    this.targetYaw = this.yaw
    this.vPitch = 0
    this.vYaw = 0
    this.dragging = false
    this.angles = cfg.rings.map((r) => r.phase)
    this.speed = 1
    this.targetSpeed = 1
    this.w = 1
    this.h = 1
    this.view = null
    this.flight = null
    this.moved = false
    this.geometry = buildGeometry(cfg, lite)
  }

  resize(w, h) {
    this.w = w
    this.h = h
    this.compact = w < 720
    const f = h / 2 / Math.tan(FOV / 2)
    const layout = this.cfg.layout(w, h)
    this.idle = { camX: 0, camY: 0, camZ: (this.cfg.extent * f) / layout.R, cx: layout.cx, cy: layout.cy, f }
    if (!this.flight) this.view = { ...this.idle }
  }

  get fov() {
    return FOV
  }

  reset() {
    this.targetPitch = this.cfg.pitch ?? 0
    this.targetYaw = this.cfg.yaw ?? 0
    this.vPitch = 0
    this.vYaw = 0
    this.moved = false
  }

  drag(dx, dy, dt) {
    const yaw = dx * 0.0075
    const pitch = dy * 0.005
    const [lo, hi] = this.cfg.pitchRange ?? [-1.05, 1.05]
    this.targetYaw += yaw
    this.targetPitch = clamp(this.targetPitch + pitch, lo, hi)
    this.vYaw = yaw / dt
    this.vPitch = pitch / dt
    this.moved = true
  }

  // System-local -> world.
  toWorld(p) {
    return rz(rx(ry(p, this.yaw), this.pitch), this.cfg.roll ?? 0)
  }

  planetWorld(i) {
    const ring = this.cfg.rings[i]
    return this.toWorld(planePoint(ring, ring.r, this.angles[i]))
  }

  project(p, view = this.view) {
    const depth = view.camZ - p[2]
    const s = view.f / depth
    return { x: view.cx + (p[0] - view.camX) * s, y: view.cy - (p[1] - view.camY) * s, s, depth }
  }

  // Camera eases toward a world point until a body of `radius` world units
  // is `sizePx` wide on screen, landing at (toX, toY).
  flyTo(target, radius, sizePx, toX, toY, duration, onDone) {
    const from = { ...this.view }
    const start = this.project(target, from)
    this.flight = { target, from, start, endDepth: (radius * from.f) / (sizePx / 2), toX, toY, t: 0, dir: 1, duration, onDone }
  }

  flyBack(duration, onDone) {
    if (!this.flight) {
      onDone?.()
      return
    }
    this.flight.dir = -1
    this.flight.duration = duration
    this.flight.onDone = onDone
  }

  step(dt) {
    if (this.paused) return
    const flying = !!this.flight
    if (!flying) {
      if (!this.dragging) {
        const [lo, hi] = this.cfg.pitchRange ?? [-1.05, 1.05]
        this.targetYaw += this.vYaw * dt
        this.targetPitch = clamp(this.targetPitch + this.vPitch * dt, lo, hi)
        const decay = Math.exp(-2.6 * dt)
        this.vYaw *= decay
        this.vPitch *= decay
        if (!this.moved && this.cfg.drift) this.targetYaw += this.cfg.drift * this.speed * dt
      }
      this.pitch = damp(this.pitch, this.targetPitch, 7, dt)
      this.yaw = damp(this.yaw, this.targetYaw, 7, dt)
      this.speed = damp(this.speed, this.targetSpeed, 6, dt)
      this.cfg.rings.forEach((ring, i) => {
        this.angles[i] += ring.speed * this.speed * dt
      })
      return
    }

    const fl = this.flight
    fl.t = clamp(fl.t + (fl.dir * dt) / fl.duration, 0, 1)
    const k = ease(fl.t)
    const startDepth = fl.from.camZ - fl.target[2]
    const depth = startDepth * Math.pow(fl.endDepth / startDepth, k)
    const sx = fl.start.x + (fl.toX - fl.start.x) * k
    const sy = fl.start.y + (fl.toY - fl.start.y) * k
    const s = fl.from.f / depth
    this.view = {
      ...fl.from,
      camZ: fl.target[2] + depth,
      camX: fl.target[0] - (sx - fl.from.cx) / s,
      camY: fl.target[1] + (sy - fl.from.cy) / s,
    }
    if (fl.dir > 0 && fl.t >= 1 && fl.onDone) {
      const done = fl.onDone
      fl.onDone = null
      done()
    } else if (fl.dir < 0 && fl.t <= 0) {
      const done = fl.onDone
      this.flight = null
      this.view = { ...this.idle }
      done?.()
    }
  }

  frame() {
    const planets = this.cfg.rings.map((ring, i) => {
      const p = this.project(this.planetWorld(i))
      return { x: p.x, y: p.y, r: Math.max(ring.size * p.s, 3), visible: p.depth > 0.2 }
    })
    const c = this.project([0, 0, 0])
    return { planets, portrait: { x: c.x, y: c.y, r: (this.cfg.portrait ?? 1) * c.s, visible: c.depth > 0.2 } }
  }

  // Static SVG data for the current pose.
  svg() {
    const pt = (p) => {
      const q = this.project(this.toWorld(p))
      return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`
    }
    const g = this.geometry
    return {
      rings: g.rings.map((ring) => ({
        ...ring,
        d: 'M' + ring.points.map(pt).join('L') + 'Z',
      })),
      ticks: g.ticks.map((set) => ({
        ...set,
        d: set.segments.map(([a, b]) => `M${pt(a)}L${pt(b)}`).join(''),
      })),
      dots: g.dots.map((set) => ({
        ...set,
        d: set.points.map((p) => `M${pt(p)}h0`).join(''),
      })),
    }
  }
}

// System-local geometry shared by both renderers.
function buildGeometry(cfg, lite) {
  // Phones get roughly half the marks: fewer dots, fewer ticks, coarser circles.
  const thin = (n) => (lite ? Math.round(n / 2) : n)
  const rings = []
  const ticks = []
  const dots = []
  const circle = (plane, r, n = lite ? 96 : 144) =>
    Array.from({ length: n }, (_, i) => planePoint(plane, r, (i / n) * TAU))

  cfg.rings.forEach((ring) => {
    if (ring.style === 'dots') {
      dots.push({ tone: 'line', size: 1.4, points: circle(ring, ring.r, thin(ring.count ?? 180)) })
    } else {
      rings.push({ tone: ring.tone ?? 'line', dash: ring.dash, points: circle(ring, ring.r) })
    }
  })
  ;(cfg.extraRings ?? []).forEach((ring) => {
    if (ring.style === 'dots') dots.push({ tone: ring.tone ?? 'faint', size: ring.dot ?? 1.2, points: circle(ring, ring.r, thin(ring.count ?? 180)) })
    else rings.push({ tone: ring.tone ?? 'faint', dash: ring.dash, points: circle(ring, ring.r) })
  })
  ;(cfg.ticks ?? []).forEach((t) => {
    const segments = []
    for (let i = 0; i < t.count; i++) {
      const isMajor = t.majorEvery && i % t.majorEvery === 0
      if (lite && !isMajor && i % 2) continue
      const a = (i / t.count) * TAU
      const len = isMajor ? t.major : t.len
      segments.push([planePoint(t, t.r, a), planePoint(t, t.r + len, a)])
    }
    ticks.push({ tone: t.tone ?? 'faint', segments })
  })
  ;(cfg.spokes ?? []).forEach((s) => {
    ticks.push({
      tone: s.tone ?? 'faint',
      segments: s.angles.map((a) => [planePoint(s, s.from, a), planePoint(s, s.to, a)]),
    })
  })
  return { rings, ticks, dots }
}
