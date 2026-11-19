const express = require('express');

const app = express();

app.use(express.json());

app.get('/api/salud', (_req, res) => {
  res.status(200).json({ ok: true, data: { estado: 'activo' } });
});

module.exports = app;
