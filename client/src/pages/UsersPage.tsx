import { useRef, useState } from 'react'
import { api, ApiError, message } from '../lib/api'
import { useResource } from '../lib/recipes'
import type { Account, Page, SessionProps } from '../lib/recipes'
import { LoadState, PageHeading, Pagination } from '../components/RecipeParts'

export default function UsersPage({ token, onExpired }: SessionProps) {
  const [q, setQ] = useState(''), [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<Account | null>(null), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const lock = useRef(false)
  const result = useResource<Page<Account>>(`/admin/users?q=${encodeURIComponent(q)}&page=${page}`, token, onExpired)
  async function remove() {
    if (!confirm || lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await api(`/admin/users/${confirm.id}`, { token, method: 'DELETE' })
      setNotice(`Le compte « ${confirm.username} » a été supprimé.`); setConfirm(null); setPage(1); result.refresh()
    } catch (error) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <main id="main" className="stock-page" tabIndex={-1}><PageHeading>Gestion des utilisateurs</PageHeading><p>Recherche un compte standard pour le supprimer. Les comptes administrateurs sont protégés.</p>
    <label className="account-search">Rechercher par nom ou e-mail<input type="search" value={q} maxLength={100} disabled={busy} onChange={e => { setQ(e.target.value); setPage(1); setConfirm(null) }} /></label>
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    {confirm && <section className="delete-confirm" role="group" aria-label="Confirmation de suppression du compte"><h2>Supprimer « {confirm.username} » ?</h2><p>Son stock et ses préférences seront supprimés. Ses recettes resteront au catalogue, sans compte auteur associé. Cette action est définitive.</p><button disabled={busy} onClick={() => setConfirm(null)}>Annuler</button><button className="danger" disabled={busy} onClick={remove}>{busy ? 'Suppression…' : 'Confirmer la suppression du compte'}</button></section>}
    <LoadState {...result} retry={result.refresh} />{result.data && <><p role="status">{result.data.total} compte(s) trouvé(s)</p><ul className="user-list">{result.data.items.map(user => <li key={user.id}><div><strong>{user.username}</strong><p>{user.email}</p><span>{user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</span></div>{user.role === 'USER' && <button disabled={busy} className="danger" onClick={() => { setConfirm(user); setError('') }}>Supprimer le compte de {user.username}</button>}</li>)}</ul><Pagination page={page} size={20} total={result.data.total} change={value => { setPage(value); setConfirm(null) }} /></>}
  </main>
}
