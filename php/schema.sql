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
    lote TEXT DEFAULT '',
    laboratorio TEXT DEFAULT '',
    presentacion TEXT DEFAULT '',
    concentracion TEXT DEFAULT '',
    cantidad INTEGER NOT NULL DEFAULT 1,
    unidad TEXT DEFAULT 'unidades',
    fecha_caducidad DATE NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT (date('now')),
    ubicacion TEXT DEFAULT '',
    temperatura TEXT DEFAULT '',
    observaciones TEXT DEFAULT '',
    requiere_receta INTEGER NOT NULL DEFAULT 0,
    es_controlado INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Índices para medicamentos
CREATE INDEX IF NOT EXISTS idx_medicamentos_fecha_caducidad ON medicamentos(fecha_caducidad);
CREATE INDEX IF NOT EXISTS idx_medicamentos_tipo ON medicamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_medicamentos_lote ON medicamentos(lote);
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
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'farmaceutico', 'tecnico', 'visualizador')) DEFAULT 'visualizador',
    activo INTEGER NOT NULL DEFAULT 1,
    ultimo_acceso DATETIME,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Trigger para usuarios updated_at
CREATE TRIGGER IF NOT EXISTS trigger_usuarios_updated_at
AFTER UPDATE ON usuarios
BEGIN
    UPDATE usuarios SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- Datos de prueba (medicamentos para farmacia)
-- ============================================
INSERT OR IGNORE INTO medicamentos (nombre, tipo, lote, laboratorio, presentacion, concentracion, cantidad, unidad, fecha_caducidad, fecha_ingreso, ubicacion, temperatura, observaciones, requiere_receta, es_controlado) VALUES
('Paracetamol', 'medicamento', 'LOT-2024-001', 'Laboratorios Pfizer', 'Caja x 20 tabletas', '500mg', 100, 'unidades', '2025-12-31', '2024-01-15', 'Almacén A - Estante 1', 'Ambiente', 'Analgésico y antipirético', 0, 0),
('Amoxicilina', 'medicamento', 'LOT-2024-002', 'Laboratorios GSK', 'Frasco 100ml', '250mg/5ml', 50, 'frascos', '2025-06-15', '2024-02-01', 'Almacén A - Estante 2', '2-8°C', 'Antibiótico de amplio espectro', 1, 0),
('Vacuna COVID-19', 'vacuna', 'LOT-2024-003', 'Moderna', 'Vial multidosis', '0.5ml', 200, 'viales', '2025-03-01', '2024-01-20', 'Almacén B - Nevera 1', '2-8°C', 'Vacuna ARNm contra COVID-19', 0, 0),
('Ibuprofeno', 'medicamento', 'LOT-2024-004', 'Laboratorios Bayer', 'Caja x 30 cápsulas', '400mg', 75, 'unidades', '2026-01-31', '2024-03-10', 'Almacén A - Estante 3', 'Ambiente', 'Antiinflamatorio no esteroide', 0, 0),
('Vacuna Influenza', 'vacuna', 'LOT-2024-005', 'Sanofi Pasteur', 'Jeringa precargada', '0.5ml', 150, 'jeringas', '2024-12-31', '2024-04-01', 'Almacén B - Nevera 2', '2-8°C', 'Vacuna tetravalente temporada 2024', 0, 0),
('Omeprazol', 'medicamento', 'LOT-2024-006', 'AstraZeneca', 'Caja x 28 cápsulas', '20mg', 60, 'unidades', '2025-09-30', '2024-02-15', 'Almacén A - Estante 4', 'Ambiente', 'Inhibidor de bomba de protones', 1, 0),
('Insulina Glargina', 'medicamento', 'LOT-2024-007', 'Sanofi', 'Pluma 3ml', '100 UI/ml', 30, 'plumas', '2024-10-15', '2024-01-10', 'Almacén B - Nevera 3', '2-8°C', 'Insulina de acción prolongada', 1, 1),
('Dexametasona', 'medicamento', 'LOT-2024-008', 'Merck', 'Caja x 10 ampollas', '4mg/ml', 40, 'ampollas', '2025-05-20', '2024-03-01', 'Almacén A - Estante 5', 'Ambiente', 'Corticoide', 1, 0),
('Vacuna Hepatitis B', 'vacuna', 'LOT-2024-009', 'GSK', 'Vial monodosis', '20mcg/ml', 100, 'viales', '2026-06-30', '2024-05-15', 'Almacén B - Nevera 1', '2-8°C', 'Vacuna recombinante', 0, 0),
('Losartán', 'medicamento', 'LOT-2024-010', 'Merck Sharp & Dohme', 'Caja x 30 tabletas', '50mg', 80, 'unidades', '2025-11-30', '2024-06-01', 'Almacén A - Estante 6', 'Ambiente', 'Antagonista de receptores de angiotensina II', 1, 0);

-- Sample activities
INSERT OR IGNORE INTO actividades (tipo, medicamento_id, medicamento, lote, cantidad, descripcion, fecha, usuario) VALUES
('entrada', 1, 'Paracetamol', 'LOT-2024-001', 100, 'Ingreso inicial de stock', '2024-01-15 09:00:00', 'Admin'),
('entrada', 2, 'Amoxicilina', 'LOT-2024-002', 50, 'Ingreso inicial de stock', '2024-02-01 10:30:00', 'Admin'),
('entrada', 3, 'Vacuna COVID-19', 'LOT-2024-003', 200, 'Ingreso inicial de stock', '2024-01-20 11:00:00', 'Admin'),
('salida', 1, 'Paracetamol', 'LOT-2024-001', 10, 'Entrega a farmacia sucursal', '2024-01-25 14:00:00', 'Farmacéutico'),
('ajuste', 4, 'Ibuprofeno', 'LOT-2024-004', 5, 'Ajuste por inventario físico', '2024-03-15 16:00:00', 'Técnico'),
('caducidad', 7, 'Insulina Glargina', 'LOT-2024-007', 2, 'Reporte de unidades próximas a caducar', '2024-09-01 09:00:00', 'Sistema');

-- Users demo (passwords: admin123, vet123, tecnico123 - bcrypt hashes)
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