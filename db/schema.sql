-- Esquema del catálogo. Idempotente: se puede ejecutar varias veces sin error.

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

-- PK compuesta: un usuario no puede tener el mismo producto dos veces.
-- ON DELETE CASCADE: al borrar un producto (o usuario) se borran sus favoritos.
CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, producto_id)
);
