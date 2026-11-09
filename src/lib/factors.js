import { REF } from './reference'

const yes = (v) => {
  if (v == null || v === '') return null
  const s = String(v).trim().toLowerCase()
  return !['no', 'none', 'nothing', '0', 'false'].includes(s)
}

// Each factor answers "did this happen that night?" → true / false / null (unknown)
export const FACTORS = [
  { key: 'caffeine', label: 'Caffeine / alcohol before bed', test: (d) => yes(d.form.caffeine) },
  { key: 'screens', label: 'Screens in last hour', test: (d) => yes(d.form.screens) },
  { key: 'nap', label: 'Napped during the day', test: (d) => yes(d.form.nap) },
  { key: 'stress', label: 'Stressed (3+ of 5)', test: (d) => (d.form.stress != null ? d.form.stress >= 3 : null) },
  { key: 'warm', label: `Room above ${REF.temp.max} °C`, test: (d) => d.env.temp != null ? d.env.temp > REF.temp.max : null },
  {
    key: 'humid',
    label: `Humidity outside ${REF.humidity.label}`,
    test: (d) => d.env.humidity != null
      ? d.env.humidity < REF.humidity.min || d.env.humidity > REF.humidity.max
      : null,
  },
]

export const OUTCOMES = [
  { key: 'score', label: 'Sleep score', unit: 'pts', get: (d) => d.sleep.score, digits: 0 },
  { key: 'total', label: 'Total sleep', unit: 'min', get: (d) => (d.sleep.total == null ? null : d.sleep.total * 60), digits: 0 },
  { key: 'deep', label: 'Deep sleep', unit: 'min', get: (d) => (d.sleep.deep == null ? null : d.sleep.deep * 60), digits: 0 },
  { key: 'quality', label: 'Self-rated quality', unit: '/5', get: (d) => d.form.quality, digits: 1 },
]

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

// Compare the outcome on nights with vs without each factor.
export function factorImpact(days, outcome) {
  const rows = []
  const skipped = []
  for (const f of FACTORS) {
    const withV = []
    const withoutV = []
    for (const d of days) {
      const hit = f.test(d)
      const val = outcome.get(d)
      if (hit == null || val == null) continue
      ;(hit ? withV : withoutV).push(val)
    }
    if (!withV.length || !withoutV.length) {
      const n = withV.length + withoutV.length
      skipped.push({
        label: f.label,
        reason: n === 0 ? 'no data yet' : `${withV.length ? 'every night' : 'never'}, ${n} logged`,
      })
      continue
    }
    const a = mean(withV)
    const b = mean(withoutV)
    rows.push({
      key: f.key, label: f.label, delta: a - b, with: a, without: b,
      nWith: withV.length, nWithout: withoutV.length,
      weak: Math.min(withV.length, withoutV.length) < 3,
    })
  }
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
  return { rows, skipped }
}
