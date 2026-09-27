// Tests HTTP réels, uniquement sur une base éphémère dédiée.
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (database.pathname !== '/platinum_dossier_test' || !['127.0.0.1', 'localhost'].includes(database.hostname)) throw new Error('Base isolée platinum_dossier_test requise');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET de test requis');
require('ts-node').register({ files: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app').default;
const { prisma } = require('../src/config/prisma');
let server, base, alice, bob, admin, secondAdmin, rice, carrot, water, recipe, category, preference;
const password = 'Test-dossier-2026!';
async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(base + '/api' + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function account(username) {
  const body = { username, email: `${username}@example.test`, password };
  const registered = await request('/auth/register', { method: 'POST', body }); assert.equal(registered.status, 201);
  const login = await request('/auth/login', { method: 'POST', body }); assert.equal(login.status, 200);
  return { ...login.body.user, token: login.body.token };
}
before(async () => {
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
  alice = await account('alice'); bob = await account('bob'); admin = await account('admin'); secondAdmin = await account('second-admin');
  await prisma.user.updateMany({ where: { id: { in: [admin.id, secondAdmin.id] } }, data: { role: 'ADMIN' } });
  rice = await prisma.ingredient.create({ data: { name: 'Riz', slug: 'riz', unit: 'GRAM' } });
  carrot = await prisma.ingredient.create({ data: { name: 'Carotte', slug: 'carotte', unit: 'GRAM' } });
  water = await prisma.ingredient.create({ data: { name: 'Eau', slug: 'eau', unit: 'MILLILITER', isDefaultAvailable: true } });
  category = await prisma.category.create({ data: { name: 'Plat', slug: 'plat' } });
  preference = await prisma.foodPreference.create({ data: { name: 'Végétarien', slug: 'vegetarien' } });
  recipe = await prisma.recipe.create({ data: { title: 'Riz aux carottes', instructions: 'Cuire le riz et les carottes.', authorId: alice.id, categoryId: category.id, ingredients: { create: [{ ingredientId: rice.id, quantity: 150 }, { ingredientId: carrot.id, quantity: 200 }, { ingredientId: water.id, quantity: 300 }] } } });
  await prisma.stockItem.createMany({ data: [{ userId: alice.id, ingredientId: rice.id, quantity: 200, location: 'PANTRY' }, { userId: alice.id, ingredientId: carrot.id, quantity: 60, location: 'FRIDGE' }, { userId: bob.id, ingredientId: carrot.id, quantity: 900, location: 'FRIDGE' }] });
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });

test('Visiteur : catalogue, détail et recherche avec plusieurs ingrédients sans stock personnel', async () => {
  const ingredients = await request('/ingredients'); assert.equal(ingredients.status, 200);
  assert.equal((await request(`/recipes?ingredientIds=${rice.id},${carrot.id}`)).body.total, 1);
  assert.equal((await request(`/recipes/${recipe.id}`)).status, 200);
  assert.equal((await request(`/recipes/${recipe.id}/compatibility`)).status, 401);
  assert.equal((await request('/recipes', { method: 'POST', body: {} })).status, 401);
  const result = JSON.stringify((await request(`/recipes/${recipe.id}`)).body);
  assert.ok(!result.includes('email') && !result.includes('password'));
});
test('Administration : refus des visiteurs et utilisateurs, rôle relu dans la base', async () => {
  for (const token of [undefined, alice.token]) {
    const status = token ? 403 : 401;
    assert.equal((await request('/admin/users', { token })).status, status);
    assert.equal((await request(`/admin/users/${bob.id}`, { token, method: 'DELETE' })).status, status);
  }
  const result = await request('/admin/users?q=ALICE', { token: admin.token });
  assert.equal(result.status, 200); assert.equal(result.body.total, 1); assert.equal(result.body.items[0].id, alice.id);
  assert.equal(result.body.items[0].password, undefined);
  assert.equal((await request('/admin/users?page=0', { token: admin.token })).status, 400);
});
test('Profil personnel : lecture, validation, mot de passe actuel, doublons et aucune élévation de rôle', async () => {
  const body = { username: 'alice-modifiee', email: 'alice-new@example.test', currentPassword: password };
  assert.equal((await request('/auth/me')).status, 401);
  const me = (await request('/auth/me', { token: alice.token })).body;
  assert.deepEqual(Object.keys(me).sort(), ['email', 'id', 'role', 'username']);
  for (const invalid of [{ ...body, role: 'ADMIN' }, { ...body, id: bob.id }, { ...body, email: 'invalide' }, { ...body, username: '' }]) assert.equal((await request('/auth/me', { method: 'PUT', token: alice.token, body: invalid })).status, 400);
  assert.equal((await request('/auth/me', { method: 'PUT', token: alice.token, body: { ...body, currentPassword: 'incorrect' } })).status, 403);
  assert.equal((await request('/auth/me', { method: 'PUT', token: alice.token, body: { ...body, email: bob.email } })).status, 409);
  const saved = await request('/auth/me', { method: 'PUT', token: alice.token, body }); assert.equal(saved.status, 200); assert.equal(saved.body.username, body.username);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: body.email, password } })).status, 200);
  assert.equal((await request('/auth/me', { token: bob.token })).body.username, 'bob');
});
test('Inscription : données invalides rejetées et erreurs sans détail interne', async () => {
  for (const body of [null, {}, { username: 'x', email: 'a@example.test', password }, { username: 'valid', email: 'x', password }, { username: 'valid', email: 'a@example.test', password: 'short' }, { username: 'valid', email: 'a@example.test', password, role: 'ADMIN' }]) assert.equal((await request('/auth/register', { method: 'POST', body })).status, 400);
  const duplicate = await request('/auth/register', { method: 'POST', body: { username: 'bob', email: bob.email, password } });
  assert.equal(duplicate.status, 409); assert.ok(!JSON.stringify(duplicate.body).includes('Prisma'));
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: bob.email, password: 'wrong' } })).status, 401);
  await prisma.user.update({ where: { id: bob.id }, data: { email: bob.email.toUpperCase() } });
  assert.equal((await request('/auth/register', { method: 'POST', body: { username: 'autre-nom', email: bob.email, password } })).status, 409);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: bob.email, password } })).status, 200);
});
test('Scénario du dossier : riz 200/150, carotte 60/200, eau par défaut => 67 %, vert, manque 140 g', async () => {
  const stocksBefore = await prisma.stockItem.findMany({ orderBy: { id: 'asc' } });
  const detail = await request(`/recipes/${recipe.id}/compatibility`, { token: alice.token });
  assert.equal(detail.status, 200); assert.equal(detail.body.scorePercent, 67); assert.equal(detail.body.level, 'GREEN'); assert.equal(detail.body.canCook, false);
  assert.deepEqual(detail.body.ingredients.map(row => row.missing), ['0', '140', '0']);
  assert.equal(detail.body.ingredients[2].ingredient.isDefaultAvailable, true);
  const suggestions = (await request('/suggestions', { token: alice.token })).body.items[0];
  assert.deepEqual(suggestions.ingredients, detail.body.ingredients); assert.equal(suggestions.scorePercent, detail.body.scorePercent);
  assert.deepEqual(await prisma.stockItem.findMany({ orderBy: { id: 'asc' } }), stocksBefore);
});
test('Compatibilité : stock vide, isolation, quantité exacte et déficit de 0,001 g', async () => {
  const empty = (await request(`/recipes/${recipe.id}/compatibility`, { token: admin.token })).body;
  assert.equal(empty.scorePercent, 33); assert.equal(empty.canCook, false); assert.equal(empty.ingredients[2].status, 'SUFFICIENT');
  const where = { userId_ingredientId_location: { userId: alice.id, ingredientId: carrot.id, location: 'FRIDGE' } };
  await prisma.stockItem.update({ where, data: { quantity: '199.999' } });
  let result = (await request(`/recipes/${recipe.id}/compatibility`, { token: alice.token })).body;
  assert.equal(result.ingredients[1].missing, '0.001'); assert.equal(result.canCook, false);
  await prisma.stockItem.update({ where, data: { quantity: 200 } });
  result = (await request(`/recipes/${recipe.id}/compatibility`, { token: alice.token })).body;
  assert.equal(result.scorePercent, 100); assert.equal(result.canCook, true);
  assert.equal((await request('/recipes/2147483647/compatibility', { token: alice.token })).status, 404);
});
test('Administration : propre compte et autres administrateurs protégés', async () => {
  assert.equal((await request(`/admin/users/${admin.id}`, { token: admin.token, method: 'DELETE' })).status, 403);
  assert.equal((await request(`/admin/users/${secondAdmin.id}`, { token: admin.token, method: 'DELETE' })).status, 404);
  await prisma.user.update({ where: { id: secondAdmin.id }, data: { role: 'USER' } });
  assert.equal((await request('/admin/users', { token: secondAdmin.token })).status, 403);
});
test('Suppression standard : stock et préférences effacés, recette conservée, ancien token refusé', async () => {
  await prisma.userPreference.create({ data: { userId: alice.id, preferenceId: preference.id } });
  assert.equal((await request(`/admin/users/${alice.id}`, { token: admin.token, method: 'DELETE' })).status, 204);
  assert.equal(await prisma.stockItem.count({ where: { userId: alice.id } }), 0);
  assert.equal(await prisma.userPreference.count({ where: { userId: alice.id } }), 0);
  assert.equal((await request(`/recipes/${recipe.id}`)).body.recipe.author, null);
  assert.equal((await request('/auth/me', { token: alice.token })).status, 401);
  assert.equal((await request(`/admin/users/${alice.id}`, { token: admin.token, method: 'DELETE' })).status, 404);
  assert.equal((await request('/auth/me', { token: bob.token })).status, 200);
});
