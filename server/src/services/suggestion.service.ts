import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { objectFields, positiveId } from "./stock.validation";
import { preferenceRelation } from "./preference.service";

export async function suggestRecipes(userId: number, value: unknown) {
  const query = objectFields(value, ["page", "pageSize"]);
  const page = query.page === undefined ? 1 : positiveId(query.page);
  const pageSize = query.pageSize === undefined ? 20 : positiveId(query.pageSize);
  if (pageSize > 100 || (page - 1) * pageSize > 2147483647) throw new ApiError(400, "Pagination hors limites");
  // All inputs belong to one consistent database snapshot.
  const { preferences, stock, recipes } = await prisma.$transaction(async tx => {
    const preferences = await tx.userPreference.findMany({ where: { userId }, ...preferenceRelation });
    const stock = await tx.stockItem.groupBy({ by: ["ingredientId"], where: { userId }, _sum: { quantity: true } });
    const recipes = await tx.recipe.findMany({ where: {
      ingredients: { some: {} },
      AND: preferences.map(row => ({ preferences: { some: { preferenceId: row.preference.id } } })),
    }, select: {
      id: true, title: true, imageUrl: true, servings: true,
      preparationMinutes: true, cookingMinutes: true,
      preferences: preferenceRelation,
      ingredients: { select: { quantity: true, ingredient: { select: { id: true, name: true, unit: true } } }, orderBy: { ingredientId: "asc" } },
    } });
    return { preferences, stock, recipes };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const quantities = new Map(stock.map(row => [row.ingredientId, row._sum.quantity ?? new Prisma.Decimal(0)]));
  const ranked = recipes.map(recipe => {
    const ingredients = recipe.ingredients.map(row => {
      const available = quantities.get(row.ingredient.id) ?? new Prisma.Decimal(0);
      const missing = Prisma.Decimal.max(row.quantity.minus(available), 0);
      return { ingredient: row.ingredient, required: row.quantity.toString(), available: available.toString(), missing: missing.toString(),
        status: missing.isZero() ? "SUFFICIENT" : available.gt(0) ? "PARTIAL" : "ABSENT" };
    });
    const sufficientCount = ingredients.filter(row => row.status === "SUFFICIENT").length;
    const ingredientCount = ingredients.length;
    const ratio = sufficientCount / ingredientCount;
    return { ...recipe, preferences: recipe.preferences.map(row => row.preference), ingredients,
      sufficientCount, ingredientCount, missingCount: ingredientCount - sufficientCount,
      scorePercent: Math.round(ratio * 100),
      level: ratio > 0.5 ? "GREEN" : ratio > 0 ? "ORANGE" : "RED",
      canCook: sufficientCount === ingredientCount };
  });
  // Compare the exact fractions before pagination, not their rounded display.
  ranked.sort((a, b) => b.sufficientCount * a.ingredientCount - a.sufficientCount * b.ingredientCount || a.missingCount - b.missingCount || a.id - b.id);
  return { items: ranked.slice((page - 1) * pageSize, page * pageSize), total: ranked.length, page, pageSize,
    appliedPreferences: preferences.map(row => row.preference) };
}
