-- ============================================
-- Esquema para Turso (libSQL / SQLite)
-- ============================================
-- Ejecutar en Turso Shell: turso db shell inventario-ganadero < schema.sql
-- O via HTTP API desde PHP: $db->initializeSchema(file_get_contents('schema.sql'));

-- Tabla: medicamentos
CREATE TABLE IF NOT EXISTS medicamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('medicamento', 'vacuna')) DEFAULT 'medicamento',
    presentacion TEXT DEFAULT '',
    concentracion TEXT DEFAULT '',
    cantidad INTEGER NOT NULL DEFAULT 1,
    unidad TEXT DEFAULT 'frascos',
    fecha_caducidad DATE NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT (date('now')),
    observaciones TEXT DEFAULT '',
    requiere_receta INTEGER NOT NULL DEFAULT 0,
    es_controlado INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Índices para medicamentos
CREATE INDEX IF NOT EXISTS idx_medicamentos_fecha_caducidad ON medicamentos(fecha_caducidad);
CREATE INDEX IF NOT EXISTS idx_medicamentos_tipo ON medicamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_medicamentos_nombre ON medicamentos(nombre);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS trigger_medicamentos_updated_at
AFTER UPDATE ON medicamentos
BEGIN
    UPDATE medicamentos SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Tabla: actividades
CREATE TABLE IF NOT EXISTS actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'caducidad', 'baja')),
    medicamento_id INTEGER,
    medicamento TEXT DEFAULT '',
    lote TEXT DEFAULT '',
    cantidad INTEGER,
    descripcion TEXT NOT NULL,
    fecha DATETIME NOT NULL,
    usuario TEXT DEFAULT 'Sistema',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE SET NULL
);

-- Índices para actividades
CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades(fecha);
CREATE INDEX IF NOT EXISTS idx_actividades_tipo ON actividades(tipo);
CREATE INDEX IF NOT EXISTS idx_actividades_medicamento_id ON actividades(medicamento_id);

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'veterinario', 'tecnico', 'visualizador')) DEFAULT 'visualizador',
    activo INTEGER NOT NULL DEFAULT 1,
    ultimo_acceso DATETIME,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Tokens temporales para recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at);

-- Trigger para usuarios updated_at
CREATE TRIGGER IF NOT EXISTS trigger_usuarios_updated_at
AFTER UPDATE ON usuarios
BEGIN
    UPDATE usuarios SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- Datos de prueba (medicamentos y vacunas para ganado)
-- ============================================
INSERT OR IGNORE INTO medicamentos (nombre, tipo, presentacion, concentracion, cantidad, unidad, fecha_caducidad, fecha_ingreso, observaciones, requiere_receta, es_controlado) VALUES
('Ivermectina', 'medicamento', 'Frasco 100ml', '1%', 50, 'frascos_100ml', '2025-12-31', '2024-01-15', 'Antiparasitario broad spectrum. Vía subcutánea. Tiempo de retiro: 28 días carne, 3 días leche', 1, 0),
('Doramectina', 'medicamento', 'Frasco 500ml', '1%', 20, 'frascos_500ml', '2025-11-30', '2024-02-01', 'Endectocida para bovinos y porcinos. Vía subcutánea. Retiro: 35 días carne', 1, 0),
('Vacuna Aftosa', 'vacuna', 'Frasco 100ml (50 dosis)', 'Trivalente O, A, C', 100, 'frascos_100ml', '2025-06-15', '2024-01-20', 'Vacuna contra fiebre aftosa. Vía subcutánea. Revacunar a los 30 días', 0, 0),
('Vacuna Brucelosis (RB51)', 'vacuna', 'Frasco 20 dosis', 'Cepa RB51', 50, 'frascos', '2025-08-31', '2024-03-10', 'Vacuna viva atenuada contra brucelosis bovina. Solo hembras 3-8 meses', 1, 0),
('Flunixin Meglumina', 'medicamento', 'Frasco 100ml', '50mg/ml', 30, 'frascos_100ml', '2026-01-31', '2024-04-15', 'Antiinflamatorio no esteroideo. Vía IV/IM. Retiro: 8 días carne, 36 horas leche', 1, 0),
('Oxitetraciclina LA', 'medicamento', 'Frasco 100ml', '20%', 40, 'frascos_100ml', '2025-09-30', '2024-02-15', 'Antibiótico de acción prolongada. Vía IM. Retiro: 28 días carne, 7 días leche', 1, 0),
('Vitamina AD3E', 'medicamento', 'Frasco 500ml', '500.000/75.000/50 UI/ml', 25, 'frascos_500ml', '2025-10-15', '2024-01-10', 'Complejo vitamínico inyectable. Vía IM/SC. Suplemento en épocas de estrés', 0, 0),
('Desparasitante Albendazol', 'medicamento', 'Frasco 1L', '10%', 15, 'frascos_1l', '2025-05-20', '2024-03-01', 'Antihelmíntico oral. Dosis: 1ml/10kg peso vivo. Retiro: 14 días carne, 4 días leche', 1, 0),
('Vacuna Clostridiosis (7 vías)', 'vacuna', 'Frasco 50 dosis', '7 cepas clostridiales', 80, 'frascos', '2026-06-30', '2024-05-15', 'Vacuna polivalente contra clostridiosis. Vía subcutánea. 2 dosis intervalo 30 días', 0, 0),
('Enrofloxacino 10%', 'medicamento', 'Frasco 100ml', '10%', 35, 'frascos_100ml', '2025-11-30', '2024-06-01', 'Antibiótico fluorquinolona. Vía SC/IM. Retiro: 14 días carne. No usar en hembras lecheras', 1, 1);

-- Usuarios demo (passwords: admin123, vet123, tecnico123 - bcrypt)
INSERT OR IGNORE INTO usuarios (nombre, email, password, rol, activo) VALUES
('Administrador', 'admin@ganadero.com', '$2y$12$dod/U.5UtkZod6N32RpnT.c7ZjYueOCAyrlJLIhmVMC2kPZbicUv.', 'admin', 1),
('Dr. Veterinario', 'vet@ganadero.com', '$2y$12$tQxK.KgwH2quCzAybrRfruCXGr9i6CD.qZLOtoPcPR/6J//3TZeE6', 'veterinario', 1),
('Técnico Ganadero', 'tecnico@ganadero.com', '$2y$12$fCNHmXqnaFMAH7ir9JlSTuLsr4vrfvXmFzNgTJCJuWQ6PEpaMOgJi', 'tecnico', 1);

-- ============================================
-- Vista: medicamentos con estado de caducidad
-- ============================================
CREATE VIEW IF NOT EXISTS vista_medicamentos_caducidad AS
SELECT 
    m.*,
    CAST(julianday(fecha_caducidad) - julianday('now') AS INTEGER) as dias_restantes,
    CASE 
        WHEN julianday(fecha_caducidad) < julianday('now') THEN 'caducado'
        WHEN julianday(fecha_caducidad) <= julianday('now', '+30 days') THEN 'critico'
        WHEN julianday(fecha_caducidad) <= julianday('now', '+90 days') THEN 'advertencia'
        ELSE 'vigente'
    END as estado_caducidad
FROM medicamentos m
ORDER BY m.fecha_caducidad ASC;