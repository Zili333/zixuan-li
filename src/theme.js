import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'

// Colours three.js needs as values. Keep in step with tokens.css.
export const PALETTE = {
  light: { zhu: '#d8361b', line: '#3d3b38', faint: '#aaa69f', paper: '#edebe6', ink: '#151413' },
  dark: { zhu: '#d8361b', line: '#bdb9b2', faint: '#55524e', paper: '#111110', ink: '#e9e6e0' },
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  // Circular reveal from the toggle. The new palette grows out of the button.
  const toggle = useCallback((origin) => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    const apply = () => {
      document.documentElement.dataset.theme = next
      flushSync(() => setTheme(next))
      try {
        localStorage.setItem('theme', next)
      } catch {
        /* private mode: the choice lasts for this visit only */
      }
    }
    if (!document.startViewTransition || reducedMotion()) {
      apply()
      return
    }
    const rect = origin?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : 0
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    document.documentElement.classList.add('is-theming')
    const transition = document.startViewTransition(apply)
    transition.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 760, easing: 'cubic-bezier(0.65, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
        ),
      )
      .catch(() => {})
    transition.finished.finally(() => document.documentElement.classList.remove('is-theming'))
  }, [])

  return { theme, toggle }
}
