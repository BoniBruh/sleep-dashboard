// Every numeric value a night has, grouped for the dropdowns.
export const METRICS = [
  { group: 'Tracker', key: 'score', label: 'Sleep score', unit: '', digits: 0, get: (d) => d.sleep.score },
  { group: 'Tracker', key: 'total', label: 'Total sleep', unit: 'h', digits: 1, get: (d) => d.sleep.total },
  { group: 'Tracker', key: 'deep', label: 'Deep sleep', unit: 'h', digits: 1, get: (d) => d.sleep.deep },
  { group: 'Tracker', key: 'light', label: 'Light sleep', unit: 'h', digits: 1, get: (d) => d.sleep.light },
  { group: 'Tracker', key: 'rem', label: 'REM sleep', unit: 'h', digits: 1, get: (d) => d.sleep.rem },
  { group: 'Tracker', key: 'inBed', label: 'Time in bed', unit: 'h', digits: 1, get: (d) => d.sleep.inBed },
  { group: 'Tracker', key: 'efficiency', label: 'Sleep efficiency', unit: '%', digits: 0, get: (d) => d.sleep.efficiency },
  { group: 'Tracker', key: 'wakeups', label: 'Wake-ups', unit: '', digits: 0, get: (d) => d.sleep.wakeups },
  { group: 'Tracker', key: 'hr', label: 'Avg heart rate', unit: 'bpm', digits: 0, get: (d) => d.sleep.hr },
  { group: 'Form', key: 'quality', label: 'Self-rated quality', unit: '/5', digits: 1, get: (d) => d.form.quality },
  { group: 'Form', key: 'rested', label: 'Felt rested', unit: '/5', digits: 1, get: (d) => d.form.rested },
  { group: 'Form', key: 'stress', label: 'Stress before bed', unit: '/5', digits: 1, get: (d) => d.form.stress },
  { group: 'Form', key: 'focus', label: 'Concentration', unit: '/5', digits: 1, get: (d) => d.form.focus },
  { group: 'Room', key: 'temp', label: 'Room temperature', unit: '°C', digits: 1, get: (d) => d.env.temp },
  { group: 'Room', key: 'humidity', label: 'Humidity', unit: '%', digits: 0, get: (d) => d.env.humidity },
  { group: 'Room', key: 'envLight', label: 'Room light', unit: '', digits: 1, get: (d) => d.env.envLight },
]

export const metric = (key) => METRICS.find((m) => m.key === key)

// Least-squares line and Pearson correlation for paired points.
export function fit(points) {
  const n = points.length
  if (n < 2) return null
  const mx = points.reduce((a, p) => a + p.x, 0) / n
  const my = points.reduce((a, p) => a + p.y, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my)
    sxx += (p.x - mx) ** 2
    syy += (p.y - my) ** 2
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  return {
    slope,
    intercept: my - slope * mx,
    r: syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy),
  }
}

export function strength(r) {
  const a = Math.abs(r)
  if (a < 0.1) return 'no'
  if (a < 0.3) return 'a weak'
  if (a < 0.6) return 'a moderate'
  return 'a strong'
}
