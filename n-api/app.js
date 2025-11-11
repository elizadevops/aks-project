const express = require('express');
const mysql = require('mysql2');

const app = express();

// MySQL конфигурация через переменные окружения (совпадает с Kubernetes)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// helper для проверки готовности базы
function checkDbConnection(callback) {
  pool.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.ping(pingErr => {
      connection.release();
      callback(pingErr);
    });
  });
}

// 🔹 Liveness probe — просто проверяет, жив ли контейнер
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 🔹 Альтернативный liveness endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// 🔹 Readiness probe — проверяет, готово ли приложение (включая БД)
app.get('/readyz', (req, res) => {
  checkDbConnection(err => {
    if (err) {
      console.error('DB not ready:', err.message);
      return res.status(500).json({ status: 'error', message: 'DB not ready' });
    }
    res.status(200).json({ status: 'ready' });
  });
});

// Корневой роут для быстрой проверки
app.get('/', (req, res) => {
  res.json({ ok: true, name: 'n-api', ts: new Date().toISOString() });
});

// Простой статус без обращения к БД
app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Статус с проверкой БД
app.get('/api/status', (req, res) => {
  pool.query('SELECT NOW() AS time', (err, rows) => {
    if (err) {
      console.error('Error executing query', err);
      return res.status(500).json({ error: 'DB query failed' });
    }
    res.status(200).json({
      status: 'ok',
      dbTime: rows[0].time,
    });
  });
});

// 404 — если маршрут не найден
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Dev error handler — со стеком
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    res.status(err.status || 500).json({
      message: err.message,
      stack: err.stack,
    });
  });
}

// Prod error handler — без стека
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
