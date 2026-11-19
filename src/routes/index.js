const { Router } = require('express');
const { ok } = require('../utils/respuestas');
const authRoutes = require('./auth.routes');
const productosRoutes = require('./productos.routes');
const favoritosRoutes = require('./favoritos.routes');

const router = Router();

router.get('/salud', (_req, res) => ok(res, { estado: 'activo' }));
router.use('/auth', authRoutes);
router.use('/productos', productosRoutes);
router.use('/favoritos', favoritosRoutes);

module.exports = router;
