-- Database Schema for Sistema de Inventario de Medicamentos y Vacunas
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS `inventario_medicamentos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `inventario_medicamentos`;

-- Table: medicamentos
CREATE TABLE IF NOT EXISTS `medicamentos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `tipo` ENUM('medicamento', 'vacuna') NOT NULL DEFAULT 'medicamento',
    `lote` VARCHAR(100) NOT NULL,
    `laboratorio` VARCHAR(255) NOT NULL,
    `presentacion` VARCHAR(255) DEFAULT '',
    `concentracion` VARCHAR(100) DEFAULT '',
    `cantidad` INT UNSIGNED NOT NULL DEFAULT 1,
    `unidad` VARCHAR(50) DEFAULT 'unidades',
    `fecha_caducidad` DATE NOT NULL,
    `fecha_ingreso` DATE NOT NULL DEFAULT (CURDATE()),
    `ubicacion` VARCHAR(255) DEFAULT '',
    `temperatura` VARCHAR(100) DEFAULT '',
    `observaciones` TEXT DEFAULT '',
    `requiere_receta` BOOLEAN NOT NULL DEFAULT FALSE,
    `es_controlado` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_fecha_caducidad` (`fecha_caducidad`),
    INDEX `idx_tipo` (`tipo`),
    INDEX `idx_lote` (`lote`),
    INDEX `idx_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: actividades
CREATE TABLE IF NOT EXISTS `actividades` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('entrada', 'salida', 'ajuste', 'caducidad', 'baja') NOT NULL,
    `medicamento_id` INT UNSIGNED DEFAULT NULL,
    `medicamento` VARCHAR(255) DEFAULT '',
    `lote` VARCHAR(100) DEFAULT '',
    `cantidad` INT DEFAULT NULL,
    `descripcion` TEXT NOT NULL,
    `fecha` DATETIME NOT NULL,
    `usuario` VARCHAR(100) DEFAULT 'Sistema',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_fecha` (`fecha`),
    INDEX `idx_tipo` (`tipo`),
    INDEX `idx_medicamento_id` (`medicamento_id`),
    FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: usuarios (opcional, para futuro sistema de autenticación)
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `rol` ENUM('admin', 'farmaceutico', 'tecnico', 'visualizador') NOT NULL DEFAULT 'visualizador',
    `activo` BOOLEAN NOT NULL DEFAULT TRUE,
    `ultimo_acceso` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for testing
INSERT INTO `medicamentos` (`nombre`, `tipo`, `lote`, `laboratorio`, `presentacion`, `concentracion`, `cantidad`, `unidad`, `fecha_caducidad`, `fecha_ingreso`, `ubicacion`, `temperatura`, `observaciones`, `requiere_receta`, `es_controlado`) VALUES
('Paracetamol', 'medicamento', 'LOT-2024-001', 'Laboratorios Pfizer', 'Caja x 20 tabletas', '500mg', 100, 'unidades', '2025-12-31', '2024-01-15', 'Almacén A - Estante 1', 'Ambiente', 'Analgésico y antipirético', FALSE, FALSE),
('Amoxicilina', 'medicamento', 'LOT-2024-002', 'Laboratorios GSK', 'Frasco 100ml', '250mg/5ml', 50, 'frascos', '2025-06-15', '2024-02-01', 'Almacén A - Estante 2', '2-8°C', 'Antibiótico de amplio espectro', TRUE, FALSE),
('Vacuna COVID-19', 'vacuna', 'LOT-2024-003', 'Moderna', 'Vial multidosis', '0.5ml', 200, 'viales', '2025-03-01', '2024-01-20', 'Almacén B - Nevera 1', '2-8°C', 'Vacuna ARNm contra COVID-19', FALSE, FALSE),
('Ibuprofeno', 'medicamento', 'LOT-2024-004', 'Laboratorios Bayer', 'Caja x 30 cápsulas', '400mg', 75, 'unidades', '2026-01-31', '2024-03-10', 'Almacén A - Estante 3', 'Ambiente', 'Antiinflamatorio no esteroideo', FALSE, FALSE),
('Vacuna Influenza', 'vacuna', 'LOT-2024-005', 'Sanofi Pasteur', 'Jeringa precargada', '0.5ml', 150, 'jeringas', '2024-12-31', '2024-04-01', 'Almacén B - Nevera 2', '2-8°C', 'Vacuna tetravalente temporada 2024', FALSE, FALSE),
('Omeprazol', 'medicamento', 'LOT-2024-006', 'AstraZeneca', 'Caja x 28 cápsulas', '20mg', 60, 'unidades', '2025-09-30', '2024-02-15', 'Almacén A - Estante 4', 'Ambiente', 'Inhibidor de bomba de protones', TRUE, FALSE),
('Insulina Glargina', 'medicamento', 'LOT-2024-007', 'Sanofi', 'Pluma 3ml', '100 UI/ml', 30, 'plumas', '2024-10-15', '2024-01-10', 'Almacén B - Nevera 3', '2-8°C', 'Insulina de acción prolongada', TRUE, TRUE),
('Dexametasona', 'medicamento', 'LOT-2024-008', 'Merck', 'Caja x 10 ampollas', '4mg/ml', 40, 'ampollas', '2025-05-20', '2024-03-01', 'Almacén A - Estante 5', 'Ambiente', 'Corticoide', TRUE, FALSE),
('Vacuna Hepatitis B', 'vacuna', 'LOT-2024-009', 'GSK', 'Vial monodosis', '20mcg/ml', 100, 'viales', '2026-06-30', '2024-05-15', 'Almacén B - Nevera 1', '2-8°C', 'Vacuna recombinante', FALSE, FALSE),
('Losartán', 'medicamento', 'LOT-2024-010', 'Merck Sharp & Dohme', 'Caja x 30 tabletas', '50mg', 80, 'unidades', '2025-11-30', '2024-06-01', 'Almacén A - Estante 6', 'Ambiente', 'Antagonista de receptores de angiotensina II', TRUE, FALSE);

-- Sample activities
INSERT INTO `actividades` (`tipo`, `medicamento_id`, `medicamento`, `lote`, `cantidad`, `descripcion`, `fecha`, `usuario`) VALUES
('entrada', 1, 'Paracetamol', 'LOT-2024-001', 100, 'Ingreso inicial de stock', '2024-01-15 09:00:00', 'Admin'),
('entrada', 2, 'Amoxicilina', 'LOT-2024-002', 50, 'Ingreso inicial de stock', '2024-02-01 10:30:00', 'Admin'),
('entrada', 3, 'Vacuna COVID-19', 'LOT-2024-003', 200, 'Ingreso inicial de stock', '2024-01-20 11:00:00', 'Admin'),
('salida', 1, 'Paracetamol', 'LOT-2024-001', 10, 'Entrega a farmacia sucursal', '2024-01-25 14:00:00', 'Farmacéutico'),
('ajuste', 4, 'Ibuprofeno', 'LOT-2024-004', 5, 'Ajuste por inventario físico', '2024-03-15 16:00:00', 'Técnico'),
('caducidad', 7, 'Insulina Glargina', 'LOT-2024-007', 2, 'Reporte de unidades próximas a caducar', '2024-09-01 09:00:00', 'Sistema');

-- View for medicamentos con estado de caducidad
CREATE OR REPLACE VIEW `vista_medicamentos_caducidad` AS
SELECT 
    m.*,
    DATEDIFF(m.fecha_caducidad, CURDATE()) as dias_restantes,
    CASE 
        WHEN DATEDIFF(m.fecha_caducidad, CURDATE()) < 0 THEN 'caducado'
        WHEN DATEDIFF(m.fecha_caducidad, CURDATE()) <= 30 THEN 'critico'
        WHEN DATEDIFF(m.fecha_caducidad, CURDATE()) <= 90 THEN 'advertencia'
        ELSE 'vigente'
    END as estado_caducidad
FROM `medicamentos` m
ORDER BY m.fecha_caducidad ASC;