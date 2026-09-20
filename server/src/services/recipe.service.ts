import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { recipeFilters, recipeInput } from "./recipe.validation";
import { referenceQuantity } from "./stock.validation";

import { preferenceRelation } from "./preference.service";

type Account = { id: number; role: "USER" | "ADMIN" };
const summary = {
  id: true, title: true, imageUrl: true, servings: true, preparationMinutes: true,
  cookingMinutes: true, difficulty: true, createdAt: true, updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, username: true } },
} satisfies Prisma.RecipeSelect;
const detail = {
  ...summary, instructions: true, source: true,
  preferences: preferenceRelation,
  ingredients: {
    select: { quantity: true, ingredient: { select: { id: true, name: true, slug: true, unit: true } } },
    orderBy: { ingredientId: "asc" as const },
  },
} satisfies Prisma.RecipeSelect;

function writable(id: number, account: Account): Prisma.RecipeWhereUniqueInput {
  return account.role === "ADMIN" ? { id } : { id, authorId: account.id };
}

function writeError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new ApiError(404, "Recette introuvable ou non modifiable par ce compte");
    if (["P2002", "P2034"].includes(error.code)) throw new ApiError(409, "Modification concurrente : actualisez la recette puis réessayez");
  }
  throw error;
}

async function checkedData(tx: Prisma.TransactionClient, input: ReturnType<typeof recipeInput>) {
  const { ingredients, ...fields } = input;
  const category = await tx.category.findUnique({ where: { id: fields.categoryId }, select: { id: true } });
  if (!category) throw new ApiError(400, "Catégorie inconnue");
  const catalogue = await tx.ingredient.findMany({ where: { id: { in: ingredients.map(row => row.ingredientId) } }, select: { id: true, unit: true } });
  const units = new Map(catalogue.map(row => [row.id, row.unit]));
  const rows = ingredients.map(row => {
    const unit = units.get(row.ingredientId);
    if (!unit) throw new ApiError(400, "Un ingrédient sélectionné n’existe pas dans le catalogue");
    return { ingredientId: row.ingredientId, quantity: referenceQuantity(row.quantity, row.unit, unit) };
  });
  return { fields, rows };
}

export async function listRecipes(value: unknown) {
  const { q, categoryId, ingredientIds, page, pageSize } = recipeFilters(value);
  const where: Prisma.RecipeWhereInput = {
    categoryId,
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" } },
      { ingredients: { some: { ingredient: { name: { contains: q, mode: "insensitive" } } } } },
    ] } : {}),
    AND: ingredientIds.map(ingredientId => ({ ingredients: { some: { ingredientId } } })),
  };
  const [items, total] = await prisma.$transaction([
    prisma.recipe.findMany({ where, select: summary, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.recipe.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, total, page, pageSize };
}

export async function getRecipe(id: number) {
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: detail });
  if (!recipe) throw new ApiError(404, "Recette introuvable");
  return recipe;
}

export async function createRecipe(account: Account, value: unknown) {
  const input = recipeInput(value);
  try {
    return await prisma.$transaction(async tx => {
      const { fields, rows } = await checkedData(tx, input);
      return tx.recipe.create({ data: { ...fields, authorId: account.id, ingredients: { create: rows } }, select: detail });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { return writeError(error); }
}

export async function replaceRecipe(id: number, account: Account, value: unknown) {
  const input = recipeInput(value);
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.recipe.findUnique({ where: writable(id, account), select: { id: true } });
      if (!existing) throw new ApiError(404, "Recette introuvable ou non modifiable par ce compte");
      const { fields, rows } = await checkedData(tx, input);
      return tx.recipe.update({
        where: writable(id, account),
        data: { ...fields, ingredients: { deleteMany: {}, create: rows }, preferences: { deleteMany: {} } },
        select: detail,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { return writeError(error); }
}

export async function deleteRecipe(id: number, account: Account) {
  try { await prisma.recipe.delete({ where: writable(id, account) }); }
  catch (error) { writeError(error); }
}

export function listCategories() {
  return prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
}
