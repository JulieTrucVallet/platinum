const fs = require("node:fs");
const path = require("node:path");
const { ingredientKey } = require("./seed-ingredients.cjs");

const categories = {
  aperitif: "Apéritif",
  plat: "Plat",
  accompagnement: "Accompagnement",
  dessert: "Dessert",
  "petit-dejeuner": "Petit déjeuner",
  boisson: "Boisson",
};

const preferences = {
  vegetarien: "Végétarien",
  vegetalien: "Végétalien",
};

function readRecipes() {
  const recipes = JSON.parse(
    fs.readFileSync(path.join(__dirname, "catalogue-recipes.json"), "utf8"),
  );
  const keys = new Set();
  const titles = new Set();

  for (const recipe of recipes) {
    const validText = (value, max) =>
      typeof value === "string" &&
      value.trim() === value &&
      value.length > 0 &&
      value.length <= max;

    if (
      !validText(recipe.key, 100) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.key) ||
      !validText(recipe.title, 150) ||
      !Object.hasOwn(categories, recipe.category) ||
      !["EASY", "MEDIUM", "HARD"].includes(recipe.difficulty) ||
      !Number.isInteger(recipe.servings) ||
      recipe.servings < 1 ||
      !Number.isInteger(recipe.preparationMinutes) ||
      recipe.preparationMinutes < 0 ||
      !Number.isInteger(recipe.cookingMinutes) ||
      recipe.cookingMinutes < 0 ||
      !Array.isArray(recipe.steps) ||
      recipe.steps.length < 3 ||
      recipe.steps.some((step) => !validText(step, 2000)) ||
      recipe.steps.join("\n\n").length > 19000 ||
      !Array.isArray(recipe.ingredients) ||
      recipe.ingredients.length < 1 ||
      recipe.ingredients.length > 100 ||
      !Array.isArray(recipe.preferences) ||
      recipe.preferences.some((slug) => !Object.hasOwn(preferences, slug)) ||
      new Set(recipe.preferences).size !== recipe.preferences.length ||
      (recipe.preferences.includes("vegetalien") &&
        !recipe.preferences.includes("vegetarien"))
    ) {
      throw new Error(`Recette invalide : ${recipe.key}`);
    }

    if (
      recipe.imageUrl !== undefined &&
      (typeof recipe.imageUrl !== "string" ||
        !/^\/images\/recipes\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/.test(
          recipe.imageUrl,
        ))
    ) {
      throw new Error(`Photo invalide : ${recipe.key}`);
    }

    const titleKey = ingredientKey(recipe.title);

    if (keys.has(recipe.key) || titles.has(titleKey)) {
      throw new Error(`Recette en double : ${recipe.title}`);
    }

    keys.add(recipe.key);
    titles.add(titleKey);

    const ingredients = new Set();

    for (const row of recipe.ingredients) {
      if (
        !validText(row.name, 100) ||
        typeof row.quantity !== "string" ||
        !/^\d{1,9}(\.\d{1,3})?$/.test(row.quantity) ||
        Number(row.quantity) <= 0 ||
        !["GRAM", "MILLILITER", "PIECE"].includes(row.unit)
      ) {
        throw new Error(`Ingrédient invalide dans ${recipe.title}`);
      }

      const key = ingredientKey(row.name);

      if (ingredients.has(key)) {
        throw new Error(`Ingrédient répété dans ${recipe.title} : ${row.name}`);
      }

      ingredients.add(key);
    }
  }

  return recipes;
}

function recipeSource(recipe) {
  return `Catalogue Platinum — ${recipe.title}`;
}

async function seedRecipes(prisma, { dryRun = true } = {}) {
  const catalogue = readRecipes();

  return prisma.$transaction(
    async (tx) => {
      if (!dryRun) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(1784, 2)`;
      }

      const existing = await tx.recipe.findMany({
        select: { title: true, source: true },
      });
      const sources = new Set(existing.map((recipe) => recipe.source));
      const titles = new Set(
        existing.map((recipe) => ingredientKey(recipe.title)),
      );
      const additions = catalogue.filter(
        (recipe) =>
          !sources.has(recipeSource(recipe)) &&
          !titles.has(ingredientKey(recipe.title)),
      );
      const ingredients = await tx.ingredient.findMany();
      const byName = new Map(
        ingredients.map((item) => [ingredientKey(item.name), item]),
      );
      const bySlug = new Map(ingredients.map((item) => [item.slug, item]));

      const resolved = additions.map((recipe) => ({
        recipe,
        rows: recipe.ingredients.map((row) => {
          const key = ingredientKey(row.name);
          const item = byName.get(key) || bySlug.get(key);

          if (!item || ingredientKey(item.name) !== key) {
            throw new Error(
              `Ingrédient absent ou ambigu : ${row.name}. Importe d'abord le catalogue d'ingrédients.`,
            );
          }

          if ((item.unit === "MILLILITER") !== (row.unit === "MILLILITER")) {
            throw new Error(
              `Unité incompatible pour ${row.name} dans ${recipe.title}`,
            );
          }

          return {
            ingredientId: item.id,
            quantity: row.quantity,
            unit: row.unit,
          };
        }),
      }));

      const categoryIds = new Map();
      const preferenceIds = new Map();

      if (!dryRun) {
        for (const { recipe, rows } of resolved) {
          if (!categoryIds.has(recipe.category)) {
            const category = await tx.category.upsert({
              where: { slug: recipe.category },
              update: {},
              create: {
                name: categories[recipe.category],
                slug: recipe.category,
              },
            });

            categoryIds.set(recipe.category, category.id);
          }

          for (const slug of recipe.preferences) {
            if (!preferenceIds.has(slug)) {
              const preference = await tx.foodPreference.upsert({
                where: { slug },
                update: {},
                create: { name: preferences[slug], slug },
              });

              preferenceIds.set(slug, preference.id);
            }
          }

          await tx.recipe.create({
            data: {
              title: recipe.title,
              source: recipeSource(recipe),
              imageUrl: recipe.imageUrl ?? null,
              instructions: recipe.steps
                .map((step, index) => `${index + 1}. ${step}`)
                .join("\n\n"),
              servings: recipe.servings,
              preparationMinutes: recipe.preparationMinutes,
              cookingMinutes: recipe.cookingMinutes,
              difficulty: recipe.difficulty,
              categoryId: categoryIds.get(recipe.category),
              ingredients: { create: rows },
              preferences: {
                create: recipe.preferences.map((slug) => ({
                  preferenceId: preferenceIds.get(slug),
                })),
              },
            },
          });
        }
      }

      return {
        catalogue: catalogue.length,
        existing: existing.length,
        preserved: catalogue.length - additions.length,
        planned: additions.length,
        inserted: dryRun ? 0 : additions.length,
        total: await tx.recipe.count(),
        dryRun,
      };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (
    args.some((argument) => !["--apply", "--dry-run"].includes(argument)) ||
    (args.includes("--apply") && args.includes("--dry-run"))
  ) {
    throw new Error("Utilise --dry-run ou --apply, séparément");
  }

  require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    quiet: true,
  });

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log(
      JSON.stringify(
        await seedRecipes(prisma, { dryRun: !args.includes("--apply") }),
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      error.code
        ? `Import interrompu (${error.code}). Aucune insertion partielle n'est conservée.`
        : error.message,
    );
    process.exitCode = 1;
  });
}

module.exports = { readRecipes, recipeSource, seedRecipes };
