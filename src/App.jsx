import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, ReferenceArea,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { fetchDays } from './lib/sheet'
import { REF } from './lib/reference'
import FactorImpact from './components/FactorImpact'
import Explore from './components/Explore'
import CalendarHeatmap from './components/CalendarHeatmap'
import Story from './components/Story'

const axis = { stroke: '#64748b', fontSize: 12 }
const tip = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 } }

const GREEN = '#22c55e'
const AMBER = '#fbbf24'
const CYAN = '#22d3ee'

function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  )
}

function Kpi({ label, value, unit, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">
        {value ?? '–'}<span className="ml-1 text-base text-slate-500">{value != null ? unit : ''}</span>
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Caption({ items }) {
  return (
    <div className="mt-3 space-y-1 text-xs text-slate-500">
      {items.map((it) => (
        <p key={it.text} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: it.color, opacity: 0.6 }}
          />
          {it.text}
        </p>
      ))}
    </div>
  )
}

const avg = (arr) => {
  const v = arr.filter((x) => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const fmt = (n, d = 1) => (n == null ? null : n.toFixed(d))

const hm = (v) => {
  if (v == null) return '–'
  const mins = Math.round(v * 60)
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default function App() {
  const [days, setDays] = useState([])
  const [error, setError] = useState(null)
  const [updated, setUpdated] = useState(null)
  // #story in the URL opens story mode directly, handy for presenting
  const [mode, setModeState] = useState(() => (window.location.hash === '#story' ? 'story' : 'dashboard'))
  const setMode = (m) => {
    setModeState(m)
    history.replaceState(null, '', m === 'story' ? '#story' : window.location.pathname)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const load = () =>
      fetchDays()
        .then((d) => { setDays(d); setUpdated(new Date()); setError(null) })
        .catch((e) => setError(e.message))
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  const chart = days.map((d) => ({
    date: d.date, ...d.sleep, ...d.env,
    quality: d.form.quality, rested: d.form.rested,
  }))

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sleep monitoring</h1>
          <p className="text-sm text-slate-400">Form · Withings · Room environment</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-0.5 text-sm">
            {[['dashboard', 'Dashboard'], ['story', 'Story']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`rounded-md px-3 py-1 transition ${
                  mode === k ? 'bg-indigo-500/80 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {error ? `Error: ${error}` : updated ? `Updated ${updated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
      </header>

      {mode === 'story' ? <Story days={days} /> : <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Avg sleep score" value={fmt(avg(chart.map((d) => d.score)), 0)} />
        <Kpi
          label="Avg total sleep"
          value={fmt(avg(chart.map((d) => d.total)))}
          unit="h"
          hint={`Recommended ${REF.totalSleep.label}`}
        />
        <Kpi
          label="Avg room temp"
          value={fmt(avg(chart.map((d) => d.temp)))}
          unit="°C"
          hint={`Typical bedroom ${REF.temp.label}`}
        />
        <Kpi label="Avg self-rated quality" value={fmt(avg(chart.map((d) => d.quality)))} unit="/5" />
      </div>

      <Card title="Sleep calendar">
        <CalendarHeatmap days={days} />
      </Card>

      <Card title="What affects my sleep?">
        <FactorImpact days={days} />
      </Card>

      <Card title="Explore any two values">
        <Explore days={days} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Sleep stages">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="date" {...axis} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} unit=" h" {...axis} />
              <Tooltip {...tip} formatter={(v) => hm(v)} />
              <Legend />
              <ReferenceArea
                y1={REF.totalSleep.min} y2={REF.totalSleep.max}
                fill={GREEN} fillOpacity={0.12} stroke="none" ifOverflow="hidden"
              />
              <Bar dataKey="deep" name="Deep" stackId="s" fill="#6366f1" />
              <Bar dataKey="light" name="Light" stackId="s" fill="#38bdf8" />
              <Bar dataKey="rem" name="REM" stackId="s" fill="#f472b6" />
            </BarChart>
          </ResponsiveContainer>
          <Caption
            items={[{
              color: GREEN,
              text: `Green band: recommended ${REF.totalSleep.label} of sleep for adults (${REF.totalSleep.source})`,
            }]}
          />
        </Card>

        <Card title="Sleep score & heart rate">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="date" {...axis} />
              <YAxis yAxisId="l" domain={[0, 100]} {...axis} />
              <YAxis yAxisId="r" orientation="right" domain={[40, 100]} {...axis} />
              <Tooltip {...tip} />
              <Legend />
              <ReferenceArea
                yAxisId="r" y1={REF.hr.min} y2={REF.hr.max}
                fill={GREEN} fillOpacity={0.12} stroke="none" ifOverflow="hidden"
              />
              <Line yAxisId="l" dataKey="score" name="Score" stroke="#34d399" strokeWidth={2} />
              <Line yAxisId="r" dataKey="hr" name="Avg HR (bpm)" stroke="#fb7185" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Caption
            items={[{
              color: GREEN,
              text: `Green band: typical sleeping heart rate ${REF.hr.label} (${REF.hr.source}). Some sources allow up to about 75 bpm.`,
            }]}
          />
        </Card>

        <Card title="Room: temperature & humidity">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="date" {...axis} />
              <YAxis yAxisId="l" domain={[14, 24]} unit="°" {...axis} />
              <YAxis yAxisId="r" orientation="right" domain={[20, 70]} unit="%" {...axis} />
              <Tooltip {...tip} />
              <Legend />
              <ReferenceArea
                yAxisId="l" y1={REF.temp.min} y2={REF.temp.max}
                fill={AMBER} fillOpacity={0.12} stroke="none" ifOverflow="hidden"
              />
              <ReferenceArea
                yAxisId="r" y1={REF.humidity.min} y2={REF.humidity.max}
                fill={CYAN} fillOpacity={0.1} stroke="none" ifOverflow="hidden"
              />
              <Line yAxisId="l" dataKey="temp" name="Temp (°C)" stroke={AMBER} strokeWidth={2} />
              <Line yAxisId="r" dataKey="humidity" name="Humidity (%)" stroke={CYAN} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Caption
            items={[
              {
                color: AMBER,
                text: `Amber band: bedroom temperature ${REF.temp.label} (${REF.temp.source})`,
              },
              {
                color: CYAN,
                text: `Blue band: indoor humidity ${REF.humidity.label} (${REF.humidity.source})`,
              },
            ]}
          />
        </Card>

        <Card title="Self-reported vs measured">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="date" {...axis} />
              <YAxis yAxisId="l" domain={[0, 5]} {...axis} />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} {...axis} />
              <Tooltip {...tip} />
              <Legend />
              <Line yAxisId="l" dataKey="quality" name="Quality (1–5)" stroke="#a78bfa" strokeWidth={2} />
              <Line yAxisId="l" dataKey="rested" name="Rested (1–5)" stroke="#f0abfc" strokeWidth={2} />
              <Line yAxisId="r" dataKey="score" name="Withings score" stroke="#34d399" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Daily form answers">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                {['Date', 'Quality', 'Rested', 'Caffeine', 'Screens', 'Stress', 'Nap', 'Focus', 'Unusual'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-medium">{d.date}</td>
                  {Object.values(d.form).map((v, i) => (
                    <td key={i} className="px-3 py-2 text-slate-300">
                      {v ?? <span className="text-slate-600">–</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Reference bands are typical or recommended ranges from health organisations, not world averages.
          Individual needs vary, so use them for comparison only.
        </p>
      </Card>
      </>}
    </main>
  )
}