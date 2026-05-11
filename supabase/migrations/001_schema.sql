-- ============================================================
-- 001_schema.sql — DiversoLab Members Conecta
-- 7 tablas, funciones RLS, políticas RLS, trigger updated_at
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABLAS
-- ------------------------------------------------------------

-- Perfiles de personas naturales y jurídicas
CREATE TABLE profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     uuid REFERENCES auth.users,
  profile_type     text NOT NULL CHECK (profile_type IN ('beneficiario','aliado','contratista','proveedor','miembro')),
  nombre           text,
  apellido         text,
  razon_social     text,
  tipo_documento   text NOT NULL,
  numero_documento text NOT NULL,
  email_principal  text UNIQUE NOT NULL,
  telefono         text,
  estado_perfil    text NOT NULL CHECK (estado_perfil IN ('pendiente','activo','suspendido','inactivo')),
  carpeta_drive_id text,
  fecha_registro   timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz
);
CREATE UNIQUE INDEX idx_profiles_doc ON profiles(tipo_documento, numero_documento);

-- Permisos configurables por miembro interno
CREATE TABLE permisos_miembro (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id  uuid NOT NULL REFERENCES profiles(id),
  permiso    text NOT NULL CHECK (permiso IN ('gestion_beneficiarios','gestion_proveedores','gestion_accesos','gestion_plataforma')),
  activo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_perm_unico ON permisos_miembro(perfil_id, permiso);

-- Asignaciones de analista (miembro) a perfil externo
CREATE TABLE asignaciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analista_id   uuid REFERENCES profiles(id),
  perfil_id     uuid REFERENCES profiles(id),
  estado        text NOT NULL CHECK (estado IN ('activa','finalizada')),
  fecha_inicio  date DEFAULT CURRENT_DATE,
  fecha_fin     date,
  motivo_cambio text,
  created_at    timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_asig_activa ON asignaciones(analista_id, perfil_id) WHERE estado = 'activa';

-- Tareas asignadas a perfiles
CREATE TABLE tareas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id        uuid REFERENCES profiles(id),
  solicitado_por   uuid REFERENCES profiles(id),
  tipo_tarea       text NOT NULL,
  detalle          text,
  estado           text NOT NULL CHECK (estado IN ('pendiente','en_curso','completada','vencida')),
  es_urgente       boolean DEFAULT false,
  fecha_limite     date,
  fecha_completada timestamptz,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX idx_tareas_perfil ON tareas(perfil_id);

-- Catálogo de documentos subidos a Drive
CREATE TABLE catalogo_docs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id       uuid REFERENCES profiles(id),
  tipo_documento  text NOT NULL,
  categoria       text,
  estado          text NOT NULL CHECK (estado IN ('pendiente','aprobado','rechazado')),
  drive_file_id   text,
  drive_url       text,
  subido_por      uuid REFERENCES profiles(id),
  revisado_por    uuid REFERENCES profiles(id),
  fecha_subida    timestamptz,
  fecha_revision  timestamptz,
  notas_revision  text,
  created_at      timestamptz DEFAULT now()
);

-- Consentimientos firmados — INMUTABLE (no UPDATE, no DELETE)
CREATE TABLE consentimientos (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id                 uuid REFERENCES profiles(id),
  tipo_firma                text NOT NULL CHECK (tipo_firma IN ('persona_natural','persona_juridica')),
  email_firmante            text NOT NULL,
  nombre_firmante           text NOT NULL,
  tipo_documento_firmante   text NOT NULL,
  numero_documento_firmante text NOT NULL,
  empresa                   text,
  nit_empresa               text,
  cargo_firmante            text,
  codigo                    text NOT NULL,
  version                   text NOT NULL,
  texto_aceptado            text NOT NULL,
  aceptado                  boolean NOT NULL,
  es_obligatorio            boolean NOT NULL DEFAULT false,
  folio                     text UNIQUE NOT NULL,
  hash_firma                text NOT NULL,
  ip_address                text,
  user_agent                text,
  solicitado_por            uuid REFERENCES profiles(id),
  programa                  text,
  created_at                timestamptz DEFAULT now()
);
CREATE INDEX idx_consent_perfil ON consentimientos(perfil_id);
CREATE INDEX idx_consent_folio ON consentimientos(folio);
CREATE INDEX idx_consent_email ON consentimientos(email_firmante);

-- Logs de actividad — solo INSERT y SELECT
CREATE TABLE logs_actividad (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid REFERENCES profiles(id),
  accion     text NOT NULL,
  modulo     text,
  detalle    jsonb,
  created_at timestamptz DEFAULT now()
);


-- ------------------------------------------------------------
-- 2. TRIGGER updated_at
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();


-- ------------------------------------------------------------
-- 3. FUNCIONES RLS
-- ------------------------------------------------------------

-- Obtener el profile_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_profile_id() RETURNS uuid AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verificar si el usuario autenticado es miembro interno
CREATE OR REPLACE FUNCTION es_miembro() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND profile_type = 'miembro'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verificar si el usuario tiene un permiso específico activo
CREATE OR REPLACE FUNCTION tiene_permiso(p text) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM permisos_miembro
    WHERE perfil_id = get_profile_id()
    AND permiso = p
    AND activo = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verificar si el usuario está asignado como analista de un perfil
CREATE OR REPLACE FUNCTION es_miembro_de(p_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM asignaciones
    WHERE analista_id = get_profile_id()
    AND perfil_id = p_id
    AND estado = 'activa'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ------------------------------------------------------------
-- 4. HABILITAR RLS EN TODAS LAS TABLAS
-- ------------------------------------------------------------

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_miembro  ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_docs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consentimientos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_actividad    ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 5. POLÍTICAS RLS
-- ------------------------------------------------------------

-- === profiles ===

-- SELECT: perfil propio, miembro asignado, o gestion_plataforma
CREATE POLICY pol_profiles_select
  ON profiles FOR SELECT
  USING (
    id = get_profile_id()
    OR es_miembro_de(id)
    OR tiene_permiso('gestion_plataforma')
  );

-- INSERT: público (registro antes de autenticación)
CREATE POLICY pol_profiles_insert_publico
  ON profiles FOR INSERT
  WITH CHECK (true);

-- UPDATE: perfil propio o gestion_plataforma
CREATE POLICY pol_profiles_update
  ON profiles FOR UPDATE
  USING (
    id = get_profile_id()
    OR tiene_permiso('gestion_plataforma')
  );

-- DELETE: solo gestion_plataforma
CREATE POLICY pol_profiles_delete_plataforma
  ON profiles FOR DELETE
  USING (
    tiene_permiso('gestion_plataforma')
  );

-- === permisos_miembro ===

-- SELECT: gestion_accesos o gestion_plataforma
CREATE POLICY pol_permisos_select
  ON permisos_miembro FOR SELECT
  USING (
    tiene_permiso('gestion_accesos')
    OR tiene_permiso('gestion_plataforma')
  );

-- INSERT: gestion_accesos
CREATE POLICY pol_permisos_insert
  ON permisos_miembro FOR INSERT
  WITH CHECK (
    tiene_permiso('gestion_accesos')
  );

-- UPDATE: gestion_accesos
CREATE POLICY pol_permisos_update
  ON permisos_miembro FOR UPDATE
  USING (
    tiene_permiso('gestion_accesos')
  );

-- DELETE: solo gestion_plataforma
CREATE POLICY pol_permisos_delete_plataforma
  ON permisos_miembro FOR DELETE
  USING (
    tiene_permiso('gestion_plataforma')
  );

-- === asignaciones ===

-- SELECT: miembro ve sus asignaciones, o gestion_plataforma
CREATE POLICY pol_asignaciones_select
  ON asignaciones FOR SELECT
  USING (
    analista_id = get_profile_id()
    OR tiene_permiso('gestion_plataforma')
  );

-- INSERT: gestion_accesos
CREATE POLICY pol_asignaciones_insert
  ON asignaciones FOR INSERT
  WITH CHECK (
    tiene_permiso('gestion_accesos')
  );

-- UPDATE: gestion_accesos
CREATE POLICY pol_asignaciones_update
  ON asignaciones FOR UPDATE
  USING (
    tiene_permiso('gestion_accesos')
  );

-- DELETE: solo gestion_plataforma
CREATE POLICY pol_asignaciones_delete_plataforma
  ON asignaciones FOR DELETE
  USING (
    tiene_permiso('gestion_plataforma')
  );

-- === tareas ===

-- SELECT: tareas propias, de perfiles asignados, o gestion_plataforma
CREATE POLICY pol_tareas_select
  ON tareas FOR SELECT
  USING (
    perfil_id = get_profile_id()
    OR es_miembro_de(perfil_id)
    OR tiene_permiso('gestion_plataforma')
  );

-- INSERT: solo miembros crean tareas
CREATE POLICY pol_tareas_insert
  ON tareas FOR INSERT
  WITH CHECK (
    es_miembro()
  );

-- UPDATE: perfil completa propias, o cualquier miembro
CREATE POLICY pol_tareas_update
  ON tareas FOR UPDATE
  USING (
    perfil_id = get_profile_id()
    OR es_miembro()
  );

-- DELETE: solo gestion_plataforma
CREATE POLICY pol_tareas_delete_plataforma
  ON tareas FOR DELETE
  USING (
    tiene_permiso('gestion_plataforma')
  );

-- === catalogo_docs ===

-- SELECT: docs propios, de perfiles asignados, o gestion_plataforma
CREATE POLICY pol_catalogo_select
  ON catalogo_docs FOR SELECT
  USING (
    perfil_id = get_profile_id()
    OR es_miembro_de(perfil_id)
    OR tiene_permiso('gestion_plataforma')
  );

-- INSERT: cualquier usuario autenticado
CREATE POLICY pol_catalogo_insert
  ON catalogo_docs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: solo miembros (revisar documentos)
CREATE POLICY pol_catalogo_update
  ON catalogo_docs FOR UPDATE
  USING (
    es_miembro()
  );

-- DELETE: solo gestion_plataforma
CREATE POLICY pol_catalogo_delete_plataforma
  ON catalogo_docs FOR DELETE
  USING (
    tiene_permiso('gestion_plataforma')
  );

-- === consentimientos (INMUTABLE) ===

-- SELECT: consentimientos propios o gestion_plataforma
CREATE POLICY pol_consentimientos_select
  ON consentimientos FOR SELECT
  USING (
    perfil_id = get_profile_id()
    OR tiene_permiso('gestion_plataforma')
  );

-- INSERT: usuario autenticado (service_role bypassa RLS automáticamente)
CREATE POLICY pol_consentimientos_insert
  ON consentimientos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- No hay políticas de UPDATE ni DELETE — tabla inmutable

-- === logs_actividad ===

-- SELECT: solo gestion_plataforma
CREATE POLICY pol_logs_select_plataforma
  ON logs_actividad FOR SELECT
  USING (
    tiene_permiso('gestion_plataforma')
  );

-- INSERT: usuario autenticado (service_role bypassa RLS automáticamente)
CREATE POLICY pol_logs_insert
  ON logs_actividad FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- No hay políticas de UPDATE ni DELETE — tabla de solo lectura
