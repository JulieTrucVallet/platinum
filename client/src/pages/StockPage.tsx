import { useEffect, useRef, useState } from 'react'
import { api, ApiError, locations, message, units } from '../lib/api'
import type { StockItem, Location } from '../lib/api'
import StockForm from '../components/StockForm'

export default function StockPage({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [items, setItems] = useState<StockItem[]>([])
  const [filter, setFilter] = useState<Location | ''>('')
  const [loading, setLoading] = useState(true), [reload, setReload] = useState(0)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<{ item: StockItem | null } | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null), [busy, setBusy] = useState(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!editor && trigger.current) {
      const target = trigger.current.isConnected ? trigger.current : addButton.current
      target?.focus()
    }
  }, [editor])
  const lock = useRef(false), addButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    api<{ items: StockItem[] }>('/stock', { token, signal: controller.signal })
      .then(result => { setItems(result.items); setError('') })
      .catch(error => { if (!controller.signal.aborted) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, reload, onExpired])
  async function remove(item: StockItem) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await api(`/stock/${item.id}`, { token, method: 'DELETE' })
      setItems(rows => rows.filter(row => row.id !== item.id)); setDeleting(null)
      setNotice(`${item.ingredient.name} a été retiré du stock.`); addButton.current?.focus()
    } catch (error) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  const visible = items.filter(row => !filter || row.location === filter)
  return <main tabIndex={-1} id="main" className="stock-page">
    <div className="stock-heading"><img src="/images/leaf.png" alt="" /><h1>Mon stock</h1></div>
    <p className="stock-intro">Tes ingrédients, au bon endroit. Garde un œil sur ce que tu as déjà.</p>
    <div className="filters" aria-label="Filtrer par rangement"><button aria-pressed={!filter} onClick={() => { setFilter(''); setDeleting(null) }}>Tout</button>{Object.entries(locations).map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => { setFilter(key as Location); setDeleting(null) }}>{label}</button>)}</div>
    <div className="stock-layout"><img className="fridge" src="/images/fridge.png" alt="" />
      <section className="stock-panel" aria-label="Ingrédients du stock" aria-busy={loading || busy}>
        <div className="panel-heading"><h2>{filter ? locations[filter] : 'Mes ingrédients'}</h2><button className="text-button" disabled={loading || busy || !!editor} onClick={() => { setLoading(true); setReload(reload + 1); setNotice('') }}>Actualiser</button></div>
        {error && <p role="alert" className="error">{error}</p>}
        <p role="status" className="status">{notice}</p>
        {loading ? <p role="status">Chargement de ton stock…</p> : error && items.length === 0 ? <p>Utilise « Actualiser » pour réessayer.</p> : visible.length === 0 ? <div className="empty"><h3>{items.length ? 'Ce rangement est vide' : 'Ton stock attend ses premiers ingrédients'}</h3><p>Ajoute les produits que tu as chez toi pour commencer.</p></div> : <ul className="stock-list">{visible.map(item => <li key={item.id}>
          <div className="stock-row"><div><strong>{item.ingredient.name}</strong><span>{Number(item.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {units[item.ingredient.unit]} · {locations[item.location]}</span></div><div className="row-actions"><button disabled={busy} aria-label={`Modifier ${item.ingredient.name} (${locations[item.location]})`} onClick={event => { trigger.current = event.currentTarget; setEditor({ item }); setDeleting(null) }}>Modifier</button><button disabled={busy} aria-label={`Retirer ${item.ingredient.name} (${locations[item.location]})`} onClick={() => setDeleting(item.id)}>Retirer</button></div></div>
          {deleting === item.id && <div className="delete-confirm"><p>Retirer {item.ingredient.name} de ce rangement ?</p><button disabled={busy} className="danger" onClick={() => remove(item)}>{busy ? 'Suppression…' : 'Confirmer le retrait'}</button><button disabled={busy} onClick={() => setDeleting(null)}>Annuler</button></div>}
        </li>)}</ul>}
        <button ref={addButton} className="primary add-button" disabled={loading || busy} onClick={event => { trigger.current = event.currentTarget; setEditor({ item: null }); setDeleting(null) }}>Ajouter un ingrédient <span aria-hidden="true">+</span></button>
      </section>
    </div>
    {editor && <StockForm token={token} item={editor.item} onExpired={onExpired} onClose={() => setEditor(null)} onSaved={saved => {
      setItems(rows => rows.some(row => row.id === saved.id) ? rows.map(row => row.id === saved.id ? saved : row) : [...rows, saved])
      setNotice(`${saved.ingredient.name} enregistré : ${Number(saved.quantity).toLocaleString('fr-FR')} ${units[saved.ingredient.unit]}, ${locations[saved.location]}.`)
      setError(''); setFilter(saved.location); setEditor(null)
    }} />}
  </main>
}
