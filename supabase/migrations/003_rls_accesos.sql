-- ============================================================
-- 003_rls_accesos.sql — Agregar gestion_accesos a profiles
-- Cierra brecha entre ARCHITECTURE.md y RLS:
-- gestion_accesos habilita "aprobar/rechazar perfiles" pero
-- las políticas de profiles no lo incluían.
-- ============================================================

-- profiles SELECT: agregar gestion_accesos
DROP POLICY pol_profiles_select ON profiles;
CREATE POLICY pol_profiles_select
  ON profiles FOR SELECT
  USING (
    id = get_profile_id()
    OR es_miembro_de(id)
    OR tiene_permiso('gestion_accesos')
    OR tiene_permiso('gestion_plataforma')
  );

-- profiles UPDATE: agregar gestion_accesos
DROP POLICY pol_profiles_update ON profiles;
CREATE POLICY pol_profiles_update
  ON profiles FOR UPDATE
  USING (
    id = get_profile_id()
    OR tiene_permiso('gestion_accesos')
    OR tiene_permiso('gestion_plataforma')
  );
