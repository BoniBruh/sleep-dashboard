import { useEffect, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceArea, ReferenceLine, Tooltip, Legend, LabelList,
} from 'recharts'
import { REF } from '../lib/reference'
import { OUTCOMES, factorImpact } from '../lib/factors'
import { fit } from '../lib/metrics'

const axis = { stroke: '#8a8798', fontSize: 12 }
const tip = { contentStyle: { background: '#ffffff', border: '1px solid #dcd8cf', borderRadius: 8 } }
const C = { deep: '#7c62c8', light: '#5a8db3', rem: '#7fc79c', good: '#5fae84', bad: '#d4735a', amber: '#e2b33c', muted: '#c4c0cc', violet: '#8b74d6' }

const avg = (a) => {
  const v = a.filter((x) => x != null)
  return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null
}
const hm = (v) => {
  if (v == null) return '–'
  const m = Math.round(v * 60)
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
const longDate = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', opts) : ''
const B = ({ children }) => <b className="font-semibold text-ink-900">{children}</b>

// Work out every number the story needs from the raw days
function analyse(days) {
  const nights = days.filter((d) => d.sleep.score != null)
  if (!nights.length) return null
  const a = {
    nights,
    first: nights[0],
    last: nights[nights.length - 1],
    score: avg(nights.map((d) => d.sleep.score)),
    total: avg(nights.map((d) => d.sleep.total)),
    deep: avg(nights.map((d) => d.sleep.deep)),
    light: avg(nights.map((d) => d.sleep.light)),
    rem: avg(nights.map((d) => d.sleep.rem)),
  }
  a.inBand = nights.filter((d) => d.sleep.total >= REF.totalSleep.min && d.sleep.total <= REF.totalSleep.max).length
  a.best = nights.reduce((x, y) => (y.sleep.score > x.sleep.score ? y : x))
  a.worst = nights.reduce((x, y) => (y.sleep.score < x.sleep.score ? y : x))
  const others = nights.filter((d) => d !== a.worst)
  a.othersScore = avg(others.map((d) => d.sleep.score))
  a.othersTotal = avg(others.map((d) => d.sleep.total))
  a.othersDeep = avg(others.map((d) => d.sleep.deep))
  a.othersRem = avg(others.map((d) => d.sleep.rem))

  const room = days.filter((d) => d.env.temp != null)
  a.roomNights = room.length
  a.tempAvg = avg(room.map((d) => d.env.temp))
  a.tempIn = room.filter((d) => d.env.temp >= REF.temp.min && d.env.temp <= REF.temp.max).length
  a.humIn = room.filter((d) => d.env.humidity >= REF.humidity.min && d.env.humidity <= REF.humidity.max).length

  const felt = nights.filter((d) => d.form.quality != null)
  a.felt = felt
  a.feltFit = felt.length >= 3 ? fit(felt.map((d) => ({ x: d.sleep.score, y: d.form.quality }))) : null

  const { rows, skipped } = factorImpact(days, OUTCOMES[0])
  a.factors = rows
  a.factorSkipped = skipped
  return a
}

/* ---------- visuals, one per step ---------- */

function Big({ value, label }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-100/60 p-5 text-center">
      <p className="font-display text-5xl text-ink-900">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-ink-500">{label}</p>
    </div>
  )
}

function IntroVisual({ a }) {
  return (
    <div className="grid w-full grid-cols-3 gap-4">
      <Big value={a.nights.length} label="nights tracked" />
      <Big value={Math.round(a.score)} label="avg sleep score" />
      <Big value={hm(a.total)} label="avg sleep" />
    </div>
  )
}

function AverageNightVisual({ a }) {
  const data = [{ name: 'Average night', deep: a.deep, light: a.light, rem: a.rem }]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} unit=" h" {...axis} />
        <YAxis type="category" dataKey="name" hide />
        <ReferenceArea x1={REF.totalSleep.min} x2={REF.totalSleep.max} fill={C.good} fillOpacity={0.12} stroke="none"
          label={{ value: `Recommended ${REF.totalSleep.label}`, position: 'insideTop', fill: '#3f8f68', fontSize: 11 }} />
        <Tooltip {...tip} formatter={(v) => hm(v)} cursor={false} />
        <Legend />
        <Bar dataKey="deep" name="Deep" stackId="s" fill={C.deep} barSize={56} />
        <Bar dataKey="light" name="Light" stackId="s" fill={C.light} />
        <Bar dataKey="rem" name="REM" stackId="s" fill={C.rem} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function NightsVisual({ a, highlight }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={a.nights.map((d) => ({ date: d.date, score: d.sleep.score, iso: d.iso }))}>
        <CartesianGrid stroke="#ece9e2" vertical={false} />
        <XAxis dataKey="date" {...axis} />
        <YAxis domain={[0, 100]} {...axis} />
        <ReferenceLine y={a.score} stroke="#9a96a8" strokeDasharray="4 4"
          label={{ value: `avg ${Math.round(a.score)}`, position: 'right', fill: '#9a96a8', fontSize: 11 }} />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {a.nights.map((d) => (
            <Cell key={d.date} fill={
              d === a.worst ? C.bad : d === a.best && highlight === 'both' ? C.good : C.muted
            } />
          ))}
          <LabelList dataKey="score" position="top" fill="#3c3a50" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function OutlierVisual({ a }) {
  const data = [
    { name: 'Total', worst: a.worst.sleep.total, rest: a.othersTotal },
    { name: 'Deep', worst: a.worst.sleep.deep, rest: a.othersDeep },
    { name: 'REM', worst: a.worst.sleep.rem, rest: a.othersRem },
  ]
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid stroke="#ece9e2" vertical={false} />
        <XAxis dataKey="name" {...axis} />
        <YAxis unit=" h" {...axis} />
        <Tooltip {...tip} formatter={(v) => hm(v)} cursor={{ fill: '#ece9e2', opacity: 0.4 }} />
        <Legend />
        <Bar dataKey="rest" name="Other nights (avg)" fill={C.muted} radius={[6, 6, 0, 0]} />
        <Bar dataKey="worst" name={a.worst.date} fill={C.bad} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function RoomVisual({ days }) {
  const data = days.filter((d) => d.env.temp != null).map((d) => ({ date: d.date, temp: d.env.temp, humidity: d.env.humidity }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid stroke="#ece9e2" />
        <XAxis dataKey="date" {...axis} />
        <YAxis yAxisId="t" domain={[14, 24]} unit="°" {...axis} />
        <YAxis yAxisId="h" orientation="right" domain={[20, 70]} unit="%" {...axis} />
        <Tooltip {...tip} />
        <Legend />
        <ReferenceArea yAxisId="t" y1={REF.temp.min} y2={REF.temp.max} fill={C.amber} fillOpacity={0.12} stroke="none" />
        <ReferenceArea yAxisId="h" y1={REF.humidity.min} y2={REF.humidity.max} fill="#6aaccf" fillOpacity={0.08} stroke="none" />
        <Line yAxisId="t" dataKey="temp" name="Temp (°C)" stroke={C.amber} strokeWidth={2.5} />
        <Line yAxisId="h" dataKey="humidity" name="Humidity (%)" stroke="#6aaccf" strokeWidth={2} strokeDasharray="5 4" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function FeltVisual({ a }) {
  const data = a.felt.map((d) => ({ date: d.date, felt: d.form.quality * 20, measured: d.sleep.score }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid stroke="#ece9e2" />
        <XAxis dataKey="date" {...axis} />
        <YAxis domain={[0, 100]} {...axis} />
        <Tooltip {...tip} formatter={(v, n) => (n === 'How I felt' ? `${v / 20} / 5` : v)} />
        <Legend />
        <Line dataKey="felt" name="How I felt" stroke={C.violet} strokeWidth={2.5} dot={{ r: 4 }} />
        <Line dataKey="measured" name="Tracker score" stroke={C.good} strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function FactorsVisual({ a }) {
  if (!a.factors.length) {
    return <p className="text-center text-sm text-ink-500">Not enough variety in the answers yet.</p>
  }
  const max = Math.ceil((Math.max(5, ...a.factors.map((r) => Math.abs(r.delta))) * 1.5) / 10) * 10
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, a.factors.length * 60 + 40)}>
      <BarChart data={a.factors} layout="vertical" margin={{ left: 10, right: 30 }}>
        <XAxis type="number" domain={[-max, max]} ticks={[-max, -max / 2, 0, max / 2, max]}
          tickFormatter={(n) => (n > 0 ? `+${n}` : `${n}`)} {...axis} />
        <YAxis type="category" dataKey="label" width={180} tickLine={false} {...axis} />
        <ReferenceLine x={0} stroke="#c4c0cc" />
        <Bar dataKey="delta" radius={4} barSize={24} minPointSize={2}>
          {a.factors.map((r) => (
            <Cell key={r.key} fill={r.delta >= 0 ? C.good : C.bad} fillOpacity={r.weak ? 0.45 : 0.9} />
          ))}
          <LabelList dataKey="delta" position="right" fill="#3c3a50" fontSize={12}
            formatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)} pts`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function TakeawaysVisual({ items }) {
  return (
    <ol className="w-full space-y-3">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-ink-200 bg-ink-100/60 p-4 text-sm text-ink-700">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-violet-700">{i + 1}</span>
          <span className="pt-0.5">{t}</span>
        </li>
      ))}
    </ol>
  )
}

/* ---------- the story itself ---------- */

function buildSteps(a, days) {
  const worstDrop = a.othersScore - a.worst.sleep.score
  const top = a.factors[0]
  const r = a.feltFit?.r

  return [
    {
      kicker: '🌙 Sleep diary',
      title: 'How did I actually sleep?',
      body: (
        <>
          From <B>{longDate(a.first.iso, { day: 'numeric', month: 'long' })}</B> to{' '}
          <B>{longDate(a.last.iso, { day: 'numeric', month: 'long' })}</B> I tracked{' '}
          <B>{a.nights.length} nights</B> with a sleep tracker, a short morning questionnaire and a room sensor.
          This is what the data says.
        </>
      ),
      visual: <IntroVisual a={a} />,
    },
    {
      kicker: '🛌 The baseline',
      title: 'An average night',
      body: (
        <>
          On average I slept <B>{hm(a.total)}</B>, which is{' '}
          {a.total >= REF.totalSleep.min && a.total <= REF.totalSleep.max ? 'inside' : 'outside'} the recommended{' '}
          {REF.totalSleep.label} for adults. <B>{a.inBand} of {a.nights.length}</B> nights landed in that range.
          About <B>{Math.round((a.deep / a.total) * 100)}%</B> of my sleep was deep sleep and{' '}
          <B>{Math.round((a.rem / a.total) * 100)}%</B> was REM.
        </>
      ),
      visual: <AverageNightVisual a={a} />,
    },
    {
      kicker: '📅 Night by night',
      title: 'Most nights look alike',
      body: (
        <>
          My sleep score averaged <B>{Math.round(a.score)}</B>. The best night was{' '}
          <B>{longDate(a.best.iso)}</B> with <B>{a.best.sleep.score}</B>. But one night clearly breaks the pattern.
        </>
      ),
      visual: <NightsVisual a={a} highlight="both" />,
    },
    {
      kicker: '🚨 The outlier',
      title: `${longDate(a.worst.iso)}: a score of ${a.worst.sleep.score}`,
      body: (
        <>
          That is <B>{Math.round(worstDrop)} points</B> below my other nights. I slept{' '}
          <B>{hm(a.worst.sleep.total)}</B> against an average of {hm(a.othersTotal)} on the other nights
          {a.worst.sleep.deep != null && a.othersDeep != null && (
            <>, and deep sleep was <B>{a.worst.sleep.deep < a.othersDeep ? 'lower' : 'higher'}</B> ({hm(a.worst.sleep.deep)})</>
          )}.
          {a.worst.form.quality == null && ' I did not fill in the questionnaire that morning, so the data cannot say why.'}
        </>
      ),
      visual: <OutlierVisual a={a} />,
    },
    {
      kicker: '🌡️ The bedroom',
      title: 'Was the room the problem?',
      body: (
        <>
          The room averaged <B>{a.tempAvg?.toFixed(1)} °C</B>. Only <B>{a.tempIn} of {a.roomNights}</B> nights were within the
          recommended {REF.temp.label}
          {a.tempAvg > REF.temp.max ? ', mostly because the room ran slightly warm' : a.tempAvg < REF.temp.min ? ', mostly because the room ran cold' : ''}.
          Humidity was fine on <B>{a.humIn} of {a.roomNights}</B> nights.
          {a.worst.env.temp != null && (
            <> On the worst night the room was <B>{a.worst.env.temp} °C</B> and <B>{a.worst.env.humidity} %</B>
            {a.worst.env.temp >= REF.temp.min && a.worst.env.temp <= REF.temp.max + 0.5
              ? ', close to ideal, so the room does not explain it.'
              : ', so the room may have played a part.'}</>
          )}
        </>
      ),
      visual: <RoomVisual days={days} />,
    },
    {
      kicker: '🤔 Perception',
      title: 'Does how I feel match the tracker?',
      body: a.felt.length >= 3 ? (
        <>
          On the <B>{a.felt.length} nights</B> where I rated my sleep, my rating (scaled to 100){' '}
          {r == null ? 'could not be compared' : Math.abs(r) < 0.3
            ? <>barely followed the tracker score (<B>r = {r.toFixed(2)}</B>).</>
            : <>{r > 0 ? 'moved with' : 'moved against'} the tracker score (<B>r = {r.toFixed(2)}</B>).</>}{' '}
          How rested I feel is not the same thing as what the tracker measures.
        </>
      ) : (
        <>I have only rated <B>{a.felt.length}</B> nights so far, which is not enough to compare.</>
      ),
      visual: <FeltVisual a={a} />,
    },
    {
      kicker: '🔍 Habits',
      title: 'What seems to matter?',
      body: top ? (
        <>
          Comparing nights with and without each factor, the biggest gap was{' '}
          <B>{top.label.toLowerCase()}</B>: <B>{top.delta > 0 ? '+' : ''}{top.delta.toFixed(0)} points</B>{' '}
          ({top.nWith} vs {top.nWithout} nights). With so few nights this is a hint, not a finding.
          {a.factorSkipped.length > 0 && (
            <> Some habits never changed, e.g. <B>{a.factorSkipped[0].label.toLowerCase()}</B> ({a.factorSkipped[0].reason}), so they cannot be judged yet.</>
          )}
        </>
      ) : (
        <>My habits have not varied enough between nights to compare them yet.</>
      ),
      visual: <FactorsVisual a={a} />,
    },
    {
      kicker: '💡 Conclusion',
      title: 'What I take away',
      body: <>{a.nights.length} nights of data is a start, not an answer. Here is what I learned and what comes next.</>,
      visual: (
        <TakeawaysVisual items={[
          <>I sleep about <B>{hm(a.total)}</B> a night, {a.total >= REF.totalSleep.min ? 'which is enough by the guidelines' : 'which is below the guidelines'}.</>,
          <>One bad night (<B>{a.worst.date}</B>) drags my average down more than any habit does.</>,
          a.tempAvg > REF.temp.max
            ? <>My bedroom is usually a little warmer than recommended. Cooling it is an easy experiment.</>
            : <>My bedroom is mostly within the recommended temperature, so it is probably not the main issue.</>,
          <>To learn what really matters, I need more nights where my habits differ, and to fill in the form every morning.</>,
        ]} />
      ),
    },
  ]
}

export default function Story({ days }) {
  const a = analyse(days)
  const steps = a ? buildSteps(a, days) : []
  const [active, setActive] = useState(0)
  const refs = useRef([])

  // Highlight the step in the middle of the screen
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i))),
      { rootMargin: '-45% 0px -45% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [steps.length])

  // Arrow keys / space / page keys move between steps, for presenting
  useEffect(() => {
    const go = (i) => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(Math.min(steps.length - 1, active + 1)) }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(Math.max(0, active - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, steps.length])

  if (!a) return <p className="py-20 text-center text-ink-500">Loading the story…</p>

  return (
    <div className="relative lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      {/* Progress dots */}
      <nav className="fixed right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2 xl:flex">
        {steps.map((s, i) => (
          <button
            key={i}
            title={s.title}
            onClick={() => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className={`h-2.5 w-2.5 rounded-full transition ${i === active ? 'scale-125 bg-accent' : 'bg-ink-300 hover:bg-ink-500'}`}
          />
        ))}
      </nav>

      <div>
        {steps.map((s, i) => (
          <section
            key={i}
            ref={(el) => (refs.current[i] = el)}
            data-i={i}
            className="flex min-h-[75vh] flex-col justify-center py-10 first:min-h-[60vh] last:min-h-[80vh]"
          >
            <div className={`rounded-2xl border p-6 transition duration-500 ${
              i === active ? 'border-ink-300 bg-ink-100/80' : 'border-transparent lg:opacity-40'
            }`}>
              <p className="text-xs font-medium uppercase tracking-widest text-violet-700">{i + 1} · {s.kicker}</p>
              <h2 className="mt-2 font-display text-4xl leading-tight text-ink-900">{s.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-600">{s.body}</p>
            </div>
            <div className="mt-6 lg:hidden">{s.visual}</div>
          </section>
        ))}
      </div>

      <div className="hidden lg:block xl:pr-8">
        <div className="sticky top-0 flex h-screen items-center">
          <div key={active} className="story-fade w-full">{steps[active].visual}</div>
        </div>
      </div>
    </div>
  )
}
