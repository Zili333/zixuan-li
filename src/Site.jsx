import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource/geist-pixel/latin-400.css'
import './site.css'
import { ORBIT } from './orbit/configs.js'
import OrbitStage from './orbit/OrbitStage.jsx'
import LishuName from './name/LishuName.jsx'
import { PALETTE, useTheme } from './theme.js'
import { ABOUT, SECTIONS } from './content.js'
import { currentRoute, go, hrefFor, onRoute, pushedHere } from './router.js'

// Route name -> what is open: a section index, 'about', or null for the orbit.
function targetOf(route) {
  if (route === ABOUT.id) return 'about'
  const i = SECTIONS.findIndex((s) => s.id === route)
  return i < 0 ? null : i
}
const nameOf = (target) => (target === 'about' ? ABOUT.id : SECTIONS[target].id)

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(media.matches)
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return reduced
}

function ThemeToggle({ theme, onToggle }) {
  const ref = useRef(null)
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      ref={ref}
      type="button"
      className="theme-toggle"
      data-nodrag
      aria-label={`${theme} mode, switch to ${next}`}
      onClick={() => onToggle(ref.current.querySelector('svg'))}
    >
      <span className="px">{theme}</span>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M8 .75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
      </svg>
    </button>
  )
}

// Pointing at one section while keyboard focus sits on another would light two at once.
// The pointer wins: focus lets go.
function releaseFocus(keep) {
  const active = document.activeElement
  if (active && active !== keep && active.matches?.('.index-row, .node')) active.blur()
}

// The four sections as large type. Used on the home screen and at the foot of every panel.
function Index({ label, current = null, hovered = null, onHover, onOpen, rowRefs, tabbable = true }) {
  return (
    <nav className="index" aria-label={label} data-nodrag>
      <ul className={hovered == null ? 'index-list' : 'index-list has-hover'}>
        {SECTIONS.map((section, i) => {
          const isCurrent = current === i
          return (
            <li key={section.id}>
              <a
                ref={(el) => {
                  if (rowRefs) rowRefs.current[i] = el
                }}
                href={hrefFor(section.id)}
                className={hovered === i ? 'index-row is-on' : 'index-row'}
                aria-current={isCurrent ? 'page' : undefined}
                tabIndex={tabbable && !isCurrent ? 0 : -1}
                draggable="false"
                onPointerEnter={(e) => {
                  if (e.pointerType !== 'mouse') return
                  releaseFocus(e.currentTarget)
                  onHover?.(i)
                }}
                onPointerLeave={(e) => e.pointerType === 'mouse' && onHover?.(null)}
                onFocus={() => onHover?.(i)}
                onBlur={() => onHover?.(null)}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                  event.preventDefault()
                  if (!isCurrent) onOpen(i)
                }}
              >
                {section.title}
                <span className="px">{section.count}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const Todo = ({ children }) => <p className="px todo">[TODO: {children}]</p>

function Field({ field }) {
  return (
    <>
      {field.text && <p>{field.text}</p>}
      {field.todo && <Todo>{field.todo}</Todo>}
    </>
  )
}

// A before-and-after number. The second value ticks down once when the panel opens.
function Stat({ stat, active, reduced }) {
  const [n, setN] = useState(stat.to)
  useEffect(() => {
    if (!active || reduced) {
      setN(stat.to)
      return undefined
    }
    const steps = 14
    let i = 0
    setN(stat.from)
    const interval = setInterval(() => {
      i += 1
      const k = 1 - Math.pow(1 - i / steps, 3)
      setN(Math.round(stat.from + (stat.to - stat.from) * k))
      if (i >= steps) clearInterval(interval)
    }, 55)
    return () => clearInterval(interval)
  }, [active, reduced, stat])
  return (
    <>
      <p className="px stat" role="img" aria-label={`${stat.from} to ${stat.to} ${stat.unit}`}>
        <span className="stat-from" aria-hidden="true">{stat.from}</span>
        <svg viewBox="0 0 40 16" aria-hidden="true">
          <path d="M0 8h38M31 1l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span aria-hidden="true">{n}</span>
        <span className="stat-unit" aria-hidden="true">{stat.unit}</span>
      </p>
      <p className="px stat-label">{stat.label}</p>
    </>
  )
}

function Work({ section, work, active, reduced }) {
  const title = (
    <h3 className="work-title">
      {work.title}
      {work.years && <span className="px">{work.years}</span>}
    </h3>
  )

  if (section.kind === 'cases') {
    const rows = [
      ['Problem', work.problem],
      ['My judgment', work.judgment],
      ['Result', work.result],
    ]
    return (
      <article className="work">
        {title}
        <dl className="case-body">
          {rows.map(([label, field]) => (
            <div key={label} className={label === 'Result' ? 'case-row is-result' : 'case-row'}>
              <dt className="px">{label}</dt>
              <dd>
                {field.stat && <Stat stat={field.stat} active={active} reduced={reduced} />}
                <Field field={field} />
              </dd>
            </div>
          ))}
        </dl>
      </article>
    )
  }

  if (section.kind === 'gallery') {
    return (
      <article className="work">
        <div className="work-side">
          {title}
          {work.line && <p>{work.line}</p>}
        </div>
        <div className="frames" style={{ '--ratio': work.frames.ratio }}>
          {Array.from({ length: work.frames.count }, (_, i) => (
            <div key={i} className="frame px">
              <span>
                [TODO: {work.frames.todo} {String(i + 1).padStart(2, '0')}]
              </span>
            </div>
          ))}
        </div>
      </article>
    )
  }

  return (
    <article className="work">
      {title}
      <div className="work-side">
        <p>{work.line}</p>
        {work.href ? (
          <a className="work-link" href={work.href} target="_blank" rel="noreferrer">
            Open {work.title}
          </a>
        ) : (
          <Todo>Link</Todo>
        )}
      </div>
    </article>
  )
}

function Panel({ panel, open, reduced, onClose, onOpen, backRef, panelRef }) {
  const section = typeof panel === 'number' ? SECTIONS[panel] : null
  return (
    <section
      ref={panelRef}
      className="panel"
      inert={!open}
      aria-label={section ? section.title : ABOUT.title}
      data-nodrag
    >
      <button ref={backRef} type="button" className="panel-back" onClick={onClose}>
        Back to orbit <kbd className="px">esc</kbd>
      </button>
      <div className="panel-inner">
        {section && (
          <>
            <header className="panel-head">
              <h2>{section.title}</h2>
              <span className="px">
                <i />
                {section.countLabel}
              </span>
            </header>
            {section.works.map((work) => (
              <Work key={work.title} section={section} work={work} active={open} reduced={reduced} />
            ))}
          </>
        )}
        {panel === 'about' && (
          <>
            <header className="panel-head">
              <h2>{ABOUT.title}</h2>
            </header>
            <div className="about">
              <img
                className="about-photo"
                src={`${import.meta.env.BASE_URL}about-portrait-1080.webp`}
                alt="Zixuan Li, resting his head on one hand"
                width="1080"
                height="1440"
              />
              <div className="about-copy">
                {ABOUT.copy.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          </>
        )}
        <footer className="panel-foot">
          <Index label="Other sections" current={section ? panel : null} onOpen={onOpen} tabbable={open} />
        </footer>
      </div>
    </section>
  )
}

export default function Site() {
  const { theme, toggle } = useTheme()
  const reduced = useReducedMotion()
  const [initial] = useState(() => targetOf(currentRoute()))
  // One section is lit at a time. From a row, a hairline runs to its planet;
  // from a planet, a label names it. Never both.
  const [hover, setHover] = useState({ i: null, from: null })
  const hovered = hover.i
  const setHovered = useCallback((i) => setHover({ i, from: i == null ? null : 'row' }), [])
  const setHoveredNode = useCallback((i) => setHover({ i, from: i == null ? null : 'node' }), [])
  const [panel, setPanel] = useState(initial) // null | section index | 'about'
  const [phase, setPhase] = useState(initial == null ? 'idle' : 'open') // idle | in | open | out
  const stage = useRef(null)
  const backRef = useRef(null)
  const panelRef = useRef(null)
  const leaderRef = useRef(null)
  const rowRefs = useRef([])
  const hoveredRef = useRef(hovered)
  hoveredRef.current = hovered
  const phaseRef = useRef(phase)
  const panelState = useRef(panel)
  panelState.current = panel

  const setPhaseNow = (next) => {
    phaseRef.current = next
    setPhase(next)
  }

  useLayoutEffect(() => {
    document.getElementById('boot')?.remove()
  }, [])

  useEffect(() => {
    const title = panel == null ? null : panel === 'about' ? ABOUT.title : SECTIONS[panel].title
    document.title = title ? `${title} – Zixuan Li` : 'Zixuan Li'
  }, [panel])

  // The URL is the source of truth. This brings the screen in line with it.
  const sync = useCallback(() => {
    const target = targetOf(currentRoute())
    const at = phaseRef.current
    if (target == null) {
      if (at !== 'open') return
      const last = panelState.current
      setPhaseNow('out')
      stage.current.flyBack(() => {
        setPhaseNow('idle')
        setPanel(null)
        if (typeof last === 'number') rowRefs.current[last]?.focus({ preventScroll: true })
        sync()
      })
    } else if (at === 'idle') {
      setPanel(target)
      setHovered(null)
      setPhaseNow('in')
      panelRef.current?.scrollTo(0, 0)
      stage.current.flyTo(target === 'about' ? -1 : target, () => {
        setPhaseNow('open')
        requestAnimationFrame(() => backRef.current?.focus({ preventScroll: true }))
        sync()
      })
    } else if (at === 'open' && panelState.current !== target) {
      setPanel(target)
      panelRef.current?.scrollTo(0, 0)
    }
  }, [])

  useEffect(() => onRoute(sync), [sync])

  const open = useCallback((target) => {
    if (phaseRef.current === 'idle') go(nameOf(target))
    else if (phaseRef.current === 'open') go(nameOf(target), { replace: true })
  }, [])

  const close = useCallback(() => {
    if (phaseRef.current !== 'open') return
    if (pushedHere()) window.history.back()
    else go('', { replace: true })
  }, [])

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Each frame: keep the leader line attached to the hovered section's planet.
  const onFrame = useCallback((frame) => {
    const i = hoveredRef.current
    const row = i == null ? null : rowRefs.current[i]
    const line = leaderRef.current?.firstChild
    if (!row || !line) return
    const rect = row.getBoundingClientRect()
    const p = frame.planets[i]
    const x1 = rect.right + 14
    const y1 = rect.top + rect.height * 0.52
    const len = Math.hypot(p.x - x1, p.y - y1) || 1
    const stop = Math.max(0, len - p.r - 7)
    line.setAttribute('x1', x1)
    line.setAttribute('y1', y1)
    line.setAttribute('x2', x1 + ((p.x - x1) / len) * stop)
    line.setAttribute('y2', y1 + ((p.y - y1) / len) * stop)
  }, [])

  const idle = phase === 'idle'

  return (
    <main className={`site is-${phase}`}>
      <OrbitStage
        ref={stage}
        cfg={ORBIT}
        sections={SECTIONS}
        colors={PALETTE[theme]}
        hovered={hovered}
        labelled={hover.from === 'node' ? hovered : null}
        selected={typeof panel === 'number' && !idle ? panel : null}
        onHover={setHoveredNode}
        onSelect={open}
        onPortrait={() => open('about')}
        idle={idle}
        reduced={reduced}
        onFrame={onFrame}
      />

      <svg ref={leaderRef} className={hover.from === 'row' ? 'leader is-on' : 'leader'} aria-hidden="true">
        <line />
      </svg>

      <header className="id">
        <h1 style={{ margin: 0, display: 'contents' }}>
          <LishuName animate={!reduced && initial == null} />
        </h1>
        <div className="id-text">
          <p className="id-en">Zixuan Li</p>
          <p className="id-role">Product designer, Dublin</p>
        </div>
      </header>

      <Index label="Sections" hovered={hovered} onHover={setHovered} onOpen={open} rowRefs={rowRefs} tabbable={idle} />

      <ThemeToggle theme={theme} onToggle={toggle} />

      <Panel
        panel={panel}
        open={phase === 'open'}
        reduced={reduced}
        onClose={close}
        onOpen={open}
        backRef={backRef}
        panelRef={panelRef}
      />
    </main>
  )
}
