import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, ReferenceLine, Tooltip, LabelList,
} from 'recharts'
import { OUTCOMES, factorImpact } from '../lib/factors'

const BETTER = '#5fae84'
const WORSE = '#d4735a'

const signed = (n, d) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(d)}`

function Tip({ active, payload, outcome }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const v = (n) => `${n.toFixed(outcome.digits)} ${outcome.unit}`
  return (
    <div className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink-800">{r.label}</p>
      <p className="text-ink-600">With: <span className="text-ink-800">{v(r.with)}</span> · {r.nWith} night{r.nWith > 1 ? 's' : ''}</p>
      <p className="text-ink-600">Without: <span className="text-ink-800">{v(r.without)}</span> · {r.nWithout} night{r.nWithout > 1 ? 's' : ''}</p>
      {r.weak && <p className="mt-1 text-amber-700">Few nights — treat as a hint, not a finding</p>}
    </div>
  )
}

export default function FactorImpact({ days }) {
  const [key, setKey] = useState('score')
  const outcome = OUTCOMES.find((o) => o.key === key)
  const { rows, skipped } = factorImpact(days, outcome)

  // Symmetric axis with round ticks, leaving room for the value labels
  const raw = Math.max(1, ...rows.map((r) => Math.abs(r.delta))) * 1.6
  const step = [1, 2, 5, 10, 20, 50, 100].find((s) => raw / s <= 2) ?? 100
  const max = Math.ceil(raw / step) * step
  const ticks = [-max, -max / 2, 0, max / 2, max]
  const fmtDelta = (n) => `${signed(n, outcome.digits)} ${outcome.unit}`

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          How {outcome.label.toLowerCase()} differs on nights <span className="text-ink-800">with</span> each factor
          vs nights without it.
        </p>
        <div className="flex rounded-lg border border-ink-200 bg-ink-50/60 p-0.5 text-xs">
          {OUTCOMES.map((o) => (
            <button
              key={o.key}
              onClick={() => setKey(o.key)}
              className={`rounded-md px-2.5 py-1 transition ${
                o.key === key ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:text-ink-800'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 52 + 30)}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis
              type="number" domain={[-max, max]} ticks={ticks} stroke="#8a8798" fontSize={12}
              tickFormatter={(n) => signed(n, 0)}
            />
            <YAxis type="category" dataKey="label" width={190} stroke="#8a8798" fontSize={12} tickLine={false} />
            <ReferenceLine x={0} stroke="#c4c0cc" />
            <Tooltip content={<Tip outcome={outcome} />} cursor={{ fill: '#ece9e2', opacity: 0.5 }} />
            <Bar dataKey="delta" radius={4} barSize={22} minPointSize={2}>
              {rows.map((r) => (
                <Cell
                  key={r.key}
                  fill={r.delta >= 0 ? BETTER : WORSE}
                  fillOpacity={r.weak ? 0.35 : 0.85}
                  stroke={r.delta >= 0 ? BETTER : WORSE}
                  strokeDasharray={r.weak ? '3 3' : undefined}
                />
              ))}
              <LabelList
                dataKey="delta"
                content={({ x, y, width, height, value, index }) => {
                  const r = rows[index]
                  if (!r) return null
                  const right = value >= 0
                  return (
                    <text
                      x={right ? x + width + 8 : x + width - 8}
                      y={y + height / 2}
                      dy={4}
                      textAnchor={right ? 'start' : 'end'}
                      fontSize={12}
                      fill="#3c3a50"
                    >
                      {fmtDelta(value)}
                      <tspan fill="#8a8798"> · {r.nWith} vs {r.nWithout}</tspan>
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="rounded-lg border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
          No factor has both “with” and “without” nights yet. Keep logging.
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs text-ink-500">
        <p className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BETTER, opacity: 0.7 }} />
          Better on nights with the factor
          <span className="ml-3 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: WORSE, opacity: 0.7 }} />
          Worse
          <span className="ml-3 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-ink-600" />
          Faded: fewer than 3 nights in a group
        </p>
        <p>“2 vs 4” = nights with vs without. Differences show association, not cause.</p>
        {skipped.length > 0 && (
          <p>
            <span className="text-ink-600">Not comparable yet: </span>
            {skipped.map((s) => `${s.label} (${s.reason})`).join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
}
