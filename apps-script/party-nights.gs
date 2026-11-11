/**
 * Sleep dashboard: saves party nights into the "Party nights" tab of this spreadsheet.
 *
 * Setup (once): in the Google Sheet open Extensions → Apps Script, paste this file,
 * then Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone.
 * Put the web app URL in the dashboard's .env as VITE_PARTY_URL.
 *
 * The dashboard sends: { "date": "2026-11-07", "party": true }   (false to unmark)
 * The tab holds one ISO date per row under a "date" header.
 */
const TAB = 'Party nights'

function doPost(e) {
  let body
  try {
    body = JSON.parse(e.postData.contents)
  } catch (err) {
    return reply({ ok: false, error: 'Body must be JSON' })
  }
  const date = String(body.date || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply({ ok: false, error: 'date must look like 2026-11-07' })
  if (typeof body.party !== 'boolean') return reply({ ok: false, error: 'party must be true or false' })

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const sheet = tab()
    const dates = listDates(sheet)
    const row = dates.indexOf(date)
    if (body.party && row === -1) {
      sheet.getRange(sheet.getLastRow() + 1, 1).setNumberFormat('@').setValue(date)
    } else if (!body.party && row !== -1) {
      sheet.deleteRow(row + 2)
    }
    return reply({ ok: true, dates: listDates(sheet) })
  } finally {
    lock.releaseLock()
  }
}

// Handy for checking the deployment in a browser: returns the saved dates
function doGet() {
  return reply({ ok: true, dates: listDates(tab()) })
}

function tab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(TAB)
  if (!sheet) {
    sheet = ss.insertSheet(TAB)
    sheet.getRange('A:A').setNumberFormat('@')
    sheet.getRange(1, 1).setValue('date')
  }
  return sheet
}

function listDates(sheet) {
  const n = sheet.getLastRow() - 1
  return n > 0 ? sheet.getRange(2, 1, n, 1).getDisplayValues().map((r) => r[0]) : []
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
