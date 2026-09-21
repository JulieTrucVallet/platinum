import { useState } from 'react'
import { useResource } from '../lib/recipes'
import type { Category, Page, RecipeSummary, SessionProps } from '../lib/recipes'
import { LoadState, PageHeading, Pagination, RecipePhoto, RecipeTime } from '../components/RecipeParts'

export default function RecipesPage({ token, onExpired }: SessionProps) {
  const [q, setQ] = useState(''), [category, setCategory] = useState(''), [page, setPage] = useState(1)
  const categories = useResource<{ items: Category[] }>('/recipes/categories', token, onExpired)
  const results = useResource<Page<RecipeSummary>>(`/recipes?q=${encodeURIComponent(q)}&page=${page}&pageSize=8${category ? `&categoryId=${category}` : ''}`, token, onExpired)
  return <main id="main" className="stock-page recipes-page" tabIndex={-1}>
    <PageHeading>Les recettes</PageHeading><p className="stock-intro">Trouve une idée, partage ta recette et passe en cuisine.</p>
    <div className="recipe-toolbar"><label>Rechercher une recette ou un ingrédient<input type="search" value={q} maxLength={100} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Riz, poulet au citron…" /></label>
      <label>Catégorie<select value={category} disabled={!categories.data} onChange={e => { setCategory(e.target.value); setPage(1) }}><option value="">Toutes les catégories</option>{categories.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <a className="button-link primary" href="#/recettes/nouvelle">Nouvelle recette</a></div>
    <LoadState {...categories} retry={categories.refresh} /><LoadState {...results} retry={results.refresh} />
    {results.data && <><p role="status">{results.data.total} recette(s) trouvée(s)</p><div className="recipe-grid">{results.data.items.map(recipe => <article className="recipe-card" key={recipe.id}>
      <RecipePhoto key={recipe.imageUrl} url={recipe.imageUrl} title={recipe.title} /><div className="recipe-card-body"><span>{recipe.category.name}</span><h2><a href={`#/recettes/${recipe.id}`}>{recipe.title}</a></h2><RecipeTime preparation={recipe.preparationMinutes} cooking={recipe.cookingMinutes} servings={recipe.servings} /><a href={`#/recettes/${recipe.id}`}>Voir la recette<span className="sr-only"> : {recipe.title}</span></a></div>
    </article>)}</div>{results.data.total === 0 && <div className="empty"><h2>Aucune recette trouvée</h2><p>Essaie un autre mot ou une autre catégorie.</p></div>}<Pagination page={page} total={results.data.total} size={8} change={setPage} /></>}
  </main>
}
