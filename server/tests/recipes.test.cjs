const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (database.pathname !== '/platinum_recipes_test' || !['127.0.0.1', 'localhost'].includes(database.hostname)) {
  throw new Error('DATABASE_URL doit cibler platinum_recipes_test sur localhost');
}
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET de test requis');
require('ts-node').register({ files: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const app = require('../src/app').default;
const { prisma } = require('../src/config/prisma');
const suffix = randomUUID();
const userIds = [], ingredientIds = [], categoryIds = [], recipeIds = [];
let server, base, alice, bob, admin, rice, water, category, otherCategory;

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function account(label) {
  const email = `${label}-${suffix}@example.test`;
  const password = 'Test-recipes-2026!';
  const registered = await request('/api/auth/register', { method: 'POST', body: { email, username: `${label}-${suffix}`, password } });
  assert.equal(registered.status, 201); userIds.push(registered.body.user.id);
  const result = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(result.status, 200);
  return { ...result.body.user, token: result.body.token };
}
function payload(overrides = {}) {
  return { title: 'PlatTest riz', instructions: 'Cuire le riz dans l’eau.', categoryId: category.id, servings: 2, preparationMinutes: 5, cookingMinutes: 20,
    ingredients: [{ ingredientId: rice.id, quantity: '0.2', unit: 'KILOGRAM' }, { ingredientId: water.id, quantity: '0.4', unit: 'LITER' }], ...overrides };
}
async function create(overrides = {}, token = alice.token) {
  const result = await request('/api/recipes', { method: 'POST', token, body: payload(overrides) });
  if (result.status === 201) recipeIds.push(result.body.recipe.id);
  return result;
}
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  alice = await account('alice'); bob = await account('bob'); admin = await account('admin');
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  for (const [name, unit] of [['Riz', 'GRAM'], ['Eau', 'MILLILITER']]) {
    const row = await prisma.ingredient.create({ data: { name, slug: `${name}-${suffix}`, unit } });
    ingredientIds.push(row.id); if (unit === 'GRAM') rice = row; else water = row;
  }
  for (const name of ['Plat', 'Dessert']) {
    const row = await prisma.category.create({ data: { name, slug: `${name}-${suffix}` } });
    categoryIds.push(row.id); if (name === 'Plat') category = row; else otherCategory = row;
  }
});
after(async () => {
  try {
    await prisma.recipe.deleteMany({ where: { categoryId: { in: categoryIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.ingredient.deleteMany({ where: { id: { in: ingredientIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});

test('Consultation publique, catégories et détail sans données sensibles', async () => {
  assert.equal((await request('/api/recipes/categories')).body.items.length, 2);
  const created = await create(); assert.equal(created.status, 201);
  const recipe = created.body.recipe;
  assert.equal(recipe.author.id, alice.id);
  assert.equal(recipe.ingredients.find(r => r.ingredient.id === rice.id).quantity, '200');
  const read = await request(`/api/recipes/${recipe.id}`); assert.equal(read.status, 200);
  assert.deepEqual(Object.keys(read.body.recipe.author).sort(), ['id', 'username']);
  assert.equal(JSON.stringify(read.body).includes('@example.test'), false);
  assert.equal(read.body.recipe.ingredients.find(r => r.ingredient.id === water.id).quantity, '400');
  assert.equal((await request('/api/recipes/2147483647')).status, 404);
});

test('Toutes les écritures nécessitent un compte authentifié', async () => {
  for (const [method, path] of [['POST', '/api/recipes'], ['PUT', `/api/recipes/${recipeIds[0]}`], ['DELETE', `/api/recipes/${recipeIds[0]}`]]) {
    assert.equal((await request(path, { method, body: method === 'DELETE' ? undefined : payload() })).status, 401);
  }
});

test('Recherche publique par titre, nom d’ingrédient, catégorie et ingrédients cumulés', async () => {
  const dessert = await create({ title: 'DessertTest', categoryId: otherCategory.id, ingredients: [{ ingredientId: water.id, quantity: 250, unit: 'MILLILITER' }] });
  assert.equal(dessert.status, 201);
  assert.equal((await request('/api/recipes?q=plattest')).body.total, 1);
  assert.equal((await request('/api/recipes?q=riz')).body.total, 1);
  assert.equal((await request(`/api/recipes?categoryId=${otherCategory.id}`)).body.items[0].id, dessert.body.recipe.id);
  const both = await request(`/api/recipes?ingredientIds=${rice.id},${water.id}`);
  assert.equal(both.body.total, 1); assert.equal(both.body.items[0].id, recipeIds[0]);
  assert.equal((await request('/api/recipes?ingredientIds=2147483647')).body.total, 0);
  const first = await request('/api/recipes?pageSize=1&page=1');
  const second = await request('/api/recipes?pageSize=1&page=2');
  assert.equal(first.body.total, 2); assert.notEqual(first.body.items[0].id, second.body.items[0].id);
});

test('L’auteur peut remplacer sa recette, puis la supprimer sans supprimer le catalogue', async () => {
  const created = await create(); const id = created.body.recipe.id;
  const updated = await request(`/api/recipes/${id}`, { method: 'PUT', token: alice.token, body: payload({ title: 'Recette modifiée', servings: 4, ingredients: [{ ingredientId: rice.id, quantity: 400, unit: 'GRAM' }] }) });
  assert.equal(updated.status, 200); assert.equal(updated.body.recipe.ingredients.length, 1);
  assert.equal(updated.body.recipe.ingredients[0].quantity, '400'); assert.equal(updated.body.recipe.servings, 4);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'DELETE', token: alice.token })).status, 204);
  assert.equal((await request(`/api/recipes/${id}`)).status, 404);
  assert.equal(await prisma.recipeIngredient.count({ where: { recipeId: id } }), 0);
  assert.equal(await prisma.ingredient.count({ where: { id: { in: ingredientIds } } }), 2);
});

test('Un autre utilisateur ne peut pas modifier, supprimer ou usurper l’auteur', async () => {
  const id = recipeIds[0]; const before = await request(`/api/recipes/${id}`);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'PUT', token: bob.token, body: payload({ title: 'Usurpation' }) })).status, 404);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'DELETE', token: bob.token })).status, 404);
  assert.equal((await create({ authorId: bob.id })).status, 400);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'PUT', token: alice.token, body: payload({ authorId: bob.id }) })).status, 400);
  assert.deepEqual((await request(`/api/recipes/${id}`)).body, before.body);
});

test('L’administrateur peut gérer une recette d’un autre auteur sans en changer l’auteur', async () => {
  const created = await create(); const id = created.body.recipe.id;
  const updated = await request(`/api/recipes/${id}`, { method: 'PUT', token: admin.token, body: payload({ title: 'Modération' }) });
  assert.equal(updated.status, 200); assert.equal(updated.body.recipe.author.id, alice.id);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'DELETE', token: admin.token })).status, 204);
});

test('Une recette sans auteur reste publique mais sa modification est réservée à ADMIN', async () => {
  const owner = await account('removed'); const created = await create({}, owner.token); const id = created.body.recipe.id;
  await prisma.user.delete({ where: { id: owner.id } });
  assert.equal((await request(`/api/recipes/${id}`)).body.recipe.author, null);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'PUT', token: alice.token, body: payload() })).status, 404);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'DELETE', token: owner.token })).status, 401);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'PUT', token: admin.token, body: payload() })).status, 200);
  assert.equal((await request(`/api/recipes/${id}`, { method: 'DELETE', token: admin.token })).status, 204);
});

test('Corps invalides refusés sans créer de recette incomplète', async t => {
  const count = await prisma.recipe.count();
  for (const [name, values] of [
    ['titre vide', { title: '  ' }], ['titre trop long', { title: 'x'.repeat(151) }],
    ['instructions vides', { instructions: '' }], ['portions nulles', { servings: 0 }],
    ['portions fractionnaires', { servings: 1.5 }], ['temps négatif', { preparationMinutes: -1 }],
    ['temps texte', { cookingMinutes: '20' }], ['catégorie inconnue', { categoryId: 2147483647 }],
    ['difficulté invalide', { difficulty: 'UNKNOWN' }], ['image javascript', { imageUrl: 'javascript:alert(1)' }],
    ['image avec identifiants', { imageUrl: 'https://user:password@example.test/photo.jpg' }],
    ['aucun ingrédient', { ingredients: [] }], ['ingrédient inconnu', { ingredients: [{ ingredientId: 2147483647, quantity: 1, unit: 'GRAM' }] }],
    ['quantité nulle', { ingredients: [{ ingredientId: rice.id, quantity: 0, unit: 'GRAM' }] }],
    ['unité incompatible', { ingredients: [{ ingredientId: rice.id, quantity: 1, unit: 'LITER' }] }],
    ['précision excessive', { ingredients: [{ ingredientId: rice.id, quantity: '1.0001', unit: 'GRAM' }] }],
    ['doublon', { ingredients: [{ ingredientId: rice.id, quantity: 1, unit: 'GRAM' }, { ingredientId: rice.id, quantity: 2, unit: 'GRAM' }] }],
    ['champ imbriqué inconnu', { ingredients: [{ ingredientId: rice.id, quantity: 1, unit: 'GRAM', userId: bob.id }] }],
  ]) await t.test(name, async () => { assert.equal((await create(values)).status, 400); assert.equal(await prisma.recipe.count(), count); });
});

test('Filtres et identifiants mal formés refusés', async () => {
  for (const path of ['/api/recipes/abc', '/api/recipes/0', '/api/recipes?q[x]=riz', '/api/recipes?pageSize=101', '/api/recipes?page=0', '/api/recipes?ingredientIds=', `/api/recipes?ingredientIds=${rice.id},${rice.id}`, '/api/recipes?authorId=1']) {
    assert.equal((await request(path)).status, 400);
  }
});

test('Échec SQL en cours de création ou remplacement : annulation de toute la transaction', async () => {
  const created = await create(); const id = created.body.recipe.id;
  const before = (await request(`/api/recipes/${id}`)).body;
  const count = await prisma.recipe.count();
  // Contrainte de panne volontaire, uniquement dans la base dédiée aux tests.
  await prisma.$executeRawUnsafe('ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "recipe_test_failure" CHECK (quantity <> 17.123)');
  try {
    const body = payload({ title: 'Ne doit pas rester', ingredients: [{ ingredientId: rice.id, quantity: '17.123', unit: 'GRAM' }] });
    const failedCreate = await request('/api/recipes', { method: 'POST', token: alice.token, body });
    assert.equal(failedCreate.status, 500); assert.deepEqual(failedCreate.body, { message: 'Erreur interne du serveur' });
    assert.equal(await prisma.recipe.count(), count);
    const failedUpdate = await request(`/api/recipes/${id}`, { method: 'PUT', token: alice.token, body });
    assert.equal(failedUpdate.status, 500);
    assert.deepEqual((await request(`/api/recipes/${id}`)).body, before);
  } finally { await prisma.$executeRawUnsafe('ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "recipe_test_failure"'); }
});

test('Remplacements simultanés : une composition complète, sans mélange ni recette vide', async () => {
  const created = await create(); const id = created.body.recipe.id;
  const candidates = [
    payload({ title: 'Version riz', ingredients: [{ ingredientId: rice.id, quantity: 123, unit: 'GRAM' }] }),
    payload({ title: 'Version eau', ingredients: [{ ingredientId: water.id, quantity: 456, unit: 'MILLILITER' }] }),
  ];
  const results = await Promise.all(candidates.map(body => request(`/api/recipes/${id}`, { method: 'PUT', token: alice.token, body })));
  assert.ok(results.some(r => r.status === 200)); assert.ok(results.every(r => [200, 409].includes(r.status)));
  const actual = (await request(`/api/recipes/${id}`)).body.recipe;
  assert.equal(actual.ingredients.length, 1);
  const expected = candidates.find(row => row.title === actual.title);
  assert.ok(expected); assert.equal(actual.ingredients[0].ingredient.id, expected.ingredients[0].ingredientId);
  assert.equal(actual.ingredients[0].quantity, String(expected.ingredients[0].quantity));
});

test('Le remplacement invalide les anciennes étiquettes de compatibilité alimentaire', async () => {
  const created = await create(); const id = created.body.recipe.id;
  const pref = await prisma.foodPreference.create({ data: { name: 'Test', slug: suffix } });
  try {
    await prisma.recipePreference.create({ data: { recipeId: id, preferenceId: pref.id } });
    assert.equal((await request(`/api/recipes/${id}`, { method: 'PUT', token: alice.token, body: payload() })).status, 200);
    assert.equal(await prisma.recipePreference.count({ where: { recipeId: id } }), 0);
  } finally { await prisma.foodPreference.delete({ where: { id: pref.id } }); }
});
