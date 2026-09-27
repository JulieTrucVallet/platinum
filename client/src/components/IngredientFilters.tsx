import { useState } from 'react'
import type { Ingredient } from '../lib/api'
import { useResource } from '../lib/recipes'
import type { Page, SessionProps } from '../lib/recipes'
import { LoadState, Pagination } from './RecipeParts'

export default function IngredientFilters({ selected, onChange, token, onExpired }: SessionProps & { selected: Ingredient[]; onChange: (items: Ingredient[]) => void }) {
  const [q, setQ] = useState(''), [page, setPage] = useState(1)
  const result = useResource<Page<Ingredient>>(`/ingredients?q=${encodeURIComponent(q)}&page=${page}&pageSize=10`, token, onExpired)
  return <details className="ingredient-filters"><summary>Filtrer par plusieurs ingrédients ({selected.length} sélectionné(s))</summary><p>Les recettes doivent contenir tous les ingrédients sélectionnés. Ton stock n’est pas modifié.</p>
    <label>Trouver un ingrédient<input type="search" value={q} maxLength={100} onChange={e => { setQ(e.target.value); setPage(1) }} /></label>
    {selected.length > 0 && <div className="detail-actions">{selected.map(item => <button key={item.id} onClick={() => onChange(selected.filter(row => row.id !== item.id))}>Retirer {item.name}</button>)}<button onClick={() => onChange([])}>Effacer les ingrédients sélectionnés</button></div>}
    <LoadState {...result} retry={result.refresh} />{result.data && <><fieldset><legend>Ingrédients à rechercher (20 maximum)</legend>{result.data.items.map(item => <label className="check-label" key={item.id}><input type="checkbox" checked={selected.some(row => row.id === item.id)} disabled={selected.length >= 20 && !selected.some(row => row.id === item.id)} onChange={e => onChange(e.target.checked ? [...selected, item] : selected.filter(row => row.id !== item.id))} />{item.name}</label>)}</fieldset><Pagination page={page} size={10} total={result.data.total} change={setPage} /></>}
  </details>
}
