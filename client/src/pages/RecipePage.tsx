import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError, message, units } from '../lib/api'
import { quantityLabel, useResource } from '../lib/recipes'
import type { Account, Preference, Recipe, SessionProps } from '../lib/recipes'
import { LoadState, PageHeading, RecipePhoto, RecipeTime } from '../components/RecipeParts'
import RecipeEditor from '../components/RecipeEditor'

function RecipeTags({ recipe, token, onExpired, onSaved }: SessionProps & { recipe: Recipe; onSaved: () => void }) {
  const catalogue = useResource<{ items: Preference[] }>('/preferences', token, onExpired)
  const [selected, setSelected] = useState(recipe.preferences.map(row => row.preference.id))
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  async function save(event: FormEvent) {
    event.preventDefault(); if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await api(`/recipes/${recipe.id}/preferences`, { token, method: 'PUT', body: { preferenceIds: selected, updatedAt: recipe.updatedAt } }); onSaved() }
    catch (error) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <form onSubmit={save} className="tag-form"><h2>Vérifier les étiquettes alimentaires</h2><p>Après relecture de la composition, coche uniquement les étiquettes que tu peux confirmer.</p><LoadState {...catalogue} retry={catalogue.refresh} /><fieldset disabled={busy}><legend>Étiquettes de cette recette</legend>{catalogue.data?.items.map(item => <label className="check-label" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e => setSelected(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />{item.name}</label>)}</fieldset>{error && <p className="error" role="alert">{error}</p>}<button disabled={busy || !catalogue.data}>{busy ? 'Enregistrement…' : 'Confirmer les étiquettes'}</button></form>
}

function RecipeDetail({ initial, account, token, onExpired, refresh }: SessionProps & { initial: Recipe; account: Account; refresh: () => void }) {
  const [recipe, setRecipe] = useState(initial), [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const lock = useRef(false)
  useEffect(() => { document.getElementById('main')?.focus(); document.getElementById('main')?.scrollIntoView() }, [editing])
  const canEdit = account.role === 'ADMIN' || recipe.author?.id === account.id
  async function remove() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await api(`/recipes/${recipe.id}`, { token, method: 'DELETE' }); window.location.hash = '/recettes' }
    catch (error) { if (error instanceof ApiError && error.status === 401) onExpired(); else setError(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  if (editing) return <><PageHeading>Modifier la recette</PageHeading><RecipeEditor recipe={recipe} token={token} onExpired={onExpired} onCancel={() => setEditing(false)} onSaved={value => { setRecipe(value); setEditing(false); setNotice('Recette enregistrée. Vérifie à nouveau ses étiquettes alimentaires.'); setConfirm(false) }} /></>
  return <><PageHeading>La recette</PageHeading><article className="recipe-sheet"><RecipePhoto key={recipe.imageUrl} url={recipe.imageUrl} title={recipe.title} /><div className="recipe-detail-body"><h2 className="recipe-title">{recipe.title}</h2><p>{recipe.category.name} · Par {recipe.author?.username ?? 'auteur non renseigné'}</p><RecipeTime preparation={recipe.preparationMinutes} cooking={recipe.cookingMinutes} servings={recipe.servings} />
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    <h3>Ingrédients</h3><ul className="ingredient-status">{recipe.ingredients.map(row => <li key={row.ingredient.id}>{quantityLabel(row.quantity)} {units[row.ingredient.unit]} de {row.ingredient.name}</li>)}</ul><h3>Préparation</h3><p className="instructions">{recipe.instructions}</p>{recipe.source && <p className="source-text">Source : {recipe.source}</p>}<p>Étiquettes : {recipe.preferences.map(row => row.preference.name).join(', ') || 'aucune étiquette confirmée'}.</p><p className="muted">Vérifie la composition ; les étiquettes ne certifient pas l’absence d’allergènes.</p>
    {canEdit && <><div className="detail-actions"><button onClick={() => setEditing(true)}>Modifier la recette</button><button onClick={refresh}>Actualiser la recette</button><button className="danger" onClick={() => setConfirm(true)}>Supprimer la recette</button></div>{confirm && <div className="delete-confirm" role="group" aria-label="Confirmation de suppression"><p>Supprimer définitivement « {recipe.title} » ?</p><button disabled={busy} onClick={() => setConfirm(false)}>Annuler la suppression</button><button className="danger" disabled={busy} onClick={remove}>Confirmer la suppression</button></div>}<RecipeTags key={recipe.updatedAt} recipe={recipe} token={token} onExpired={onExpired} onSaved={refresh} /></>}
  </div></article></>
}
export default function RecipePage({ id, account, ...session }: SessionProps & { id: number | null; account: Account }) {
  return <main id="main" className="stock-page" tabIndex={-1}><a className="button-link" href="#/recettes">Retour aux recettes</a>{id === null ? <><PageHeading>Nouvelle recette</PageHeading><RecipeEditor {...session} onCancel={() => { window.location.hash = '/recettes' }} onSaved={recipe => { window.location.hash = `/recettes/${recipe.id}` }} /></> : <ExistingRecipe key={id} id={id} account={account} {...session} />}</main>
}
function ExistingRecipe({ id, account, ...session }: SessionProps & { id: number; account: Account }) {
  const [notice, setNotice] = useState('')
  const result = useResource<{ recipe: Recipe }>(`/recipes/${id}`, session.token, session.onExpired)
  return <>{notice && <p className="notice" role="status">{notice}</p>}<LoadState {...result} retry={result.refresh} />{result.data && <RecipeDetail key={result.data.recipe.updatedAt} initial={result.data.recipe} account={account} refresh={() => { setNotice('Recette actualisée et étiquettes rechargées.'); result.refresh() }} {...session} />}</>
}
