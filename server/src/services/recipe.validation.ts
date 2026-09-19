import { Difficulty } from "@prisma/client";
import { ApiError } from "../utils/api-error";
import { objectFields, positiveId } from "./stock.validation";

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, `${label} obligatoire (${max} caractères maximum)`);
  }
  return value.trim();
}

function integer(value: unknown, label: string, min: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > 2147483647) {
    throw new ApiError(400, `${label} : entier supérieur ou égal à ${min} attendu`);
  }
  return value;
}

function optionalText(value: unknown, label: string, max: number): string | null {
  return value === undefined || value === null ? null : text(value, label, max);
}

export function recipeInput(value: unknown) {
  const body = objectFields(value, ["title", "instructions", "categoryId", "servings", "preparationMinutes", "cookingMinutes", "difficulty", "imageUrl", "source", "ingredients"]);
  const title = text(body.title, "Titre", 150);
  const instructions = text(body.instructions, "Instructions", 20000);
  const categoryId = positiveId(body.categoryId);
  const servings = integer(body.servings, "Nombre de portions", 1);
  const preparationMinutes = integer(body.preparationMinutes, "Temps de préparation", 0);
  const cookingMinutes = integer(body.cookingMinutes, "Temps de cuisson", 0);
  const difficulty = body.difficulty === undefined || body.difficulty === null ? null : body.difficulty;
  if (difficulty !== null && (typeof difficulty !== "string" || !Object.values(Difficulty).includes(difficulty as Difficulty))) {
    throw new ApiError(400, "Difficulté invalide");
  }
  const imageUrl = optionalText(body.imageUrl, "Adresse de l’image", 2048);
  if (imageUrl) {
    let url: URL;
    try { url = new URL(imageUrl); } catch { throw new ApiError(400, "Adresse de l’image invalide"); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new ApiError(400, "L’image doit utiliser une adresse HTTP ou HTTPS sans identifiants");
  }
  const source = optionalText(body.source, "Source", 500);
  if (!Array.isArray(body.ingredients) || body.ingredients.length < 1 || body.ingredients.length > 100) {
    throw new ApiError(400, "Une recette doit contenir entre 1 et 100 ingrédients");
  }
  const ingredients = body.ingredients.map(value => {
    const row = objectFields(value, ["ingredientId", "quantity", "unit"]);
    return { ingredientId: positiveId(row.ingredientId), quantity: row.quantity, unit: row.unit };
  });
  if (new Set(ingredients.map(row => row.ingredientId)).size !== ingredients.length) {
    throw new ApiError(400, "Un ingrédient ne peut apparaître qu’une fois dans la recette");
  }
  return { title, instructions, categoryId, servings, preparationMinutes, cookingMinutes, difficulty: difficulty as Difficulty | null, imageUrl, source, ingredients };
}

export function recipeFilters(value: unknown) {
  const query = objectFields(value, ["q", "categoryId", "ingredientIds", "page", "pageSize"]);
  if (query.q !== undefined && (typeof query.q !== "string" || query.q.length > 100)) throw new ApiError(400, "Recherche invalide (100 caractères maximum)");
  const q = (query.q as string | undefined)?.trim();
  const categoryId = query.categoryId === undefined ? undefined : positiveId(query.categoryId);
  let ingredientIds: number[] = [];
  if (query.ingredientIds !== undefined) {
    if (typeof query.ingredientIds !== "string" || query.ingredientIds.length > 250) throw new ApiError(400, "Liste d’ingrédients invalide");
    ingredientIds = query.ingredientIds.split(",").map(positiveId);
    if (ingredientIds.length > 20 || new Set(ingredientIds).size !== ingredientIds.length) throw new ApiError(400, "Choisissez au maximum 20 ingrédients distincts");
  }
  const page = query.page === undefined ? 1 : positiveId(query.page);
  const pageSize = query.pageSize === undefined ? 20 : positiveId(query.pageSize);
  if (pageSize > 100 || (page - 1) * pageSize > 2147483647) throw new ApiError(400, "Pagination hors limites");
  return { q, categoryId, ingredientIds, page, pageSize };
}
