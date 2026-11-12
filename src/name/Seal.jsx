import { SEAL_GLYPH } from './seal.js'

// The name seal: 玄 in seal script on a vermilion ground. It sits to the right of the written name.
export default function Seal({ className = '' }) {
  return (
    <svg className={`seal ${className}`} viewBox="0 0 1000 1000" role="img" aria-label="Seal: 玄">
      <rect className="seal-ground" width="1000" height="1000" rx="90" />
      <path className="seal-glyph" fillRule="evenodd" d={SEAL_GLYPH} />
    </svg>
  )
}
