const { Router } = require('express');
const controlador = require('../controllers/productos.controller');
const validarId = require('../middlewares/validarId');

const router = Router();

router.get('/', controlador.listar);
router.get('/:id', validarId('id'), controlador.obtener);
router.post('/', controlador.crear);
router.put('/:id', validarId('id'), controlador.actualizar);
router.delete('/:id', validarId('id'), controlador.eliminar);

module.exports = router;
