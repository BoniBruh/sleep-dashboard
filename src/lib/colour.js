// Shared "worse → better" scale: dark indigo → light periwinkle.
// Lightness rises steadily, so brighter always means better.
export const STOPS = ['#1e1b4b', '#3730a3', '#6366f1', '#a5b4fc', '#e0e7ff']

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

// t from 0 (worst) to 1 (best)
export function colour(t) {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(x))
  const a = hex(STOPS[i])
  const b = hex(STOPS[i + 1])
  const f = x - i
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`
}
