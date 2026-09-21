import { useState } from 'react'
import type { ReactNode } from 'react'

export function PageHeading({ children }: { children: ReactNode }) {
  return <div className="stock-heading"><img src="/images/leaf.png" alt="" /><h1>{children}</h1></div>
}
export function LoadState({ loading, error, retry }: { loading: boolean; error?: string; retry: () => void }) {
  return loading ? <p role="status">Chargement…</p> : error ? <div className="error" role="alert"><p>{error}</p><button type="button" onClick={retry}>Réessayer</button></div> : null
}
export function Pagination({ page, total, size, change }: { page: number; total: number; size: number; change: (page: number) => void }) {
  return total > size ? <nav className="pagination" aria-label="Pagination des résultats"><button type="button" disabled={page <= 1} onClick={() => change(page - 1)}>Précédent</button><span>Page {page} / {Math.ceil(total / size)}</span><button type="button" disabled={page * size >= total} onClick={() => change(page + 1)}>Suivant</button></nav> : null
}
export function RecipePhoto({ url, title }: { url: string | null; title: string }) {
  const [failed, setFailed] = useState(false)
  return url && /^https?:\/\//i.test(url) && !failed
    ? <img className="recipe-photo" src={url} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <div className="recipe-no-photo">{failed ? 'Photo indisponible' : 'Recette sans photo'}</div>
}
export function RecipeTime({ preparation, cooking, servings }: { preparation: number; cooking: number; servings: number }) {
  return <p className="recipe-time"><img src="/images/clock.png" alt="" />Préparation : {preparation} min · Cuisson : {cooking} min · {servings} portion(s)</p>
}

