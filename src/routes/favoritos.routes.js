const { Router } = require('express');
const controlador = require('../controllers/favoritos.controller');
const verificarToken = require('../middlewares/verificarToken');
const validarId = require('../middlewares/validarId');

const router = Router();

// Todas las rutas de favoritos requieren un usuario autenticado.
router.use(verificarToken);

router.get('/', controlador.listar);
router.post('/', controlador.agregar);
router.delete('/:productId', validarId('productId'), controlador.quitar);

module.exports = router;
