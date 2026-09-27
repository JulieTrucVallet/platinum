const database = new URL(
  process.env.DATABASE_URL || "postgresql://invalid/invalid",
);

if (
  database.pathname !== "/platinum_units_test" ||
  !["127.0.0.1", "localhost"].includes(database.hostname)
)
  throw new Error("Base isolée platinum_units_test requise");

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET de test requis");

require("ts-node").register({ files: true });

const { test, before, after } = require("node:test");

const assert = require("node:assert/strict");

const app = require("../src/app").default;

const { prisma } = require("../src/config/prisma");

let server, base, token, userId, carrot, category, recipe, stock;

async function request(path, method = "GET", body) {
  const r = await fetch(base + "/api" + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: r.status, body: r.status === 204 ? null : await r.json() };
}

const payload = (unit) => ({
  title: "Deux carottes",
  instructions: "Préparer les carottes.",
  servings: 2,
  preparationMinutes: 5,
  cookingMinutes: 10,
  categoryId: category.id,
  ingredients: [{ ingredientId: carrot.id, quantity: 2, unit }],
});

const compatible = async () =>
  (await request(`/recipes/${recipe.id}/compatibility`)).body;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;

  const body = {
    username: "units-user",
    email: "units@example.test",
    password: "Test-units-2026!",
  };

  userId = (await request("/auth/register", "POST", body)).body.user.id;
  token = (await request("/auth/login", "POST", body)).body.token;
  carrot = await prisma.ingredient.create({
    data: { name: "Carotte", slug: "carotte", unit: "GRAM" },
  });
  category = await prisma.category.create({
    data: { name: "Plat", slug: "plat" },
  });
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));

  await prisma.$disconnect();
});

test("Recette en pièces : création, lecture et modification conservent les pièces", async () => {
  const created = await request("/recipes", "POST", payload("PIECE"));

  assert.equal(created.status, 201);
  recipe = created.body.recipe;
  assert.equal(recipe.ingredients[0].unit, "PIECE");
  assert.equal(recipe.ingredients[0].quantity, "2");

  const read = (await request(`/recipes/${recipe.id}`)).body.recipe;

  assert.equal(read.ingredients[0].unit, "PIECE");
  assert.equal(
    (await request(`/recipes/${recipe.id}`, "PUT", payload("PIECE"))).body
      .recipe.ingredients[0].unit,
    "PIECE",
  );
});

test("Stock en pièces : 2 carottes correspondent à 2 carottes, sans conversion en grammes", async () => {
  const r = await request("/stock", "POST", {
    ingredientId: carrot.id,
    quantity: 2,
    unit: "PIECE",
    location: "PANTRY",
  });

  assert.equal(r.status, 201);
  stock = r.body.item;
  assert.equal(stock.unit, "PIECE");
  assert.equal(stock.quantity, "2");
  assert.equal((await compatible()).canCook, true);
  assert.equal((await request("/suggestions")).body.items[0].scorePercent, 100);
});

test("Poids et pièces différents : avertissement, jamais de faux positif", async () => {
  const r = await request(`/stock/${stock.id}`, "PATCH", {
    quantity: 500,
    unit: "GRAM",
  });

  assert.equal(r.status, 200);
  assert.equal(r.body.item.unit, "GRAM");

  const result = await compatible();

  assert.equal(result.canCook, false);
  assert.equal(result.ingredients[0].status, "UNIT_MISMATCH");
  assert.equal(result.ingredients[0].available, "0");

  const suggestion = (await request("/suggestions")).body.items.find(
    (x) => x.id === recipe.id,
  );

  assert.deepEqual(suggestion.ingredients, result.ingredients);
});

test("Deux rangements de mesures différentes ne sont jamais additionnés", async () => {
  await request("/stock", "POST", {
    ingredientId: carrot.id,
    quantity: 1,
    unit: "PIECE",
    location: "FRIDGE",
  });

  const r = await compatible();

  assert.equal(r.ingredients[0].available, "1");
  assert.equal(r.ingredients[0].status, "UNIT_MISMATCH");
  assert.equal(r.canCook, false);
  await request(`/stock/${stock.id}`, "PATCH", { quantity: 1, unit: "PIECE" });
  assert.equal((await compatible()).ingredients[0].available, "2");
  assert.equal((await compatible()).canCook, true);
});

test("Conversion kg/g toujours exacte ; les pièces ne couvrent pas le poids requis", async () => {
  await request(`/recipes/${recipe.id}`, "PUT", {
    ...payload("KILOGRAM"),
    ingredients: [
      { ingredientId: carrot.id, quantity: "0.2", unit: "KILOGRAM" },
    ],
  });

  const read = (await request(`/recipes/${recipe.id}`)).body.recipe;

  assert.equal(read.ingredients[0].unit, "GRAM");
  assert.equal(read.ingredients[0].quantity, "200");
  assert.equal((await compatible()).ingredients[0].status, "UNIT_MISMATCH");
  await request(`/stock/${stock.id}`, "PATCH", {
    quantity: "0.2",
    unit: "KILOGRAM",
  });
  assert.equal((await compatible()).canCook, true);
  assert.equal((await compatible()).ingredients[0].available, "200");
});

test("Données historiques sans unité explicite : unité du catalogue conservée", async () => {
  await prisma.recipeIngredient.update({
    where: {
      recipeId_ingredientId: { recipeId: recipe.id, ingredientId: carrot.id },
    },
    data: { unit: null },
  });
  await prisma.stockItem.update({
    where: { id: stock.id },
    data: { unit: null },
  });
  assert.equal((await compatible()).canCook, true);
  assert.equal((await compatible()).ingredients[0].unit, "GRAM");
});

test("Liquides sans conversion en pièces ; filets de poulet identifiés séparément", async () => {
  const water = await prisma.ingredient.create({
    data: { name: "Eau", slug: "eau", unit: "MILLILITER" },
  });

  assert.equal(
    (
      await request("/stock", "POST", {
        ingredientId: water.id,
        quantity: 2,
        unit: "PIECE",
      })
    ).status,
    400,
  );

  const filet = await prisma.ingredient.findUnique({
    where: { slug: "filet-de-poulet" },
  });

  assert.equal(filet.unit, "PIECE");

  const r = await request("/recipes", "POST", {
    ...payload("PIECE"),
    title: "Deux filets de poulet",
    ingredients: [{ ingredientId: filet.id, quantity: 2, unit: "PIECE" }],
  });

  assert.equal(r.status, 201);
  assert.equal(r.body.recipe.ingredients[0].quantity, "2");
});
