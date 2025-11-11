const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('Web service is up!');
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).send(err.message || 'Internal Server Error');
});

module.exports = app;
