import { useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ReferenceLine, LabelList,
} from 'recharts'
import { METRICS, metric, fit, strength } from '../lib/metrics'

const DOT = '#8b74d6'
const TREND = '#e2b33c'
const groups = [...new Set(METRICS.map((m) => m.group))]

// Padded, rounded axis range so dots never sit on the edge
function range(values) {
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (lo === hi) { lo -= 1; hi += 1 }
  const pad = (hi - lo) * 0.15
  const span = hi - lo + 2 * pad
  const step = [1, 2, 2.5, 5, 10].map((s) => s * 10 ** Math.floor(Math.log10(span / 5))).find((s) => span / s <= 6)
  const a = Math.floor((lo - pad) / step) * step
  const b = Math.ceil((hi + pad) / step) * step
  const ticks = []
  for (let t = a; t <= b + step / 2; t += step) ticks.push(+t.toFixed(6))
  return { domain: [a, b], ticks }
}

const withUnit = (m) => (m.unit ? `${m.label} (${m.unit})` : m.label)

function Picker({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-ink-300 bg-ink-50 px-2 py-1 text-sm text-ink-800 focus:border-violet-400 focus:outline-none"
      >
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {METRICS.filter((m) => m.group === g).map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

function Tip({ active, payload, mx, my }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink-800">{p.date}</p>
      <p className="text-ink-600">{mx.label}: <span className="text-ink-800">{p.x.toFixed(mx.digits)} {mx.unit}</span></p>
      <p className="text-ink-600">{my.label}: <span className="text-ink-800">{p.y.toFixed(my.digits)} {my.unit}</span></p>
    </div>
  )
}

export default function Explore({ days }) {
  const [xKey, setX] = useState('temp')
  const [yKey, setY] = useState('score')
  const mx = metric(xKey)
  const my = metric(yKey)

  const points = days
    .map((d) => ({ date: d.date, x: mx.get(d), y: my.get(d) }))
    .filter((p) => p.x != null && p.y != null)
  const line = points.length >= 3 ? fit(points) : null
  const xs = range(points.length ? points.map((p) => p.x) : [0, 1])
  const ys = range(points.length ? points.map((p) => p.y) : [0, 1])
  const xr = xs.domain

  let summary
  if (xKey === yKey) summary = 'Pick two different values to compare.'
  else if (points.length < 3) summary = `Only ${points.length} night${points.length === 1 ? '' : 's'} with both values — need at least 3.`
  else if (!line) summary = `${mx.label} was the same every night, so there is nothing to compare yet.`
  else {
    const dir = line.r > 0 ? 'higher' : 'lower'
    summary = (
      <>
        Across <b className="text-ink-800">{points.length} nights</b>,{' '}
        {strength(line.r) === 'no'
          ? <>{mx.label.toLowerCase()} shows <b className="text-ink-800">no clear link</b> with {my.label.toLowerCase()}</>
          : <>higher {mx.label.toLowerCase()} went with <b className="text-ink-800">{dir} {my.label.toLowerCase()}</b> — {strength(line.r)} link</>}
        {' '}(r = {line.r.toFixed(2)}).
      </>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Picker label="Compare" value={xKey} onChange={setX} />
        <button
          onClick={() => { setX(yKey); setY(xKey) }}
          title="Swap axes"
          className="rounded-md border border-ink-300 px-2 py-1 text-sm text-ink-600 hover:border-ink-500 hover:text-ink-800"
        >
          ⇄
        </button>
        <Picker label="with" value={yKey} onChange={setY} />
      </div>

      <p className="mb-3 text-sm text-ink-600">{summary}</p>

      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid stroke="#ece9e2" />
          <XAxis
            type="number" dataKey="x" domain={xr} ticks={xs.ticks} allowDataOverflow stroke="#8a8798" fontSize={12}
            label={{ value: withUnit(mx), position: 'insideBottom', offset: -12, fill: '#9a96a8', fontSize: 12 }}
          />
          <YAxis
            type="number" dataKey="y" domain={ys.domain} ticks={ys.ticks} allowDataOverflow stroke="#8a8798" fontSize={12}
            label={{ value: withUnit(my), angle: -90, position: 'insideLeft', offset: 14, fill: '#9a96a8', fontSize: 12, style: { textAnchor: 'middle' } }}
          />
          <ZAxis range={[110, 110]} />
          <Tooltip content={<Tip mx={mx} my={my} />} cursor={{ strokeDasharray: '3 3', stroke: '#c4c0cc' }} />
          {line && xKey !== yKey && (
            <ReferenceLine
              segment={[
                { x: xr[0], y: line.intercept + line.slope * xr[0] },
                { x: xr[1], y: line.intercept + line.slope * xr[1] },
              ]}
              stroke={TREND} strokeDasharray="6 4" strokeWidth={1.5} ifOverflow="hidden"
            />
          )}
          <Scatter data={points} fill={DOT} fillOpacity={0.85} stroke="#ffffff" strokeWidth={1}>
            {points.length <= 20 && (
              <LabelList dataKey="date" position="top" offset={8} fill="#8a8798" fontSize={11} />
            )}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-2 space-y-1 text-xs text-ink-500">
        <p className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DOT }} />
          One dot per night
          <span className="ml-3 inline-block w-4 border-t-2 border-dashed" style={{ borderColor: TREND }} />
          Trend line (least squares)
        </p>
        <p>
          r runs from −1 to +1: near 0 means no linear link, closer to ±1 means the dots follow the line.
          With few nights, one unusual night can swing it a lot.
        </p>
      </div>
    </div>
  )
}
