const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const rutas = require('./routes');
const noEncontrado = require('./middlewares/noEncontrado');
const manejadorErrores = require('./middlewares/manejadorErrores');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use('/api', rutas);

// Express 5 envía al manejador los errores lanzados en funciones async, sin try/catch.
app.use(noEncontrado);
app.use(manejadorErrores);

module.exports = app;
