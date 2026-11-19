# Catálogo de productos con favoritos y acceso por roles

API REST construida con **Node.js, Express 5 y PostgreSQL** para la Tarea 2 de *Desarrollo Web* (UNEMI). Permite consultar un catálogo de productos, gestionarlo como administrador y que cada usuario autenticado mantenga su propia lista de favoritos.

| Integrante | GitHub |
|---|---|
| Aaron Alejandro Bayas Caicedo | [`AaronBayas`](https://github.com/AaronBayas) |
| [NOMBRE COMPLETO INTEGRANTE B] | `[USUARIO_GITHUB_B]` |

**Funcionalidades**
- Registro e inicio de sesión con contraseñas cifradas (bcrypt) y token JWT con expiración.
- Catálogo público (listar, filtrar por categoría, ver detalle).
- Creación, actualización y eliminación de productos solo para el rol `admin`.
- Favoritos por usuario autenticado, sin duplicados y aislados entre usuarios.
- Datos persistentes en PostgreSQL (sobreviven al reinicio del servidor).

---

## 1. Base de datos elegida: PostgreSQL

Se eligió **PostgreSQL** con el controlador `pg` porque:

- Los datos son **relacionales**: un usuario tiene muchos favoritos y cada favorito apunta a un producto.
- Las reglas de integridad viven **en el propio motor**, aunque falle una validación de la API (defensa en profundidad):
  - `PRIMARY KEY (usuario_id, producto_id)` en `favoritos` → un producto no puede repetirse en los favoritos de un usuario.
  - `UNIQUE` en `usuarios.correo` → no hay correos duplicados.
  - `CHECK (precio > 0)`, `CHECK (rol IN ('usuario','admin'))` y longitudes mínimas en los textos.
  - `FOREIGN KEY … ON DELETE CASCADE` → consistencia al eliminar.
- `pg` admite **consultas parametrizadas** (`$1, $2…`), lo que evita la inyección SQL. Ninguna consulta del proyecto concatena valores.

### Política al eliminar un producto

`favoritos.producto_id` está definido con `ON DELETE CASCADE`: **al eliminar un producto se eliminan automáticamente sus filas en `favoritos`**. Así no quedan favoritos que apunten a productos inexistentes. Se demuestra en la carpeta `07 Consistencia al eliminar` de la colección de Postman.

---

## 2. Requisitos

- **Node.js 22 LTS o superior** y npm
- **PostgreSQL 15 o superior** instalado localmente, o **Docker** (se incluye `docker-compose.yml`)
- **Postman** (opcional, para ejecutar la colección de forma visual). Newman ya viene como dependencia de desarrollo.

## 3. Instalación

```bash
git clone https://github.com/AaronBayas/API-REST-con-Node.js-y-Express-.git
cd API-REST-con-Node.js-y-Express-
npm ci
cp .env.example .env        # en Windows (cmd): copy .env.example .env
```

Luego edite `.env` y complete los valores (ver la tabla siguiente).

## 4. Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP de la API (por defecto `3000`) |
| `PGHOST` | Servidor de PostgreSQL (p. ej. `localhost`) |
| `PGPORT` | Puerto de PostgreSQL (por defecto `5432`) |
| `PGUSER` | Usuario de PostgreSQL |
| `PGPASSWORD` | Contraseña de ese usuario |
| `PGDATABASE` | Nombre de la base de datos (`catalogo_db`) |
| `JWT_SECRET` | Clave secreta para firmar los tokens. Use un valor largo y aleatorio, p. ej. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Vigencia del token (p. ej. `1h`, `30m`) |
| `BCRYPT_ROUNDS` | Costo de bcrypt (por defecto `10`) |
| `ADMIN_NOMBRE` | Nombre del administrador que crea `npm run db:admin` |
| `ADMIN_CORREO` | Correo del administrador |
| `ADMIN_PASSWORD` | Contraseña del administrador (8 a 72 caracteres) |

El archivo `.env` está en `.gitignore` y **nunca** se sube al repositorio. Si falta una variable obligatoria, la API se detiene al iniciar e indica cuál falta (sin mostrar valores).

## 5. Inicialización de la base de datos

1. Cree la base de datos vacía. Con PostgreSQL local:
   ```bash
   psql -U postgres -c "CREATE DATABASE catalogo_db;"
   ```
   O con Docker (crea la base con los datos del `.env` y guarda los datos en el volumen `pgdata`):
   ```bash
   docker compose up -d
   ```
2. Cree las tablas y cargue los 6 productos de ejemplo (se puede ejecutar varias veces sin duplicar datos):
   ```bash
   npm run db:init
   ```
3. Cree el administrador definido en `.env` (si ya existe, actualiza su contraseña y rol):
   ```bash
   npm run db:admin
   ```

El registro público **siempre** crea usuarios con rol `usuario`; la única forma de obtener un administrador es este script.

---

## 6. Ejecución

```bash
npm run dev     # desarrollo, se reinicia al guardar cambios (nodemon)
npm start       # modo normal
```

La API queda disponible en `http://localhost:3000/api`. Prueba rápida:

```bash
curl http://localhost:3000/api/salud
# {"ok":true,"data":{"estado":"activo"}}
```

## 7. Rutas

Prefijo común: `/api`. Las rutas protegidas requieren el encabezado `Authorization: Bearer <token>`.

| Método | Ruta | Acceso | Cuerpo | Respuestas |
|---|---|---|---|---|
| GET | `/salud` | Público | — | 200 |
| POST | `/auth/registro` | Público | `{ nombre, correo, password }` | 201, 409, 422 |
| POST | `/auth/login` | Público | `{ correo, password }` | 200, 401, 422 |
| GET | `/productos` | Público | — (`?categoria=` opcional) | 200 |
| GET | `/productos/:id` | Público | — | 200, 400, 404 |
| POST | `/productos` | Admin | `{ nombre, descripcion, categoria, precio }` | 201, 401, 403, 422 |
| PUT | `/productos/:id` | Admin | `{ nombre, descripcion, categoria, precio }` (los 4 obligatorios) | 200, 400, 401, 403, 404, 422 |
| DELETE | `/productos/:id` | Admin | — | 204, 400, 401, 403, 404 |
| GET | `/favoritos` | Usuario autenticado | — | 200, 401 |
| POST | `/favoritos` | Usuario autenticado | `{ productoId }` | 201, 401, 404, 409, 422 |
| DELETE | `/favoritos/:productId` | Usuario autenticado | — | 204, 400, 401, 404 |

**Reglas importantes**
- Los favoritos se asocian **solo** al usuario del token (`req.usuario.id`). Si el cuerpo trae un `usuarioId`, se ignora.
- El registro ignora cualquier campo `rol` enviado por el cliente.
- Al crear o actualizar un producto solo se toman `nombre`, `descripcion`, `categoria` y `precio`; los demás campos se ignoran. La categoría se guarda en minúsculas.
- `precio` debe ser un **número** JSON mayor que 0 y con máximo 2 decimales (`"10"` como texto es inválido).
- Ninguna respuesta incluye `password_hash`, trazas de error ni SQL.

### Formato de las respuestas

```jsonc
// Éxito
{ "ok": true, "data": { "id": 1, "nombre": "Audífonos Nébula X2", "categoria": "tecnologia", "precio": 79.9, "...": "..." } }

// Éxito en listas
{ "ok": true, "total": 2, "data": [ { "...": "..." }, { "...": "..." } ] }

// Error
{ "ok": false, "error": { "codigo": "VALIDACION", "mensaje": "Datos inválidos",
  "detalles": [ { "campo": "precio", "mensaje": "Debe ser un número mayor que 0" } ] } }
```

`DELETE` exitoso responde **204 sin cuerpo**.

### Ejemplos

Inicio de sesión:

```http
POST /api/auth/login
Content-Type: application/json

{ "correo": "usuario@demo.test", "password": "ClavePrueba123" }
```

```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tipo": "Bearer",
    "expiraEn": "1h",
    "usuario": { "id": 3, "nombre": "Usuario A", "correo": "usuario@demo.test", "rol": "usuario" }
  }
}
```

Agregar un favorito:

```http
POST /api/favoritos
Authorization: Bearer <token>
Content-Type: application/json

{ "productoId": 3 }
```

```json
{ "ok": true, "data": { "usuario_id": 3, "producto_id": 3, "creado_en": "2026-11-18T20:15:00.000Z" } }
```

### Criterio de códigos HTTP

| Código | Cuándo | `error.codigo` |
|---|---|---|
| 200 | Consultas y actualizaciones exitosas | — |
| 201 | Creación (registro, producto, favorito) | — |
| 204 | Eliminación exitosa | — |
| **400** | **Petición mal formada**: JSON con sintaxis inválida, o parámetro de ruta `:id` / `:productId` que no es un entero positivo | `PETICION_INVALIDA` |
| **422** | **JSON bien formado pero con contenido inválido**: campo obligatorio ausente o vacío, correo con formato inválido, contraseña corta, precio ≤ 0 o no numérico, `productoId` no entero | `VALIDACION` |
| 401 | Sin token, token mal firmado o alterado, token vencido, credenciales incorrectas en el login | `NO_AUTENTICADO` / `TOKEN_VENCIDO` / `CREDENCIALES_INVALIDAS` |
| 403 | Token válido pero rol insuficiente (un usuario intenta modificar el catálogo) | `PROHIBIDO` |
| 404 | Producto inexistente, favorito inexistente para ese usuario o ruta inexistente | `NO_ENCONTRADO` |
| 409 | Correo ya registrado o favorito duplicado | `CONFLICTO` |
| 500 | Error no controlado (mensaje genérico "Error interno del servidor") | `ERROR_INTERNO` |

La diferencia entre **400** y **422**: 400 significa que la API *no pudo interpretar* la petición (el JSON está roto o la URL tiene un id que no es número); 422 significa que la entendió pero los *datos no cumplen las reglas*.

### Seguridad del JWT

- Payload mínimo: `{ sub: <id del usuario>, rol: "usuario" | "admin" }`, firmado con `HS256` y `expiresIn = JWT_EXPIRES_IN`.
- `jwt.verify` se ejecuta con el algoritmo fijado en `['HS256']`, y comprueba firma y expiración. Un token vencido devuelve `TOKEN_VENCIDO`; cualquier otro problema (firma inválida, token alterado, `alg: none`) devuelve `NO_AUTENTICADO`.
- El login responde el mismo mensaje si el correo no existe o si la contraseña es incorrecta, para no revelar qué correos están registrados.

---

## 8. Pruebas

La colección `postman/Catalogo_API.postman_collection.json` tiene **9 carpetas y 48 peticiones**. Cada una incluye aserciones `pm.test` sobre el código de estado y los campos de la respuesta.

| Carpeta | Qué prueba |
|---|---|
| 00 Salud | API activa; genera correos ficticios nuevos para los usuarios A y B |
| 01 Registro e inicio de sesión | Registro, rol forzado a `usuario`, duplicado 409, validaciones 422, login de A, B y admin, 401 |
| 02 Catálogo público | Listado, filtro por categoría, detalle, 404, 400 |
| 03 Gestión de productos (admin) | Crear, precio 0 → 422, campos vacíos → 422, actualizar, eliminar y verificar 404 |
| 04 Seguridad | Sin token, token vencido, token alterado → 401; rol usuario → 403 |
| 05 Favoritos | Agregar, duplicado 409, inexistente 404, `productoId` inválido 422, listar |
| 06 Aislamiento entre usuarios | B no ve ni puede quitar los favoritos de A; `usuarioId` en el cuerpo se ignora |
| 07 Consistencia al eliminar | Eliminar un producto lo quita de los favoritos (cascade) |
| 08 Persistencia tras reinicio | Tras reiniciar Node, el producto actualizado y el favorito siguen existiendo |

### Preparar el entorno

```bash
cp postman/Catalogo_API.postman_environment.example.json postman/entorno.local.json
# Windows (cmd): copy postman\Catalogo_API.postman_environment.example.json postman\entorno.local.json
```

En `postman/entorno.local.json` (ignorado por git) complete `adminCorreo` y `adminPassword` con los valores del `.env`. `passwordPrueba` es opcional: si queda vacío, la colección usa una contraseña ficticia para los usuarios de prueba.

Genere un token vencido y péguelo en la variable `tokenVencido`:

```bash
npm run token:vencido
```

### Opción A · Todo automático (recomendado)

Con el servidor **detenido**:

```bash
npm run test:e2e
```

El script levanta la API, ejecuta las carpetas 00–07, **detiene el proceso Node y lo vuelve a iniciar**, ejecuta la carpeta 08 y termina con `Persistencia verificada tras reinicio`. Genera `tokenVencido` y completa los datos del administrador desde `.env` si faltan. Si algo falla, termina con código de salida distinto de 0.

### Opción B · Newman manual

```bash
npm start            # en una terminal
npm run test:api     # en otra terminal
```

### Opción C · Postman y reinicio manual

1. Importe la colección y `entorno.local.json` en Postman y seleccione el entorno.
2. Con `npm start` en marcha, ejecute las carpetas 00 a 07 en orden con el *Collection Runner*.
3. Detenga el servidor con `Ctrl + C` y vuelva a iniciarlo con `npm start`.
4. Ejecute la carpeta `08 Persistencia tras reinicio`.

Los reportes HTML de Newman quedan en `docs/evidencias/newman/` (ignorado por git). En ellos se omiten el encabezado `Authorization`, la contraseña del administrador y los tokens emitidos.

---

## 9. Estructura del proyecto

```
├── src/
│   ├── app.js                    # app Express: helmet, cors, JSON, rutas y manejo de errores
│   ├── server.js                 # valida .env, prueba la conexión a la BD y escucha en PORT
│   ├── config/                   # env.js (variables) y db.js (pool de pg)
│   ├── routes/                   # index, auth, productos, favoritos
│   ├── controllers/              # lógica de cada ruta
│   ├── repositories/             # ÚNICA capa que ejecuta SQL (consultas parametrizadas)
│   ├── middlewares/              # verificarToken, requerirRol, validarId, noEncontrado, manejadorErrores
│   └── utils/                    # HttpError, validaciones, respuestas
├── db/
│   ├── schema.sql                # tablas y restricciones
│   └── seed.sql                  # 6 productos de ejemplo
├── scripts/
│   ├── init-db.js                # npm run db:init
│   ├── crear-admin.js            # npm run db:admin
│   ├── generar-token-vencido.js  # npm run token:vencido
│   └── e2e-persistencia.js       # npm run test:e2e
├── postman/                      # colección y entorno de ejemplo (sin secretos)
├── docs/evidencias/              # capturas para el informe
├── .env.example
├── docker-compose.yml
└── package.json
```

**Flujo de una petición:** Postman → ruta (`routes/`) → middlewares (`verificarToken`, `requerirRol`, `validarId`) → controlador (valida el cuerpo) → repositorio (SQL parametrizado) → PostgreSQL → respuesta JSON. Cualquier error lanzado en el camino llega al `manejadorErrores`, que responde con el formato único.

## 10. Herramientas de apoyo y recursos

- **Claude Code** (Anthropic): asistente de programación usado para generar la estructura, el código, la colección de Postman y este README a partir del plan de trabajo del equipo; todo el código fue revisado y probado por los integrantes.
- Visual Studio Code, Postman, Newman y `newman-reporter-htmlextra`, pgAdmin.
- Documentación consultada: [Express 5](https://expressjs.com/), [node-postgres](https://node-postgres.com/), [PostgreSQL – Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [Postman – Writing tests](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/), [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110).
