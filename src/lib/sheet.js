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

export async function fetchDays() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${ID}/values/${RANGE}?key=${KEY}&valueRenderOption=FORMATTED_VALUE`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API error ${res.status}`)
  const { values = [] } = await res.json()

  return values
    .filter((r) => r[0])
    .map((r) => {
      const c = Array.from({ length: 21 }, (_, i) => r[i] ?? '')
      const [d, m] = c[0].split('/')
      return {
        date: `${d}/${m}`,
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