import { useId, useMemo, useState } from 'react'
import { NAME_GLYPHS } from './glyphs.js'

// 李紫玄 as inline SVG, written stroke by stroke on first load.
// To swap in your own brush-written name, replace the data in glyphs.js
// (see README.md in this folder). Nothing else needs to change.

const SPEED = 5200 // glyph units per second
const CHAR_STAGGER = 0.5 // seconds between the start of each character

function roughLength(d) {
  const n = d.match(/-?\d+\.?\d*/g).map(Number)
  let len = 0
  for (let i = 2; i < n.length - 1; i += 2) len += Math.hypot(n[i] - n[i - 2], n[i + 1] - n[i - 1])
  return len
}

export default function LishuName({ glyphs = NAME_GLYPHS, animate = true, className = '', label = '李紫玄' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [written, setWritten] = useState(!animate)

  const plan = useMemo(() => {
    let end = 0
    const chars = glyphs.map((glyph, c) => {
      let t = c * CHAR_STAGGER
      const strokes = (glyph.strokes ?? []).map((stroke) => {
        const dur = Math.min(0.34, Math.max(0.13, roughLength(stroke.d) / SPEED))
        const item = { ...stroke, delay: t, dur }
        t += dur * 0.78
        end = Math.max(end, item.delay + dur)
        return item
      })
      if (!strokes.length) end = Math.max(end, c * CHAR_STAGGER + 0.7)
      return { ...glyph, strokes }
    })
    return { chars, end }
  }, [glyphs])

  return (
    <span
      className={`lishu ${written ? 'is-written' : 'is-writing'} ${className}`}
      role="img"
      aria-label={label}
      lang="zh-Hans"
      style={{ '--lishu-total': `${plan.end}s` }}
      onAnimationEnd={(e) => e.animationName === 'lishu-done' && setWritten(true)}
    >
      {plan.chars.map((glyph, c) => {
        const maskId = `lishu-${uid}-${c}`
        const [x, y, w, h] = glyph.viewBox
        return (
          <svg key={glyph.char} className="lishu-char" viewBox={glyph.viewBox.join(' ')} aria-hidden="true">
            {!written && (
              <mask id={maskId} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
                {glyph.strokes.length ? (
                  glyph.strokes.map((s, i) => (
                    <path
                      key={i}
                      className="lishu-stroke"
                      d={s.d}
                      pathLength="1"
                      strokeWidth={s.w}
                      style={{ '--delay': `${s.delay}s`, '--dur': `${s.dur}s` }}
                    />
                  ))
                ) : (
                  // No stroke data: wipe the character in from the left instead.
                  <rect className="lishu-wipe" x={x} y={y} width={w} height={h} style={{ '--delay': `${c * CHAR_STAGGER}s` }} />
                )}
              </mask>
            )}
            <path d={glyph.outline} fill="currentColor" mask={written ? undefined : `url(#${maskId})`} />
          </svg>
        )
      })}
    </span>
  )
}
