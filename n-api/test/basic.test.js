const assert = require('assert');

function sum(a, b) {
  return a + b;
}

assert.strictEqual(sum(2, 2), 4, '2 + 2 должно быть равно 4');

assert.doesNotThrow(() => {
  require('../src/server');
}, 'server.js не должен падать при require');

console.log('✅ basic.test.js: все тесты прошли успешно');
