// Vercel Routing Middleware: asks for a username and password before anything is served.
// Runs only on Vercel (not in `npm run dev`). Set BASIC_AUTH_USER and BASIC_AUTH_PASSWORD
// in the Vercel project's Environment Variables. If they are missing the site stays locked.

export const config = {
  matcher: '/:path*',
}

// Compares without stopping at the first different character, so timing doesn't leak the password
function sameText(a, b) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function credentials(request) {
  const [scheme, encoded] = (request.headers.get('authorization') || '').split(' ')
  if (scheme !== 'Basic' || !encoded) return null
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)))
    const i = decoded.indexOf(':')
    return i === -1 ? null : { user: decoded.slice(0, i), pass: decoded.slice(i + 1) }
  } catch {
    return null
  }
}

export default function middleware(request) {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASSWORD
  if (!user || !pass) {
    return new Response('This site is locked: access has not been configured yet.', { status: 503 })
  }

  const given = credentials(request)
  if (given && sameText(given.user, user) && sameText(given.pass, pass)) {
    return // correct: continue to the site
  }

  return new Response('Password required to view the sleep dashboard.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Sleep dashboard", charset="UTF-8"' },
  })
}
