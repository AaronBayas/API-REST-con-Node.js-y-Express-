// Solo para pruebas: imprime un JWT válido en firma pero ya expirado (para probar 401 TOKEN_VENCIDO).
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

const ahora = Math.floor(Date.now() / 1000);
const token = jwt.sign({ sub: '1', rol: 'usuario', exp: ahora - 60 }, env.JWT_SECRET, { algorithm: 'HS256' });

process.stdout.write(`${token}\n`);
