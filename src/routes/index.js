const { Router } = require('express');
const { ok } = require('../utils/respuestas');
const authRoutes = require('./auth.routes');

const router = Router();

router.get('/salud', (_req, res) => ok(res, { estado: 'activo' }));
router.use('/auth', authRoutes);

module.exports = router;
