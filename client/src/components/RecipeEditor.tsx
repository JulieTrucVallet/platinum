import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError, message, units } from '../lib/api'
import type { Ingredient } from '../lib/api'
import { useResource } from '../lib/recipes'
import type { Category, Page, Recipe, SessionProps } from '../lib/recipes'
import { LoadState, Pagination } from './RecipeParts'

type Row = { ingredient: Ingredient; quantity: string; unit: string }
export default function RecipeEditor({ recipe, token, onExpired, onSaved, onCancel }: SessionProps & {
  recipe?: Recipe; onSaved: (recipe: Recipe) => void; onCancel: () => void
}) {
  const categories = useResource<{ items: Category[] }>('/recipes/categories', token, onExpired)
  const [q, setQ] = useState(''), [page, setPage] = useState(1)
  const catalogue = useResource<Page<Ingredient>>(`/ingredients?q=${encodeURIComponent(q)}&page=${page}&pageSize=20`, token, onExpired)
  const [rows, setRows] = useState<Row[]>(recipe?.ingredients.map(row => ({ ...row, unit: row.ingredient.unit })) ?? [])
  const [picked, setPicked] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const lock = useRef(false)
  function addIngredient() {
    const ingredient = catalogue.data?.items.find(item => item.id === Number(picked))
    if (ingredient && !rows.some(row => row.ingredient.id === ingredient.id)) {
      setRows([...rows, { ingredient, quantity: '', unit: ingredient.unit }]); setPicked('')
    }
  }
  function updateRow(id: number, values: Partial<Row>) { setRows(rows.map(row => row.ingredient.id === id ? { ...row, ...values } : row)) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return
    const form = new FormData(event.currentTarget)
    if (!rows.length) { setError('Ajoute au moins un ingrédient.'); return }
    if (rows.some(row => !/^\d{1,9}(\.\d{1,3})?$/.test(row.quantity.replace(',', '.')) || Number(row.quantity.replace(',', '.')) <= 0)) { setError('Chaque ingrédient doit avoir une quantité positive, avec au plus trois décimales.'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const body = { title: form.get('title'), instructions: form.get('instructions'), categoryId: Number(form.get('categoryId')),
        servings: Number(form.get('servings')), preparationMinutes: Number(form.get('preparationMinutes')), cookingMinutes: Number(form.get('cookingMinutes')),
        difficulty: form.get('difficulty') || null, imageUrl: form.get('imageUrl') || null, source: form.get('source') || null,
        ingredients: rows.map(row => ({ ingredientId: row.ingredient.id, quantity: row.quantity.replace(',', '.'), unit: row.unit })) }
      const result = await api<{ recipe: Recipe }>(recipe ? `/recipes/${recipe.id}` : '/recipes', { token, method: recipe ? 'PUT' : 'POST', body })
      onSaved(result.recipe)
    } catch (error) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <form className="recipe-sheet recipe-editor" onSubmit={submit} aria-busy={busy}>
    {recipe && <p className="notice">Modifier cette recette retire ses étiquettes alimentaires. Vérifie-les à nouveau après l’enregistrement. Les quantités correspondent au nombre total de portions indiqué.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <fieldset disabled={busy}><legend>La recette</legend>
      <label>Titre<input name="title" defaultValue={recipe?.title} required maxLength={150} /></label>
      <label>Adresse de la photo (facultatif)<input name="imageUrl" type="url" defaultValue={recipe?.imageUrl ?? ''} maxLength={2048} placeholder="https://…" /></label>
      <LoadState {...categories} retry={categories.refresh} />
      {categories.data && <label>Catégorie<select name="categoryId" required defaultValue={recipe?.category.id ?? ''}><option value="">Choisir une catégorie</option>{categories.data.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <div className="form-grid"><label>Portions<input name="servings" type="number" min="1" max="2147483647" step="1" defaultValue={recipe?.servings ?? 2} required /></label><label>Préparation (min)<input name="preparationMinutes" type="number" min="0" max="2147483647" step="1" defaultValue={recipe?.preparationMinutes ?? 10} required /></label><label>Cuisson (min)<input name="cookingMinutes" type="number" min="0" max="2147483647" step="1" defaultValue={recipe?.cookingMinutes ?? 0} required /></label></div>
      <label>Difficulté<select name="difficulty" defaultValue={recipe?.difficulty ?? ''}><option value="">Non précisée</option><option value="EASY">Facile</option><option value="MEDIUM">Moyenne</option><option value="HARD">Difficile</option></select></label>
    </fieldset>
    <fieldset disabled={busy}><legend>Ingrédients pour toutes les portions</legend>
      {rows.map(row => <div className="composition-row" key={row.ingredient.id}><strong>{row.ingredient.name}</strong><label>Quantité de {row.ingredient.name}<input required inputMode="decimal" value={row.quantity} onChange={e => updateRow(row.ingredient.id, { quantity: e.target.value })} /></label><label>Unité de {row.ingredient.name}<select value={row.unit} onChange={e => updateRow(row.ingredient.id, { unit: e.target.value })}>{(row.ingredient.unit === 'GRAM' ? ['GRAM', 'KILOGRAM'] : row.ingredient.unit === 'MILLILITER' ? ['MILLILITER', 'LITER'] : ['PIECE']).map(unit => <option key={unit} value={unit}>{units[unit]}</option>)}</select></label><button type="button" aria-label={`Retirer ${row.ingredient.name} de la recette`} onClick={() => setRows(rows.filter(item => item !== row))}>Retirer</button></div>)}
      <label>Rechercher dans le catalogue<input type="search" value={q} maxLength={100} onChange={e => { setQ(e.target.value); setPage(1); setPicked('') }} /></label>
      <LoadState {...catalogue} retry={catalogue.refresh} />
      {catalogue.data && <><label>Ingrédient à ajouter<select value={picked} onChange={e => setPicked(e.target.value)}><option value="">Choisir un ingrédient</option>{catalogue.data.items.filter(item => !rows.some(row => row.ingredient.id === item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{catalogue.data.total === 0 && <p>Aucun ingrédient trouvé.</p>}<Pagination page={page} total={catalogue.data.total} size={20} change={value => { setPage(value); setPicked('') }} /></>}
      <button type="button" disabled={!picked || catalogue.loading || rows.length >= 100} onClick={addIngredient}>Ajouter à la composition</button>
    </fieldset>
    <fieldset disabled={busy}><legend>Préparation</legend><label>Étapes de la recette<textarea name="instructions" defaultValue={recipe?.instructions} required maxLength={20000} rows={8} /></label><label>Source ou lien (facultatif)<input name="source" defaultValue={recipe?.source ?? ''} maxLength={500} /></label></fieldset>
    <div className="form-actions"><button type="button" disabled={busy} onClick={onCancel}>Annuler</button><button className="primary" disabled={busy || !categories.data}>{busy ? 'Enregistrement…' : 'Enregistrer la recette'}</button></div>
  </form>
}
