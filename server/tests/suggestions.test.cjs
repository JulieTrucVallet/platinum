const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (database.pathname !== '/platinum_suggestions_test' || !['127.0.0.1', 'localhost'].includes(database.hostname)) throw new Error('Base isolée platinum_suggestions_test requise');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET de test requis');
require('ts-node').register({ files: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app').default;
const { prisma } = require('../src/config/prisma');
let server, base, alice, bob, admin, rice, carrot, water, category, vegetarian, vegan, plate, drink, empty;
const users = [], ingredients = [], preferences = [];
async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function account(label) {
  const body = { username: label, email: `${label}@example.test`, password: 'Test-suggestions-2026!' };
  const registered = await request('/api/auth/register', { method: 'POST', body });
  assert.equal(registered.status, 201); users.push(registered.body.user.id);
  const logged = await request('/api/auth/login', { method: 'POST', body });
  assert.equal(logged.status, 200); return { ...logged.body.user, token: logged.body.token };
}
function payload(title, rows) {
  return { title, instructions: 'Préparer les ingrédients.', categoryId: category.id, servings: 2, preparationMinutes: 5, cookingMinutes: 10, ingredients: rows };
}
async function personal(preferenceIds, token = alice.token) {
  return request('/api/preferences/me', { method: 'PUT', token, body: { preferenceIds } });
}
async function tag(recipe, preferenceIds, token = alice.token, updatedAt) {
  if (!updatedAt) updatedAt = (await request(`/api/recipes/${recipe.id}`)).body.recipe.updatedAt;
  return request(`/api/recipes/${recipe.id}/preferences`, { method: 'PUT', token, body: { preferenceIds, updatedAt } });
}
async function suggestions(token = alice.token, query = '') {
  const result = await request('/api/suggestions' + query, { token }); assert.equal(result.status, 200); return result.body;
}
before(async () => {
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  alice = await account('alice'); bob = await account('bob'); admin = await account('admin');
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  for (const [name, unit] of [['riz', 'GRAM'], ['carotte', 'GRAM'], ['eau', 'MILLILITER']]) {
    ingredients.push(await prisma.ingredient.create({ data: { name, slug: name, unit } }));
  }
  [rice, carrot, water] = ingredients;
  category = await prisma.category.create({ data: { name: 'Plat', slug: 'plat' } });
  for (const name of ['vegetarien', 'vegetalien']) preferences.push(await prisma.foodPreference.create({ data: { name, slug: name } }));
  [vegetarian, vegan] = preferences;
  const rows = [{ ingredientId: rice.id, quantity: 200, unit: 'GRAM' }, { ingredientId: carrot.id, quantity: 100, unit: 'GRAM' }];
  plate = (await request('/api/recipes', { method: 'POST', token: alice.token, body: payload('Riz carottes', rows) })).body.recipe;
  drink = (await request('/api/recipes', { method: 'POST', token: alice.token, body: payload('Eau', [{ ingredientId: water.id, quantity: 200, unit: 'MILLILITER' }]) })).body.recipe;
  empty = await prisma.recipe.create({ data: { title: 'Ancienne recette vide', instructions: 'Incomplète', categoryId: category.id } });
  for (const [ingredientId, quantity, location] of [[rice.id, '150', 'PANTRY'], [rice.id, '50', 'FRIDGE'], [carrot.id, '60', 'FRIDGE']]) {
    assert.equal((await request('/api/stock', { method: 'POST', token: alice.token, body: { ingredientId, quantity, unit: 'GRAM', location } })).status, 201);
  }
  await prisma.stockItem.create({ data: { userId: bob.id, ingredientId: carrot.id, quantity: 900, location: 'FRIDGE' } });
});
after(async () => {
  try {
    if (category) await prisma.recipe.deleteMany({ where: { categoryId: category.id } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.ingredient.deleteMany({ where: { id: { in: ingredients.map(row => row.id) } } });
    await prisma.foodPreference.deleteMany({ where: { id: { in: preferences.map(row => row.id) } } });
    if (category) await prisma.category.delete({ where: { id: category.id } });
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
});
test('Accès public au catalogue, authentification des données personnelles', async () => {
  assert.equal((await request('/api/preferences')).body.items.length, 2);
  for (const [method, path] of [['GET', '/api/preferences/me'], ['PUT', '/api/preferences/me'], ['GET', '/api/suggestions'], ['PUT', `/api/recipes/${plate.id}/preferences`]]) {
    assert.equal((await request(path, { method, body: method === 'PUT' ? {} : undefined })).status, 401);
  }
});
test('Jeu représentatif : addition des rangements, quantités et isolation du stock', async () => {
  const result = await suggestions(); assert.equal(result.total, 2);
  const first = result.items[0]; assert.equal(first.id, plate.id);
  assert.equal(first.scorePercent, 50); assert.equal(first.level, 'ORANGE'); assert.equal(first.canCook, false);
  assert.equal(first.servings, 2);
  assert.deepEqual(first.ingredients.map(row => [row.required, row.available, row.missing, row.status]), [['200', '200', '0', 'SUFFICIENT'], ['100', '60', '40', 'PARTIAL']]);
  const second = result.items[1]; assert.equal(second.id, drink.id); assert.equal(second.scorePercent, 0); assert.equal(second.level, 'RED');
  assert.equal(second.ingredients[0].status, 'ABSENT'); assert.equal(second.ingredients[0].missing, '200');
  assert.equal(JSON.stringify(result).includes('userId'), false);
  assert.equal(JSON.stringify(result).includes('@example.test'), false);
  console.log('JEU DOSSIER : riz 200/200 g + carotte 60/100 g => 50 %, orange, manque 40 g ; eau 0/200 ml => 0 %, rouge.');
});
test('Stock vide, recette sans ingrédients exclue et consultation sans consommation', async () => {
  const result = await suggestions(admin.token); assert.equal(result.total, 2);
  assert.ok(result.items.every(row => row.scorePercent === 0 && !row.canCook));
  assert.ok(result.items.every(row => row.id !== empty.id));
  const before = await prisma.stockItem.findMany({ orderBy: { id: 'asc' } });
  await suggestions(); await suggestions();
  assert.deepEqual(await prisma.stockItem.findMany({ orderBy: { id: 'asc' } }), before);
});
test('Quantité exacte et déficit de 0,001 g : aucun faux positif', async () => {
  const where = { userId_ingredientId_location: { userId: alice.id, ingredientId: carrot.id, location: 'FRIDGE' } };
  await prisma.stockItem.update({ where, data: { quantity: '99.999' } });
  let row = (await suggestions()).items.find(row => row.id === plate.id);
  assert.equal(row.canCook, false); assert.equal(row.ingredients[1].missing, '0.001');
  await prisma.stockItem.update({ where, data: { quantity: 100 } });
  row = (await suggestions()).items[0]; assert.equal(row.scorePercent, 100); assert.equal(row.level, 'GREEN'); assert.equal(row.canCook, true);
  console.log('JEU DOSSIER : carotte 99,999/100 g => manque 0,001 g ; carotte 100/100 g => 100 %, vert, réalisable.');
  await prisma.stockItem.update({ where, data: { quantity: 60 } });
});
test('Pagination appliquée après classement global et ordre stable', async () => {
  const all = await suggestions(); const first = await suggestions(alice.token, '?pageSize=1'); const second = await suggestions(alice.token, '?pageSize=1&page=2');
  assert.equal(first.total, 2); assert.equal(first.items[0].id, all.items[0].id); assert.equal(second.items[0].id, all.items[1].id);
  assert.deepEqual((await suggestions(alice.token, '?page=3')).items, []);
  assert.deepEqual((await suggestions(admin.token)).items.map(row => row.id), [drink.id, plate.id]);
});
test('Enregistrement, remplacement et effacement des préférences personnelles', async () => {
  assert.deepEqual((await request('/api/preferences/me', { token: alice.token })).body.items, []);
  assert.equal((await personal([vegetarian.id, vegan.id])).status, 200);
  assert.equal((await request('/api/preferences/me', { token: alice.token })).body.items.length, 2);
  assert.deepEqual((await request('/api/preferences/me', { token: bob.token })).body.items, []);
  assert.equal((await personal([vegan.id])).body.items[0].id, vegan.id);
  assert.deepEqual((await personal([])).body.items, []);
});
test('Rejet des préférences invalides et conservation atomique des choix', async t => {
  await personal([vegetarian.id]);
  for (const body of [{}, { preferenceIds: '1' }, { preferenceIds: [vegetarian.id, vegetarian.id] }, { preferenceIds: [2147483647] }, { preferenceIds: [-1] }, { preferenceIds: [], userId: bob.id }, { preferenceIds: Array(21).fill(vegetarian.id) }]) {
    await t.test(JSON.stringify(body), async () => {
      assert.equal((await request('/api/preferences/me', { method: 'PUT', token: alice.token, body })).status, 400);
      assert.deepEqual((await request('/api/preferences/me', { token: alice.token })).body.items.map(row => row.id), [vegetarian.id]);
    });
  }
  await personal([]);
});
test('Étiquettes réservées à l’auteur ou administrateur, avec contrôle de version', async () => {
  assert.equal((await tag(plate, [vegetarian.id], bob.token)).status, 404);
  const version = (await request(`/api/recipes/${plate.id}`)).body.recipe.updatedAt;
  assert.equal((await tag(plate, [vegetarian.id], alice.token, version)).status, 200);
  assert.equal((await tag(plate, [vegan.id], alice.token, version)).status, 409);
  assert.equal((await tag(plate, [vegetarian.id, vegan.id], admin.token)).status, 200);
  assert.equal((await tag(plate, [2147483647])).status, 400);
  const result = await request(`/api/recipes/${plate.id}`); assert.equal(result.body.recipe.preferences.length, 2);
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'USER' } });
  assert.equal((await tag(plate, [], admin.token)).status, 404);
  assert.equal((await request(`/api/recipes/${plate.id}/preferences`, { method: 'PUT', token: alice.token, body: { preferenceIds: [] } })).status, 400);
});
test('Toutes les préférences choisies sont exigées ; une recette non étiquetée est exclue', async () => {
  await tag(plate, [vegetarian.id]); await personal([vegetarian.id, vegan.id]);
  assert.equal((await suggestions()).total, 0);
  await tag(plate, [vegetarian.id, vegan.id]);
  const result = await suggestions(); assert.deepEqual(result.items.map(row => row.id), [plate.id]);
  assert.equal(result.appliedPreferences.length, 2); assert.equal(result.items[0].scorePercent, 50);
  assert.equal((await suggestions(bob.token)).total, 2);
  await personal([]);
});
test('Changement de composition : étiquettes effacées et ancienne version refusée', async () => {
  const old = (await request(`/api/recipes/${plate.id}`)).body.recipe.updatedAt;
  const result = await request(`/api/recipes/${plate.id}`, { method: 'PUT', token: alice.token, body: payload('Riz carottes modifié', [{ ingredientId: rice.id, quantity: 250, unit: 'GRAM' }, { ingredientId: carrot.id, quantity: 100, unit: 'GRAM' }]) });
  assert.equal(result.status, 200); assert.deepEqual(result.body.recipe.preferences, []);
  assert.equal((await tag(plate, [vegetarian.id], alice.token, old)).status, 409);
});
test('Deux remplacements simultanés ne mélangent pas les préférences', async () => {
  await personal([]);
  const results = await Promise.all([personal([vegetarian.id]), personal([vegan.id])]);
  assert.ok(results.some(row => row.status === 200)); assert.ok(results.every(row => [200, 409].includes(row.status)));
  const saved = (await request('/api/preferences/me', { token: alice.token })).body.items;
  assert.equal(saved.length, 1); assert.ok([vegetarian.id, vegan.id].includes(saved[0].id));
  await personal([]);
});
test('Filtres invalides et tentative d’utiliser un autre compte rejetés', async t => {
  for (const query of ['?userId=2', '?page=0', '?pageSize=101', '?page=1&page=2', '?pageSize=1.5', '?servings=4']) {
    await t.test(query, async () => assert.equal((await request('/api/suggestions' + query, { token: alice.token })).status, 400));
  }
});
