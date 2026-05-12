# SUPABASE.md — Integración GAS ↔ Supabase Auth

Documentación de la investigación y resolución de la integración entre Google Apps Script y Supabase Auth para el flujo OTP de DiversoLab.

---

## Contexto del problema

El servicio GAS OTP necesita:
1. Crear usuarios en `auth.users` (si no existen)
2. Generar sesiones (`access_token` + `refresh_token`) para el frontend
3. Vincular `auth_user_id` al perfil en `profiles`

Originalmente, GAS llamaba directamente a la Supabase Auth Admin API REST con `service_role` key. Después de la rotación de seguridad (keys cambiaron de formato JWT legacy a formato opaco `sb_`), esta aproximación dejó de funcionar.

---

## Tres causas raíz

### 1. User-Agent restriction — sb_secret bloqueado desde "browsers"

El API gateway de Supabase detecta el header `User-Agent` y bloquea el uso de `sb_secret_*` keys cuando el User-Agent coincide con un patrón de browser (`Mozilla/5.0`, `Chrome`, etc.).

**Problema:** GAS `UrlFetchApp` SIEMPRE envía `User-Agent: Mozilla/5.0 ...` y NO permite overridearlo. Cualquier request desde GAS con `sb_secret` en el header `apikey` recibe:

```json
{"code": 403, "message": "Forbidden use of secret API key in browser"}
```

**Implicación:** GAS no puede usar `sb_secret` directamente para llamadas Admin API.

### 2. Publishable keys NO son JWTs

Las keys con formato `sb_publishable_*` son tokens opacos que el API gateway traduce internamente:
- `sb_publishable_*` → JWT `anon` (rol anon)
- `sb_secret_*` → JWT `service_role`

Pero esta traducción solo ocurre en el header `apikey`. Si se intenta usar una key `sb_secret_*` en el header `Authorization: Bearer ...`, el gateway no la reconoce como JWT y responde:

```json
{"code": 403, "error_code": "bad_jwt", "msg": "invalid JWT: token contains an invalid number of segments"}
```

**Implicación:** Las API keys NO son intercambiables con JWTs. `apikey` = identificación del proyecto (gateway). `Authorization` = credencial de autenticación (GoTrue/PostgREST).

### 3. GoTrue NULL token crash

Cuando se crea un usuario vía Admin API, GoTrue puede dejar columnas de token en NULL:
- `confirmation_token`
- `recovery_token`
- `email_change_token_new`

Luego, al intentar leer ese usuario (sign-in, listUsers, etc.), GoTrue crashea con:

```
converting NULL to string is unsupported
```

**Causa:** GoTrue internamente hace string operations sobre estas columnas sin verificar NULL.

**Fix:** Migración 006 — trigger `BEFORE INSERT` en `auth.users` que convierte NULLs a string vacío:

```sql
CREATE OR REPLACE FUNCTION public.fix_auth_user_token_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_token IS NULL THEN NEW.confirmation_token := ''; END IF;
  IF NEW.recovery_token IS NULL THEN NEW.recovery_token := ''; END IF;
  IF NEW.email_change_token_new IS NULL THEN NEW.email_change_token_new := ''; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

No se puede `ALTER TABLE auth.users` (owner: `supabase_auth_admin`), pero sí se puede crear un trigger desde `public`.

---

## Solución: Edge Function proxy

### Arquitectura

```
GAS (UrlFetchApp)
  │
  ├─ apikey: sb_publishable_*      ← identifica proyecto, rol anon
  ├─ x-gas-secret: shared secret   ← autenticación GAS↔Edge Function
  │
  └──→ Edge Function otp-admin (verify_jwt: false)
         │
         ├─ Valida x-gas-secret contra env GAS_SHARED_SECRET
         ├─ Usa supabase-js con SUPABASE_SERVICE_ROLE_KEY (env interno)
         │
         └──→ Supabase Auth Admin API (service_role)
               ├─ crear_usuario (listUsers + createUser)
               ├─ set_password (updateUserById)
               └─ vincular_perfil (profiles UPDATE)
```

### Por qué Edge Function

| Alternativa | Por qué no funciona |
|------------|-------------------|
| GAS → Auth Admin API directa con sb_secret | User-Agent blocking: GAS envía Mozilla/5.0, gateway bloquea sb_secret |
| GAS → Auth Admin API con sb_secret en Authorization | sb_secret no es JWT, bad_jwt error |
| Override User-Agent en GAS | UrlFetchApp ignora el header custom |
| Re-habilitar legacy JWT keys | El legacy service_role JWT está filtrado (comprometido), re-habilitarlo expondría la BD |
| Magic Links nativos | Supabase rate-limita a ~2/hora, insuficiente para producción |

### Edge Function `otp-admin`

- **Runtime:** Deno (Supabase Edge Functions)
- **JWT verification:** Deshabilitado (`verify_jwt: false`) — autenticación propia via shared secret
- **Autenticación:** Header `x-gas-secret` validado contra `Deno.env.get('GAS_SHARED_SECRET')`
- **Cliente admin:** `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` — service_role key como env var del Edge Function, nunca transita por red externa

**Acciones:**

| Acción | Qué hace | supabase-js method |
|--------|---------|-------------------|
| `crear_usuario` | Lista usuarios por email. Si existe, retorna. Si no, crea con `email_confirm: true` | `auth.admin.listUsers()` + `auth.admin.createUser()` |
| `set_password` | Establece password temporal para generar sesión | `auth.admin.updateUserById()` |
| `vincular_perfil` | Actualiza `auth_user_id` en tabla `profiles` | `.from('profiles').update()` |

### Flujo completo de sesión

```
1. GAS genera password temporal (UUID + UUID)
2. GAS → Edge Function: set_password(auth_user_id, password)
3. Edge Function → Supabase Admin API: updateUserById(id, { password })
4. GAS → Supabase GoTrue directamente: POST /auth/v1/token?grant_type=password
   - apikey: sb_publishable_*  (esto sí funciona, endpoint público)
   - body: { email, password: temporal }
5. GoTrue retorna: { access_token, refresh_token, ... }
6. GAS retorna tokens al frontend
7. Frontend: supabase.auth.setSession({ access_token, refresh_token })
```

El paso 4 funciona con publishable key porque `/auth/v1/token` es un endpoint público (login normal).

---

## Conceptos clave

### apikey vs Authorization

| Header | Propósito | Qué acepta |
|--------|----------|-----------|
| `apikey` | Identificación del proyecto ante el API gateway | `sb_publishable_*`, `sb_secret_*`, o JWT legacy |
| `Authorization: Bearer` | Autenticación del usuario/servicio ante GoTrue/PostgREST | JWT de sesión (access_token) |

Son headers independientes. El gateway lee `apikey` para routing. GoTrue/PostgREST lee `Authorization` para autenticación.

### Publishable vs Secret

| Key | Formato | Se traduce a | Uso seguro desde |
|-----|---------|-------------|-----------------|
| `sb_publishable_*` | Opaco | JWT anon (gateway traduce) | Browser, GAS, cualquier cliente |
| `sb_secret_*` | Opaco | JWT service_role (gateway traduce) | Solo servidor (User-Agent no-browser) |

**GAS NO es "servidor" para el gateway** — UrlFetchApp envía User-Agent de browser.

### Variables de entorno

| Variable | Dónde | Propósito |
|----------|-------|----------|
| `SUPABASE_PUBLISHABLE_KEY` | GAS Script Properties | apikey header en requests a Supabase |
| `GAS_SHARED_SECRET` | GAS Script Properties + Edge Function env | Autenticación GAS ↔ Edge Function |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function env (auto) — NO va en GAS | Admin API dentro del Edge Function |
| `SUPABASE_URL` | GAS Script Properties + Edge Function env (auto) | URL del proyecto |

---

## Migraciones relacionadas

| Migración | Propósito |
|-----------|----------|
| `006_fix_auth_token_defaults.sql` | Trigger BEFORE INSERT en auth.users para prevenir NULLs en token columns |

---

## Restricciones descubiertas

1. **GAS UrlFetchApp User-Agent:** No se puede cambiar. Siempre `Mozilla/5.0`. Esto afecta cualquier integración GAS ↔ Supabase que requiera `sb_secret`.
2. **auth.users owner:** `supabase_auth_admin`. El rol `postgres` NO puede `ALTER TABLE auth.users`. Pero SÍ puede crear triggers `BEFORE INSERT`.
3. **Legacy JWT keys:** Una vez deshabilitadas, re-habilitarlas expone TODAS las keys legacy (anon Y service_role). Si alguna fue comprometida, no es opción.
4. **supabase-js v2 Admin API:** El método para actualizar usuario por ID es `updateUserById()`, NO `updateUser()`. `updateUser()` es para el usuario autenticado actual.
