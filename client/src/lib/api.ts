export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

export async function api<T>(path: string, options: { token?: string; method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET', signal: options.signal,
      headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Le serveur est inaccessible. Vérifie ta connexion puis réessaie.')
  }
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, body?.message ?? 'Une erreur est survenue. Réessaie dans un instant.')
  if (!body) throw new ApiError(0, 'La réponse du serveur est invalide. Réessaie dans un instant.')
  return body as T
}

export function message(error: unknown) { return error instanceof Error ? error.message : 'Une erreur est survenue.' }
export type Ingredient = { id: number; name: string; slug: string; unit: 'GRAM' | 'MILLILITER' | 'PIECE' }
export type Location = 'FRIDGE' | 'FREEZER' | 'PANTRY' | 'CONDIMENTS'
export type StockItem = { id: number; quantity: string; location: Location; ingredient: Ingredient }
export const locations: Record<Location, string> = { FRIDGE: 'Frigo', FREEZER: 'Congélateur', PANTRY: 'Placard', CONDIMENTS: 'Condiments' }
export const units: Record<string, string> = { GRAM: 'g', KILOGRAM: 'kg', MILLILITER: 'ml', LITER: 'l', PIECE: 'pièce(s)' }
