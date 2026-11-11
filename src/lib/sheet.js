const ID = import.meta.env.VITE_SHEET_ID
const KEY = import.meta.env.VITE_API_KEY
const RANGE = encodeURIComponent("'Daily Summary'!A2:U")

const num = (v) => {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace('%', '').replace(',', '.'))
  return Number.isNaN(n) ? null : n
}
const hours = (v) => {
  const m = /(\d+)h\s*(\d+)m/.exec(v || '')
  return m ? +m[1] + +m[2] / 60 : null
}
const pct = (v) => {
  const n = num(v)
  if (n == null) return null
  return n <= 1 ? n * 100 : n
}

// Party nights saved by the Apps Script (apps-script/party-nights.gs).
// The tab only exists after the first mark, so a missing tab means "none yet".
export async function fetchParties() {
  const range = encodeURIComponent("'Party nights'!A2:A")
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ID}/values/${range}?key=${KEY}`)
  if (res.status === 400) return []
  if (!res.ok) throw new Error(`Sheets API error ${res.status}`)
  const { values = [] } = await res.json()
  return values.map((r) => String(r[0] || '').trim()).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))
}

// "2026-11-01 22:41:00" → minutes relative to midnight at the start of `sleepIso`
// (so 22:41 the evening before is -79, 07:57 that morning is 477)
function minutesFrom(sleepIso, stamp) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(stamp || '')
  if (!m) return null
  const [ys, ms, ds] = sleepIso.split('-').map(Number)
  const dayDiff = (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(ys, ms - 1, ds)) / 86_400_000
  return dayDiff * 1440 + +m[4] * 60 + +m[5]
}

// Bed and wake times from the raw Withings sessions. A date can have more than one
// session (a nap), so the longest one counts as that night.
async function fetchBedtimes() {
  const range = encodeURIComponent('withings_raw!A2:E')
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ID}/values/${range}?key=${KEY}`)
  if (!res.ok) return {}
  const { values = [] } = await res.json()
  const nights = {}
  for (const r of values) {
    const iso = String(r[0] || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue
    const bed = minutesFrom(iso, r[2])
    const wake = minutesFrom(iso, r[3])
    if (bed == null || wake == null || wake <= bed) continue
    if (!nights[iso] || wake - bed > nights[iso].wake - nights[iso].bed) nights[iso] = { bed, wake }
  }
  return nights
}

export async function fetchDays() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${ID}/values/${RANGE}?key=${KEY}&valueRenderOption=FORMATTED_VALUE`
  const [res, bedtimes] = await Promise.all([fetch(url), fetchBedtimes().catch(() => ({}))])
  if (!res.ok) throw new Error(`Sheets API error ${res.status}`)
  const { values = [] } = await res.json()

  return values
    .filter((r) => r[0])
    .map((r) => {
      const c = Array.from({ length: 21 }, (_, i) => r[i] ?? '')
      const [d, m, y] = c[0].split('/')
      const iso = y ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : null
      return {
        date: `${d}/${m}`,
        iso,
        // { bed, wake } in minutes from midnight of this date; bed is negative before midnight
        night: (iso && bedtimes[iso]) || null,
        form: {
          quality: num(c[1]), rested: num(c[2]), caffeine: c[3] || null,
          screens: c[4] || null, stress: num(c[5]), nap: c[6] || null,
          focus: num(c[7]), unusual: c[8] || null,
        },
        sleep: {
          inBed: hours(c[9]), total: hours(c[10]), light: hours(c[11]),
          deep: hours(c[12]), rem: hours(c[13]), efficiency: pct(c[14]),
          wakeups: num(c[15]), score: num(c[16]), hr: num(c[17]),
        },
        env: { temp: num(c[18]), humidity: num(c[19]), envLight: num(c[20]) },
      }
    })
}