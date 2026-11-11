import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { fit, strength } from '../lib/metrics'
import { STOPS, colour } from '../lib/colour'

const SCORE_MIN = 40
const SCORE_MAX = 100

// minutes from midnight (can be negative or past 24h) → "23:41"
const clock = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const dur = (min) => {
  const m = Math.round(Math.abs(min))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
const sd = (a) => {
  const mu = mean(a)
  return Math.sqrt(mean(a.map((x) => (x - mu) ** 2)))
}
const weekday = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-ink-300 bg-ink-50 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink-800">{p.label}{p.party ? ' 🎉' : ''}</p>
      <p className="text-ink-600">In bed <span className="text-ink-800">{clock(p.range[0])} → {clock(p.range[1])}</span> ({dur(p.range[1] - p.range[0])})</p>
      {p.total != null && <p className="text-ink-600">Asleep <span className="text-ink-800">{dur(p.total * 60)}</span></p>}
      {p.awake != null && <p className="text-ink-600">Awake in bed <span className="text-ink-800">{dur(p.awake)}</span></p>}
      {p.score != null && <p className="text-ink-600">Sleep score <span className="text-ink-800">{p.score}</span></p>}
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-3xl leading-tight text-ink-900">{value}</p>
      {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
    </div>
  )
}

export default function SleepWindow({ days }) {
  const nights = days.filter((d) => d.night)
  if (!nights.length) {
    return <p className="text-sm text-ink-500">No bed and wake times found in the Withings data yet.</p>
  }

  const rows = nights.map((d) => ({
    label: `${weekday(d.iso)} ${d.date}`,
    range: [d.night.bed, d.night.wake],
    bed: d.night.bed,
    score: d.sleep.score,
    total: d.sleep.total,
    awake: d.sleep.inBed != null && d.sleep.total != null ? (d.sleep.inBed - d.sleep.total) * 60 : null,
    party: d.party,
  }))

  const beds = rows.map((r) => r.bed)
  const wakes = rows.map((r) => r.range[1])
  const avgBed = mean(beds)
  const avgWake = mean(wakes)
  const awakes = rows.filter((r) => r.awake != null).map((r) => r.awake)
  const latest = rows.reduce((a, b) => (b.bed > a.bed ? b : a))
  const earliest = rows.reduce((a, b) => (b.bed < a.bed ? b : a))

  const scored = rows.filter((r) => r.score != null)
  const line = scored.length >= 3 ? fit(scored.map((r) => ({ x: r.bed, y: r.score }))) : null

  const lo = Math.floor((Math.min(...beds) - 30) / 120) * 120
  const hi = Math.ceil((Math.max(...wakes) + 30) / 120) * 120
  const ticks = []
  for (let t = lo; t <= hi; t += 120) ticks.push(t)

  return (
    <div>
      <p className="mb-4 text-sm text-ink-600">
        When you went to bed and got up each night, from the Withings sleep sessions. Deeper purple bars mean a better sleep score.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Avg bedtime" value={clock(avgBed)} hint={`earliest ${clock(earliest.bed)} · latest ${clock(latest.bed)}`} />
        <Stat label="Avg wake-up" value={clock(avgWake)} />
        <Stat label="Bedtime varies by" value={`± ${dur(sd(beds))}`} hint="typical distance from your average" />
        <Stat
          label="Avg awake in bed"
          value={awakes.length ? dur(mean(awakes)) : '–'}
          hint="falling asleep + waking up at night"
        />
      </div>

      <ResponsiveContainer width="100%" height={rows.length * 34 + 50}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 20 }} barCategoryGap={6}>
          <CartesianGrid stroke="#ece9e2" horizontal={false} />
          <XAxis
            type="number" domain={[lo, hi]} ticks={ticks} tickFormatter={clock}
            stroke="#8a8798" fontSize={12} orientation="top"
          />
          <YAxis type="category" dataKey="label" width={86} stroke="#8a8798" fontSize={12} tickLine={false} />
          <ReferenceLine x={0} stroke="#c4c0cc" />
          <ReferenceLine x={avgBed} stroke="#e2b33c" strokeDasharray="4 4" />
          <ReferenceLine x={avgWake} stroke="#5a8db3" strokeDasharray="4 4" />
          <Tooltip content={<Tip />} cursor={{ fill: '#ece9e2', opacity: 0.4 }} />
          <Bar dataKey="range" radius={6}>
            {rows.map((r) => (
              <Cell
                key={r.label}
                fill={r.score == null ? '#dcd8cf' : colour((r.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN))}
                stroke={r.party ? '#e0904a' : 'none'}
                strokeWidth={r.party ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
        <span className="flex items-center gap-2">
          score {SCORE_MIN}
          <span className="inline-block h-2.5 w-24 rounded-sm" style={{ background: `linear-gradient(to right, ${STOPS.join(',')})` }} />
          {SCORE_MAX}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-amber-400" /> avg bedtime
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-sky-400" /> avg wake-up
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm border-2 border-orange-400" /> party night
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-ink-600">
        <p>
          Your latest bedtime was <b className="text-ink-800">{clock(latest.bed)}</b> on{' '}
          <b className="text-ink-800">{latest.label}</b>
          {latest.score != null && <> with a sleep score of <b className="text-ink-800">{latest.score}</b></>}.
          {line && (
            <> Across {scored.length} nights, {strength(line.r) === 'no'
              ? <>bedtime shows <b className="text-ink-800">no clear link</b> with sleep score</>
              : <>a later bedtime went with a <b className="text-ink-800">{line.r < 0 ? 'lower' : 'higher'} sleep score</b>, {strength(line.r)} link</>}{' '}
              (r = {line.r.toFixed(2)}
              {strength(line.r) !== 'no' && <>, about {Math.abs(Math.round(line.slope * 60))} points per hour later</>}).
              {scored.length < 15 && <span className="text-ink-500"> With this few nights, one very late night can drive the result.</span>}</>
          )}
        </p>
        <p className="rounded-lg border border-ink-200 bg-ink-50/50 p-2.5 text-xs text-ink-500">
          <b className="text-ink-600">Time to fall asleep</b> is not in the data yet. “Awake in bed” is time in bed minus sleep,
          so it also includes waking up during the night and lying in after waking.
        </p>
      </div>
    </div>
  )
}
