const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");
const { seedIngredients } = require("../prisma/seed-ingredients.cjs");
const {
  readRecipes,
  seedRecipes,
  recipeSource,
} = require("../prisma/seed-recipes.cjs");

const database = new URL(
  process.env.DATABASE_URL || "postgresql://invalid/invalid",
);

if (
  database.pathname !== "/platinum_recipe_catalogue_test" ||
  !["127.0.0.1", "localhost"].includes(database.hostname)
) {
  throw new Error("Base isolée platinum_recipe_catalogue_test requise");
}

test("Recettes : import atomique, répétable, préservation, filtres et suggestions", async () => {
  const prisma = new PrismaClient();
  let server;

  try {
    const catalogue = readRecipes();

    assert.equal(catalogue.length, 50);

    const countBefore = await prisma.recipe.count();
    const categoriesBefore = await prisma.category.findMany();

    await assert.rejects(
      seedRecipes(prisma, { dryRun: false }),
      /Ingrédient absent/,
    );
    assert.equal(await prisma.recipe.count(), countBefore);
    assert.deepEqual(await prisma.category.findMany(), categoriesBefore);

    await seedIngredients(prisma);

    const ingredientsBefore = await prisma.ingredient.findMany({
      orderBy: { id: "asc" },
    });
    const user = await prisma.user.create({
      data: {
        username: "recipes-catalogue",
        email: "recipes-catalogue@example.invalid",
        password: "not-a-login-hash",
      },
    });
    const category = await prisma.category.upsert({
      where: { slug: "plat" },
      update: {},
      create: { name: "Plats conservés", slug: "plat" },
    });
    const rice = await prisma.ingredient.findUniqueOrThrow({
      where: { slug: "riz" },
    });
    const stock = await prisma.stockItem.create({
      data: {
        userId: user.id,
        ingredientId: rice.id,
        quantity: "200",
        unit: "GRAM",
      },
    });
    const ownRecipe = await prisma.recipe.create({
      data: {
        title: catalogue[0].title,
        instructions: "Ma recette personnelle",
        servings: 3,
        authorId: user.id,
        categoryId: category.id,
        ingredients: {
          create: { ingredientId: rice.id, quantity: "150", unit: "GRAM" },
        },
      },
      include: { ingredients: true, preferences: true },
    });
    const preview = await seedRecipes(prisma);

    assert.equal(preview.planned, 49);
    assert.equal(preview.inserted, 0);
    assert.equal(await prisma.recipe.count(), countBefore + 1);

    const cliPreview = spawnSync(
      process.execPath,
      ["prisma/seed-recipes.cjs"],
      {
        cwd: require("node:path").join(__dirname, ".."),
        env: process.env,
        encoding: "utf8",
      },
    );

    assert.equal(cliPreview.status, 0, cliPreview.stderr);
    assert.equal(JSON.parse(cliPreview.stdout).dryRun, true);
    assert.equal(await prisma.recipe.count(), countBefore + 1);

    const results = await Promise.all([
      seedRecipes(prisma, { dryRun: false }),
      seedRecipes(prisma, { dryRun: false }),
    ]);

    assert.deepEqual(
      results.map((result) => result.inserted).sort((a, b) => a - b),
      [0, 49],
    );
    assert.equal(await prisma.recipe.count(), countBefore + 50);
    assert.deepEqual(
      await prisma.recipe.findUnique({
        where: { id: ownRecipe.id },
        include: { ingredients: true, preferences: true },
      }),
      ownRecipe,
    );
    assert.deepEqual(
      await prisma.stockItem.findUnique({ where: { id: stock.id } }),
      stock,
    );
    assert.deepEqual(
      await prisma.ingredient.findMany({ orderBy: { id: "asc" } }),
      ingredientsBefore,
    );
    assert.deepEqual(
      await prisma.category.findUnique({ where: { id: category.id } }),
      category,
    );

    require("ts-node").register({ files: true });

    const { recipeInput } = require("../src/services/recipe.validation");
    const { measuredQuantity } = require("../src/services/stock.validation");
    const added = await prisma.recipe.findMany({
      where: { source: { startsWith: "Catalogue Platinum — " } },
      include: {
        ingredients: { include: { ingredient: true } },
        preferences: { include: { preference: true } },
      },
    });

    for (const row of added) {
      recipeInput({
        title: row.title,
        instructions: row.instructions,
        categoryId: row.categoryId,
        servings: row.servings,
        preparationMinutes: row.preparationMinutes,
        cookingMinutes: row.cookingMinutes,
        difficulty: row.difficulty,
        source: row.source,
        imageUrl: row.imageUrl,
        ingredients: row.ingredients.map((part) => ({
          ingredientId: part.ingredientId,
          quantity: part.quantity.toString(),
          unit: part.unit,
        })),
      });

      for (const part of row.ingredients) {
        measuredQuantity(
          part.quantity.toString(),
          part.unit,
          part.ingredient.unit,
        );
      }

      assert.equal(row.authorId, null);
      assert.ok(row.instructions.includes("4. "));
    }

    const modified = added[0];

    await prisma.recipe.update({
      where: { id: modified.id },
      data: {
        title: "Titre personnalisé après import",
        instructions: "Adaptation personnelle conservée",
      },
    });

    const snapshot = await prisma.recipe.findMany({
      orderBy: { id: "asc" },
      include: { ingredients: true, preferences: true },
    });
    const repeat = await seedRecipes(prisma, { dryRun: false });

    assert.equal(repeat.inserted, 0);
    assert.deepEqual(
      await prisma.recipe.findMany({
        orderBy: { id: "asc" },
        include: { ingredients: true, preferences: true },
      }),
      snapshot,
    );

    const app = require("../src/app").default;

    server = await new Promise((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });

    const base = `http://127.0.0.1:${server.address().port}/api`;
    const first = await fetch(`${base}/recipes?pageSize=10`).then((response) =>
      response.json(),
    );
    const second = await fetch(`${base}/recipes?pageSize=10&page=2`).then(
      (response) => response.json(),
    );

    assert.equal(first.total, 50);
    assert.equal(first.items.length, 10);
    assert.equal(second.items.length, 10);
    assert.ok(
      !first.items.some((a) => second.items.some((b) => a.id === b.id)),
    );

    const dessert = await prisma.category.findUniqueOrThrow({
      where: { slug: "dessert" },
    });
    const desserts = await fetch(
      `${base}/recipes?categoryId=${dessert.id}`,
    ).then((response) => response.json());

    assert.equal(desserts.total, 12);

    const smoothieDefinition = catalogue.find(
      (recipe) => recipe.key === "smoothie-fraise",
    );
    const smoothie = added.find(
      (recipe) => recipe.source === recipeSource(smoothieDefinition),
    );

    for (const part of smoothie.ingredients) {
      await prisma.stockItem.create({
        data: {
          userId: user.id,
          ingredientId: part.ingredientId,
          quantity: part.quantity,
          unit: part.unit,
        },
      });
    }

    const vegan = await prisma.foodPreference.findUniqueOrThrow({
      where: { slug: "vegetalien" },
    });

    await prisma.userPreference.create({
      data: { userId: user.id, preferenceId: vegan.id },
    });

    const token = require("jsonwebtoken").sign(
      { id: user.id, role: "USER" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    const suggestionsResponse = await fetch(
      `${base}/suggestions?pageSize=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const suggestions = await suggestionsResponse.json();

    assert.equal(suggestionsResponse.status, 200);
    assert.ok(suggestions.items.length > 0);
    assert.equal(
      suggestions.items.find((recipe) => recipe.id === smoothie.id).canCook,
      true,
    );
    assert.ok(
      suggestions.items.every((recipe) =>
        recipe.preferences.some(
          (preference) => preference.slug === "vegetalien",
        ),
      ),
    );
    assert.ok(
      !suggestions.items.some(
        (recipe) => recipe.title === "Poulet au curry et lait de coco",
      ),
    );
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      await require("../src/config/prisma").prisma.$disconnect();
    }

    await prisma.$disconnect();
  }
});
