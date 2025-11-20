// n-api/test/basic.test.js
const http = require('http');
const assert = require('assert');
const app = require('../app'); // Express-приложение

function request(path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
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
          resolve({ statusCode: res.statusCode, body: data });
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

(async () => {
  console.log('🔍 Проверяем /health для API...');

  const res = await request('/health');

  // Ожидаем HTTP 200
  assert.strictEqual(res.statusCode, 200, `Ожидали 200, получили ${res.statusCode}`);

  console.log('✅ basic.test.js: все тесты прошли успешно');
})().catch((err) => {
  console.error('❌ Тесты упали:', err);
  process.exit(1);
});
