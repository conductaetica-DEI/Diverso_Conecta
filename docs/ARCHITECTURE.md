# ARCHITECTURE.md — DiversoLab Members Conecta

## Proyecto

Plataforma de gestión de expedientes digitales para DiversoLab — Transformación desde el Potencial Humano Diverso. Frontend en GitHub Pages (HTML/CSS/JS estático). Backend en Supabase (PostgreSQL + Auth + RLS) + Google Apps Script (OTP, Firma, Drive).

---

## Stack

```
GitHub Pages (HTML/CSS/JS) ──fetch()+JWT──→ Supabase (BD + Auth + RLS)
       │                                         ↑
       │                                    Edge Function
       │                                    (otp-admin)
       │                                         ↑
       └──fetch()+JWT──→ GAS (OTP + Firma + Drive)──fetch()+shared_secret──┘
```

| Componente | Rol |
|-----------|-----|
| GitHub Pages | Frontend estático, app privada en app.diversolab.org |
| Supabase | PostgreSQL, Auth (sesión/JWT), RLS, API REST automática |
| Edge Function otp-admin | Proxy Admin API para GAS OTP (ver `docs/SUPABASE.md`) |
| GAS OTP | Verificar identidad por email (código 6 dígitos) |
| GAS Firma | Firma electrónica de consentimientos y documentos |
| GAS Drive | Crear carpetas, gestionar permisos, subir archivos |
| Google Drive | Expedientes digitales (archivos físicos) |
| Monday.com | Tablero operativo (espejo, no fuente de verdad) |
| Wix | Landing page pública, SEO, blog (NO la app privada) |

---

## Roles

### Externos (se auto-registran)

| Clave | Tipo persona | Descripción |
|-------|-------------|-------------|
| `beneficiario` | Natural | PCDi que recibe acompañamiento |
| `aliado` | Jurídica | Empresa en programas de inclusión/DEI |
| `contratista` | Natural | Profesional independiente |
| `proveedor` | Jurídica | Empresa proveedora |

### Internos (profile_type = `miembro`, email @diversolab.org)

No hay roles fijos. Cada miembro tiene permisos configurables:

| Permiso | Clave | Habilita |
|---------|-------|----------|
| Gestión beneficiarios | `gestion_beneficiarios` | Gestionar beneficiarios y aliados asignados |
| Gestión proveedores | `gestion_proveedores` | Gestionar contratistas y proveedores asignados |
| Gestión accesos | `gestion_accesos` | Crear miembros, permisos, aprobar/rechazar perfiles |
| Gestión plataforma | `gestion_plataforma` | Configuración, catálogos, ver todo sin asignación |

Primer miembro = seed manual en Supabase con los 4 permisos. Usa panel de gestión para crear al resto.

---

## Schema SQL — 7 tablas

### profiles

```sql
CREATE TABLE profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     uuid REFERENCES auth.users,  -- NULL hasta primer login post-aprobación
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
```

### permisos_miembro

```sql
CREATE TABLE permisos_miembro (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id  uuid NOT NULL REFERENCES profiles(id),
  permiso    text NOT NULL CHECK (permiso IN ('gestion_beneficiarios','gestion_proveedores','gestion_accesos','gestion_plataforma')),
  activo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_perm_unico ON permisos_miembro(perfil_id, permiso);
```

### asignaciones

```sql
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
```

### tareas

```sql
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
```

### catalogo_docs

```sql
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
```

### consentimientos (INMUTABLE — no UPDATE, no DELETE)

```sql
CREATE TABLE consentimientos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id           uuid REFERENCES profiles(id),
  tipo_firma          text NOT NULL CHECK (tipo_firma IN ('persona_natural','persona_juridica')),
  -- Datos del firmante (siempre)
  email_firmante      text NOT NULL,
  nombre_firmante     text NOT NULL,
  tipo_documento_firmante text NOT NULL,
  numero_documento_firmante text NOT NULL,
  -- Datos empresariales (solo persona_juridica)
  empresa             text,
  nit_empresa         text,
  cargo_firmante      text,
  -- Consentimiento
  codigo              text NOT NULL,
  version             text NOT NULL,
  texto_aceptado      text NOT NULL,
  aceptado            boolean NOT NULL,
  es_obligatorio      boolean NOT NULL DEFAULT false,
  -- Evidencia jurídica
  folio               text UNIQUE NOT NULL,
  hash_firma          text NOT NULL,
  ip_address          text,
  user_agent          text,
  -- Contexto
  solicitado_por      uuid REFERENCES profiles(id),
  programa            text,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX idx_consent_perfil ON consentimientos(perfil_id);
CREATE INDEX idx_consent_folio ON consentimientos(folio);
CREATE INDEX idx_consent_email ON consentimientos(email_firmante);
```

**Regla de validación a nivel de aplicación (GAS Firma):** si tipo_firma = 'persona_juridica', entonces empresa, nit_empresa y cargo_firmante son obligatorios. PostgreSQL no tiene CHECK condicional cross-column fácil, así que GAS lo valida antes de insertar.

### logs_actividad

```sql
CREATE TABLE logs_actividad (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid REFERENCES profiles(id),
  accion     text NOT NULL,
  modulo     text,
  detalle    jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## Funciones RLS

```sql
CREATE OR REPLACE FUNCTION get_profile_id() RETURNS uuid AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION es_miembro() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND profile_type = 'miembro'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION tiene_permiso(p text) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM permisos_miembro
    WHERE perfil_id = get_profile_id()
    AND permiso = p
    AND activo = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION es_miembro_de(p_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM asignaciones
    WHERE analista_id = get_profile_id()
    AND perfil_id = p_id
    AND estado = 'activa'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## Políticas RLS

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Propio OR miembro asignado OR gestion_accesos OR gestion_plataforma | Público (registro) | Propio OR gestion_accesos OR gestion_plataforma | gestion_plataforma |
| permisos_miembro | gestion_accesos OR gestion_plataforma | gestion_accesos | gestion_accesos | gestion_plataforma |
| asignaciones | Miembro (suyas) OR gestion_plataforma | gestion_accesos | gestion_accesos | gestion_plataforma |
| tareas | Perfil (suyas) OR miembro (asignados) OR gestion_plataforma | es_miembro() | Perfil (completar propias) OR miembro | gestion_plataforma |
| catalogo_docs | Perfil (suyos) OR miembro (asignados) OR gestion_plataforma | Autenticado | Miembro (revisar) | gestion_plataforma |
| consentimientos | Perfil (suyos) OR gestion_plataforma | Autenticado + service_role | NUNCA | NUNCA |
| logs_actividad | gestion_plataforma | Autenticado + service_role | NUNCA | NUNCA |

---

## Servicios GAS

### GAS OTP (`gas/otp/`)

Verificar identidad por email. Código de 6 dígitos.

| Endpoint | Parámetros | Retorna |
|----------|-----------|---------|
| solicitarOTP | email, nombre, empresa (si aplica) | { ok: true } |
| verificarOTP | email, codigo | { ok: true, access_token, refresh_token, token_verificacion } |
| notificarEmail | destinatario, asunto, cuerpo | { ok: true } |

- Rate limit: 20 solicitudes/10 min por email (temporal para desarrollo, reducir en producción)
- Máx 5 intentos de verificación
- TTL: 10 minutos
- Al verificar exitosamente:
  1. Llama Edge Function `otp-admin` (acción `crear_usuario`): busca auth user por email, si no existe lo crea
  2. Genera sesión: Edge Function establece password temporal (`set_password`), GAS llama `/auth/v1/token?grant_type=password` para obtener tokens
  3. Vincula `auth_user_id` al profile (Edge Function acción `vincular_perfil`)
  4. Genera `token_verificacion` temporal (5 min) que GAS Firma requiere
  5. Retorna `access_token` + `refresh_token` + `token_verificacion` al frontend
- GAS usa `sb_publishable_*` key en header `apikey` + `x-gas-secret` shared secret para Edge Function (ver `docs/SUPABASE.md`)
- El email de OTP incluye contexto: "Código de verificación para [nombre]" (persona natural) o "Código de verificación para [nombre] en representación de [empresa]" (persona jurídica)
- Referencia: `docs/referencia-corex.gs`

### GAS Firma (`gas/firma/`)

Firma electrónica de consentimientos y documentos. Servicio transversal reutilizable.

| Endpoint | Parámetros | Retorna |
|----------|-----------|---------|
| firmar | ver abajo | { ok, folios: [...], pdf_url } |
| verificarFirma | folio | { ok, datos_firma } |
| obtenerDatosFirma | token (uuid tarea) | { ok, tarea_id, perfil_id, tipo_firma, firmante, programa, obligatorios } |

**obtenerDatosFirma** — endpoint intermediario para la página standalone `/firma.html`. Consulta tareas y profiles con service_role (el frontend no tiene sesión Supabase en este flujo). Valida que la tarea exista, esté pendiente y sea tipo "consentimiento". Dual-path:
- Si `tarea.perfil_id` existe → consulta perfil en BD y construye firmante desde perfil
- Si `tarea.perfil_id` es null → lee `firmante_externo` del JSON en `tarea.detalle` (firma externa sin perfil)

Retorna la misma estructura en ambos casos: `{ ok, tarea_id, perfil_id (o null), tipo_firma, firmante, programa, obligatorios }`.

**Parámetros de firmar — dos líneas según tipo:**

Persona natural (beneficiario, contratista):
```json
{
  "token_verificacion": "...",
  "proyecto": "diversolab",
  "tipo_firma": "persona_natural",
  "firmante": {
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "telefono": "+57 300 1111111"
  },
  "consentimientos": [...],
  "solicitado_por": "uuid-analista o null",
  "programa": "Acompañamiento PCDi 2026",
  "ip_address": "...",
  "user_agent": "..."
}
```

Persona jurídica (aliado, proveedor):
```json
{
  "token_verificacion": "...",
  "proyecto": "diversolab",
  "tipo_firma": "persona_juridica",
  "firmante": {
    "nombre": "Andrea Restrepo",
    "email": "arestrepo@empresa.com",
    "tipo_documento": "CC",
    "numero_documento": "9876543210",
    "telefono": "+57 310 2222222",
    "cargo": "Representante Legal",
    "empresa": "Inclusión Total S.A.S.",
    "nit_empresa": "900123456-1"
  },
  "consentimientos": [...],
  "solicitado_por": "uuid-analista o null",
  "programa": "Diagnóstico DEI 2026",
  "ip_address": "...",
  "user_agent": "..."
}
```

**Validación según tipo_firma:**
- `persona_natural`: nombre, email, tipo_documento, numero_documento → todos obligatorios
- `persona_juridica`: todos los anteriores + cargo, empresa, nit_empresa → todos obligatorios
- Si tipo_firma es `persona_juridica` y falta cargo, empresa o nit_empresa → rechazar con error `DATOS_EMPRESA_REQUERIDOS`

**Estructura de consentimientos (igual para ambos tipos):**
```json
"consentimientos": [
  { "codigo": "C1", "version": "1.0", "texto": "Acepto el tratamiento...", "aceptado": true, "es_obligatorio": true },
  { "codigo": "C2", "version": "1.0", "texto": "Autorizo el registro...", "aceptado": true, "es_obligatorio": true },
  { "codigo": "C3", "version": "1.0", "texto": "Autorizo datos sensibles...", "aceptado": true, "es_obligatorio": true },
  { "codigo": "C4", "version": "1.0", "texto": "Autorizo analítica...", "aceptado": false, "es_obligatorio": false },
  { "codigo": "C5", "version": "1.0", "texto": "Acepto comunicaciones...", "aceptado": true, "es_obligatorio": false },
  { "codigo": "C6", "version": "1.0", "texto": "Autorizo imagen...", "aceptado": false, "es_obligatorio": false },
  { "codigo": "C7", "version": "1.0", "texto": "Autorizo seguimiento...", "aceptado": true, "es_obligatorio": true }
]
```

**Lógica interna:**
1. Acción pública (no requiere JWT ni api_key — token_verificacion es la autenticación)
2. Valida token_verificacion contra GAS OTP server-to-server con api_key (debe ser válido y reciente <5 min)
3. Valida tipo_firma: si `persona_juridica`, exige cargo + empresa + nit_empresa
4. Valida que todos los consentimientos con es_obligatorio=true estén aceptados
5. Por cada consentimiento: genera folio (DL-{codigo}-{año}-{secuencial}), genera hash SHA-256 (email + codigo + version + timestamp + ip)
6. Escribe a Supabase tabla consentimientos (service_role) — un registro por consentimiento (aceptados Y rechazados)
7. Genera PDF de constancia usando plantilla Google Docs (Script Property `DOC_ID_PLANTILLA_FIRMA`): makeCopy → replaceText placeholders → getAs PDF → trash copy
8. PDF diferenciado: persona natural muestra (nombre, documento, teléfono, fecha, folio). Persona jurídica muestra (empresa, NIT, firmante, documento, cargo, teléfono, fecha, folio). Incluye tabla de decisiones C1-C7 con tipo OBLIGATORIO/VOLUNTARIO
9. Sube PDF a Drive (carpeta del perfil si existe, o carpeta temporal de firmas) — solo almacenamiento interno, no accesible desde frontend
10. Envía email al firmante con PDF adjunto
11. Retorna { ok, folios: [...], pdf_url, resumen: [{codigo, decision, folio, hash}, ...] }

### GAS Drive (`gas/drive/`)

Crear carpetas y gestionar archivos en Drive.

| Endpoint | Parámetros | Retorna |
|----------|-----------|---------|
| crearCarpeta | profile_id, profile_type, nombre/razon_social | { ok, carpeta_drive_id, url } |

**Estructura de carpetas:**

```
DiversoLab_Expedientes/
  beneficiarios/{id}_{nombre}/       → kyc/ administrativos/ diversolab/qol/ diversolab/intervencion/ diversolab/analisis/
  aliados/{id}_{razon_social}/       → kyc/ administrativos/ diversolab/dei/ diversolab/consultoria/ diversolab/analisis/
  contratistas/{id}_{nombre}/        → kyc/ administrativos/ financieros/
  proveedores/{id}_{razon_social}/   → kyc/ administrativos/ financieros/
```

---

## Consentimientos C1-C7

| ID | Texto corto | Obligatorio sistema | Referencia SICE |
|----|------------|-------------------|----------------|
| C1 | Datos básicos | Sí (siempre) | Art. 12, Política 01 |
| C2 | Identificación | Sí (siempre) | Art. 13, Política 01 |
| C3 | Datos sensibles | No (analista configura) | Art. 14, Política 01 |
| C4 | Analítica/IA | No (analista configura) | Art. 15, Política 01 |
| C5 | Comunicaciones | No (analista configura) | Art. 16, Política 01 |
| C6 | Imagen/voz | No (analista configura) | Art. 17, Política 01 |
| C7 | Seguimiento | No (analista configura) | Art. 18, Política 01 |

**Reglas:**
- Los 7 SIEMPRE se muestran al firmante
- C1 y C2 son obligatorios por sistema — no se pueden desmarcar
- C3-C7: el analista configura cuáles son obligatorios para cada solicitud
- Los marcados como obligatorios bloquean el botón "Firmar" hasta ser aceptados
- Se registra tanto aceptación como rechazo de cada uno

**Flujo auto-firma (registro):**
1. Usuario llena registro → ve los 7 consentimientos → C1+C2 obligatorios, C3-C7 voluntarios
2. Marca los que acepta → verifica con OTP → firma registrada

**Flujo firma solicitada (analista):**
1. Analista configura: programa, firmante, email, cuáles C3-C7 son obligatorios
2. Sistema envía email con link a página standalone de firma
3. Firmante abre → ve los 7 → C1+C2 + los que analista marcó = obligatorios
4. Marca los que acepta → verifica con OTP → firma registrada
5. Analista ve confirmación en su dashboard

---

## Flujos principales

### Registro

1. Usuario abre `/registro.html`
2. Selecciona tipo de perfil
3. Llena datos Capa 0 (nombre/razón social, documento, email, teléfono)
4. Ve los 7 consentimientos, marca los que acepta (C1+C2 obligatorios)
5. Solicita OTP → verifica
6. Frontend llama GAS Firma con token_verificacion
7. Frontend crea perfil en Supabase (estado: pendiente, auth_user_id: null)
8. Confirmación: "Tu solicitud fue recibida"
9. Miembro con gestion_accesos aprueba → GAS Drive crea carpeta → estado: activo

### Login

1. Usuario abre `/login.html`
2. Ingresa email
3. Frontend consulta Supabase (profiles por email, estado)
4. Si no existe o inactivo → error amigable
5. Si activo → solicita OTP via GAS
6. Usuario ingresa código → frontend llama GAS verificarOTP
7. GAS verifica OTP → llama Edge Function `otp-admin` para crear/buscar auth user → genera sesión via password temporal + `/token` → vincula auth_user_id al profile
8. GAS retorna { ok, access_token, refresh_token, token_verificacion }
9. Frontend hace `supabase.auth.setSession({ access_token, refresh_token })` → sesión activa con JWT
10. Redirect según profile_type (miembro → /dashboard, externo → /mi-expediente)

### Firma solicitada por analista

1. Analista abre modal "Solicitar firma" en /dashboard.html
2. Toggle: "Perfil existente" (búsqueda por nombre/email/doc con chip de selección) o "Externo" (formulario manual: tipo persona, nombre, apellido, documento, email, teléfono; si jurídica: empresa, NIT, cargo)
3. Llena: programa, cuáles C3-C7 son obligatorios (C1+C2 siempre obligatorios)
4. Sistema crea tarea tipo "consentimiento" en Supabase. Si externo: `perfil_id: null`, datos del firmante en `detalle.firmante_externo` (JSON)
5. Email al firmante con link: `/firma.html?token={uuid}`
6. Firmante abre → GAS obtenerDatosFirma resuelve datos (desde perfil o desde firmante_externo)
7. Ve los 7 consentimientos con obligatorios marcados
8. Acepta → OTP → GAS Firma → constancia PDF por email
9. Tarea se marca como completada

---

## Tablas futuras (Fase 1+)

- `ubicacion` — Capa 1
- `kyc_personas` — Capa 2 persona natural
- `kyc_empresas` — Capa 2 persona jurídica

Tablas que NO van a Supabase: caract_pcdi, caract_empresarial, qol_respuestas, dei_respuestas, cargo_dei — viven en Google Sheets (Forms → GAS).
