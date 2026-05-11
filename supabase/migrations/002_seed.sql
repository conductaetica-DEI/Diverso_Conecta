-- ============================================================
-- 002_seed.sql — Datos de prueba para DiversoLab Members Conecta
-- 3 miembros, 5 externos, 4 asignaciones, 2 tareas
-- ============================================================

DO $$
DECLARE
  -- Miembros
  v_super_admin     uuid;
  v_analista        uuid;
  v_admin_prov      uuid;
  -- Externos
  v_juan            uuid;
  v_maria           uuid;
  v_empresa_abc     uuid;
  v_pedro           uuid;
  v_suministros     uuid;
BEGIN

  -- ------------------------------------------------------------
  -- MIEMBROS INTERNOS (@diversolab.org)
  -- ------------------------------------------------------------

  -- Super Admin — todos los permisos
  INSERT INTO profiles (profile_type, nombre_completo, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('miembro', 'Super Admin', 'CC', '0000000001', 'admin@diversolab.org', '+57 300 0000001', 'activo')
  RETURNING id INTO v_super_admin;

  INSERT INTO permisos_miembro (perfil_id, permiso) VALUES
    (v_super_admin, 'gestion_beneficiarios'),
    (v_super_admin, 'gestion_proveedores'),
    (v_super_admin, 'gestion_accesos'),
    (v_super_admin, 'gestion_plataforma');

  -- Analista Inclusión — solo gestion_beneficiarios
  INSERT INTO profiles (profile_type, nombre_completo, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('miembro', 'Analista Inclusión', 'CC', '0000000002', 'analista@diversolab.org', '+57 300 0000002', 'activo')
  RETURNING id INTO v_analista;

  INSERT INTO permisos_miembro (perfil_id, permiso) VALUES
    (v_analista, 'gestion_beneficiarios');

  -- Admin Proveedores — gestion_proveedores + gestion_accesos
  INSERT INTO profiles (profile_type, nombre_completo, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('miembro', 'Admin Proveedores', 'CC', '0000000003', 'adminprov@diversolab.org', '+57 300 0000003', 'activo')
  RETURNING id INTO v_admin_prov;

  INSERT INTO permisos_miembro (perfil_id, permiso) VALUES
    (v_admin_prov, 'gestion_proveedores'),
    (v_admin_prov, 'gestion_accesos');

  -- ------------------------------------------------------------
  -- PERFILES EXTERNOS
  -- ------------------------------------------------------------

  -- Beneficiario activo
  INSERT INTO profiles (profile_type, nombre_completo, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('beneficiario', 'Juan Pérez', 'CC', '1234567890', 'juan.perez@test.com', '+57 300 1111111', 'activo')
  RETURNING id INTO v_juan;

  -- Beneficiaria pendiente (no puede autenticarse — auth_user_id queda NULL)
  INSERT INTO profiles (profile_type, nombre_completo, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('beneficiario', 'María López', 'CC', '9876543210', 'maria.lopez@test.com', '+57 300 2222222', 'pendiente')
  RETURNING id INTO v_maria;

  -- Aliado (empresa)
  INSERT INTO profiles (profile_type, razon_social, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('aliado', 'Empresa ABC S.A.S.', 'NIT', '900123456-1', 'contacto@empresaabc.com', '+57 601 3333333', 'activo')
  RETURNING id INTO v_empresa_abc;

  -- Contratista
  INSERT INTO profiles (profile_type, nombre_completo, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('contratista', 'Pedro Gómez', 'CC', '5555555555', 'pedro.gomez@test.com', '+57 300 4444444', 'activo')
  RETURNING id INTO v_pedro;

  -- Proveedor (empresa)
  INSERT INTO profiles (profile_type, razon_social, tipo_documento, numero_documento, email_principal, telefono, estado_perfil)
  VALUES ('proveedor', 'Suministros XYZ Ltda', 'NIT', '800999888-7', 'contacto@suministrosxyz.com', '+57 601 5555555', 'activo')
  RETURNING id INTO v_suministros;

  -- ------------------------------------------------------------
  -- ASIGNACIONES
  -- ------------------------------------------------------------

  -- Analista Inclusión → Juan Pérez y Empresa ABC
  INSERT INTO asignaciones (analista_id, perfil_id, estado) VALUES
    (v_analista, v_juan, 'activa'),
    (v_analista, v_empresa_abc, 'activa');

  -- Admin Proveedores → Pedro Gómez y Suministros XYZ
  INSERT INTO asignaciones (analista_id, perfil_id, estado) VALUES
    (v_admin_prov, v_pedro, 'activa'),
    (v_admin_prov, v_suministros, 'activa');

  -- ------------------------------------------------------------
  -- TAREAS
  -- ------------------------------------------------------------

  -- Analista pide documento a Juan Pérez
  INSERT INTO tareas (perfil_id, solicitado_por, tipo_tarea, detalle, estado)
  VALUES (v_juan, v_analista, 'documento', 'Subir copia de cédula ampliada al 150%', 'pendiente');

  -- Admin Proveedores pide KYC a Pedro Gómez
  INSERT INTO tareas (perfil_id, solicitado_por, tipo_tarea, detalle, estado)
  VALUES (v_pedro, v_admin_prov, 'kyc', 'Completar formulario de vinculación de contratistas', 'pendiente');

END $$;

-- ============================================================
-- VERIFICACIONES RLS ESPERADAS
--
-- Analista Inclusión (analista@diversolab.org):
--   SELECT profiles → ve su perfil + Juan Pérez + Empresa ABC (asignados)
--   NO ve: María López, Pedro Gómez, Suministros XYZ
--
-- Admin Proveedores (adminprov@diversolab.org):
--   SELECT profiles → ve su perfil + Pedro Gómez + Suministros XYZ (asignados)
--   NO ve: Juan Pérez, María López, Empresa ABC
--
-- Super Admin (admin@diversolab.org):
--   SELECT profiles → ve TODOS (gestion_plataforma)
--   SELECT logs_actividad → ve TODOS
--
-- Juan Pérez (juan.perez@test.com):
--   SELECT profiles → solo su perfil
--   SELECT tareas → solo su tarea (documento)
--   NO ve: otros perfiles, otras tareas
--
-- María López (maria.lopez@test.com):
--   NO puede autenticarse (estado pendiente, auth_user_id NULL)
--   Ninguna política RLS le aplica
-- ============================================================
