// Prueba de extremo a extremo con reinicio real del servidor:
// 1) levanta la API  2) corre las carpetas 00–07  3) detiene Node y lo vuelve a iniciar
// 4) corre la carpeta 08 con el entorno exportado  5) informa si la persistencia se verificó.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const newman = require('newman');
const jwt = require('jsonwebtoken');

const env = require('../src/config/env');

const RAIZ = path.join(__dirname, '..');
const COLECCION = path.join(RAIZ, 'postman', 'Catalogo_API.postman_collection.json');
const ENTORNO_LOCAL = path.join(RAIZ, 'postman', 'entorno.local.json');
const ENTORNO_EJEMPLO = path.join(RAIZ, 'postman', 'Catalogo_API.postman_environment.example.json');
const REPORTES = path.join(RAIZ, 'docs', 'evidencias', 'newman');
const URL_SALUD = `http://localhost:${env.PORT}/api/salud`;

const CARPETAS_FASE_1 = [
  '00 Salud',
  '01 Registro e inicio de sesión',
  '02 Catálogo público',
  '03 Gestión de productos (admin)',
  '04 Seguridad',
  '05 Favoritos',
  '06 Aislamiento entre usuarios',
  '07 Consistencia al eliminar',
];
const CARPETA_PERSISTENCIA = '08 Persistencia tras reinicio';
const LOGINS = ['01.6 Login usuario A', '01.7 Login usuario B', '01.8 Login administrador', '08.1 (tras reiniciar) Login A'];

const esperar = (ms) => new Promise((r) => { setTimeout(r, ms); });

const saludOk = async () => {
  try {
    return (await fetch(URL_SALUD)).status === 200;
  } catch {
    return false;
  }
};

const iniciarServidor = async () => {
  if (await saludOk()) {
    throw new Error(`Ya hay un servidor escuchando en el puerto ${env.PORT}. Deténgalo antes de ejecutar esta prueba.`);
  }
  const proceso = spawn(process.execPath, [path.join(RAIZ, 'src', 'server.js')], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] });
  proceso.stdout.on('data', (d) => process.stdout.write(`[servidor] ${d}`));
  proceso.stderr.on('data', (d) => process.stderr.write(`[servidor] ${d}`));
  for (let i = 0; i < 60; i += 1) {
    if (await saludOk()) return proceso;
    if (proceso.exitCode !== null) throw new Error('El servidor terminó al iniciar (revise .env y PostgreSQL).');
    await esperar(250);
  }
  proceso.kill();
  throw new Error('El servidor no respondió a /api/salud a tiempo.');
};

const detenerServidor = async (proceso) => {
  if (!proceso || proceso.exitCode !== null) return;
  const terminado = new Promise((r) => { proceso.once('exit', r); });
  proceso.kill();
  await terminado;
  console.log('[e2e] Servidor detenido (proceso Node finalizado)');
};

// Entorno: entorno.local.json si existe; si no, el de ejemplo. Completa admin desde .env y genera tokenVencido.
const prepararEntorno = () => {
  const base = JSON.parse(fs.readFileSync(fs.existsSync(ENTORNO_LOCAL) ? ENTORNO_LOCAL : ENTORNO_EJEMPLO, 'utf8'));
  const fijar = (key, value) => {
    const v = base.values.find((x) => x.key === key);
    if (v) v.value = value;
    else base.values.push({ key, value, type: 'default', enabled: true });
  };
  const obtener = (key) => (base.values.find((x) => x.key === key) || {}).value;

  // Las pruebas apuntan siempre al servidor que levanta este script (puerto PORT).
  fijar('baseUrl', `http://localhost:${env.PORT}/api`);
  if (!obtener('adminCorreo')) fijar('adminCorreo', process.env.ADMIN_CORREO || '');
  if (!obtener('adminPassword')) fijar('adminPassword', process.env.ADMIN_PASSWORD || '');
  const ahora = Math.floor(Date.now() / 1000);
  fijar('tokenVencido', jwt.sign({ sub: '1', rol: 'usuario', exp: ahora - 60 }, env.JWT_SECRET, { algorithm: 'HS256' }));
  return base;
};

const correr = (folder, environment, nombreReporte) => new Promise((resolve, reject) => {
  newman.run({
    collection: COLECCION,
    environment,
    folder,
    exportEnvironment: ENTORNO_LOCAL,
    reporters: ['cli', 'htmlextra'],
    reporter: {
      htmlextra: {
        export: path.join(REPORTES, nombreReporte),
        skipHeaders: 'Authorization',
        // El reporte no debe mostrar la contraseña del administrador ni los tokens emitidos
        hideRequestBody: ['01.8 Login administrador'],
        hideResponseBody: LOGINS,
        title: 'Catálogo API · Reporte de pruebas',
        browserTitle: 'Catálogo API · Newman',
      },
    },
  }, (err, resumen) => {
    if (err) return reject(err);
    return resolve(resumen);
  });
});

// run.failures incluye aserciones fallidas y errores de petición o de script.
const fallos = (resumen) => resumen.run.failures.length;

(async () => {
  let servidor;
  let codigo = 0;
  try {
    fs.mkdirSync(REPORTES, { recursive: true });

    console.log('[e2e] 1/4 Iniciando servidor…');
    servidor = await iniciarServidor();

    console.log('[e2e] 2/4 Ejecutando carpetas 00–07…');
    const r1 = await correr(CARPETAS_FASE_1, prepararEntorno(), 'reporte-e2e-1-funcional.html');
    if (fallos(r1) > 0) throw new Error(`Fallaron ${fallos(r1)} pruebas en las carpetas 00–07.`);

    console.log('[e2e] 3/4 Reiniciando el servidor…');
    await detenerServidor(servidor);
    if (await saludOk()) throw new Error('El servidor sigue respondiendo después de detenerlo.');
    servidor = await iniciarServidor();
    console.log('[e2e] Servidor iniciado de nuevo');

    console.log('[e2e] 4/4 Ejecutando carpeta 08 (persistencia)…');
    const r2 = await correr([CARPETA_PERSISTENCIA], r1.environment.toJSON(), 'reporte-e2e-2-persistencia.html');
    if (fallos(r2) > 0) throw new Error(`Fallaron ${fallos(r2)} pruebas en la carpeta 08.`);

    const peticiones = r1.run.stats.requests.total + r2.run.stats.requests.total;
    const aserciones = r1.run.stats.assertions.total + r2.run.stats.assertions.total;
    console.log(`\n[e2e] ${peticiones} peticiones, ${aserciones} aserciones, 0 fallos.`);
    console.log('[e2e] Persistencia verificada tras reinicio');
  } catch (err) {
    console.error(`\n[e2e] ERROR: ${err.message}`);
    codigo = 1;
  } finally {
    await detenerServidor(servidor);
    // exitCode en lugar de process.exit(): deja cerrar los sockets pendientes (en Windows exit() inmediato puede abortar).
    process.exitCode = codigo;
  }
})();
