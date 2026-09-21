import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, message } from './lib/api'
import AuthPage from './pages/AuthPage'
import StockPage from './pages/StockPage'
import Logo from './components/Logo'
import RecipesPage from './pages/RecipesPage'
import SuggestionsPage from './pages/SuggestionsPage'
import PreferencesPage from './pages/PreferencesPage'
import RecipePage from './pages/RecipePage'
import type { Account } from './lib/recipes'
import './App.css'
import './Recipes.css'

function storedToken() { try { return sessionStorage.getItem('platinum.token') ?? '' } catch { return '' } }
function saveToken(token: string) { try { if (token) sessionStorage.setItem('platinum.token', token); else sessionStorage.removeItem('platinum.token') } catch { /* The session still works in memory when storage is unavailable. */ } }

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/stock')
  const [account, setAccount] = useState<Account | null>(null)
  useEffect(() => {
    const change = () => setRoute(window.location.hash.slice(1) || '/stock')
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => { document.title = 'Platinum — ' + (route.startsWith('/recettes') ? 'Recettes' : route === '/suggestions' ? 'Suggestions' : route === '/preferences' ? 'Préférences' : 'Mon stock'); document.getElementById('main')?.focus(); window.scrollTo(0, 0) }, [route])
  const [token, setToken] = useState(storedToken)
  const [checking, setChecking] = useState(!!token)
  const [notice, setNotice] = useState(''), [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const expire = useCallback(() => { saveToken(''); setToken(''); setChecking(false); setNotice('Ta session a expiré. Connecte-toi à nouveau.'); setError('') }, [])
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    api<Account>('/auth/me', { token, signal: controller.signal }).then(value => { if (controller.signal.aborted) return; setAccount(value); setChecking(false); setError('') })
      .catch(error => { if (!controller.signal.aborted) { if (error instanceof ApiError && error.status === 401) expire(); else setError(message(error)) } })
    return () => controller.abort()
  }, [token, retry, expire])
  if (!token) return <AuthPage notice={notice} onLogin={value => { saveToken(value); setChecking(true); setToken(value); setNotice('') }} />
  if (checking) return <main className="session-page"><Logo /><p role={error ? 'alert' : 'status'}>{error || 'Vérification de ta session…'}</p>{error && <button onClick={() => { setError(''); setRetry(retry + 1) }}>Réessayer</button>}<button className="text-button" onClick={() => { saveToken(''); setToken(''); setChecking(false); setError('') }}>Revenir à la connexion</button></main>
  if (!account) return null
  const recipeMatch = /^\/recettes\/(\d+|nouvelle)$/.exec(route)
  const session = { token, onExpired: expire }
  const active = recipeMatch ? '/recettes' : route
  return <><a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); document.getElementById('main')?.scrollIntoView() }}>Aller au contenu</a>
    <header className="site-header"><Logo compact /><nav aria-label="Navigation principale">
      {[['/recettes', 'Recettes'], ['/suggestions', 'Suggestions'], ['/stock', 'Mon stock'], ['/preferences', 'Préférences']].map(([path, label]) => <a key={path} href={`#${path}`} aria-current={active === path ? 'page' : undefined}>{label}</a>)}
      <button className="text-button" onClick={() => { saveToken(''); setToken(''); setAccount(null); setNotice('Tu es déconnectée.'); setError('') }}>Se déconnecter</button>
    </nav></header>
    {recipeMatch ? <RecipePage key={route} id={recipeMatch[1] === 'nouvelle' ? null : Number(recipeMatch[1])} account={account} {...session} />
      : route === '/recettes' ? <RecipesPage {...session} />
      : route === '/suggestions' ? <SuggestionsPage {...session} />
      : route === '/preferences' ? <PreferencesPage {...session} />
      : route === '/stock' || route === 'main' ? <StockPage {...session} />
      : <main id="main" className="stock-page" tabIndex={-1}><h1>Page introuvable</h1><a href="#/recettes">Revenir aux recettes</a></main>}
    <footer>Platinum · Des recettes simples, un goût premium</footer></>
}
