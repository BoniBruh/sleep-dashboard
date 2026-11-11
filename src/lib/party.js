import { useEffect, useRef, useState } from 'react'
import { fetchParties } from './sheet'

// Party nights are saved to the Google Sheet through the Apps Script web app
// (apps-script/party-nights.gs) when VITE_PARTY_URL is set. Without it they
// are only kept in this browser. The browser copy is also used as a cache so
// marks show instantly before the sheet has answered.
const PARTY_URL = import.meta.env.VITE_PARTY_URL
const KEY = 'sleep-dashboard:party-nights'
const MIGRATED = 'sleep-dashboard:party-nights-uploaded'

const read = (key) => {
  try { return localStorage.getItem(key) } catch { return null }
}
const write = (key, value) => {
  try { localStorage.setItem(key, value) } catch { /* storage blocked: cache just won't persist */ }
}
function loadCache() {
  try {
    const v = JSON.parse(read(KEY))
    return new Set(Array.isArray(v) ? v : [])
  } catch {
    return new Set()
  }
}
const withMark = (set, iso, on) => {
  const next = new Set(set)
  if (on) next.add(iso)
  else next.delete(iso)
  return next
}

async function sendMark(date, party) {
  // text/plain keeps this a "simple" request, so the browser skips the CORS preflight
  // that Apps Script cannot answer
  const res = await fetch(PARTY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ date, party }),
  })
  const out = await res.json()
  if (!out.ok) throw new Error(out.error || 'unknown error')
  return out.dates
}

export function useParties() {
  const [parties, setParties] = useState(loadCache)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const pending = useRef(0)

  useEffect(() => { write(KEY, JSON.stringify([...parties].sort())) }, [parties])

  // Load from the sheet, then every minute so other devices' marks show up
  useEffect(() => {
    if (!PARTY_URL) return
    let alive = true
    const pull = async () => {
      try {
        let list = await fetchParties()
        // First time sheet sync is on: upload marks that only exist in this browser
        if (!read(MIGRATED)) {
          const localOnly = [...loadCache()].filter((d) => !list.includes(d))
          for (const d of localOnly) list = await sendMark(d, true)
          write(MIGRATED, '1')
        }
        if (alive && pending.current === 0) { setParties(new Set(list)); setError(null) }
      } catch (e) {
        if (alive) setError(`Could not load party nights from the sheet (${e.message}). Showing this browser's copy.`)
      }
    }
    pull()
    const id = setInterval(pull, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const toggle = async (iso) => {
    const on = !parties.has(iso)
    setParties((p) => withMark(p, iso, on)) // show it straight away
    if (!PARTY_URL) return
    pending.current += 1
    setSaving(true)
    try {
      const dates = await sendMark(iso, on)
      if (pending.current === 1) setParties(new Set(dates)) // the sheet is the source of truth
      setError(null)
    } catch (e) {
      setParties((p) => withMark(p, iso, !on)) // undo, it was not saved
      setError(`Could not save to the sheet (${e.message}). Try again.`)
    } finally {
      pending.current -= 1
      if (pending.current === 0) setSaving(false)
    }
  }

  return { parties, toggle, synced: !!PARTY_URL, saving, error }
}

const prevIso = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Adds party / afterParty flags to every day
export function tagParties(days, parties) {
  return days.map((d) => {
    const party = !!d.iso && parties.has(d.iso)
    return { ...d, party, afterParty: !!d.iso && !party && parties.has(prevIso(d.iso)) }
  })
}
