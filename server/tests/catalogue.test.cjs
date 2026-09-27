const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const {
  ingredientKey,
  readCatalogue,
  seedIngredients,
} = require("../prisma/seed-ingredients.cjs");

const database = new URL(
  process.env.DATABASE_URL || "postgresql://invalid/invalid",
);

if (
  database.pathname !== "/platinum_catalogue_test" ||
  !["127.0.0.1", "localhost"].includes(database.hostname)
) {
  throw new Error("Base isolée platinum_catalogue_test requise");
}

test("Catalogue : import répétable, conservation des données et accès depuis l'API", async () => {
  const prisma = new PrismaClient();
  let server;

  try {
    const entries = readCatalogue();

    assert.equal(entries.length, 649);
    assert.equal(
      new Set(entries.map((item) => item.slug)).size,
      entries.length,
    );
    assert.equal(ingredientKey(" Œuf "), "oeuf");
    assert.equal(ingredientKey("PÂTES"), "pates");

    const custom = await prisma.ingredient.create({
      data: { name: "Pates", slug: "pates-personnelles", unit: "PIECE" },
    });
    const user = await prisma.user.create({
      data: {
        username: "catalogue-test",
        email: "catalogue@example.invalid",
        password: "not-a-login-hash",
      },
    });
    const category = await prisma.category.create({
      data: { name: "Test", slug: "catalogue-test" },
    });
    const recipe = await prisma.recipe.create({
      data: {
        title: "Recette conservée",
        instructions: "Exemple",
        authorId: user.id,
        categoryId: category.id,
        ingredients: {
          create: { ingredientId: custom.id, quantity: "2", unit: "PIECE" },
        },
      },
      include: { ingredients: true },
    });
    const stock = await prisma.stockItem.create({
      data: {
        userId: user.id,
        ingredientId: custom.id,
        quantity: "3",
        unit: "PIECE",
      },
    });
    const before = await prisma.ingredient.findMany({ orderBy: { id: "asc" } });
    const preview = await seedIngredients(prisma, { dryRun: true });

    assert.equal(preview.inserted, 0);
    assert.deepEqual(
      await prisma.ingredient.findMany({ orderBy: { id: "asc" } }),
      before,
    );
    assert.ok(preview.planned > 600);

    const imported = await seedIngredients(prisma);

    assert.equal(imported.inserted, preview.planned);
    assert.equal(imported.total, before.length + imported.inserted);

    for (const ingredient of before) {
      assert.deepEqual(
        await prisma.ingredient.findUnique({ where: { id: ingredient.id } }),
        ingredient,
      );
    }

    assert.equal(
      await prisma.ingredient.count({ where: { slug: "pates" } }),
      0,
    );
    assert.deepEqual(
      await prisma.stockItem.findUnique({ where: { id: stock.id } }),
      stock,
    );
    assert.deepEqual(
      await prisma.recipe.findUnique({
        where: { id: recipe.id },
        include: { ingredients: true },
      }),
      recipe,
    );

    const snapshot = await prisma.ingredient.findMany({
      orderBy: { id: "asc" },
    });
    const repeated = await seedIngredients(prisma);

    assert.equal(repeated.inserted, 0);
    assert.deepEqual(
      await prisma.ingredient.findMany({ orderBy: { id: "asc" } }),
      snapshot,
    );

    require("ts-node").register({ files: true });

    const app = require("../src/app").default;

    server = await new Promise((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });

    const base = `http://127.0.0.1:${server.address().port}/api/ingredients`;
    const found = new Set();

    for (let page = 1; found.size < repeated.total; page++) {
      const response = await fetch(`${base}?page=${page}&pageSize=100`);

      assert.equal(response.status, 200);

      const data = await response.json();

      assert.equal(data.total, repeated.total);
      assert.ok(data.items.length > 0);

      for (const item of data.items) {
        assert.ok(!found.has(item.id));
        found.add(item.id);
      }
    }

    for (const query of [
      "Spaghetti",
      "Mascarpone",
      "Gochujang",
      "Œuf",
      "Crevette",
    ]) {
      const response = await fetch(`${base}?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      assert.equal(response.status, 200);
      assert.ok(data.total > 0, query);
    }

    const conflict = await prisma.ingredient.create({
      data: { name: "Conflit volontaire", slug: "pates", unit: "GRAM" },
    });
    const count = await prisma.ingredient.count();

    await assert.rejects(seedIngredients(prisma), /Identifiant déjà utilisé/);
    assert.equal(await prisma.ingredient.count(), count);
    assert.deepEqual(
      await prisma.ingredient.findUnique({ where: { id: conflict.id } }),
      conflict,
    );
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      await require("../src/config/prisma").prisma.$disconnect();
    }

    await prisma.$disconnect();
  }
});
