// The orbit system. Ring order is the section order:
// Product Design, Visual / Art, Builds, Video.
// The system is deliberately too large for the screen and runs off the edge.
// If the layout numbers change, update the matching CSS for #boot in index.html.
const FLAT = { tilt: Math.PI / 2 }
const deg = (d) => (d * Math.PI) / 180

export const ORBIT = {
  extent: 8.2,
  pitch: 0.4,
  yaw: 0,
  roll: deg(-24),
  pitchRange: [0.12, 1.5],
  portrait: 1,
  rings: [
    { ...FLAT, r: 3.2, size: 0.13, phase: deg(238), speed: 0.03 },
    { ...FLAT, r: 4.7, size: 0.2, phase: deg(196), speed: 0.022, look: 'hollow' },
    { ...FLAT, r: 6.3, size: 0.16, phase: deg(262), speed: 0.016 },
    { ...FLAT, r: 8.2, size: 0.24, phase: deg(224), speed: 0.012, look: 'hollow' },
  ],
  extraRings: [
    { ...FLAT, r: 5.45, style: 'dots', count: 420, tone: 'line', dot: 1.2 },
    { ...FLAT, r: 5.6, style: 'dots', count: 300, tone: 'faint', dot: 1.2 },
  ],
  layout: (w, h) =>
    w < 720
      ? { cx: w * 0.66, cy: h * 0.77, R: w * 1.05 }
      : { cx: w * 0.76, cy: h * 0.6, R: Math.max(w * 0.6, h * 0.86) },
}
