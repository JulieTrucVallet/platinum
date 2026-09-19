import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { locationValue, objectFields, positiveId, referenceQuantity } from "./stock.validation";

const withIngredient = { ingredient: { select: { id: true, name: true, slug: true, unit: true } } };

export async function listStock(userId: number, query: unknown) {
  const filters = objectFields(query, ["location"]);
  const location = filters.location === undefined ? undefined : locationValue(filters.location);
  return prisma.stockItem.findMany({ where: { userId, location }, include: withIngredient, orderBy: { id: "asc" } });
}

export async function getStockItem(userId: number, id: number) {
  const item = await prisma.stockItem.findFirst({ where: { id, userId }, include: withIngredient });
  if (!item) throw new ApiError(404, "Ligne de stock introuvable");
  return item;
}

export async function createStockItem(userId: number, value: unknown) {
  const body = objectFields(value, ["ingredientId", "quantity", "unit", "location"]);
  const ingredientId = positiveId(body.ingredientId);
  const location = body.location === undefined ? "PANTRY" : locationValue(body.location);
  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient) throw new ApiError(404, "Ingrédient introuvable");
  const quantity = referenceQuantity(body.quantity, body.unit, ingredient.unit);
  return prisma.stockItem.create({ data: { userId, ingredientId, quantity, location }, include: withIngredient });
}

export async function updateStockItem(userId: number, id: number, value: unknown) {
  const body = objectFields(value, ["quantity", "unit", "location"]);
  if (Object.keys(body).length === 0) throw new ApiError(400, "Aucune modification fournie");
  if ((body.quantity === undefined) !== (body.unit === undefined)) {
    throw new ApiError(400, "Fournissez ensemble la quantité et son unité");
  }
  const item = await getStockItem(userId, id);
  const quantity = body.quantity === undefined ? undefined : referenceQuantity(body.quantity, body.unit, item.ingredient.unit);
  const location = body.location === undefined ? undefined : locationValue(body.location);
  // Le propriétaire reste dans la requête d’écriture, pas uniquement dans la lecture préalable.
  return prisma.stockItem.update({ where: { id, userId }, data: { quantity, location }, include: withIngredient });
}

export async function deleteStockItem(userId: number, id: number) {
  return prisma.stockItem.delete({ where: { id, userId } });
}

export async function listIngredients(query: unknown) {
  const filters = objectFields(query, ["q", "page", "pageSize"]);
  if (filters.q !== undefined && (typeof filters.q !== "string" || filters.q.length > 100)) {
    throw new ApiError(400, "Recherche invalide (100 caractères maximum)");
  }
  const page = filters.page === undefined ? 1 : positiveId(filters.page);
  const pageSize = filters.pageSize === undefined ? 50 : positiveId(filters.pageSize);
  if (pageSize > 100 || (page - 1) * pageSize > 2147483647) throw new ApiError(400, "Pagination hors limites");
  const where = { name: { contains: (filters.q as string | undefined)?.trim() || "", mode: "insensitive" as const } };
  const [items, total] = await prisma.$transaction([
    prisma.ingredient.findMany({ where, select: { id: true, name: true, slug: true, unit: true }, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.ingredient.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
