import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { preferenceRelation } from "./preference.service";
import { objectFields, positiveId } from "./stock.validation";

export async function suggestRecipes(userId: number, value: unknown) {
  const query = objectFields(value, ["page", "pageSize"]);
  const page = query.page === undefined ? 1 : positiveId(query.page);
  const pageSize =
    query.pageSize === undefined ? 20 : positiveId(query.pageSize);

  if (pageSize > 100 || (page - 1) * pageSize > 2147483647)
    throw new ApiError(400, "Pagination hors limites");

  const { preferences, stock, recipes } = await prisma.$transaction(
    async (tx) => {
      const preferences = await tx.userPreference.findMany({
        where: { userId },
        ...preferenceRelation,
      });
      const stock = await tx.stockItem.groupBy({
        by: ["ingredientId", "unit"],
        where: { userId },
        _sum: { quantity: true },
      });
      const recipes = await tx.recipe.findMany({
        where: {
          ingredients: { some: {} },
          AND: preferences.map((row) => ({
            preferences: { some: { preferenceId: row.preference.id } },
          })),
        },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          servings: true,
          preparationMinutes: true,
          cookingMinutes: true,
          preferences: preferenceRelation,
          ingredients: {
            select: {
              quantity: true,
              unit: true,
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  isDefaultAvailable: true,
                },
              },
            },
            orderBy: { ingredientId: "asc" },
          },
        },
      });

      return { preferences, stock, recipes };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const quantities = new Map(
    stock.map((row) => [
      `${row.ingredientId}:${row.unit ?? "LEGACY"}`,
      row._sum.quantity ?? new Prisma.Decimal(0),
    ]),
  );
  const ranked = recipes.map((recipe) => ({
    ...recipe,
    preferences: recipe.preferences.map((row) => row.preference),
    ...compareIngredients(recipe.ingredients, quantities),
  }));

  ranked.sort(
    (a, b) =>
      b.sufficientCount * a.ingredientCount -
        a.sufficientCount * b.ingredientCount ||
      a.missingCount - b.missingCount ||
      a.id - b.id,
  );

  return {
    items: ranked.slice((page - 1) * pageSize, page * pageSize),
    total: ranked.length,
    page,
    pageSize,
    appliedPreferences: preferences.map((row) => row.preference),
  };
}

type IngredientRow = {
  unit: string | null;
  quantity: Prisma.Decimal;
  ingredient: {
    id: number;
    name: string;
    unit: string;
    isDefaultAvailable: boolean;
  };
};

function compareIngredients(
  rows: IngredientRow[],
  quantities: Map<string, Prisma.Decimal>,
) {
  const ingredients = rows.map((row) => {
    const unit = row.unit ?? row.ingredient.unit;
    const measured = (
      quantities.get(`${row.ingredient.id}:${unit}`) ?? new Prisma.Decimal(0)
    ).plus(
      unit === row.ingredient.unit
        ? (quantities.get(`${row.ingredient.id}:LEGACY`) ?? 0)
        : 0,
    );
    const otherUnitStock = ["GRAM", "PIECE", "MILLILITER", "LEGACY"].some(
      (key) =>
        (key === "LEGACY" ? row.ingredient.unit : key) !== unit &&
        (quantities.get(`${row.ingredient.id}:${key}`)?.gt(0) ?? false),
    );
    const available = row.ingredient.isDefaultAvailable
      ? row.quantity
      : measured;
    const missing = Prisma.Decimal.max(row.quantity.minus(available), 0);

    return {
      ingredient: row.ingredient,
      unit,
      otherUnitStock,
      required: row.quantity.toString(),
      available: available.toString(),
      missing: missing.toString(),
      status: missing.isZero()
        ? "SUFFICIENT"
        : otherUnitStock
          ? "UNIT_MISMATCH"
          : available.gt(0)
            ? "PARTIAL"
            : "ABSENT",
    };
  });
  const sufficientCount = ingredients.filter(
    (row) => row.status === "SUFFICIENT",
  ).length;
  const ingredientCount = ingredients.length;
  const ratio = ingredientCount ? sufficientCount / ingredientCount : 0;

  return {
    ingredients,
    sufficientCount,
    ingredientCount,
    missingCount: ingredientCount - sufficientCount,
    scorePercent: Math.round(ratio * 100),
    level: ratio > 0.5 ? "GREEN" : ratio > 0 ? "ORANGE" : "RED",
    canCook: ingredientCount > 0 && sufficientCount === ingredientCount,
  };
}

export async function recipeCompatibility(userId: number, id: number) {
  return prisma.$transaction(
    async (tx) => {
      const recipe = await tx.recipe.findUnique({
        where: { id },
        select: {
          ingredients: {
            select: {
              quantity: true,
              unit: true,
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  isDefaultAvailable: true,
                },
              },
            },
            orderBy: { ingredientId: "asc" },
          },
        },
      });

      if (!recipe) throw new ApiError(404, "Recette introuvable");

      const stock = await tx.stockItem.groupBy({
        by: ["ingredientId", "unit"],
        where: { userId },
        _sum: { quantity: true },
      });

      return compareIngredients(
        recipe.ingredients,
        new Map(
          stock.map((row) => [
            `${row.ingredientId}:${row.unit ?? "LEGACY"}`,
            row._sum.quantity ?? new Prisma.Decimal(0),
          ]),
        ),
      );
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
