-- Tabla para contadores de folios secuenciales.
-- Reemplaza Script Properties: atómico, sin race condition, auditable.

CREATE TABLE folios_secuencial (
  codigo text NOT NULL,
  anio   integer NOT NULL,
  secuencial integer NOT NULL DEFAULT 0,
  PRIMARY KEY (codigo, anio)
);

ALTER TABLE folios_secuencial ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede leer/escribir (GAS via Edge Function)
CREATE POLICY pol_folios_service_only
  ON folios_secuencial FOR ALL
  USING (false);

-- Función atómica: INSERT ON CONFLICT incrementa y retorna
CREATE OR REPLACE FUNCTION siguiente_folio(p_codigo text, p_anio integer)
RETURNS integer AS $$
  INSERT INTO folios_secuencial (codigo, anio, secuencial)
  VALUES (p_codigo, p_anio, 1)
  ON CONFLICT (codigo, anio)
  DO UPDATE SET secuencial = folios_secuencial.secuencial + 1
  RETURNING secuencial;
$$ LANGUAGE sql SECURITY DEFINER;
