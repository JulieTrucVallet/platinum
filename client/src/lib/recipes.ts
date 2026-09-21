import { useEffect, useState } from 'react'
import { api, ApiError, message } from './api'
import type { Ingredient } from './api'

export type Account = { id: number; role: 'USER' | 'ADMIN' }
export type Preference = { id: number; name: string; slug: string }
export type Category = Preference
export type RecipeSummary = {
  id: number; title: string; imageUrl: string | null; servings: number;
  preparationMinutes: number; cookingMinutes: number; difficulty: string | null;
  category: Category; author: { id: number; username: string } | null; updatedAt: string
}
export type Recipe = RecipeSummary & {
  instructions: string; source: string | null;
  ingredients: { quantity: string; ingredient: Ingredient }[];
  preferences: { preference: Preference }[]
}
export type Suggestion = Pick<RecipeSummary, 'id' | 'title' | 'imageUrl' | 'servings' | 'preparationMinutes' | 'cookingMinutes'> & {
  preferences: Preference[]; scorePercent: number; sufficientCount: number; ingredientCount: number;
  canCook: boolean; level: 'GREEN' | 'ORANGE' | 'RED';
  ingredients: { ingredient: Ingredient; required: string; available: string; missing: string; status: string }[]
}
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }
export type SessionProps = { token: string; onExpired: () => void }

// A response belongs to one URL and one session. Older requests cannot replace it.
export function useResource<T>(path: string, token: string, onExpired: () => void) {
  const [revision, setRevision] = useState(0)
  const key = `${token}:${path}:${revision}`
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    api<T>(path, { token, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }) })
      .catch(error => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) onExpired()
        else setResult({ key, error: message(error) })
      })
    return () => controller.abort()
  }, [path, token, key, onExpired])
  return { data: result.key === key ? result.data : undefined, error: result.key === key ? result.error : undefined,
    loading: result.key !== key, refresh: () => setRevision(value => value + 1) }
}
export const quantityLabel = (value: string) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 })
