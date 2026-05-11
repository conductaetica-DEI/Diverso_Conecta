-- 004_nombre_apellido.sql — Split nombre_completo en nombre + apellido
-- Ejecutada en BD remota 2026-05-11 via MCP execute_sql

-- Datos de prueba limpiados (DELETE tareas, asignaciones, permisos_miembro, logs_actividad, consentimientos, profiles)
-- Seed re-insertado con nombre + apellido separados

ALTER TABLE profiles ADD COLUMN nombre text;
ALTER TABLE profiles ADD COLUMN apellido text;
ALTER TABLE profiles DROP COLUMN nombre_completo;
