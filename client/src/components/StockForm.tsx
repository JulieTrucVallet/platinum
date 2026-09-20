import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError, locations, message, units } from '../lib/api'
import type { Ingredient, Location, StockItem } from '../lib/api'

export default function StockForm({ token, item, onClose, onSaved, onExpired }: {
  token: string; item: StockItem | null; onClose: () => void; onSaved: (item: StockItem) => void; onExpired: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState(''), [page, setPage] = useState(1)
  const [catalogue, setCatalogue] = useState<Ingredient[]>([]), [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Ingredient | null>(item?.ingredient ?? null)
  const [quantity, setQuantity] = useState(item?.quantity ?? '')
  const [unit, setUnit] = useState<string>(item?.ingredient.unit ?? 'GRAM')
  const [location, setLocation] = useState<Location>(item?.location ?? 'PANTRY')
  const [loading, setLoading] = useState(!item), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [catalogueError, setCatalogueError] = useState('')
  const [reload, setReload] = useState(0)
  const lock = useRef(false)
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close() }, [])
  useEffect(() => {
    if (item) return
    const controller = new AbortController()
    api<{ items: Ingredient[]; total: number }>(`/ingredients?q=${encodeURIComponent(q)}&page=${page}&pageSize=20`, { token, signal: controller.signal })
      .then(result => { setCatalogue(result.items); setTotal(result.total); setCatalogueError('') })
      .catch(error => { if (!controller.signal.aborted) { if (error instanceof ApiError && error.status === 401) onExpired(); else setCatalogueError(message(error)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [item, token, q, page, reload, onExpired])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    if (!selected) { setError('Choisis un ingrédient dans le catalogue.'); return }
    const value = quantity.replace(',', '.')
    if (!/^\d{1,9}(\.\d{1,3})?$/.test(value) || Number(value) <= 0) { setError('Saisis une quantité positive avec au maximum trois décimales.'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await api<{ item: StockItem }>(item ? `/stock/${item.id}` : '/stock', {
        token, method: item ? 'PATCH' : 'POST',
        body: { ...(!item ? { ingredientId: selected.id } : {}), quantity: value, unit, location },
      })
      onSaved(result.item)
    } catch (error) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  const choices = selected?.unit === 'GRAM' ? ['GRAM', 'KILOGRAM'] : selected?.unit === 'MILLILITER' ? ['MILLILITER', 'LITER'] : ['PIECE']
  return <dialog ref={dialog} aria-labelledby="stock-form-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <form onSubmit={submit} aria-busy={busy}>
      <h2 id="stock-form-title">{item ? `Modifier : ${item.ingredient.name}` : 'Ajouter un ingrédient'}</h2>
      {error && <p role="alert" className="error">{error}</p>}
      {!item && <fieldset disabled={busy}><legend>Choisir dans le catalogue</legend>
        <label>Rechercher un ingrédient<input type="search" value={q} maxLength={100} onChange={event => { setQ(event.target.value); setPage(1); setLoading(true) }} placeholder="Riz, carotte…" /></label>
        {catalogueError ? <div role="alert"><p>{catalogueError}</p><button type="button" onClick={() => { setReload(reload + 1); setLoading(true) }}>Réessayer</button></div> : loading ? <p role="status">Recherche…</p> : <>
          <label>Ingrédient<select value={selected?.id ?? ''} onChange={event => { const ingredient = catalogue.find(row => row.id === Number(event.target.value)); setSelected(ingredient ?? null); if (ingredient) setUnit(ingredient.unit) }} required>
            <option value="">Sélectionner un ingrédient</option>
            {selected && !catalogue.some(row => row.id === selected.id) && <option value={selected.id}>{selected.name}</option>}
            {catalogue.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          {total === 0 && <p role="status">Aucun ingrédient trouvé. Essaie un autre nom.</p>}
          {total > 20 && <div className="pagination"><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setLoading(true) }}>Précédent</button><span>Page {page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page * 20 >= total} onClick={() => { setPage(page + 1); setLoading(true) }}>Suivant</button></div>}
        </>}
      </fieldset>}
      <fieldset disabled={busy}><legend>Quantité et rangement</legend>
        <div className="quantity-fields"><label>Quantité<input inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} required placeholder="Ex. 250" /></label><label>Unité<select value={unit} disabled={!selected} onChange={event => setUnit(event.target.value)}>{choices.map(value => <option key={value} value={value}>{units[value]}</option>)}</select></label></div>
        <label>Rangement<select value={location} onChange={event => setLocation(event.target.value as Location)}>{Object.entries(locations).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </fieldset>
      <div className="form-actions"><button type="button" disabled={busy} onClick={onClose}>Annuler</button><button className="primary" disabled={busy || !selected}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  </dialog>
}
