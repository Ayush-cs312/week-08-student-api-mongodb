// Run with: npm test
// Uses a temporary in-memory MongoDB (downloaded automatically the first time),
// so your real database is never touched. Needs internet on the first run.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const app = require('./server');

let server, base, memoryDb;

before(async () => {
  let uri = process.env.TEST_MONGODB_URI; // optional: point tests at any throwaway database
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryDb = await MongoMemoryServer.create();
    uri = memoryDb.getUri();
  }
  await mongoose.connect(uri);
  await mongoose.connection.collection('students').deleteMany({});
  await new Promise((resolve) => {
    server = app.listen(0, () => { base = `http://localhost:${server.address().port}`; resolve(); });
  });
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  if (memoryDb) await memoryDb.stop();
});

const call = async (method, path, body, raw) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, data: await res.json() };
};

const ids = {};
const sample = [
  { key: 'a', name: ' Aarav Shetty ', department: 'Computer Science', semester: 4 },
  { key: 'b', name: 'Diya Nayak', department: 'Electronics', semester: 3 },
  { key: 'c', name: 'Rohan Kamath', department: 'Computer Science', semester: 6 },
];

test('POST /students creates students (201) with id and timestamps', async () => {
  for (const { key, ...body } of sample) {
    const { status, data } = await call('POST', '/students', body);
    assert.equal(status, 201);
    assert.ok(data.id);
    assert.ok(data.createdAt && data.updatedAt);
    assert.equal(data._id, undefined);
    assert.equal(data.__v, undefined);
    ids[key] = data.id;
  }
  assert.equal((await call('GET', `/students/${ids.a}`)).data.name, 'Aarav Shetty'); // trimmed
});

test('GET /students returns all students', async () => {
  const { status, data } = await call('GET', '/students');
  assert.equal(status, 200);
  assert.equal(data.length, 3);
});

test('GET /students?department filters (case-insensitive, safe with special characters)', async () => {
  const { data } = await call('GET', '/students?department=computer');
  assert.equal(data.length, 2);
  assert.equal((await call('GET', '/students?department=zzz')).data.length, 0);
  const odd = await call('GET', '/students?department=' + encodeURIComponent('(['));
  assert.equal(odd.status, 200);
});

test('GET /students/:id: found, not found, invalid id', async () => {
  assert.equal((await call('GET', `/students/${ids.b}`)).data.name, 'Diya Nayak');
  assert.equal((await call('GET', '/students/64b7f0000000000000000000')).status, 404);
  assert.equal((await call('GET', '/students/abc')).status, 400);
});

test('POST rejects invalid data with 400 and clear messages', async () => {
  const missing = await call('POST', '/students', { name: 'X' });
  assert.equal(missing.status, 400);
  assert.ok(missing.data.details.length >= 2);

  const bad = (body) => call('POST', '/students', body).then((r) => r.status);
  assert.equal(await bad({ name: 'Meera', department: 'Mech', semester: 9 }), 400);
  assert.equal(await bad({ name: 'Meera', department: 'Mech', semester: 2.5 }), 400);
  assert.equal(await bad({ name: 'Meera', department: 'Mech', semester: 'abc' }), 400);
  assert.equal(await bad({ name: 'M', department: 'Mech', semester: 2 }), 400);
  assert.equal(await bad({ name: '   ', department: 'Mech', semester: 2 }), 400);
  assert.equal((await call('POST', '/students', null, '{ bad json')).status, 400);
  assert.equal((await call('GET', '/students')).data.length, 3); // nothing invalid was saved
});

test('PUT /students/:id updates, validates, and 404s', async () => {
  const before = (await call('GET', `/students/${ids.b}`)).data;
  await new Promise((r) => setTimeout(r, 20));
  const ok = await call('PUT', `/students/${ids.b}`, { semester: 4 });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.semester, 4);
  assert.equal(ok.data.name, 'Diya Nayak'); // untouched fields stay
  assert.ok(new Date(ok.data.updatedAt) > new Date(before.updatedAt)); // timestamp moved

  assert.equal((await call('PUT', `/students/${ids.b}`, { semester: 0 })).status, 400);
  assert.equal((await call('PUT', `/students/${ids.b}`, {})).status, 400);
  assert.equal((await call('PUT', '/students/64b7f0000000000000000000', { semester: 2 })).status, 404);
  assert.equal((await call('GET', `/students/${ids.b}`)).data.semester, 4); // bad updates did not stick
});

test('DELETE /students/:id removes the student', async () => {
  assert.equal((await call('DELETE', `/students/${ids.c}`)).status, 200);
  assert.equal((await call('GET', `/students/${ids.c}`)).status, 404);
  assert.equal((await call('DELETE', `/students/${ids.c}`)).status, 404);
});

test('unknown route returns JSON 404', async () => {
  const { status, data } = await call('GET', '/nope');
  assert.equal(status, 404);
  assert.ok(data.error);
});

test('returns 503 when the database is disconnected', async () => {
  await mongoose.disconnect();
  const { status, data } = await call('GET', '/students');
  assert.equal(status, 503);
  assert.match(data.error, /Database unavailable/);
});
