import { useState } from 'react'
import { metric } from '../lib/metrics'
import { STOPS, colour, textOn } from '../lib/colour'

// Fixed colour ranges per measure, so a colour means the same thing every month
const MEASURES = [
  { key: 'score', min: 40, max: 100 },
  { key: 'total', min: 5, max: 9 },
  { key: 'deep', min: 0.5, max: 3 },
  { key: 'quality', min: 1, max: 5 },
].map((m) => ({ ...metric(m.key), ...m }))


const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n) => String(n).padStart(2, '0')
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const weekdayIdx = (iso) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7 // Monday = 0

function months(days) {
  const keys = [...new Set(days.filter((d) => d.iso).map((d) => d.iso.slice(0, 7)))].sort()
  return keys.map((k) => {
    const [y, m] = k.split('-').map(Number)
    return { y, m: m - 1 }
  })
}

function Month({ y, m, byIso, measure, hovered, onHover, onSelect, todayIso }) {
  const first = (new Date(y, m, 1).getDay() + 6) % 7
  const count = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  const title = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-700">{title}</p>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-center text-[10px] uppercase tracking-wide text-ink-500">{w[0]}</span>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <span key={`e${i}`} />
          const iso = isoOf(y, m, d)
          const day = byIso[iso]
          const v = day ? measure.get(day) : null
          const t = v == null ? null : (v - measure.min) / (measure.max - measure.min)
          const future = iso > todayIso
          const active = hovered === iso
          return (
            <button
              key={iso}
              type="button"
              onMouseEnter={() => day && onHover(iso)}
              onFocus={() => day && onHover(iso)}
              onClick={() => day && onSelect(iso)}
              className={`relative flex aspect-square w-10 items-center justify-center rounded-md text-xs transition duration-200 sm:w-11 ${
                active ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white' : ''
              } ${day ? 'cursor-pointer hover:z-10 hover:shadow-lg hover:shadow-violet-900/25 motion-safe:hover:scale-115' : 'cursor-default'}`}
              style={
                t != null
                  ? { background: colour(t), color: textOn(t) }
                  : {
                      border: `1px ${day ? 'dashed' : 'solid'} ${day ? '#c4c0cc' : future ? '#f1eee8' : '#ece9e2'}`,
                      color: future ? '#cfcbd6' : '#8a8798',
                    }
              }
              aria-label={`${iso}${v != null ? `: ${v.toFixed(measure.digits)}` : ''}${day?.party ? ', party night' : ''}`}
            >
              {d}
              {day?.party && (
                <span className="absolute -bottom-1.5 -right-1.5 text-sm leading-none drop-shadow" aria-hidden>🎉</span>
              )}
              {day?.form.unusual && !/^no(ne)?$/i.test(day.form.unusual) && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const fmtH = (v) => {
  if (v == null) return '–'
  const mins = Math.round(v * 60)
  return `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`
}

function Detail({ day, pinned, party }) {
  if (!day) return null
  const when = new Date(`${day.iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const rows = [
    ['Sleep score', day.sleep.score ?? '–'],
    ['Total sleep', fmtH(day.sleep.total)],
    ['Deep sleep', fmtH(day.sleep.deep)],
    ['Self-rated quality', day.form.quality != null ? `${day.form.quality} / 5` : '–'],
    ['Room', day.env.temp != null ? `${day.env.temp} °C · ${day.env.humidity ?? '–'} %` : '–'],
  ]
  const note = day.form.unusual && !/^no(ne)?$/i.test(day.form.unusual) ? day.form.unusual : null
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">Night of</p>
      <p className="mb-3 font-medium text-ink-800">{when}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-500">{k}</dt>
            <dd className="text-right text-ink-800">{v}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-3 border-t border-ink-200 pt-2 text-xs text-amber-800">“{note}”</p>}
      <div className="mt-3 border-t border-ink-200 pt-3">
        <button
          type="button"
          onClick={() => party.toggle(day.iso)}
          aria-pressed={day.party}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
            day.party
              ? 'border-orange-400/60 bg-orange-500/15 text-orange-700 hover:bg-orange-500/25'
              : 'border-ink-300 text-ink-700 hover:border-orange-400/60 hover:text-orange-700'
          }`}
        >
          <span aria-hidden>🎉</span>
          {day.party ? 'Party night (click to unmark)' : 'Mark as party night'}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-ink-500">
          {party.saving ? 'Saving to the Google Sheet…'
            : !pinned ? 'Click a night in the calendar to select it'
              : party.synced ? 'Saved to the Google Sheet' : 'Saved in this browser only'}
        </p>
        {party.error && <p className="mt-1 text-center text-[11px] text-rose-700">{party.error}</p>}
      </div>
    </div>
  )
}

function Weekdays({ days, measure }) {
  const groups = WEEKDAYS.map(() => [])
  for (const d of days) {
    const v = measure.get(d)
    if (d.iso && v != null) groups[weekdayIdx(d.iso)].push(v)
  }
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">Average by weekday</p>
      <div className="flex h-24 items-end gap-1.5">
        {groups.map((g, i) => {
          const avg = g.length ? g.reduce((a, b) => a + b, 0) / g.length : null
          const t = avg == null ? 0 : (avg - measure.min) / (measure.max - measure.min)
          return (
            <div key={WEEKDAYS[i]} className="flex flex-1 flex-col items-center gap-1" title={avg == null ? 'No nights yet' : `${g.length} night${g.length > 1 ? 's' : ''}`}>
              <span className="text-[10px] text-ink-600">{avg == null ? '' : avg.toFixed(measure.digits)}</span>
              <div
                className="w-full rounded-t"
                style={{
                  height: avg == null ? 2 : `${Math.max(6, t * 56)}px`,
                  background: avg == null ? '#ece9e2' : colour(t),
                }}
              />
              <span className="text-[10px] text-ink-500">{WEEKDAYS[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarHeatmap({ days, party }) {
  const [key, setKey] = useState('score')
  const measure = MEASURES.find((m) => m.key === key)
  const byIso = Object.fromEntries(days.filter((d) => d.iso).map((d) => [d.iso, d]))
  const latest = [...days].reverse().find((d) => d.iso && d.sleep.score != null)
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  // Hover previews a night; a click pins it so the party button can be reached
  const shown = byIso[hovered] ?? byIso[selected] ?? latest
  const [todayIso] = useState(() => {
    const now = new Date()
    return isoOf(now.getFullYear(), now.getMonth(), now.getDate())
  })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">One square per night. Deeper purple means better. Hover a night for details.</p>
        <div className="flex rounded-lg border border-ink-200 bg-ink-50/60 p-0.5 text-xs">
          {MEASURES.map((m) => (
            <button
              key={m.key}
              onClick={() => setKey(m.key)}
              className={`rounded-md px-2.5 py-1 transition ${
                m.key === key ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:text-ink-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-wrap gap-8" onMouseLeave={() => setHovered(null)}>
          {months(days).map(({ y, m }) => (
            <Month
              key={`${y}-${m}`} y={y} m={m} byIso={byIso} measure={measure}
              hovered={shown?.iso} onHover={setHovered} todayIso={todayIso}
              onSelect={setSelected}
            />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5 md:max-w-sm">
          <Detail day={shown} pinned={selected === shown?.iso} party={party} />
          <Weekdays days={days} measure={measure} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
        <span className="flex items-center gap-2">
          {measure.min}{measure.unit && ` ${measure.unit}`}
          <span
            className="inline-block h-2.5 w-28 rounded-sm"
            style={{ background: `linear-gradient(to right, ${STOPS.join(',')})` }}
          />
          {measure.max}{measure.unit && ` ${measure.unit}`}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-ink-500" /> Logged, no value
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" /> Unusual night noted
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden>🎉</span> Party night ({party.synced ? 'saved to the Google Sheet' : 'saved in this browser only'})
        </span>
      </div>
    </div>
  )
}
