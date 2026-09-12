-- Database Schema for Sistema de Inventario de Medicamentos y Vacunas para Ganado
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS `inventario_medicamentos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `inventario_medicamentos`;

-- Table: medicamentos
CREATE TABLE IF NOT EXISTS `medicamentos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `tipo` ENUM('medicamento', 'vacuna') NOT NULL DEFAULT 'medicamento',
    `presentacion` VARCHAR(255) DEFAULT '',
    `concentracion` VARCHAR(100) DEFAULT '',
    `cantidad` INT UNSIGNED NOT NULL DEFAULT 1,
    `unidad` VARCHAR(50) DEFAULT 'frascos',
    `fecha_caducidad` DATE NOT NULL,
    `fecha_ingreso` DATE NOT NULL DEFAULT (CURDATE()),
    `observaciones` TEXT DEFAULT '',
    `requiere_receta` BOOLEAN NOT NULL DEFAULT FALSE,
    `es_controlado` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_fecha_caducidad` (`fecha_caducidad`),
    INDEX `idx_tipo` (`tipo`),
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
    `rol` ENUM('admin', 'veterinario', 'tecnico', 'visualizador') NOT NULL DEFAULT 'visualizador',
    `activo` BOOLEAN NOT NULL DEFAULT TRUE,
    `ultimo_acceso` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for testing (medicamentos y vacunas para ganado)
INSERT INTO `medicamentos` (`nombre`, `tipo`, `presentacion`, `concentracion`, `cantidad`, `unidad`, `fecha_caducidad`, `fecha_ingreso`, `observaciones`, `requiere_receta`, `es_controlado`) VALUES
('Ivermectina', 'medicamento', 'Frasco 100ml', '1%', 50, 'frascos_100ml', '2025-12-31', '2024-01-15', 'Antiparasitario broad spectrum. Vía subcutánea. Tiempo de retiro: 28 días carne, 3 días leche', TRUE, FALSE),
('Doramectina', 'medicamento', 'Frasco 500ml', '1%', 20, 'frascos_500ml', '2025-11-30', '2024-02-01', 'Endectocida para bovinos y porcinos. Vía subcutánea. Retiro: 35 días carne', TRUE, FALSE),
('Vacuna Aftosa', 'vacuna', 'Frasco 100ml (50 dosis)', 'Trivalente O, A, C', 100, 'frascos_100ml', '2025-06-15', '2024-01-20', 'Vacuna contra fiebre aftosa. Vía subcutánea. Revacunar a los 30 días', FALSE, FALSE),
('Vacuna Brucelosis (RB51)', 'vacuna', 'Frasco 20 dosis', 'Cepa RB51', 50, 'frascos', '2025-08-31', '2024-03-10', 'Vacuna viva atenuada contra brucelosis bovina. Solo hembras 3-8 meses', TRUE, FALSE),
('Flunixin Meglumina', 'medicamento', 'Frasco 100ml', '50mg/ml', 30, 'frascos_100ml', '2026-01-31', '2024-04-15', 'Antiinflamatorio no esteroideo. Vía IV/IM. Retiro: 8 días carne, 36 horas leche', TRUE, FALSE),
('Oxitetraciclina LA', 'medicamento', 'Frasco 100ml', '20%', 40, 'frascos_100ml', '2025-09-30', '2024-02-15', 'Antibiótico de acción prolongada. Vía IM. Retiro: 28 días carne, 7 días leche', TRUE, FALSE),
('Vitamina AD3E', 'medicamento', 'Frasco 500ml', '500.000/75.000/50 UI/ml', 25, 'frascos_500ml', '2025-10-15', '2024-01-10', 'Complejo vitamínico inyectable. Vía IM/SC. Suplemento en épocas de estrés', FALSE, FALSE),
('Desparasitante Albendazol', 'medicamento', 'Frasco 1L', '10%', 15, 'frascos_1l', '2025-05-20', '2024-03-01', 'Antihelmíntico oral. Dosis: 1ml/10kg peso vivo. Retiro: 14 días carne, 4 días leche', TRUE, FALSE),
('Vacuna Clostridiosis (7 vías)', 'vacuna', 'Frasco 50 dosis', '7 cepas clostridiales', 80, 'frascos', '2026-06-30', '2024-05-15', 'Vacuna polivalente contra clostridiosis. Vía subcutánea. 2 dosis intervalo 30 días', FALSE, FALSE),
('Enrofloxacino 10%', 'medicamento', 'Frasco 100ml', '10%', 35, 'frascos_100ml', '2025-11-30', '2024-06-01', 'Antibiótico fluorquinolona. Vía SC/IM. Retiro: 14 días carne. No usar en hembras lecheras', TRUE, TRUE);

-- Sample activities
INSERT INTO `actividades` (`tipo`, `medicamento_id`, `medicamento`, `lote`, `cantidad`, `descripcion`, `fecha`, `usuario`) VALUES
('entrada', 1, 'Ivermectina', '', 50, 'Ingreso inicial de stock', '2024-01-15 09:00:00', 'Admin'),
('entrada', 3, 'Vacuna Aftosa', '', 100, 'Ingreso inicial de stock', '2024-01-20 10:30:00', 'Admin'),
('entrada', 2, 'Doramectina', '', 20, 'Ingreso inicial de stock', '2024-02-01 11:00:00', 'Admin'),
('salida', 1, 'Ivermectina', '', 10, 'Aplicación en rodeo de cría - 500 cabezas', '2024-01-25 14:00:00', 'Veterinario'),
('ajuste', 5, 'Flunixin Meglumina', '', 5, 'Ajuste por inventario físico', '2024-03-15 16:00:00', 'Técnico'),
('caducidad', 8, 'Desparasitante Albendazol', '', 2, 'Reporte de unidades próximas a caducar', '2024-09-01 09:00:00', 'Sistema');

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