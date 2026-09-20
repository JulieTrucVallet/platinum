import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, message } from '../lib/api'
import Logo from '../components/Logo'

export default function AuthPage({ onLogin, notice }: { onLogin: (token: string) => void; notice: string }) {
  const [register, setRegister] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [visible, setVisible] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email')).trim()
    const password = String(fields.get('password'))
    lock.current = true; setBusy(true); setError(''); setSuccess('')
    try {
      if (register) {
        await api('/auth/register', { method: 'POST', body: { username: String(fields.get('username')).trim(), email, password } })
        setRegister(false); setVisible(false); form.current?.reset()
        setSuccess('Ton compte est créé. Tu peux maintenant te connecter.')
      } else {
        const result = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email, password } })
        onLogin(result.token)
      }
    } catch (error) { setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <main id="main" className="auth-page">
    <Logo />
    <h1 className="sr-only">{register ? 'Créer un compte' : 'Se connecter'}</h1>
    <form ref={form} onSubmit={submit} className="auth-form" aria-busy={busy}>
      {notice && !success && <p role="status" className="notice">{notice}</p>}
      {success && <p role="status" className="notice">{success}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {register && <label className="auth-field"><img src="/images/person.png" alt="" /><span><span className="field-label">Nom d’utilisateur</span><input name="username" autoComplete="username" required minLength={2} maxLength={80} placeholder="Ton nom d’utilisateur" /></span></label>}
      <label className="auth-field"><img src="/images/mail.png" alt="" /><span><span className="field-label">Adresse e-mail</span><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="prenom.nom@mail.com" /></span></label>
      <label className="auth-field"><img src="/images/password.png" alt="" /><span><span className="field-label">Mot de passe</span><input name="password" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : undefined} placeholder={register ? 'Au moins 8 caractères' : 'Ton mot de passe'} /></span></label>
      <button className="text-button password-toggle" type="button" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Masquer' : 'Afficher'} le mot de passe</button>
      <button className="primary auth-submit" disabled={busy}>{busy ? 'Patiente un instant…' : register ? 'S’inscrire' : 'Se connecter'}</button>
    </form>
    <div className="auth-switch"><p>{register ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}</p><button disabled={busy} className="text-button" onClick={() => { setRegister(!register); setError(''); setSuccess(''); setVisible(false); form.current?.reset() }}>{register ? 'Se connecter' : 'S’inscrire'}</button></div>
  </main>
}
