-- 005_check_tipo_documento.sql — CHECK constraint para tipo de documento de identificación

ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_tipo_documento
  CHECK (tipo_documento IN ('CC','CE','NIT','PA','PEP','PPT','TI'));

ALTER TABLE consentimientos
  ADD CONSTRAINT chk_consentimientos_tipo_documento_firmante
  CHECK (tipo_documento_firmante IN ('CC','CE','NIT','PA','PEP','PPT','TI'));
