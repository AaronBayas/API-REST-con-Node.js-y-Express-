const { Router } = require('express');
const controlador = require('../controllers/productos.controller');
const validarId = require('../middlewares/validarId');
const verificarToken = require('../middlewares/verificarToken');
const requerirRol = require('../middlewares/requerirRol');

const router = Router();

// Consulta pública
router.get('/', controlador.listar);
router.get('/:id', validarId('id'), controlador.obtener);

// Gestión del catálogo: solo administrador (401 sin token válido, 403 con rol usuario)
const soloAdmin = [verificarToken, requerirRol('admin')];
router.post('/', soloAdmin, controlador.crear);
router.put('/:id', soloAdmin, validarId('id'), controlador.actualizar);
router.delete('/:id', soloAdmin, validarId('id'), controlador.eliminar);

module.exports = router;
