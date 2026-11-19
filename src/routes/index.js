const { Router } = require('express');
const { ok } = require('../utils/respuestas');

const router = Router();

router.get('/salud', (_req, res) => ok(res, { estado: 'activo' }));

module.exports = router;
