// Data colours, matched to the light "sleep clock" palette.
export const C = {
  deep: '#7c62c8', // purple
  light: '#5a8db3', // steel blue
  rem: '#7fc79c', // sage green
  awake: '#e0904a', // orange
  good: '#5fae84',
  bad: '#d4735a', // terracotta
  bed: '#e2b33c', // bedtime marker yellow
  wake: '#a8604a', // wake-up marker brown
  humidity: '#6aaccf',
  party: '#e0904a',
  violet: '#8b74d6',
  muted: '#c4c0cc',
  grid: '#ece9e2',
  axis: '#8a8798',
  label: '#3c3a50',
}

// Shared "worse → better" scale: pale lavender → deep purple.
// Colour gets stronger steadily, so deeper purple always means better.
export const STOPS = ['#f3effa', '#d9cff0', '#b3a2e2', '#8a70d0', '#5b45a6']

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

// Text colour that stays readable on top of colour(t)
export const textOn = (t) => (t > 0.55 ? '#ffffff' : '#36344b')
