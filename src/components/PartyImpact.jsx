import { useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { metric } from '../lib/metrics'

const MEASURES = ['score', 'total', 'deep', 'quality'].map(metric)

const GROUPS = [
  { key: 'party', label: 'Party nights', short: 'party nights', colour: '#e0904a', test: (d) => d.party },
  { key: 'after', label: 'Night after', short: 'the night after a party', colour: '#e2b33c', test: (d) => d.afterParty },
  { key: 'normal', label: 'Normal nights', short: 'normal nights', colour: '#9a96a8', test: (d) => !d.party && !d.afterParty },
]

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const nights = (n) => `${n} night${n === 1 ? '' : 's'}`

// Hours are easier to read as minutes when talking about a difference.
// Rounds first, so the words always match the number shown.
function diff(delta, m) {
  const [n, unit] =
    m.unit === 'h' ? [Math.round(delta * 60), 'min']
      : m.unit === '/5' ? [Math.round(delta * 10) / 10, 'pts']
        : [Math.round(delta), 'pts']
  return { n, text: `${Math.abs(n)} ${unit}` }
}

// Round axis ticks (e.g. 30, 50, 70, 90) instead of whatever the data edges are
function niceAxis(lo, hi) {
  const span = hi - lo || 1
  const step = [1, 2, 2.5, 5, 10].map((s) => s * 10 ** Math.floor(Math.log10(span / 4))).find((s) => span / s <= 5)
  const a = Math.floor(lo / step) * step
  const b = Math.ceil(hi / step) * step
  const ticks = []
  for (let t = a; t <= b + step / 2; t += step) ticks.push(+t.toFixed(6))
  return { domain: [a, b], ticks }
}
function value(v, m) {
  if (m.unit === 'h') {
    const mins = Math.round(v * 60)
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
  }
  return `${v.toFixed(m.digits)}${m.unit === '/5' ? ' / 5' : ''}`
}

function Tip({ active, payload, m }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink-800">{p.date} · {p.group}</p>
      <p className="text-ink-600">{m.label}: <span className="text-ink-800">{value(p.y, m)}</span></p>
    </div>
  )
}

export default function PartyImpact({ days, synced }) {
  const [key, setKey] = useState('score')
  const m = MEASURES.find((x) => x.key === key)
  const marked = days.filter((d) => d.party).length

  const groups = GROUPS.map((g, i) => {
    const pts = days
      .filter((d) => g.test(d) && m.get(d) != null)
      .map((d, j, arr) => ({
        // spread dots sideways a little so equal values don't hide each other
        x: i + (arr.length > 1 ? (j / (arr.length - 1) - 0.5) * 0.36 : 0),
        y: m.get(d), date: d.date, group: g.label,
      }))
    return { ...g, i, pts, avg: mean(pts.map((p) => p.y)) }
  })
  const [party, after, normal] = groups
  const all = groups.flatMap((g) => g.pts.map((p) => p.y))
  const lo = all.length ? Math.min(...all) : 0
  const hi = all.length ? Math.max(...all) : 1
  const pad = (hi - lo || 1) * 0.2
  const cap = m.key === 'score' ? 100 : m.key === 'quality' ? 5 : Infinity
  const yAxis = niceAxis(Math.max(0, lo - pad), Math.min(cap, hi + pad))

  const sentence = (g) => {
    if (!g.pts.length || normal.avg == null) return null
    const { n, text } = diff(g.avg - normal.avg, m)
    const word = n === 0 ? 'about the same as' : n < 0 ? 'below' : 'above'
    return (
      <li key={g.key} className="flex gap-2">
        <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: g.colour }} />
        <span>
          On <b className="text-ink-800">{g.short}</b> your {m.label.toLowerCase()} averaged{' '}
          <b className="text-ink-800">{value(g.avg, m)}</b>
          {n === 0 ? ', ' : <>, <b style={{ color: n < 0 ? '#b85a42' : '#3f8f68' }}>{text}</b>{' '}</>}
          {word} normal nights
          <span className="text-ink-500"> ({nights(g.pts.length)} vs {nights(normal.pts.length)})</span>.
        </span>
      </li>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          Do party nights, and the nights after them, sleep worse? One dot per night; the line is the group average.
        </p>
        <div className="flex rounded-lg border border-ink-200 bg-ink-50/60 p-0.5 text-xs">
          {MEASURES.map((x) => (
            <button
              key={x.key}
              onClick={() => setKey(x.key)}
              className={`rounded-md px-2.5 py-1 transition ${
                x.key === key ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:text-ink-800'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {marked === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 p-8 text-center">
          <p className="text-2xl" aria-hidden>🎉</p>
          <p className="mt-2 text-sm text-ink-700">No party nights marked yet.</p>
          <p className="mt-1 text-xs text-ink-500">
            In the <b className="text-ink-600">Sleep calendar</b> above, click a night and press “Mark as party night”.
            Mark the night you went to sleep after the party.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#ece9e2" vertical={false} />
                <XAxis
                  type="number" dataKey="x" domain={[-0.5, 2.5]} ticks={[0, 1, 2]}
                  tickFormatter={(i) => GROUPS[i]?.label} stroke="#8a8798" fontSize={12} tickLine={false}
                />
                <YAxis
                  type="number" dataKey="y" domain={yAxis.domain} ticks={yAxis.ticks} stroke="#8a8798" fontSize={12}
                  tickFormatter={(v) => (m.unit === 'h' ? `${v.toFixed(1)}h` : v.toFixed(m.digits === 0 ? 0 : 1))}
                />
                <ZAxis range={[120, 120]} />
                <Tooltip content={<Tip m={m} />} cursor={false} />
                {groups.map((g) => g.avg != null && (
                  <ReferenceLine
                    key={`avg-${g.key}`}
                    segment={[{ x: g.i - 0.3, y: g.avg }, { x: g.i + 0.3, y: g.avg }]}
                    stroke={g.colour} strokeWidth={2.5}
                  />
                ))}
                {groups.map((g) => (
                  <Scatter key={g.key} data={g.pts} fill={g.colour} fillOpacity={0.85} stroke="#ffffff" strokeWidth={1.5} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 text-sm text-ink-600 lg:w-80">
            <ul className="space-y-2">
              {sentence(party) ?? (
                <li className="text-ink-500">None of your marked party nights has a {m.label.toLowerCase()} value yet.</li>
              )}
              {sentence(after)}
            </ul>
            {(party.pts.length < 3 || normal.pts.length < 3) && (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5 text-xs text-amber-800">
                Fewer than 3 nights in a group: treat this as a hint, not a finding. Keep marking parties to firm it up.
              </p>
            )}
            <p className="text-xs text-ink-500">
              {marked} party night{marked === 1 ? '' : 's'} marked,{' '}
              {synced ? 'saved to the Google Sheet.' : 'saved in this browser only (see README to save them to the sheet).'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
