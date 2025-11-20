// n-api/test/basic.test.js
const http = require('http');
const assert = require('assert');
const app = require('../app'); // твой Express из app.js

// Универсальная функция для GET-запроса к приложению
function request(path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    // Слушаем на свободном порту
    server.listen(0, () => {
      const { port } = server.address();
      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'GET',
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      req.end();
    });
  });
}

async function testHealth() {
  console.log('🔹 Проверяем /health...');
  const res = await request('/health');

  assert.strictEqual(res.statusCode, 200, `Ожидали 200, получили ${res.statusCode}`);
  assert.strictEqual(res.body, 'OK', `Ожидали тело "OK", получили "${res.body}"`);
}

async function testHealthz() {
  console.log('🔹 Проверяем /healthz...');
  const res = await request('/healthz');

  assert.strictEqual(res.statusCode, 200, `Ожидали 200, получили ${res.statusCode}`);
  assert.strictEqual(res.body, 'ok', `Ожидали тело "ok", получили "${res.body}"`);
}

async function testRoot() {
  console.log('🔹 Проверяем / ...');
  const res = await request('/');

  assert.strictEqual(res.statusCode, 200, `Ожидали 200, получили ${res.statusCode}`);

  let json;
  try {
    json = JSON.parse(res.body);
  } catch (e) {
    throw new Error(`Ожидали JSON, получили: ${res.body}`);
  }

  assert.strictEqual(json.ok, true, 'json.ok должен быть true');
  assert.strictEqual(json.name, 'n-api', 'json.name должен быть "n-api"');
  assert.ok(json.ts, 'Ожидали поле ts (timestamp)');
}

async function testStatus() {
  console.log('🔹 Проверяем /status...');
  const res = await request('/status');

  assert.strictEqual(res.statusCode, 200, `Ожидали 200, получили ${res.statusCode}`);

  let json;
  try {
    json = JSON.parse(res.body);
  } catch (e) {
    throw new Error(`Ожидали JSON, получили: ${res.body}`);
  }

  assert.strictEqual(json.status, 'ok', 'json.status должен быть "ok"');
}

async function test404() {
  console.log('🔹 Проверяем 404 для /unknown-route...');
  const res = await request('/unknown-route');

  // Твой 404-хэндлер ставит статус 404
  assert.strictEqual(res.statusCode, 404, `Ожидали 404, получили ${res.statusCode}`);

  let json;
  try {
    json = JSON.parse(res.body);
  } catch (e) {
    throw new Error(`Ожидали JSON, получили: ${res.body}`);
  }

  assert.strictEqual(json.message, 'Not Found', 'Ожидали message "Not Found"');
}

// Запускаем тесты последовательно
(async () => {
  try {
    await testHealth();
    await testHealthz();
    await testRoot();
    await testStatus();
    await test404();

    console.log('✅ basic.test.js: все тесты прошли успешно');
  } catch (err) {
    console.error('❌ Тесты упали:', err.message || err);
    process.exit(1);
  }
})();
