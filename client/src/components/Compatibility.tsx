import { units } from '../lib/api'
import { quantityLabel, useResource } from '../lib/recipes'
import type { SessionProps, Suggestion } from '../lib/recipes'
import { LoadState } from './RecipeParts'

export default function Compatibility({ id, token, onExpired }: SessionProps & { id: number }) {
  const result = useResource<Pick<Suggestion, 'scorePercent' | 'canCook' | 'level' | 'ingredients'>>(`/recipes/${id}/compatibility`, token, onExpired)
  return <section className="compatibility"><h3>Compatibilité avec mon stock</h3><button onClick={result.refresh}>Actualiser les quantités disponibles</button><LoadState {...result} retry={result.refresh} />
    {result.data && <><p className={`score score-${result.data.level.toLowerCase()}`}>{result.data.scorePercent} % · {result.data.canCook ? 'Tout est disponible' : 'Des ingrédients sont à compléter'}</p><p>Pour les portions indiquées dans la recette. Cette consultation ne modifie pas ton stock.</p><ul className="ingredient-status">{result.data.ingredients.map(row => <li key={row.ingredient.id}><strong>{row.ingredient.name}</strong><span>Besoin : {quantityLabel(row.required)} {units[row.unit]} · {row.ingredient.isDefaultAvailable ? 'Disponible par défaut' : `Stock : ${quantityLabel(row.available)} ${units[row.unit]}`}</span><span>{row.status === 'SUFFICIENT' ? 'Quantité suffisante' : row.status === 'UNIT_MISMATCH' ? 'À vérifier : ton stock utilise une autre unité, sans conversion automatique.' : `À compléter : ${quantityLabel(row.missing)} ${units[row.unit]}`}</span></li>)}</ul></>}
  </section>
}
