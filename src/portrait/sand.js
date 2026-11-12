// The portrait is drawn in fine sprayed grain. This sets that grain moving, at the same
// fineness as the drawing: the cloth slides slowly down and off the shoulders, and the outer
// edge of the hair sheds grain into the paper. The face stays still.
// Tone is preserved: grains are only as dark as the drawing is where they pass.

const GRID = 200 // the drawing is sampled on a GRID x GRID map
const SIZE = 760 // canvas backing size: about two device pixels per CSS pixel at normal size
const CLOTH = 9000 // grains in the clothes
const HAIR = 3200 // grains along the outer edge of the hair

// Face and neck, in 0..1 image coordinates. Nothing moves here.
const FACE = { cx: 0.513, cy: 0.504, rx: 0.2, ry: 0.29 }
const NECK = { x0: 0.37, x1: 0.665, y0: 0.7 }
const HEAD = { cx: 0.513, cy: 0.42 } // "outward" is measured from here
const SHOULDERS = 0.73 // below this line the drawing is clothing

const inSkin = (x, y) =>
  ((x - FACE.cx) / FACE.rx) ** 2 + ((y - FACE.cy) / FACE.ry) ** 2 < 1 || (y > NECK.y0 && x > NECK.x0 && x < NECK.x1)

function readMap(img) {
  const c = document.createElement('canvas')
  c.width = GRID
  c.height = GRID
  const g = c.getContext('2d', { willReadFrequently: true })
  const read = (blur) => {
    g.filter = `blur(${blur}px)`
    g.drawImage(img, 0, 0, GRID, GRID)
    const data = g.getImageData(0, 0, GRID, GRID).data
    const out = new Float32Array(GRID * GRID)
    for (let i = 0; i < out.length; i++) out[i] = 1 - data[i * 4] / 255
    return out
  }
  const dark = read(1.2) // how much ink there is at each point
  const soft = read(4) // the broad shape, for finding the outline and which way is out

  const cloth = [] // anywhere in the clothes that carries ink
  const edge = [] // the outer outline of the hair
  for (let y = 2; y < GRID - 2; y++) {
    for (let x = 2; x < GRID - 2; x++) {
      const u = x / GRID
      const v = y / GRID
      if (inSkin(u, v)) continue
      const i = y * GRID + x
      if (v > SHOULDERS) {
        if (dark[i] > 0.06) cloth.push(i)
        continue
      }
      const s = soft[i]
      if (s < 0.08 || s > 0.7) continue
      const gx = soft[i + 2] - soft[i - 2]
      const gy = soft[i + 2 * GRID] - soft[i - 2 * GRID]
      const g2 = Math.hypot(gx, gy)
      if (g2 < 0.03) continue
      const nx = -gx / g2 // out of the ink is down the tone slope
      const ny = -gy / g2
      if (nx * (u - HEAD.cx) + ny * (v - HEAD.cy) < 0.02) continue // inner edges face the head: skip
      edge.push({ x, y, nx, ny })
    }
  }
  return { dark, cloth, edge }
}

export function startSand(canvas, img, colors) {
  const none = { pause() {}, stop() {} }
  const ctx = canvas.getContext('2d')
  canvas.width = SIZE
  canvas.height = SIZE
  let map
  try {
    map = readMap(img)
  } catch {
    return none // image not readable: leave the portrait still
  }
  const { dark, cloth, edge } = map
  if (!cloth.length && !edge.length) return none
  const at = (x, y) => dark[Math.min(GRID - 1, Math.max(0, y | 0)) * GRID + Math.min(GRID - 1, Math.max(0, x | 0))]
  const k = SIZE / GRID

  // Clothes: every grain creeps down the slope of the shoulder it is on.
  const startCloth = (p) => {
    const i = cloth[(Math.random() * cloth.length) | 0]
    p.x = (i % GRID) + Math.random()
    p.y = ((i / GRID) | 0) + Math.random()
    p.span = 120 + Math.random() * 200
    p.life = p.span
    p.speed = 0.02 + Math.random() * 0.045
    p.ink = Math.random() < 0.62 // the rest are paper-coloured, so the tone holds
    p.phase = Math.random() * 6.28
  }
  // Hair: grain leaves the outline and thins out within a short distance.
  const startEdge = (p) => {
    const s = edge[(Math.random() * edge.length) | 0]
    const inset = Math.random() * 2.5
    p.x = s.x + Math.random() - s.nx * inset
    p.y = s.y + Math.random() - s.ny * inset
    const push = 0.025 + Math.random() * 0.06
    p.vx = s.nx * push
    p.vy = s.ny * push
    p.span = 70 + Math.random() * 130
    p.life = p.span
    p.ink = Math.random() < 0.8
  }

  const share = window.innerWidth < 720 ? 0.5 : 1 // phones draw the portrait smaller: half the grains
  const clothGrains = cloth.length ? Array.from({ length: Math.round(CLOTH * share) }, () => ({})) : []
  const hairGrains = edge.length ? Array.from({ length: Math.round(HAIR * share) }, () => ({})) : []
  // Begin mid-flow, so nothing appears all at once.
  for (const p of clothGrains) {
    startCloth(p)
    p.life = Math.random() * p.span
  }
  for (const p of hairGrains) {
    startEdge(p)
    const lead = Math.random() * p.span
    p.life -= lead
    p.x += p.vx * lead
    p.y += p.vy * lead
  }

  let raf = 0
  let running = true
  let tick = 0

  const draw = (list, ink) => {
    ctx.fillStyle = ink ? colors.dark : colors.light
    for (const p of list) {
      if (p.ink !== ink || p.a <= 0.01) continue
      ctx.globalAlpha = p.a
      ctx.fillRect(p.x * k, p.y * k, 1, 1)
    }
  }

  const frame = () => {
    raf = requestAnimationFrame(frame)
    tick += 1
    if (!running || tick % 2) return // about 30 frames a second
    ctx.clearRect(0, 0, SIZE, SIZE)

    for (const p of clothGrains) {
      p.life -= 1
      const u = p.x / GRID
      if (p.life <= 0 || p.y >= GRID || p.x < 0 || p.x >= GRID || inSkin(u, p.y / GRID)) {
        startCloth(p)
        p.a = 0
        continue
      }
      // Down, and away from the neck, with a slow sideways sway like sand settling.
      const out = (u - 0.5) * 1.5
      p.x += (out + Math.sin(p.y * 0.16 + p.phase + tick * 0.008) * 0.3) * p.speed
      p.y += p.speed
      const d = at(p.x, p.y)
      const fade = Math.min(1, p.life / 24, (p.span - p.life) / 24)
      // A dark grain shows on the lighter cloth, a light grain on the darker: both scale with the ink there.
      p.a = fade * (p.ink ? Math.min(0.75, d * 1.5) : Math.min(0.6, d * 1.1))
    }
    for (const p of hairGrains) {
      p.life -= 1
      if (p.life <= 0) {
        startEdge(p)
        p.a = 0
        continue
      }
      p.vx += 0.0006 + Math.sin(p.y * 0.2 + tick * 0.009) * 0.0006 // a breath of wind
      p.vy += 0.0007 // and its own weight
      p.x += p.vx
      p.y += p.vy
      const d = at(p.x, p.y)
      const age = 1 - p.life / p.span
      const fade = Math.min(1, (p.span - p.life) / 14) * (1 - age) ** 1.2
      p.a = p.ink ? fade * (d > 0.85 ? 0 : 0.2 + Math.min(0.55, d * 1.4)) : fade * Math.min(0.7, d * 1.2)
    }

    draw(clothGrains, false)
    draw(hairGrains, false)
    draw(clothGrains, true)
    draw(hairGrains, true)
    ctx.globalAlpha = 1
  }
  raf = requestAnimationFrame(frame)

  return {
    pause(on) {
      running = !on
    },
    stop() {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, SIZE, SIZE)
    },
  }
}
