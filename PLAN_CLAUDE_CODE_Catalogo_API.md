# Plan de ejecución para Claude Code
## Tarea 2 · Catálogo de productos con favoritos y acceso por roles (UNEMI · Desarrollo Web)

> **Cómo usar este archivo:** colóquenlo en la raíz del repositorio clonado y pídanle a Claude Code:
> *"Lee `PLAN_CLAUDE_CODE_Catalogo_API.md` y ejecuta la Fase N. Al terminar la fase, muéstrame el resumen y espera mi confirmación antes de continuar."*
> Ejecuten **una fase por vez**. Cada fase tiene un responsable, archivos a crear, criterios de aceptación y el commit que debe cerrarla.

---

## 0. Contexto fijo (no cambiar sin avisar)

| Dato | Valor |
|---|---|
| Repositorio | `https://github.com/AaronBayas/API-REST-con-Node.js-y-Express-.git` |
| Integrante A | Aaron Alejandro Bayas Caicedo · GitHub `AaronBayas` |
| Integrante B | `[NOMBRE COMPLETO INTEGRANTE B]` · GitHub `[USUARIO_GITHUB_B]` |
| Stack | Node.js ≥ 22 LTS, Express 5, PostgreSQL ≥ 15 con `pg`, `jsonwebtoken`, `bcryptjs`, `dotenv` |
| Pruebas | Postman (colección + entorno de ejemplo) y Newman para ejecutarlas por consola |
| Prefijo de rutas | `/api` |
| Idioma del código | Nombres de dominio en español (`productos`, `favoritos`, `usuarios`), código limpio y comentado solo donde aporte |

### 0.1 Reglas que Claude Code debe respetar en todas las fases

1. **Autoría real de commits.** Antes de cada commit ejecutar `git config user.name` y `git config user.email`. Si no coinciden con el **responsable de la fase**, **detenerse** y avisar: "Esta fase la debe commitear el Integrante X desde su equipo o con su identidad configurada". **Nunca** usar `--author` para suplantar al otro integrante.
2. **Secretos fuera del repo.** Nunca escribir valores reales en archivos versionados. `.env` siempre en `.gitignore`. No imprimir `JWT_SECRET` ni contraseñas en logs.
3. **Consultas parametrizadas siempre** (`$1, $2…`). Prohibido concatenar valores en SQL.
4. **Nunca devolver `password_hash`** en ninguna respuesta (las consultas de repositorio deben seleccionar columnas explícitas, no `SELECT *` sobre `usuarios`).
5. Respuestas JSON con formato único (ver §2.3). Errores sin stack trace ni detalles internos.
6. Al cerrar cada fase: `npm run lint` (si existe) y una prueba manual rápida con `curl` o Newman; reportar resultado real, no supuesto.

---

## 1. Reparto de trabajo (para que ambos tengan commits identificables)

| Fase | Contenido | Responsable |
|---|---|---|
| F0 | Inicialización del proyecto, estructura, `.gitignore`, `.env.example` | **A (Aaron)** |
| F1 | Base de datos: `schema.sql`, `seed.sql`, conexión `pg`, script `db:init` | **A (Aaron)** |
| F2 | CRUD de productos (repositorio, controlador, rutas, validaciones, filtro) | **B** |
| F3 | Autenticación: registro, login, hash, JWT, middleware `verificarToken` | **A (Aaron)** |
| F4 | Roles: middleware `requerirRol`, script `db:admin`, protección del CRUD | **B** |
| F5 | Favoritos: agregar, listar, quitar, aislamiento por usuario | **B** |
| F6 | Manejo de errores centralizado y criterio 400/422 | **A (Aaron)** |
| F7 | Colección Postman + entorno de ejemplo + Newman (Auth/Productos/Seguridad) | **A (Aaron)** |
| F8 | Colección Postman (Favoritos/Aislamiento/Persistencia) + script e2e con reinicio | **B** |
| F9 | README, verificación desde copia limpia, commit final | **A y B** (cada uno su sección) |

> En el video, **A** explica verificación del JWT y el flujo de una petición; **B** explica una operación CRUD y el control de rol/propiedad. Así cada uno explica código que escribió.

---

## 2. Decisiones de diseño (ya tomadas; el Word de entrega las documenta igual)

### 2.1 Por qué PostgreSQL + `pg`
- Los datos son **relacionales** (usuario ↔ favorito ↔ producto) y la tarea exige **sin duplicados** y **consistencia al eliminar**: PostgreSQL lo resuelve en el propio motor con `PRIMARY KEY (usuario_id, producto_id)`, `FOREIGN KEY … ON DELETE CASCADE`, `UNIQUE` y `CHECK (precio > 0)`.
- Las restricciones viven en la base de datos aunque falle una validación de la API (defensa en profundidad).
- `pg` permite **consultas parametrizadas** nativas, lo que evita inyección SQL.

### 2.2 Política al eliminar un producto
`favoritos.producto_id` usa `ON DELETE CASCADE`: al eliminar un producto se eliminan automáticamente sus filas en `favoritos`. No quedan favoritos que apunten a productos inexistentes. Se demuestra en la prueba "Eliminar producto con favoritos → desaparece de la lista del usuario".

### 2.3 Formato de respuestas
```json
// Éxito
{ "ok": true, "data": { ... } }
// Éxito en listas
{ "ok": true, "total": 6, "data": [ ... ] }
// Error
{ "ok": false, "error": { "codigo": "VALIDACION", "mensaje": "Datos inválidos", "detalles": [ { "campo": "precio", "mensaje": "Debe ser un número mayor que 0" } ] } }
```
`DELETE` exitoso responde **204 sin cuerpo**.

### 2.4 Criterio de códigos HTTP (documentar en README)

| Código | Cuándo | `error.codigo` |
|---|---|---|
| 200 | Consultas y actualizaciones exitosas | — |
| 201 | Creación (registro, producto, favorito) | — |
| 204 | Eliminación exitosa | — |
| **400** | **Petición mal formada**: JSON inválido, parámetro de ruta `:id`/`:productId` que no es entero positivo | `PETICION_INVALIDA` |
| **422** | **JSON bien formado pero contenido inválido**: campo obligatorio ausente o vacío, correo con formato inválido, contraseña corta, precio ≤ 0 o no numérico, `productoId` no entero | `VALIDACION` |
| 401 | Sin token, token mal firmado, token vencido, credenciales incorrectas en login | `NO_AUTENTICADO` / `TOKEN_VENCIDO` / `CREDENCIALES_INVALIDAS` |
| 403 | Token válido pero rol insuficiente (usuario intenta modificar catálogo) | `PROHIBIDO` |
| 404 | Producto inexistente, favorito inexistente para ese usuario, ruta inexistente | `NO_ENCONTRADO` |
| 409 | Correo ya registrado, favorito duplicado | `CONFLICTO` |
| 500 | Error no controlado (mensaje genérico "Error interno del servidor") | `ERROR_INTERNO` |

### 2.5 Seguridad del JWT
- Payload mínimo: `{ sub: <id usuario>, rol: <"usuario"|"admin"> }`.
- `jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN })`.
- `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })` — verifica **firma y expiración**. `TokenExpiredError` → 401 `TOKEN_VENCIDO`; cualquier otro error → 401 `NO_AUTENTICADO`.
- La identidad para favoritos sale **solo** de `req.usuario.id` (del token verificado); se ignora cualquier `usuarioId` del cuerpo, query o ruta.

---

## 3. Estructura objetivo del repositorio

```
API-REST-con-Node.js-y-Express-/
├── src/
│   ├── app.js                    # crea la app Express, middlewares globales, monta rutas
│   ├── server.js                 # lee PORT, prueba conexión a BD y hace listen
│   ├── config/
│   │   ├── env.js                # carga dotenv y valida variables obligatorias
│   │   └── db.js                 # Pool de pg + helper query()
│   ├── routes/
│   │   ├── index.js              # /api/salud, /api/auth, /api/productos, /api/favoritos
│   │   ├── auth.routes.js
│   │   ├── productos.routes.js
│   │   └── favoritos.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── productos.controller.js
│   │   └── favoritos.controller.js
│   ├── repositories/             # ÚNICA capa que habla con la base de datos
│   │   ├── usuarios.repository.js
│   │   ├── productos.repository.js
│   │   └── favoritos.repository.js
│   ├── middlewares/
│   │   ├── verificarToken.js
│   │   ├── requerirRol.js
│   │   ├── validarId.js
│   │   ├── noEncontrado.js
│   │   └── manejadorErrores.js
│   └── utils/
│       ├── HttpError.js
│       ├── validaciones.js
│       └── respuestas.js
├── db/
│   ├── schema.sql
│   └── seed.sql
├── scripts/
│   ├── init-db.js                # ejecuta schema.sql + seed.sql
│   ├── crear-admin.js            # crea/actualiza el administrador desde .env
│   ├── generar-token-vencido.js  # imprime un JWT ya expirado (solo para pruebas)
│   └── e2e-persistencia.js       # corre Newman, reinicia el servidor y verifica persistencia
├── postman/
│   ├── Catalogo_API.postman_collection.json
│   └── Catalogo_API.postman_environment.example.json
├── docs/
│   └── evidencias/               # capturas para el Word (PNG); reportes Newman ignorados por git
├── .env.example
├── .gitignore
├── docker-compose.yml            # opcional: PostgreSQL local
├── package.json
├── package-lock.json
├── PLAN_CLAUDE_CODE_Catalogo_API.md
└── README.md
```

---

## 4. Fases

### F0 · Inicialización — Responsable: **A (Aaron)**

1. Clonar (si no existe) y entrar:
   ```bash
   git clone https://github.com/AaronBayas/API-REST-con-Node.js-y-Express-.git
   cd API-REST-con-Node.js-y-Express-
   ```
2. `npm init -y` y ajustar `package.json`: `"name": "catalogo-api"`, `"type": "commonjs"`, `"engines": { "node": ">=22" }`.
3. Instalar:
   ```bash
   npm install express@5 pg jsonwebtoken bcryptjs dotenv helmet cors
   npm install -D nodemon newman newman-reporter-htmlextra
   ```
4. Scripts en `package.json`:
   ```json
   "scripts": {
     "start": "node src/server.js",
     "dev": "nodemon src/server.js",
     "db:init": "node scripts/init-db.js",
     "db:admin": "node scripts/crear-admin.js",
     "token:vencido": "node scripts/generar-token-vencido.js",
     "test:api": "newman run postman/Catalogo_API.postman_collection.json -e postman/entorno.local.json --export-environment postman/entorno.local.json -r cli,htmlextra --reporter-htmlextra-export docs/evidencias/newman/reporte.html --reporter-htmlextra-skipHeaders Authorization",
     "test:e2e": "node scripts/e2e-persistencia.js"
   }
   ```
5. `.gitignore`:
   ```
   node_modules/
   .env
   postman/entorno.local.json
   docs/evidencias/newman/
   *.log
   .DS_Store
   ```
6. `.env.example` (sin valores reales):
   ```
   PORT=3000
   PGHOST=localhost
   PGPORT=5432
   PGUSER=
   PGPASSWORD=
   PGDATABASE=catalogo_db
   JWT_SECRET=
   JWT_EXPIRES_IN=1h
   BCRYPT_ROUNDS=10
   ADMIN_NOMBRE=Administrador
   ADMIN_CORREO=
   ADMIN_PASSWORD=
   ```
7. `docker-compose.yml` opcional con `postgres:16`, puerto 5432 y volumen nombrado `pgdata` (para que los datos persistan).
8. Crear la estructura de carpetas vacía de §3 (con `.gitkeep` donde haga falta) y un `src/app.js` + `src/server.js` mínimos con `GET /api/salud → 200 { ok: true, data: { estado: "activo" } }`.

**Aceptación:** `npm run dev` levanta y `GET http://localhost:3000/api/salud` responde 200.
**Commit:** `chore: inicializa proyecto Express con estructura por capas`

---

### F1 · Base de datos — Responsable: **A (Aaron)**

`db/schema.sql` (idempotente para desarrollo):
```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL CHECK (length(trim(nombre)) >= 2),
  correo        VARCHAR(150) NOT NULL UNIQUE CHECK (correo = lower(correo)),
  password_hash VARCHAR(100) NOT NULL,
  rol           VARCHAR(10)  NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario','admin')),
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(120)  NOT NULL CHECK (length(trim(nombre)) >= 2),
  descripcion    VARCHAR(500)  NOT NULL CHECK (length(trim(descripcion)) >= 1),
  categoria      VARCHAR(60)   NOT NULL CHECK (length(trim(categoria)) >= 2),
  precio         NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  creado_en      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (lower(categoria));

CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, producto_id)
);
```

`db/seed.sql`: **6 productos ficticios** en 3 categorías (`tecnologia`, `hogar`, `deportes`), insertados solo si la tabla está vacía (`INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM productos)`). Ejemplos: "Audífonos Nébula X2", "Teclado Orión 60%", "Lámpara Lumen Desk", "Set de tazas Brisa", "Balón Andes Pro", "Botella térmica Cumbre".

`src/config/db.js`: `new Pool()` (pg toma `PGHOST…` del entorno) y exportar `query(text, params)`.
`scripts/init-db.js`: lee y ejecuta `schema.sql` y luego `seed.sql`; imprime "Base de datos inicializada" y cierra el pool.
`src/config/env.js`: si falta `JWT_SECRET` o variables `PG*`, terminar con mensaje claro (sin imprimir valores).

**Aceptación:** crear BD vacía `catalogo_db` → `npm run db:init` dos veces seguidas sin error → `SELECT count(*) FROM productos` = 6.
**Commit:** `feat(db): esquema PostgreSQL con restricciones y datos de ejemplo`

---

### F2 · CRUD de productos — Responsable: **B**

- `productos.repository.js`: `listar({ categoria })` (filtro `WHERE lower(categoria) = lower($1)` si viene), `obtenerPorId(id)`, `crear(datos)`, `actualizar(id, datos)` (también `actualizado_en = now()`, `RETURNING …`), `eliminar(id)` (devuelve `rowCount`).
- `utils/validaciones.js` → `validarProducto(body)`:
  - Tomar **solo** `nombre, descripcion, categoria, precio` (lista blanca; el resto se ignora).
  - `nombre` string 2–120 tras `trim`; `descripcion` string 1–500; `categoria` string 2–60 (guardar en minúsculas).
  - `precio`: `typeof === 'number'`, finito, `> 0`, máximo 2 decimales, ≤ 99 999 999.99. `"10"` (string) es inválido.
  - Devuelve lista de `{ campo, mensaje }`; si no está vacía → `HttpError(422, 'VALIDACION', 'Datos inválidos', detalles)`.
- `middlewares/validarId.js`: el parámetro debe cumplir `/^[1-9]\d{0,9}$/` y ≤ 2 147 483 647; si no → 400 `PETICION_INVALIDA`.
- Controlador + rutas:
  - `GET /api/productos` (público; `?categoria=` opcional) → 200 lista.
  - `GET /api/productos/:id` (público) → 200 o 404.
  - `POST /api/productos` → 201.
  - `PUT /api/productos/:id` → 200 (PUT = reemplazo completo, exige los 4 campos) o 404.
  - `DELETE /api/productos/:id` → 204 o 404.
  - En esta fase POST/PUT/DELETE aún sin protección (la agrega F4).

**Aceptación:** con `curl` crear, leer, filtrar, actualizar y eliminar; `precio: 0` → 422; id `abc` → 400; id `99999` → 404. Reiniciar Node y comprobar que el producto creado sigue en `GET`.
**Commit:** `feat(productos): CRUD con filtro por categoría y validaciones`

---

### F3 · Autenticación — Responsable: **A (Aaron)**

- `usuarios.repository.js`: `crear({ nombre, correo, passwordHash })` **inserta siempre `rol = 'usuario'`** (el valor está escrito en la consulta, no viene del cliente); `buscarPorCorreoConHash(correo)` (único método que lee `password_hash`, uso interno del login); `buscarPorId(id)` sin hash.
- `validarRegistro(body)`: `nombre` 2–100, `correo` con formato válido (regex simple `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`, máx. 150, normalizar a minúsculas), `password` 8–72 caracteres. Cualquier `rol` enviado **se ignora**.
- `POST /api/auth/registro` → hash con `bcrypt.hash(password, BCRYPT_ROUNDS)` → 201 `{ id, nombre, correo, rol }`. Correo repetido (error pg `23505`) → 409.
- `POST /api/auth/login` → valida campos (422 si faltan) → busca por correo → `bcrypt.compare`. Si no existe o no coincide → **401 con el mismo mensaje** "Correo o contraseña incorrectos" (no revelar cuál falló). Éxito → 200 `{ token, tipo: "Bearer", expiraEn: JWT_EXPIRES_IN, usuario: { id, nombre, correo, rol } }`.
- `middlewares/verificarToken.js`:
  ```js
  // Lee "Authorization: Bearer <token>", verifica firma y expiración y deja la identidad en req.usuario
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');
  if (tipo !== 'Bearer' || !token) throw new HttpError(401, 'NO_AUTENTICADO', 'Token requerido');
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    req.usuario = { id: Number(payload.sub), rol: payload.rol };
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') throw new HttpError(401, 'TOKEN_VENCIDO', 'El token ha expirado');
    throw new HttpError(401, 'NO_AUTENTICADO', 'Token inválido');
  }
  ```
- `scripts/generar-token-vencido.js`: firma `{ sub: '1', rol: 'usuario', exp: ahora - 60 }` con `JWT_SECRET` e imprime **solo** el token (para la prueba de 401 por vencimiento).

**Aceptación:** registro 201 sin `password_hash` en la respuesta; registro con `"rol":"admin"` crea `rol: "usuario"`; correo duplicado 409; login incorrecto 401; login correcto devuelve token con `exp`.
**Commit:** `feat(auth): registro e inicio de sesión con bcrypt y JWT con expiración`

---

### F4 · Roles y administrador — Responsable: **B**

- `middlewares/requerirRol.js`:
  ```js
  // Se usa SIEMPRE después de verificarToken
  module.exports = (...roles) => (req, _res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw new HttpError(403, 'PROHIBIDO', 'No tiene permisos para esta acción');
    }
    next();
  };
  ```
- En `productos.routes.js`: `router.post('/', verificarToken, requerirRol('admin'), crear)`; igual para `PUT /:id` y `DELETE /:id`. Los `GET` quedan públicos.
- `scripts/crear-admin.js`: lee `ADMIN_NOMBRE`, `ADMIN_CORREO`, `ADMIN_PASSWORD` del `.env`, valida, hashea y hace
  `INSERT … VALUES ($1,$2,$3,'admin') ON CONFLICT (correo) DO UPDATE SET rol='admin', password_hash=EXCLUDED.password_hash, nombre=EXCLUDED.nombre`.
  Imprime "Administrador listo: <correo>" (nunca la contraseña).

**Aceptación:** POST producto sin token → 401; con token de usuario → 403; con token de admin → 201.
**Commit:** `feat(roles): restringe la gestión del catálogo al administrador`

---

### F5 · Favoritos — Responsable: **B**

- `favoritos.repository.js` (todas las consultas filtran por `usuario_id = $1`):
  - `listarPorUsuario(usuarioId)` → `JOIN productos` devolviendo `producto_id, nombre, categoria, precio, creado_en` (fecha de agregado).
  - `agregar(usuarioId, productoId)` → `INSERT … RETURNING`.
  - `quitar(usuarioId, productoId)` → `DELETE … WHERE usuario_id=$1 AND producto_id=$2` → `rowCount`.
- Controlador:
  - `POST /api/favoritos` body `{ "productoId": 3 }` → validar entero positivo (422) → verificar que el producto existe (404) → insertar; pg `23505` → 409 "El producto ya está en sus favoritos"; pg `23503` → 404 → 201.
  - `GET /api/favoritos` → 200 `{ total, data }`.
  - `DELETE /api/favoritos/:productId` (`validarId`) → `rowCount === 0` → 404 "Favorito no encontrado"; si no → 204.
  - **Siempre** `req.usuario.id`. Si llega `usuarioId` en el cuerpo, se ignora.
- Todas las rutas con `router.use(verificarToken)`.

**Aceptación:** A agrega producto 1 (201) → repite (409) → producto 99999 (404) → B lista y no ve el de A → B hace `DELETE /api/favoritos/1` (404) → A lista y el favorito sigue → admin elimina un producto que A tenía en favoritos → desaparece de la lista de A (cascade).
**Commit:** `feat(favoritos): favoritos por usuario autenticado con aislamiento`

---

### F6 · Errores y consistencia — Responsable: **A (Aaron)**

- `utils/HttpError.js`: `class HttpError extends Error { constructor(status, codigo, mensaje, detalles) }`.
- `middlewares/noEncontrado.js`: ruta inexistente → 404 `NO_ENCONTRADO`.
- `middlewares/manejadorErrores.js` (último middleware):
  - `err instanceof HttpError` → su estado y formato §2.3.
  - `err.type === 'entity.parse.failed'` (JSON mal formado) → 400 `PETICION_INVALIDA`.
  - pg `23505` → 409; `23503` → 404; `23514` (CHECK) → 422; `22P02` → 400.
  - Cualquier otro → `console.error` del error (solo en servidor) y 500 genérico.
- `app.js`: `helmet()`, `cors()`, `express.json({ limit: '100kb' })`, `app.disable('x-powered-by')`.
- Revisar que Express 5 propaga errores de funciones `async` (no hace falta `try/catch` en cada controlador).

**Aceptación:** enviar `{ "nombre": ` (JSON roto) → 400; ninguna respuesta de error contiene `stack`, SQL ni `password_hash`.
**Commit:** `refactor(errores): manejador centralizado y criterio 400/422 documentado`

---

### F7 · Colección Postman (parte 1) — Responsable: **A (Aaron)**

Crear `postman/Catalogo_API.postman_collection.json` (formato v2.1) con variables de entorno `{{baseUrl}}`, `{{tokenAdmin}}`, `{{tokenA}}`, `{{tokenB}}`, `{{tokenVencido}}`, `{{productoId}}`, `{{productoTemporalId}}`, `{{correoA}}`, `{{correoB}}`, `{{passwordPrueba}}`, `{{adminCorreo}}`, `{{adminPassword}}`.

En el *pre-request* de la colección: si `correoA` está vacío, generar `usuarioA_<timestamp>@demo.test` y `usuarioB_<timestamp>@demo.test` (correos ficticios, permiten re-ejecutar).

Carpetas y peticiones (cada una con `pm.test` de **estado** y **campos**):

| # | Carpeta / Petición | Esperado | Aserciones clave |
|---|---|---|---|
| 00 | Salud | 200 | `ok === true` |
| 01.1 | Registro usuario A | 201 | `data.rol === 'usuario'`, **no existe** `password_hash` ni `password` |
| 01.2 | Registro usuario B | 201 | igual |
| 01.3 | Registro con `"rol":"admin"` | 201 | `data.rol === 'usuario'` |
| 01.4 | Registro correo duplicado (A) | 409 | `error.codigo === 'CONFLICTO'` |
| 01.5 | Registro correo inválido / campos vacíos | 422 | `error.detalles` es arreglo |
| 01.6 | Login A | 200 | `data.token` existe → guardar `tokenA` |
| 01.7 | Login B | 200 | guardar `tokenB` |
| 01.8 | Login admin | 200 | `data.usuario.rol === 'admin'` → guardar `tokenAdmin` |
| 01.9 | Login contraseña incorrecta | 401 | `error.codigo === 'CREDENCIALES_INVALIDAS'` |
| 02.1 | Listar productos (público) | 200 | `total >= 5` |
| 02.2 | Filtrar `?categoria=tecnologia` | 200 | todos los `categoria === 'tecnologia'` |
| 02.3 | Obtener producto por id | 200 | `data.id` igual al pedido |
| 02.4 | Producto inexistente `/productos/999999` | 404 | `NO_ENCONTRADO` |
| 02.5 | Id inválido `/productos/abc` | 400 | `PETICION_INVALIDA` |
| 03.1 | Crear producto (admin) | 201 | guardar `productoId` |
| 03.2 | Crear con `precio: 0` | 422 | detalle con `campo === 'precio'` |
| 03.3 | Crear con campos vacíos | 422 | `detalles.length >= 1` |
| 03.4 | Actualizar producto (admin) | 200 | precio actualizado |
| 03.5 | Crear producto temporal (admin) | 201 | guardar `productoTemporalId` |
| 03.6 | Eliminar producto temporal (admin) | 204 | — |
| 03.7 | Consultar producto eliminado | 404 | — |
| 04.1 | Crear producto **sin token** | 401 | `NO_AUTENTICADO` |
| 04.2 | Crear producto con **token vencido** | 401 | `TOKEN_VENCIDO` |
| 04.3 | Crear producto con token alterado | 401 | `NO_AUTENTICADO` |
| 04.4 | Crear producto con rol usuario (tokenA) | 403 | `PROHIBIDO` |
| 04.5 | Actualizar con rol usuario | 403 | — |
| 04.6 | Eliminar con rol usuario | 403 | y luego GET confirma que sigue existiendo |
| 04.7 | `GET /favoritos` sin token | 401 | — |

Entorno de ejemplo `postman/Catalogo_API.postman_environment.example.json`: `baseUrl = http://localhost:3000/api`; **todas** las demás variables con valor vacío. Copiarlo como `postman/entorno.local.json` (ignorado por git) y llenar `adminCorreo`, `adminPassword`, `passwordPrueba` localmente. `tokenVencido` se llena con `npm run token:vencido`.

**Aceptación:** `npm run test:api` con carpetas 00–04 en verde.
**Commit:** `test(postman): colección de autenticación, productos y seguridad`

---

### F8 · Colección Postman (parte 2) y persistencia — Responsable: **B**

Agregar a la misma colección:

| # | Carpeta / Petición | Esperado | Aserciones clave |
|---|---|---|---|
| 05.1 | A agrega `productoId` a favoritos | 201 | `data.producto_id` |
| 05.2 | A agrega el mismo otra vez | 409 | `CONFLICTO` |
| 05.3 | A agrega producto inexistente 999999 | 404 | `NO_ENCONTRADO` |
| 05.4 | A agrega con `productoId: "x"` | 422 | — |
| 05.5 | A lista favoritos | 200 | contiene `productoId` |
| 06.1 | B lista favoritos | 200 | **no** contiene `productoId` |
| 06.2 | B intenta quitar favorito de A | 404 | — |
| 06.3 | B envía `usuarioId` de A en el cuerpo al agregar | 201 | el favorito queda en B, no en A |
| 06.4 | A lista favoritos | 200 | **sigue** conteniendo `productoId` |
| 06.5 | A quita su favorito | 204 | — |
| 06.6 | A lista favoritos | 200 | ya no lo contiene |
| 06.7 | A vuelve a agregar `productoId` (para persistencia) | 201 | — |
| 07.1 | Admin crea producto "cascada" | 201 | guardar id |
| 07.2 | A lo agrega a favoritos | 201 | — |
| 07.3 | Admin elimina producto "cascada" | 204 | — |
| 07.4 | A lista favoritos | 200 | **no** contiene el producto eliminado |
| 08.1 | *(tras reiniciar)* Login A | 200 | nuevo `tokenA` |
| 08.2 | *(tras reiniciar)* GET `/productos/{{productoId}}` | 200 | datos actualizados en 03.4 |
| 08.3 | *(tras reiniciar)* GET `/favoritos` de A | 200 | contiene `productoId` |

`scripts/e2e-persistencia.js` (usa `child_process` y la API de `newman`):
1. Levanta `node src/server.js`, espera `GET /api/salud` = 200.
2. Genera `tokenVencido` y corre las carpetas 00–07 exportando el entorno.
3. **Detiene el proceso Node** y lo vuelve a iniciar.
4. Corre la carpeta 08 con el entorno exportado.
5. Imprime "Persistencia verificada tras reinicio" si todo pasa; código de salida ≠ 0 si algo falla.

**Aceptación:** `npm run test:e2e` termina con 0 fallos.
**Commit:** `test(postman): favoritos, aislamiento entre usuarios y persistencia tras reinicio`

---

### F9 · README, verificación limpia y cierre — Responsables: **A y B**

`README.md` (A redacta 1–6, B redacta 7–11, cada uno lo commitea):
1. Título, integrantes (nombre + usuario GitHub) y propósito.
2. Elección de base de datos y justificación (§2.1) + política de eliminación (§2.2).
3. Requisitos (Node ≥ 22, npm, PostgreSQL ≥ 15 o Docker, Postman/Newman).
4. Instalación: `git clone`, `npm ci`, `cp .env.example .env` (en Windows `copy`).
5. Variables de entorno (tabla con descripción, **sin valores**).
6. Inicialización: crear BD, `npm run db:init`, `npm run db:admin`.
7. Ejecución: `npm run dev` / `npm start`.
8. Rutas: tabla método/ruta/acceso/cuerpo/respuestas + ejemplos JSON + criterio 400/422 (§2.4).
9. Pruebas: importar colección y entorno, `npm run token:vencido`, `npm run test:api`, `npm run test:e2e`, cómo probar el reinicio manual.
10. Estructura del proyecto.
11. Herramientas de apoyo usadas (incluye Claude Code) y recursos consultados.

Verificación desde copia limpia (Claude Code la ejecuta y reporta):
```bash
cd /tmp && rm -rf verif && git clone https://github.com/AaronBayas/API-REST-con-Node.js-y-Express-.git verif && cd verif
npm ci && cp ../<ruta>/.env .env   # o crear uno nuevo desde .env.example
npm run db:init && npm run db:admin && npm run test:e2e
```
Revisar además: `git ls-files | grep -E "\.env$|node_modules|entorno.local"` debe devolver **nada**.

Commit final y registro del hash:
```bash
git add -A && git commit -m "docs: README reproducible y guía de pruebas"
git push origin main
git rev-parse --short HEAD   # ← este hash va en el Word de entrega
git shortlog -sn             # ← evidencia de aportes de ambos
```
Opcional: `git tag -a entrega-tarea2 -m "Entrega Tarea 2"` y `git push --tags`.

---

## 5. Evidencias para el Word (capturas)

Claude Code **no puede** capturar la ventana de Postman, pero sí puede dejar listas las evidencias de consola y el reporte HTML. Guardar todas las imágenes en `docs/evidencias/` con estos nombres (el Word tiene un espacio para cada una):

| Archivo | Qué mostrar |
|---|---|
| `fig01_estructura.png` | Explorador de VS Code con la carpeta `src/` expandida |
| `fig02_db_tablas.png` | pgAdmin o `psql \d+ favoritos` mostrando PK compuesta y `ON DELETE CASCADE` |
| `fig03_registro_login.png` | Postman: registro 201 y login 200 (ocultar/recortar el token) |
| `fig04_validaciones.png` | Postman: crear producto con `precio: 0` → 422 |
| `fig05_401_403.png` | Postman: 401 sin token / token vencido y 403 con rol usuario |
| `fig06_favoritos_409_404.png` | Postman: favorito duplicado 409 y producto inexistente 404 |
| `fig07_aislamiento.png` | Postman: B no ve el favorito de A, B recibe 404 al quitarlo, A lo conserva |
| `fig08_newman.png` | Terminal con el resumen de `npm run test:e2e` (tabla de Newman con 0 fallos) |
| `fig09_persistencia.png` | Terminal: `Ctrl+C`, `npm start` otra vez y Postman consultando el producto/favorito |
| `fig10_commits.png` | GitHub → *Insights › Contributors* o `git log --oneline --format="%h %an %s"` |

Opcional automatizable por Claude Code: tras `npm run test:api`, abrir `docs/evidencias/newman/reporte.html` con Playwright y guardar una captura de la página de resumen como `fig08b_reporte_newman.png` (verificar antes que el reporte no muestre encabezados `Authorization`).

---

## 6. Checklist final contra la rúbrica

- [ ] **CRUD y persistencia (3):** CRUD + filtro OK, datos siguen tras reiniciar, cascada en favoritos demostrada.
- [ ] **Autenticación (1,5):** bcrypt, JWT con `expiresIn`, `verify` con algoritmo fijo, 401 por vencido.
- [ ] **Roles y propiedad (2):** 403 para usuario, registro ignora `rol`, favoritos filtrados por `req.usuario.id`, prueba A/B.
- [ ] **Validaciones y errores (1):** 400/422/404/409 coherentes y documentados, sin stack ni hashes.
- [ ] **Pruebas (1):** colección con aserciones en todas las peticiones, entorno de ejemplo sin secretos, carpeta de persistencia.
- [ ] **Repositorio (0,5):** público, `package-lock.json`, `.gitignore`, `.env.example`, colección, `schema.sql`, README completo, commits de ambos.
- [ ] **Video (1):** ambos hablan de código propio, flujo Postman→ruta→controlador→BD→JSON, demostraciones, dificultad y cómo ejecutar.
- [ ] Enlaces del repo y del video probados en ventana privada; hash del commit final anotado en el Word.
