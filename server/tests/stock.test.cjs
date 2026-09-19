// Exécution HTTP réelle sur une base de test dédiée, jamais sur la base de développement.
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (database.pathname !== '/platinum_stock_test' || !['127.0.0.1', 'localhost'].includes(database.hostname)) {
  throw new Error('DATABASE_URL doit cibler platinum_stock_test sur localhost');
}
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET de test requis');
require('ts-node').register({ files: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const app = require('../src/app').default;
const { prisma } = require('../src/config/prisma');
let server, base, rice, milk, egg, alice, bob;
const createdUsers = [], ingredientIds = [];
const suffix = randomUUID();

async function request(path, { token, method = 'GET', body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function account(label) {
  const email = `${label}-${suffix}@example.test`;
  const password = 'Test-stock-2026!';
  const registered = await request('/api/auth/register', { method: 'POST', body: { username: `${label}-${suffix}`, email, password } });
  assert.equal(registered.status, 201);
  createdUsers.push(registered.body.user.id);
  assert.equal(registered.body.user.password, undefined);
  const logged = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(logged.status, 200);
  return { ...logged.body.user, token: logged.body.token };
}
function add(body, token = alice.token) {
  return request('/api/stock', { token, method: 'POST', body: { ingredientId: rice.id, quantity: '0.5', unit: 'KILOGRAM', location: 'PANTRY', ...body } });
}
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  alice = await account('alice'); bob = await account('bob');
  for (const [name, unit] of [['Riz', 'GRAM'], ['Lait', 'MILLILITER'], ['Œuf', 'PIECE']]) {
    const row = await prisma.ingredient.create({ data: { name, slug: `${name}-${suffix}`, unit } });
    ingredientIds.push(row.id);
    if (unit === 'GRAM') rice = row; else if (unit === 'MILLILITER') milk = row; else egg = row;
  }
});
after(async () => {
  try {
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    await prisma.ingredient.deleteMany({ where: { id: { in: ingredientIds } } });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});

test('Le stock et le catalogue nécessitent une authentification valide', async t => {
  for (const [name, token] of [
    ['absent', undefined], ['altéré', 'incorrect'],
    ['expiré', jwt.sign({ id: alice.id }, process.env.JWT_SECRET, { expiresIn: -1 })],
    ['identifiant invalide', jwt.sign({ id: '1' }, process.env.JWT_SECRET, { expiresIn: 60 })],
    ['sans expiration', jwt.sign({ id: alice.id }, process.env.JWT_SECRET)],
    ['autre algorithme', jwt.sign({ id: alice.id }, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: 60 })],
  ]) await t.test(name, async () => {
    for (const path of ['/api/stock', '/api/ingredients']) assert.equal((await request(path, { token })).status, 401);
  });
  await t.test('compte supprimé', async () => {
    const removed = await account('removed');
    await prisma.user.delete({ where: { id: removed.id } });
    assert.equal((await request('/api/stock', { token: removed.token })).status, 401);
  });
});

test('Le catalogue propose recherche et pagination sans données de compte', async () => {
  const result = await request('/api/ingredients?q=riz&pageSize=1', { token: alice.token });
  assert.equal(result.status, 200); assert.equal(result.body.items.length, 1);
  assert.equal(result.body.items[0].id, rice.id); assert.equal(result.body.total, 1);
  assert.deepEqual(Object.keys(result.body.items[0]).sort(), ['id', 'name', 'slug', 'unit']);
  assert.equal((await request('/api/ingredients?pageSize=101', { token: alice.token })).status, 400);
  assert.equal((await request('/api/ingredients?q[x]=rice', { token: alice.token })).status, 400);
});

test('CRUD complet avec conversion exacte et emplacement', async () => {
  const created = await add({}); assert.equal(created.status, 201);
  const id = created.body.item.id;
  assert.equal(created.body.item.quantity, '500'); assert.equal(created.body.item.userId, alice.id);
  assert.equal(created.body.item.ingredient.unit, 'GRAM');
  const read = await request(`/api/stock/${id}`, { token: alice.token });
  assert.equal(read.status, 200); assert.equal(read.body.item.quantity, '500');
  const edited = await request(`/api/stock/${id}`, { token: alice.token, method: 'PATCH', body: { quantity: '0.125', unit: 'KILOGRAM', location: 'FRIDGE' } });
  assert.equal(edited.status, 200); assert.equal(edited.body.item.quantity, '125');
  assert.equal((await request('/api/stock?location=PANTRY', { token: alice.token })).body.items.length, 0);
  assert.equal((await request('/api/stock?location=FRIDGE', { token: alice.token })).body.items.length, 1);
  assert.equal((await request(`/api/stock/${id}`, { token: alice.token, method: 'DELETE' })).status, 204);
  assert.equal((await request(`/api/stock/${id}`, { token: alice.token })).status, 404);
  assert.equal((await request(`/api/stock/${id}`, { token: alice.token, method: 'DELETE' })).status, 404);
});

test('Un autre compte ne peut ni lire, ni modifier, ni supprimer la ligne', async () => {
  const created = await add({}); const id = created.body.item.id;
  assert.equal((await request('/api/stock', { token: bob.token })).body.items.length, 0);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const result = await request(`/api/stock/${id}`, { token: bob.token, method, body: method === 'PATCH' ? { quantity: 1, unit: 'GRAM' } : undefined });
    assert.equal(result.status, 404);
  }
  assert.equal((await prisma.stockItem.findUnique({ where: { id } })).quantity.toString(), '500');
  assert.equal((await add({ userId: bob.id })).status, 400);
  assert.equal((await request(`/api/stock/${id}`, { token: alice.token, method: 'PATCH', body: { userId: bob.id } })).status, 400);
  assert.equal((await request(`/api/stock?userId=${alice.id}`, { token: bob.token })).status, 400);
  const own = await add({}, bob.token); assert.equal(own.status, 201);
  assert.equal(own.body.item.userId, bob.id);
});

test('Doublons refusés, plusieurs emplacements permis, collision de déplacement atomique', async () => {
  assert.equal((await add({})).status, 409);
  const fridge = await add({ location: 'FRIDGE' }); assert.equal(fridge.status, 201);
  const result = await request(`/api/stock/${fridge.body.item.id}`, { token: alice.token, method: 'PATCH', body: { location: 'PANTRY', quantity: 1, unit: 'GRAM' } });
  assert.equal(result.status, 409);
  const row = await prisma.stockItem.findUnique({ where: { id: fridge.body.item.id } });
  assert.equal(row.location, 'FRIDGE'); assert.equal(row.quantity.toString(), '500');
  const concurrent = await Promise.all([add({ location: 'FREEZER' }), add({ location: 'FREEZER' })]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [201, 409]);
});

test('Quantités invalides refusées sans arrondi silencieux', async t => {
  for (const quantity of [0, -1, '1.1234', '1e3', '', '1\n', ' 1', null, true, [], {}, '1000000000', '1000000.001']) {
    await t.test(JSON.stringify(quantity), async () => {
      assert.equal((await add({ quantity, location: 'CONDIMENTS' })).status, 400);
    });
  }
  assert.equal((await add({ quantity: '999999999.999', unit: 'GRAM', location: 'CONDIMENTS' })).status, 201);
});

test('Unités compatibles, litres et pièces ; précision décimale conservée', async () => {
  assert.equal((await add({ unit: 'LITER' })).status, 400);
  assert.equal((await add({ unit: 'toString' })).status, 400);
  const result = await add({ ingredientId: milk.id, quantity: '0.125', unit: 'LITER' });
  assert.equal(result.status, 201); assert.equal(result.body.item.quantity, '125');
  const piece = await add({ ingredientId: egg.id, quantity: '1.5', unit: 'PIECE' });
  assert.equal(piece.status, 201); assert.equal(piece.body.item.quantity, '1.5');
  const decimal = await request(`/api/stock/${result.body.item.id}`, { token: alice.token, method: 'PATCH', body: { quantity: '0.001', unit: 'MILLILITER' } });
  assert.equal(decimal.status, 200); assert.equal(decimal.body.item.quantity, '0.001');
});

test('Identifiants, emplacement, corps JSON et mises à jour incompletes refusés', async () => {
  for (const id of ['0', '-1', 'abc', '1.5', '2147483648']) {
    assert.equal((await request(`/api/stock/${id}`, { token: alice.token })).status, 400);
  }
  assert.equal((await add({ ingredientId: 2147483647 })).status, 404);
  assert.equal((await add({ location: 'Tout' })).status, 400);
  assert.equal((await request('/api/stock?location=Tout', { token: alice.token })).status, 400);
  for (const body of [null, [], {}, { quantity: 4 }, { unit: 'GRAM' }, { ingredientId: egg.id }]) {
    assert.equal((await request('/api/stock/1', { token: alice.token, method: 'PATCH', body })).status, 400);
  }
  assert.equal((await request('/api/stock', { token: alice.token, method: 'POST', raw: '{bad' })).status, 400);
});

test('Le rôle courant du compte prime sur le rôle contenu dans un ancien jeton', async () => {
  const obsolete = jwt.sign({ id: bob.id, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: 60 });
  assert.equal((await request('/api/auth/admin-test', { token: obsolete })).status, 403);
  const me = await request('/api/auth/me', { token: alice.token });
  assert.equal(me.status, 200); assert.deepEqual(me.body, { id: alice.id, role: 'USER' });
});
