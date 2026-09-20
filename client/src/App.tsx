import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, message } from './lib/api'
import AuthPage from './pages/AuthPage'
import StockPage from './pages/StockPage'
import Logo from './components/Logo'
import './App.css'

function storedToken() { try { return sessionStorage.getItem('platinum.token') ?? '' } catch { return '' } }
function saveToken(token: string) { try { if (token) sessionStorage.setItem('platinum.token', token); else sessionStorage.removeItem('platinum.token') } catch { /* The session still works in memory when storage is unavailable. */ } }

export default function App() {
  const [token, setToken] = useState(storedToken)
  const [checking, setChecking] = useState(!!token)
  const [notice, setNotice] = useState(''), [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const expire = useCallback(() => { saveToken(''); setToken(''); setChecking(false); setNotice('Ta session a expiré. Connecte-toi à nouveau.'); setError('') }, [])
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    api('/auth/me', { token, signal: controller.signal }).then(() => { setChecking(false); setError('') })
      .catch(error => { if (!controller.signal.aborted) { if (error instanceof ApiError && error.status === 401) expire(); else setError(message(error)) } })
    return () => controller.abort()
  }, [token, retry, expire])
  if (!token) return <AuthPage notice={notice} onLogin={value => { saveToken(value); setChecking(true); setToken(value); setNotice('') }} />
  if (checking) return <main className="session-page"><Logo /><p role={error ? 'alert' : 'status'}>{error || 'Vérification de ta session…'}</p>{error && <button onClick={() => { setError(''); setRetry(retry + 1) }}>Réessayer</button>}<button className="text-button" onClick={() => { saveToken(''); setToken(''); setChecking(false); setError('') }}>Revenir à la connexion</button></main>
  return <><a className="skip-link" href="#main">Aller au contenu</a><header className="site-header"><Logo compact /><nav aria-label="Navigation principale"><a href="#main" aria-current="page">Mon stock</a><button className="text-button" onClick={() => { saveToken(''); setToken(''); setNotice('Tu es déconnectée.'); setError('') }}>Se déconnecter</button></nav></header><StockPage token={token} onExpired={expire} /><footer>Platinum · Des recettes simples, un goût premium</footer></>
}
