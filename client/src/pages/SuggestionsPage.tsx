import { useState } from 'react'
import { units } from '../lib/api'
import { quantityLabel, useResource } from '../lib/recipes'
import type { Page, Preference, SessionProps, Suggestion } from '../lib/recipes'
import { LoadState, PageHeading, Pagination, RecipePhoto, RecipeTime } from '../components/RecipeParts'

export default function SuggestionsPage({ token, onExpired }: SessionProps) {
  const [page, setPage] = useState(1)
  const result = useResource<Page<Suggestion> & { appliedPreferences: Preference[] }>(`/suggestions?page=${page}&pageSize=8`, token, onExpired)
  return <main id="main" className="stock-page recipes-page" tabIndex={-1}><PageHeading>Suggestions</PageHeading>
    <p className="stock-intro">Des idées selon les quantités de ton stock et tes préférences.</p>
    <div className="suggestion-intro"><a href="#/preferences">Modifier mes préférences</a><button onClick={result.refresh}>Actualiser les suggestions</button></div>
    <LoadState {...result} retry={result.refresh} />
    {result.data && <><p>Préférences appliquées : {result.data.appliedPreferences.map(p => p.name).join(', ') || 'aucune restriction'}.</p><p className="muted">Le pourcentage compte les ingrédients disponibles en quantité suffisante. Consulter une suggestion ne retire rien de ton stock.</p>
      <div className="recipe-grid suggestions-grid">{result.data.items.map(recipe => <article className="suggestion-card" key={recipe.id}><div className="recipe-card"><RecipePhoto key={recipe.imageUrl} url={recipe.imageUrl} title={recipe.title} /><div className="recipe-card-body"><p className={`score score-${recipe.level.toLowerCase()}`}>{recipe.scorePercent} % · {recipe.sufficientCount}/{recipe.ingredientCount} ingrédients suffisants</p><h2><a href={`#/recettes/${recipe.id}`}>{recipe.title}</a></h2><RecipeTime preparation={recipe.preparationMinutes} cooking={recipe.cookingMinutes} servings={recipe.servings} /><strong>{recipe.canCook ? 'Tout est disponible pour cette recette' : 'Des ingrédients sont à compléter'}</strong></div></div>
        <details><summary>Voir les quantités pour {recipe.servings} portion(s)</summary><ul className="ingredient-status">{recipe.ingredients.map(row => <li key={row.ingredient.id}><strong>{row.ingredient.name}</strong><span>Besoin : {quantityLabel(row.required)} {units[row.ingredient.unit]} · Stock : {quantityLabel(row.available)} {units[row.ingredient.unit]}</span><span>{row.status === 'SUFFICIENT' ? 'Quantité suffisante' : `À compléter : ${quantityLabel(row.missing)} ${units[row.ingredient.unit]}`}</span></li>)}</ul><a href={`#/recettes/${recipe.id}`}>Lire la recette</a></details></article>)}</div>
      {result.data.total === 0 && <div className="empty"><h2>Aucune recette compatible pour le moment</h2><p>Aucune recette ne porte toutes les étiquettes correspondant à tes choix. Tu peux consulter <a href="#/recettes">le catalogue</a> ou revoir tes préférences.</p></div>}<Pagination page={page} total={result.data.total} size={8} change={setPage} /></>}
  </main>
}
