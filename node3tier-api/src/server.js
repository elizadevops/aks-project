// src/server.js
const app = require('./app'); // твой app.js (экспонирует Express app)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
