import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { objectFields, positiveId } from "./stock.validation";

const selection = { id: true, name: true, slug: true };
export const preferenceRelation = {
  select: { preference: { select: selection } }, orderBy: { preferenceId: "asc" as const },
};

function ids(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > 20) throw new ApiError(400, "Choisissez au maximum 20 préférences");
  const result = value.map(positiveId);
  if (new Set(result).size !== result.length) throw new ApiError(400, "Préférences en double");
  return result;
}
async function checkCatalogue(tx: Prisma.TransactionClient, preferenceIds: number[]) {
  const count = await tx.foodPreference.count({ where: { id: { in: preferenceIds } } });
  if (count !== preferenceIds.length) throw new ApiError(400, "Préférence inconnue");
}
function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034", "P2025"].includes(error.code)) {
    throw new ApiError(409, "Modification concurrente : actualisez puis réessayez");
  }
  throw error;
}
export function listPreferences() {
  return prisma.foodPreference.findMany({ select: selection, orderBy: { id: "asc" } });
}
export async function getUserPreferences(userId: number) {
  const rows = await prisma.userPreference.findMany({ where: { userId }, ...preferenceRelation });
  return rows.map(row => row.preference);
}
export async function replaceUserPreferences(userId: number, value: unknown) {
  const body = objectFields(value, ["preferenceIds"]);
  const preferenceIds = ids(body.preferenceIds);
  try {
    return await prisma.$transaction(async tx => {
      await checkCatalogue(tx, preferenceIds);
      const result = await tx.user.update({ where: { id: userId }, data: {
        preferences: { deleteMany: {}, create: preferenceIds.map(preferenceId => ({ preferenceId })) },
      }, select: { preferences: preferenceRelation } });
      return result.preferences.map(row => row.preference);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { return conflict(error); }
}

export async function replaceRecipePreferences(recipeId: number, account: { id: number; role: "USER" | "ADMIN" }, value: unknown) {
  const body = objectFields(value, ["preferenceIds", "updatedAt"]);
  const preferenceIds = ids(body.preferenceIds);
  if (typeof body.updatedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(body.updatedAt) || !Number.isFinite(Date.parse(body.updatedAt))) {
    throw new ApiError(400, "Version updatedAt de la recette requise (date ISO UTC)");
  }
  const expected = new Date(body.updatedAt);
  try {
    return await prisma.$transaction(async tx => {
      const where = account.role === "ADMIN" ? { id: recipeId } : { id: recipeId, authorId: account.id };
      const recipe = await tx.recipe.findUnique({ where, select: { updatedAt: true } });
      if (!recipe) throw new ApiError(404, "Recette introuvable ou non modifiable par ce compte");
      if (recipe.updatedAt.getTime() !== expected.getTime()) throw new ApiError(409, "La recette a changé : relisez sa composition avant de confirmer ses préférences");
      await checkCatalogue(tx, preferenceIds);
      const result = await tx.recipe.update({ where: { ...where, updatedAt: expected }, data: {
        // Also advance the recipe version when only its tags change.
        updatedAt: new Date(Math.max(Date.now(), expected.getTime() + 1)),
        preferences: { deleteMany: {}, create: preferenceIds.map(preferenceId => ({ preferenceId })) },
      }, select: { id: true, updatedAt: true, preferences: preferenceRelation } });
      return { ...result, preferences: result.preferences.map(row => row.preference) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { return conflict(error); }
}
