-- Trigger BEFORE INSERT en auth.users para prevenir NULLs en columnas de token.
-- GoTrue crashea con "converting NULL to string is unsupported" cuando lee usuarios
-- con confirmation_token, recovery_token o email_change_token_new en NULL.
-- No se puede ALTER TABLE auth.users (owner: supabase_auth_admin), así que se usa trigger.

CREATE OR REPLACE FUNCTION public.fix_auth_user_token_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_token IS NULL THEN NEW.confirmation_token := ''; END IF;
  IF NEW.recovery_token IS NULL THEN NEW.recovery_token := ''; END IF;
  IF NEW.email_change_token_new IS NULL THEN NEW.email_change_token_new := ''; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_fix_auth_token_defaults
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fix_auth_user_token_defaults();
