import React, { useState } from 'react'
import { login, saveSession } from '../auth.js'

export default function Login({ onLogin }) {
  const [usuario, setUsuario]   = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!usuario || !password) return setError('Completa todos los campos')
    setLoading(true)
    setError('')
    try {
      const res = await login(usuario.trim().toLowerCase(), password)
      if (res.ok) {
        saveSession(res)
        onLogin(res)
      } else {
        setError(res.error || 'Credenciales incorrectas')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoAccent}>INTEL</span>
          <span style={styles.logoBase}>COMERCIAL</span>
        </div>
        <div style={styles.subtitle}>Inteligencia de Negocios</div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Usuario</label>
            <input
              style={styles.input}
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              placeholder="tu usuario"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={{ ...styles.btn, opacity: loading ? .7 : 1 }} disabled={loading}>
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>

        <div style={styles.footer}>Sistema de acceso restringido</div>
      </div>
    </div>
  )
}

const styles = {
  bg: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f1f3d 0%, #1a3560 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: '36px 32px 28px',
    width: '100%',
    maxWidth: 360,
    boxShadow: '0 20px 60px rgba(0,0,0,.3)',
    textAlign: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: '.5px',
    marginBottom: 4,
  },
  logoAccent: { color: '#1a6cf0' },
  logoBase:   { color: '#0f1f3d' },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    marginBottom: 28,
  },
  form:  { textAlign: 'left' },
  field: { marginBottom: 14 },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 7,
    fontSize: 14,
    color: '#0f1f3d',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: 7,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 12,
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    background: '#1a6cf0',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '11px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity .15s',
    fontFamily: 'inherit',
  },
  footer: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
  },
}
