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
import PartyImpact from './components/PartyImpact'
import SleepWindow from './components/SleepWindow'
import { useParties, tagParties } from './lib/party'

const axis = { stroke: '#8a8798', fontSize: 12 }
const tip = { contentStyle: { background: '#ffffff', border: '1px solid #dcd8cf', borderRadius: 8 } }

const GREEN = '#7fc79c'
const AMBER = '#e2b33c'
const CYAN = '#6aaccf'

// Feeds the mouse position to the .spotlight glow (see index.css)
function spotlight(e) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

function Card({ title, icon, children, className = '' }) {
  return (
    <section
      onMouseMove={spotlight}
      className={`spotlight group rounded-2xl border border-ink-200 bg-ink-100/60 p-5 shadow-lg shadow-ink-900/5 backdrop-blur-sm transition duration-300 hover:z-10 hover:shadow-xl hover:shadow-violet-900/10 ${className}`}
    >
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-ink-800">
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-200/80 text-lg transition duration-300 group-hover:bg-accent-soft motion-safe:group-hover:rotate-6 motion-safe:group-hover:scale-110"
            aria-hidden
          >
            {icon}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  )
}

const TONES = {
  good: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-700',
  ok: 'border-amber-400/30 bg-amber-400/10 text-amber-800',
  bad: 'border-rose-400/30 bg-rose-400/10 text-rose-700',
}

function Kpi({ icon, label, value, unit, hint, status }) {
  return (
    <div
      onMouseMove={spotlight}
      className="spotlight group rounded-2xl border border-ink-200 bg-ink-100/60 p-5 shadow-lg shadow-ink-900/5 transition duration-300 hover:shadow-xl hover:shadow-violet-900/15 motion-safe:hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-600">{label}</p>
        <span className="wiggle-on-hover inline-block text-2xl leading-none" aria-hidden>{icon}</span>
      </div>
      <p className="mt-2 font-display text-5xl leading-none text-ink-900 transition-colors duration-300 group-hover:text-accent">
        {value ?? '–'}<span className="ml-1 font-sans text-base text-ink-500">{value != null ? unit : ''}</span>
      </p>
      {status && value != null && (
        <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${TONES[status.tone]}`}>
          {status.text}
        </span>
      )}
      {hint && <p className="mt-2 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

// Status badges for the top tiles
const scoreStatus = (v) =>
  v >= 80 ? { tone: 'good', text: '😴 Great nights' } : v >= 60 ? { tone: 'ok', text: '🙂 Fair' } : { tone: 'bad', text: '😫 Poor' }
const rangeStatus = (v, ref, low, high) =>
  v < ref.min ? { tone: 'bad', text: low } : v > ref.max ? { tone: 'ok', text: high } : { tone: 'good', text: '✅ In range' }
const qualityStatus = (v) =>
  v >= 4 ? { tone: 'good', text: '😊 Feeling good' } : v >= 3 ? { tone: 'ok', text: '😐 Okay' } : { tone: 'bad', text: '😞 Low' }

// Form answers as small readable chips
const FACES = ['😫', '😕', '😐', '🙂', '😄']
const STRESS = ['😌', '🙂', '😐', '😟', '😰']
const isNo = (v) => v == null || /^(no|none|nothing|0|false)$/i.test(String(v).trim())

function Chip({ children, tone = 'plain' }) {
  const cls = {
    plain: 'border-ink-300 bg-ink-200/60 text-ink-700',
    warn: 'border-amber-400/30 bg-amber-400/10 text-amber-800',
    party: 'border-orange-400/40 bg-orange-500/10 text-orange-700',
  }[tone]
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs transition duration-200 hover:shadow-sm motion-safe:hover:-translate-y-0.5 ${cls}`}
    >
      {children}
    </span>
  )
}
const Muted = () => <span className="text-ink-400">–</span>
const rating = (v, faces = FACES) => (v == null ? <Muted /> : <Chip>{faces[Math.min(4, Math.max(0, Math.round(v) - 1))]} {v}</Chip>)
const yesNo = (v, yesIcon, noIcon) =>
  v == null ? <Muted /> : isNo(v) ? <span className="text-xs text-ink-500">{noIcon} No</span> : <Chip>{yesIcon} {/^yes$/i.test(v) ? 'Yes' : v}</Chip>

function Caption({ items }) {
  return (
    <div className="mt-3 space-y-1 text-xs text-ink-500">
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
  const [rawDays, setDays] = useState([])
  const party = useParties()
  const days = tagParties(rawDays, party.parties)
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
  const avgScore = avg(chart.map((d) => d.score))
  const avgTotal = avg(chart.map((d) => d.total))
  const avgTemp = avg(chart.map((d) => d.temp))
  const avgQuality = avg(chart.map((d) => d.quality))

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-5xl tracking-tight text-ink-900 sm:text-6xl">
            <span className="text-4xl" aria-hidden>🌙</span>
            Sleep monitoring
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip>📝 Morning form</Chip>
            <Chip>⌚ Withings tracker</Chip>
            <Chip>🌡️ Room sensor</Chip>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex rounded-lg border border-ink-200 bg-ink-50/60 p-0.5 text-sm">
            {[['dashboard', '📊 Dashboard'], ['story', '📖 Story']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`rounded-md px-3 py-1 transition ${
                  mode === k ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:text-ink-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={`flex items-center gap-1.5 text-xs ${error ? 'text-rose-700' : 'text-ink-500'}`}>
            {error ? `⚠️ ${error}` : updated ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live · updated {updated.toLocaleTimeString()}
              </>
            ) : '⏳ Loading…'}
          </p>
        </div>
      </header>

      {mode === 'story' ? <Story days={days} /> : <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          icon="⭐" label="Avg sleep score" value={fmt(avgScore, 0)}
          status={avgScore != null && scoreStatus(avgScore)} hint="Withings score out of 100"
        />
        <Kpi
          icon="🛌" label="Avg total sleep" value={fmt(avgTotal)} unit="h"
          status={avgTotal != null && rangeStatus(avgTotal, REF.totalSleep, '⚠️ Too short', '⚠️ Very long')}
          hint={`Recommended ${REF.totalSleep.label}`}
        />
        <Kpi
          icon="🌡️" label="Avg room temp" value={fmt(avgTemp)} unit="°C"
          status={avgTemp != null && rangeStatus(avgTemp, REF.temp, '🥶 Cold', '🔥 Warm')}
          hint={`Ideal bedroom ${REF.temp.label}`}
        />
        <Kpi
          icon="💭" label="Avg self-rated quality" value={fmt(avgQuality)} unit="/5"
          status={avgQuality != null && qualityStatus(avgQuality)} hint="From the morning form"
        />
      </div>

      <Card title="Sleep calendar" icon="📅">
        <CalendarHeatmap days={days} party={party} />
      </Card>

      <Card title="Bedtime & wake-up" icon="🛏️">
        <SleepWindow days={days} />
      </Card>

      <Card title="Parties & sleep" icon="🎉">
        <PartyImpact days={days} synced={party.synced} />
      </Card>

      <Card title="What affects my sleep?" icon="🔍">
        <FactorImpact days={days} />
      </Card>

      <Card title="Explore any two values" icon="🔀">
        <Explore days={days} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Sleep stages" icon="💤">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid stroke="#ece9e2" />
              <XAxis dataKey="date" {...axis} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} unit=" h" {...axis} />
              <Tooltip {...tip} formatter={(v) => hm(v)} />
              <Legend />
              <ReferenceArea
                y1={REF.totalSleep.min} y2={REF.totalSleep.max}
                fill={GREEN} fillOpacity={0.12} stroke="none" ifOverflow="hidden"
              />
              <Bar dataKey="deep" name="Deep" stackId="s" fill="#7c62c8" />
              <Bar dataKey="light" name="Light" stackId="s" fill="#5a8db3" />
              <Bar dataKey="rem" name="REM" stackId="s" fill="#7fc79c" />
            </BarChart>
          </ResponsiveContainer>
          <Caption
            items={[{
              color: GREEN,
              text: `Green band: recommended ${REF.totalSleep.label} of sleep for adults (${REF.totalSleep.source})`,
            }]}
          />
        </Card>

        <Card title="Sleep score & heart rate" icon="❤️">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid stroke="#ece9e2" />
              <XAxis dataKey="date" {...axis} />
              <YAxis yAxisId="l" domain={[0, 100]} {...axis} />
              <YAxis yAxisId="r" orientation="right" domain={[40, 100]} {...axis} />
              <Tooltip {...tip} />
              <Legend />
              <ReferenceArea
                yAxisId="r" y1={REF.hr.min} y2={REF.hr.max}
                fill={GREEN} fillOpacity={0.12} stroke="none" ifOverflow="hidden"
              />
              <Line yAxisId="l" dataKey="score" name="Score" stroke="#5fae84" strokeWidth={2} />
              <Line yAxisId="r" dataKey="hr" name="Avg HR (bpm)" stroke="#d4735a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Caption
            items={[{
              color: GREEN,
              text: `Green band: typical sleeping heart rate ${REF.hr.label} (${REF.hr.source}). Some sources allow up to about 75 bpm.`,
            }]}
          />
        </Card>

        <Card title="Room: temperature & humidity" icon="🌡️">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid stroke="#ece9e2" />
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

        <Card title="Self-reported vs measured" icon="🤔">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid stroke="#ece9e2" />
              <XAxis dataKey="date" {...axis} />
              <YAxis yAxisId="l" domain={[0, 5]} {...axis} />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} {...axis} />
              <Tooltip {...tip} />
              <Legend />
              <Line yAxisId="l" dataKey="quality" name="Quality (1–5)" stroke="#8b74d6" strokeWidth={2} />
              <Line yAxisId="l" dataKey="rested" name="Rested (1–5)" stroke="#c99be0" strokeWidth={2} />
              <Line yAxisId="r" dataKey="score" name="Withings score" stroke="#5fae84" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Daily form answers" icon="📝">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-500">
              <tr>
                {['Date', 'Quality', 'Rested', 'Caffeine', 'Screens', 'Stress', 'Nap', 'Focus', 'Unusual'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const f = d.form
                const answered = Object.values(f).some((v) => v != null)
                return (
                  <tr key={d.date} className="border-t border-ink-200 transition hover:bg-ink-200/30">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {d.date}{d.party && <span className="ml-1" title="Party night">🎉</span>}
                    </td>
                    {answered ? (
                      <>
                        <td className="px-3 py-2">{rating(f.quality)}</td>
                        <td className="px-3 py-2">{rating(f.rested)}</td>
                        <td className="px-3 py-2">{yesNo(f.caffeine, '☕', '🚫')}</td>
                        <td className="px-3 py-2">{yesNo(f.screens, '📱', '📵')}</td>
                        <td className="px-3 py-2">{rating(f.stress, STRESS)}</td>
                        <td className="px-3 py-2">{yesNo(f.nap, '💤', '🚫')}</td>
                        <td className="px-3 py-2">{rating(f.focus)}</td>
                        <td className="px-3 py-2">
                          {isNo(f.unusual) ? <Muted /> : <Chip tone="warn">⚠️ {f.unusual}</Chip>}
                        </td>
                      </>
                    ) : (
                      <td colSpan={8} className="px-3 py-2 text-xs italic text-ink-400">🫥 Form not filled in</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-500">
          Reference bands are typical or recommended ranges from health organisations, not world averages.
          Individual needs vary, so use them for comparison only.
        </p>
      </Card>
      </>}
    </main>
  )
}