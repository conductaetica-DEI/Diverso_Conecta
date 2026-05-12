# SETUP.md — Configuración inicial

Pasos manuales que el desarrollador debe hacer en interfaces web. Claude Code NO puede hacer estos pasos — son configuración de plataformas externas.

---

## 1. Supabase

### Crear proyecto

1. Ir a [app.supabase.com](https://app.supabase.com)
2. New Project → nombre: `diversolab-members` → región: `South America (São Paulo)` → generar password seguro
3. Esperar ~2 minutos a que se cree

### Copiar credenciales

En Project Settings → API:
- **Project URL**: `https://xxxxx.supabase.co` → guardar como `SUPABASE_URL`
- **Publishable key** (`sb_publishable_*`): va al frontend y a GAS OTP como `SUPABASE_PUBLISHABLE_KEY`
- **Secret key** (`sb_secret_*`): va a Edge Function env como `SUPABASE_SERVICE_ROLE_KEY` — NUNCA al frontend

**Nota:** Las keys con formato `sb_*` son opacas (no JWTs). El API gateway las traduce internamente. Ver `docs/SUPABASE.md` para detalles del formato.

### Ejecutar migración

1. Ir a SQL Editor en el dashboard de Supabase
2. Abrir `supabase/migrations/001_schema.sql` del repo
3. Pegar y ejecutar
4. Verificar que se crearon las 7 tablas en Table Editor
5. Verificar que se crearon las 4 funciones en Database → Functions

### Configurar Auth

1. Authentication → Providers → deshabilitar Email (no queremos magic link nativo)
2. Authentication → URL Configuration → agregar `https://app.diversolab.org` como Redirect URL
3. Authentication → Settings → JWT expiry: 3600 (1 hora)

### Configurar CORS

1. En Settings → API → agregar a "Additional allowed origins":
   - `https://app.diversolab.org`
   - `http://localhost:5500` (desarrollo con Live Server)

### Crear seed (primer super admin)

Ejecutar en SQL Editor:

```sql
-- Crear el primer miembro (super admin)
INSERT INTO profiles (profile_type, nombre, apellido, tipo_documento, numero_documento, email_principal, estado_perfil)
VALUES ('miembro', 'NOMBRE', 'APELLIDO', 'CC', 'NUMERO_DOCUMENTO', 'admin@diversolab.org', 'activo')
RETURNING id;

-- Copiar el UUID retornado y usarlo abajo
INSERT INTO permisos_miembro (perfil_id, permiso) VALUES
('UUID_RETORNADO', 'gestion_beneficiarios'),
('UUID_RETORNADO', 'gestion_proveedores'),
('UUID_RETORNADO', 'gestion_accesos'),
('UUID_RETORNADO', 'gestion_plataforma');
```

---

## 2. Google Apps Script — OTP

### Opción A: via clasp (recomendado)

1. Instalar clasp: `npm install -g @google/clasp`
2. Login: `clasp login` (abre browser para autenticar con cuenta @diversolab.org)
3. Crear proyecto: `clasp create --type webapp --title "DiversoLab OTP" --rootDir gas/otp`
4. Push: `clasp push` (sube el código)
5. Deploy: `clasp deploy --description "v1.0"`
6. Copiar la URL del deployment

### Opción B: manual

1. Ir a [script.google.com](https://script.google.com) con cuenta @diversolab.org
2. New Project → nombre: "DiversoLab OTP"
3. Copiar contenido de `gas/otp/Codigo.gs` y `gas/otp/Otp.gs`
4. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone
5. Copiar la URL del deployment

### Configurar Script Properties

1. En el editor de GAS → Project Settings → Script Properties
2. Agregar:
   - `API_KEY`: generar string aleatorio de 32+ caracteres (usar `openssl rand -hex 32`) — solo para llamadas server-to-server GAS↔GAS
   - `SUPABASE_URL`: el URL del proyecto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: la service_role key de Supabase (`sb_secret_*`) — usada por Auth.gs para verificar JWTs
   - `SUPABASE_PUBLISHABLE_KEY`: la publishable key de Supabase (`sb_publishable_*`) — usada como apikey en requests a Supabase y Edge Functions
   - `GAS_SHARED_SECRET`: secreto compartido con la Edge Function otp-admin — generar con `openssl rand -hex 32`
   - `EMAIL_REPLY_TO`: correo público para Reply-To en emails de salida (ej. `info@diversolab.org`)

### Probar

```bash
# solicitarOTP es acción pública (no requiere auth)
curl -X POST "URL_DEL_DEPLOYMENT" \
  -H "Content-Type: application/json" \
  -d '{"action":"solicitarOTP","email":"test@diversolab.org","nombre":"Test"}'
```

Debe retornar: `{"ok":true}`

---

## 3. Supabase Edge Function — otp-admin

### Propósito

Proxy para operaciones Admin API de Supabase Auth que GAS no puede hacer directamente (ver `docs/SUPABASE.md` para el por qué).

### Desplegar

```bash
supabase functions deploy otp-admin --project-ref nrqmnaktnpcgqrqpoksi
```

O via MCP tool `deploy_edge_function`.

### Configurar variables de entorno

En Supabase Dashboard → Edge Functions → otp-admin → Settings → Environment Variables:

- `GAS_SHARED_SECRET`: el mismo valor configurado en GAS OTP Script Properties (generado con `openssl rand -hex 32`)

Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente para todas las Edge Functions.

### Configuración del function

El archivo `supabase/functions/otp-admin/config.toml` (o flag en deploy) debe tener:

```toml
[functions.otp-admin]
verify_jwt = false
```

`verify_jwt = false` permite que GAS llame sin JWT válido — la autenticación se hace via `x-gas-secret` header.

### Acciones disponibles

| Acción | Payload | Respuesta |
|--------|---------|----------|
| `crear_usuario` | `{ email }` | `{ ok: true, user: { id, email } }` |
| `set_password` | `{ auth_user_id, password }` | `{ ok: true }` |
| `vincular_perfil` | `{ email, auth_user_id }` | `{ ok: true }` |

---

## 5. Google Apps Script — Firma

### Crear proyecto

Mismo proceso que OTP pero con nombre "DiversoLab Firma" y directorio `gas/firma`.

### Script Properties

- `API_KEY`: para llamadas server-to-server (diferente al de OTP)
- `SUPABASE_URL`: mismo
- `SUPABASE_SERVICE_ROLE_KEY`: mismo (también usado por Auth.gs para verificar JWTs)
- `OTP_URL`: URL del deployment de GAS OTP
- `OTP_API_KEY`: API key del servicio OTP (para llamadas Firma→OTP server-to-server)
- `DRIVE_CARPETA_FIRMAS`: ID de carpeta Drive para PDFs de constancia
- `FOLIO_PREFIJO`: "DL" (o el prefijo del proyecto)
- `DOC_ID_FDATO01`: ID del Google Doc con el Consentimiento Informado Integral (F-DATO-01)
- `DOC_ID_SICEPOL01`: ID del Google Doc con la Política de Protección de Datos (SICE-POL-01)
- `EMAIL_REPLY_TO`: correo público para Reply-To en emails de salida (ej. `info@diversolab.org`)

---

## 6. Google Apps Script — Drive

### Crear proyecto

Mismo proceso, nombre "DiversoLab Drive", directorio `gas/drive`.

### Script Properties

- `API_KEY`: para llamadas server-to-server (diferente a los otros)
- `SUPABASE_URL`: mismo
- `SUPABASE_SERVICE_ROLE_KEY`: mismo (también usado por Auth.gs para verificar JWTs)
- `CARPETA_RAIZ_ID`: ID de la carpeta "DiversoLab_Expedientes" en Drive (crearla manualmente primero)

### Crear carpeta raíz en Drive

1. En Google Drive de @diversolab.org, crear carpeta "DiversoLab_Expedientes"
2. Dentro crear 4 subcarpetas: beneficiarios, aliados, contratistas, proveedores
3. Copiar el ID de "DiversoLab_Expedientes" (está en la URL)
4. Ponerlo en Script Properties como `CARPETA_RAIZ_ID`

---

## 7. GitHub Pages

### Crear repositorio

1. Ir a github.com → New Repository
2. Nombre: `diversolab-app` (o el que prefiera)
3. Public (GitHub Pages gratis solo en repos public, o con GitHub Pro)
4. Inicializar con README

### Habilitar Pages

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` → folder: `/ (root)`
4. Save

### Verificar

Después de push, la app estará en `https://tu-usuario.github.io/diversolab-app/`

---

## 8. Dominio personalizado (GoDaddy → GitHub Pages)

### En GoDaddy

1. DNS Management → agregar registro CNAME:
   - Name: `app`
   - Value: `tu-usuario.github.io`
   - TTL: 600

### En GitHub

1. Settings → Pages → Custom domain: `app.diversolab.org`
2. Enforce HTTPS: ✅ (esperar unos minutos a que GitHub genere el certificado SSL)

### Verificar

Navegar a `https://app.diversolab.org` → debe mostrar el contenido del repo.

---

## 9. Configuración del frontend

### Archivo de configuración

Crear `js/config.js` con las variables públicas (NO secretos):

```javascript
// Configuración pública — estos valores son visibles en el código fuente
var CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_xxxx',  // publishable key (formato opaco, no JWT)
  GAS_OTP_URL: 'https://script.google.com/macros/s/xxxxx/exec',
  GAS_FIRMA_URL: 'https://script.google.com/macros/s/xxxxx/exec',
  GAS_DRIVE_URL: 'https://script.google.com/macros/s/xxxxx/exec',
  DOC_SICE_POL_01: 'GOOGLE_DOC_ID_sice_pol_01',
  DOC_F_DATO_01: 'GOOGLE_DOC_ID_f_dato_01'
};
```

**NOTA**: Las API keys de GAS NO van aquí. Van hardcodeadas en `gas-client.js` como variable. Aunque el código es público en GitHub Pages, las API keys de GAS protegen contra uso desde otros dominios. Si esto preocupa, considerar que la verdadera seguridad está en Supabase RLS — GAS es la segunda línea, no la única.

Las GAS API keys van en `gas-client.js`. La seguridad real está en Supabase RLS + validación interna de GAS, no en ocultar keys.

---

## 10. Desarrollo local

### Servir archivos estáticos

Opción simple con VS Code:
1. Instalar extensión "Live Server"
2. Click derecho en `login.html` → "Open with Live Server"
3. Se abre en `http://localhost:5500`

Opción con Python:
```bash
cd diversolab-app
python3 -m http.server 5500
```

### Apuntar a Supabase de desarrollo

Puedes crear un segundo proyecto Supabase para dev, o usar el mismo con datos de prueba. Lo importante es que `localhost:5500` esté en los CORS allowed origins de Supabase.

---

## Resumen de secretos

| Secreto | Dónde configurar | Dónde se usa |
|---------|-----------------|-------------|
| SUPABASE_URL | config.js (frontend) + GAS Script Properties | Frontend + GAS |
| SUPABASE_PUBLISHABLE_KEY | config.js (frontend, como SUPABASE_ANON_KEY) + GAS OTP Script Properties | Frontend + GAS OTP (apikey header) |
| SUPABASE_SERVICE_ROLE_KEY | Edge Function env (auto) + GAS Script Properties (verificar JWT) | Edge Function (Admin API) + GAS (verificar JWT) |
| GAS_SHARED_SECRET | GAS OTP Script Properties + Edge Function env | GAS OTP ↔ Edge Function otp-admin |
| GAS_OTP_URL | config.js (frontend) | Frontend |
| GAS_OTP_API_KEY | GAS OTP Script Properties + GAS Firma Script Properties | Solo GAS↔GAS server-to-server |
| GAS_FIRMA_URL | config.js (frontend) | Frontend |
| GAS_FIRMA_API_KEY | GAS Firma Script Properties | Solo GAS Firma (server-to-server) |
| GAS_DRIVE_URL | config.js (frontend) | Frontend |
| GAS_DRIVE_API_KEY | GAS Drive Script Properties | Solo GAS Drive (server-to-server) |
| EMAIL_REPLY_TO | GAS OTP + GAS Firma Script Properties | Reply-To en emails de salida |
