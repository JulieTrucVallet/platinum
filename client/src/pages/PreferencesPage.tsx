import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError, message } from '../lib/api'
import { useResource } from '../lib/recipes'
import type { Preference, SessionProps } from '../lib/recipes'
import { LoadState, PageHeading } from '../components/RecipeParts'

function PreferencesForm({ initial, catalogue, token, onExpired }: SessionProps & { initial: Preference[]; catalogue: Preference[] }) {
  const [selected, setSelected] = useState(initial.map(p => p.id)), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const lock = useRef(false)
  async function save(event: FormEvent) {
    event.preventDefault(); if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { const result = await api<{ items: Preference[] }>('/preferences/me', { token, method: 'PUT', body: { preferenceIds: selected } }); setSelected(result.items.map(p => p.id)); setNotice('Tes préférences sont enregistrées. Les suggestions utiliseront ces choix.') }
    catch (error) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <form onSubmit={save} className="recipe-sheet preference-sheet"><h2>Mes préférences alimentaires</h2><p>Les suggestions retiendront les recettes portant toutes les étiquettes sélectionnées. Aucun choix signifie aucune restriction.</p><fieldset disabled={busy}><legend>Mes choix</legend>{catalogue.map(item => <label className="check-label" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e => { setNotice(''); setSelected(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id)) }} />{item.name}</label>)}</fieldset>
    <p className="muted">Les étiquettes sont déclarées par les auteurs. Vérifie la composition de chaque recette ; elles ne garantissent pas l’absence d’allergènes.</p>{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<button className="primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer mes préférences'}</button> <a className="button-link" href="#/suggestions">Voir mes suggestions</a></form>
}
export default function PreferencesPage(props: SessionProps) {
  const catalogue = useResource<{ items: Preference[] }>('/preferences', props.token, props.onExpired)
  const mine = useResource<{ items: Preference[] }>('/preferences/me', props.token, props.onExpired)
  return <main id="main" className="stock-page" tabIndex={-1}><PageHeading>Mes préférences</PageHeading><LoadState {...catalogue} retry={catalogue.refresh} /><LoadState {...mine} retry={mine.refresh} />{catalogue.data && mine.data && <PreferencesForm {...props} catalogue={catalogue.data.items} initial={mine.data.items} />}</main>
}
