const AUTH_API = 'https://script.google.com/macros/s/AKfycbxPS5xKblTMvRGgNj6JBuT8yCr0dwx88ueKbH8LpM9jf5Cu1CKRgfJ50UNRvfjp4IZVlg/exec'

export async function login(usuario, password) {
  const res = await fetch(AUTH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'login', usuario, password }),
  })
  return res.json()
}

export async function verifyToken(token) {
  const res = await fetch(AUTH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'verifyToken', token }),
  })
  return res.json()
}

export function getSession() {
  try {
    const s = localStorage.getItem('intel_session')
    if (!s) return null
    const parsed = JSON.parse(s)
    if (new Date() > new Date(parsed.expires)) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSession(data) {
  localStorage.setItem('intel_session', JSON.stringify(data))
}

export function clearSession() {
  localStorage.removeItem('intel_session')
}
