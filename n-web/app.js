const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const routes = require('./routes/index'); // если есть дополнительные роуты

const app = express();

// Если реально используешь Jade/Pug-шаблоны — раскомментируй:
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// Middleware
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Health-check endpoint для Kubernetes (liveness/readiness)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ✅ Простой root для проверки через браузер / IP
app.get('/', (req, res) => {
  res.send('Web service is up!');
});

// Основные роуты (если нужны дополнительные страницы/эндпоинты)
app.use('/', routes);

// catch 404 и передать в error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// ✅ Dev error handler — показывает stack trace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    res.status(err.status || 500).json({
      message: err.message,
      stack: err.stack,
    });
  });
}

// ✅ Prod error handler — без stack trace, не ломает /health
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
