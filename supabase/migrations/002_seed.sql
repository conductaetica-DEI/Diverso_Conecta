-- ============================================================
-- 002_seed.sql — Seed mínimo para DiversoLab Members Conecta
-- 1 miembro (Super Admin), 4 permisos
-- Datos de prueba se crean desde la UI (registro + accesos)
-- ============================================================

DO $$
DECLARE
  v_super_admin uuid;
BEGIN

  -- Super Admin — todos los permisos
  INSERT INTO profiles (profile_type, nombre, apellido, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('miembro', 'Super', 'Admin', 'CC', '0000000001', 'admin@diversolab.org', '+57 300 0000001', 'activo')
  RETURNING id INTO v_super_admin;

  INSERT INTO permisos_miembro (perfil_id, permiso) VALUES
    (v_super_admin, 'gestion_beneficiarios'),
    (v_super_admin, 'gestion_proveedores'),
    (v_super_admin, 'gestion_accesos'),
    (v_super_admin, 'gestion_plataforma');

END $$;

-- ============================================================
-- VERIFICACIONES RLS ESPERADAS
--
-- Super Admin (admin@diversolab.org):
--   SELECT profiles → ve TODOS (gestion_plataforma)
--   SELECT logs_actividad → ve TODOS
-- ============================================================
