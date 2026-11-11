// Tiny router. Real paths in production (/builds), plain hashes in a review
// build (#builds), which has no server to rewrite routes.
const HASH = import.meta.env.VITE_REVIEW === '1'

export const hrefFor = (name) => (HASH ? `#${name}` : `/${name}`)

export function currentRoute() {
  const raw = HASH ? window.location.hash.slice(1) : window.location.pathname.replace(/^\/+|\/+$/g, '')
  return raw || ''
}

// Returns true when the entry we are on was pushed by this site, so "back" is safe.
export const pushedHere = () => !!window.history.state?.site

export function go(name, { replace = false } = {}) {
  const url = name ? hrefFor(name) : HASH ? window.location.pathname + window.location.search : '/'
  if (replace) window.history.replaceState(window.history.state, '', url)
  else window.history.pushState({ site: true }, '', url)
  window.dispatchEvent(new Event('site:route'))
}

export function onRoute(fn) {
  window.addEventListener('popstate', fn)
  window.addEventListener('hashchange', fn)
  window.addEventListener('site:route', fn)
  return () => {
    window.removeEventListener('popstate', fn)
    window.removeEventListener('hashchange', fn)
    window.removeEventListener('site:route', fn)
  }
}
