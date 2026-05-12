# Status — DiversoLab Members Conecta

Última actualización: 2026-05-11

---

## Infraestructura conectada

| Servicio | Estado | Detalle |
|----------|--------|---------|
| Supabase | Migrado | Proyecto `nrqmnaktnpcgqrqpoksi`, 7 tablas + RLS, CLI local en `supabase/` |
| Edge Function otp-admin | Desplegado | v3, verify_jwt=false, proxy Admin API para GAS OTP |
| GAS OTP | Desplegado | Script `13lSaw-...`, deployment v1.21 @24, login OTP funcionando |
| GAS Firma | Desplegado | Script `16yZGc-...`, deployment v1.7 @10 funcionando (GET OK) |
| GAS Drive | Desplegado | Script `1pMbDQ-...`, deployment v1.0 funcionando (GET OK) |

## GAS OTP — Servicio implementado

| Archivo | Contenido |
|---------|-----------|
| appsscript.json | Timezone Bogotá, webapp ANYONE_ANONYMOUS |
| Codigo.gs | Router: doPost (acciones públicas: solicitarOTP, verificarOTP; protegidas: verificarTokenVerificacion, notificarEmail), doGet, respuesta_json |
| Auth.gs | verificar_jwt (valida contra Supabase Auth API), autenticar (JWT o api_key) |
| Otp.gs | solicitarOTP, verificarOTP (crea auth user + genera sesión + token_verificacion), verificarTokenVerificacion, generar_token_verificacion — usa CacheService para datos efímeros con TTL |
| Email.gs | enviar_otp_email, notificarEmail, generar_html_otp, escapar_html — replyTo via EMAIL_REPLY_TO property |
| Supabase.gs | llamar_edge_function (proxy otp-admin), obtener_o_crear_usuario_auth, buscar_usuario_por_email, vincular_auth_user_id, generar_sesion_supabase (password temporal via Edge Function + POST /token con publishable key) |

Script Properties configuradas: API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY, GAS_SHARED_SECRET, EMAIL_REPLY_TO.

Login OTP funcionando end-to-end (2026-05-12): email → OTP → Edge Function crear usuario → password temporal → sesión → setSession → redirect.

## Edge Function otp-admin — Desplegada

Proxy para operaciones Admin API de Supabase Auth. GAS no puede usar sb_secret directamente (User-Agent restriction). Ver `docs/SUPABASE.md`.

| Acción | Qué hace |
|--------|---------|
| crear_usuario | listUsers + createUser si no existe |
| set_password | updateUserById con password temporal |
| vincular_perfil | UPDATE profiles SET auth_user_id |

Auth: `x-gas-secret` header, `verify_jwt: false`. Versión desplegada: v3.

## GAS Firma — Servicio implementado

| Archivo | Contenido |
|---------|-----------|
| appsscript.json | Timezone Bogotá, webapp ANYONE_ANONYMOUS |
| Codigo.gs | Router: doPost (acciones públicas: firmar, verificarFirma, obtenerDatosFirma), doGet, respuesta_json |
| Auth.gs | verificar_jwt (valida contra Supabase Auth API), autenticar (JWT o api_key) |
| Firma.gs | firmar (incluye completar_tarea si tarea_id presente), verificarFirma, obtener_datos_firma, verificar_token_otp, validar_firmante, validar_consentimientos |
| Folio.gs | generar_folio (DL-{codigo}-{año}-{secuencial}), generar_hash (SHA-256), bytes_a_hex |
| Pdf.gs | generar_pdf_constancia, construir_encabezado/datos/tabla/evidencia, anexos legales (F-DATO-01, SICE-POL-01), estilos |
| Supabase.gs | insertar_consentimientos, consultar_por_folio, registrar_log, obtener_carpeta_perfil, consultar_tarea_firma, completar_tarea, consultar_perfil |

Script Properties configuradas (10):
- API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMAIL_REPLY_TO
- OTP_URL, OTP_API_KEY (inter-servicio con GAS OTP)
- DRIVE_CARPETA_FIRMAS, FOLIO_PREFIJO (DL)
- DOC_ID_FDATO01, DOC_ID_SICEPOL01 (Google Docs con documentos legales completos)

Pendiente: pruebas con POST real (tablas ya creadas en Supabase).

## Documentos legales de referencia

Guardados en `docs/` como referencia local:
- `F-DATO-01_Consentimiento-Integral.md` — 7 consentimientos con textos aprobados
- `SICE-POL-01_Politica-Datos.md` — Política de Protección de Datos (39 artículos)

Los originales viven en Google Docs (DOC_ID_FDATO01 y DOC_ID_SICEPOL01) y se embeben como anexos en el PDF de constancia.

## GAS Drive — Servicio implementado

| Archivo | Contenido |
|---------|-----------|
| appsscript.json | Timezone Bogotá, webapp ANYONE_ANONYMOUS |
| Codigo.gs | Router: doPost (todas las acciones requieren JWT o api_key), doGet, respuesta_json |
| Auth.gs | verificar_jwt (valida contra Supabase Auth API), autenticar (JWT o api_key) |
| Drive.gs | crear_carpeta_expediente, obtener_o_crear_subcarpeta, obtener_subcarpetas_por_tipo, validar_datos_carpeta |
| Supabase.gs | actualizar_carpeta_perfil (PATCH profiles SET carpeta_drive_id) |

Script Properties configuradas (4):
- API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CARPETA_RAIZ_ID

Pendiente: pruebas con POST real (tablas ya creadas en Supabase).

## Supabase — Migración 001 ejecutada

Migración `001_schema.sql` ejecutada en BD remota:
- 7 tablas: profiles, permisos_miembro, asignaciones, tareas, catalogo_docs, consentimientos, logs_actividad
- 5 funciones: get_profile_id, es_miembro, tiene_permiso, es_miembro_de, actualizar_updated_at
- 24 políticas RLS en las 7 tablas
- RLS habilitado en todas las tablas
- Trigger updated_at en profiles
- consentimientos y logs_actividad: sin UPDATE ni DELETE (inmutables)

Seed `002_seed.sql` ejecutado: 1 profile (Super Admin admin@diversolab.org), 4 permisos. Datos de prueba se crean desde la UI (registro + accesos).

## Design system CSS — Implementado

| Archivo | Contenido |
|---------|-----------|
| css/tokens.css | @import Google Fonts, 7 colores base, 6 variantes (color-mix), 6 estados semánticos, 3 fuentes, 7 tamaños, 6 espaciados, 4 radios, 2 sombras, --color-borde-tabla |
| css/componentes.css | body base, botones (primario/secundario/ghost + disabled + loading), inputs/selects (focus/error/válido), cards (4 variantes), badges (4 estados), tabla, modal, toast (éxito/error), stepper, skip link, focus visible global, consentimientos (10 clases), OTP (8 clases), confirmación (5 clases), firmante (4 clases), documento-iframe (1 clase), encabezado-app (6 clases: app, izquierda, logo, titulo, btn-salir + responsive) |

Cero colores hardcodeados en componentes. Variantes generadas con color-mix(in srgb).

## Clientes JS — Implementados

| Archivo | Contenido |
|---------|-----------|
| js/config.js | CONFIG con SUPABASE_URL, SUPABASE_ANON_KEY (real), 3 URLs GAS (reales), DOC_SICE_POL_01, DOC_F_DATO_01 (Google Doc IDs para iframes) |
| js/supabase-client.js | iniciar_supabase, obtener_sesion, verificar_sesion, supabase_fetch (retry 401 + refresh), cerrar_sesion |
| js/gas-client.js | gas_fetch (adjunta JWT automáticamente si hay sesión), solicitar_otp, verificar_otp, firmar_consentimientos, verificar_firma, obtener_datos_firma, notificar_email, crear_carpeta |
| js/utils.js | mostrar_error/exito (toast), mensaje_usuario (27 códigos), escapar_html, formatear_fecha, formatear_tipo_documento (sigla→nombre legible), deshabilitar/habilitar_boton, validar_email/documento, obtener_ip |
| js/consentimientos.js | Catálogo F-DATO-01 v1.0 — 7 consentimientos (C1-C7) con textos aprobados por Asamblea General, importado por firma.html y registro.html |

API keys eliminadas del frontend — gas_fetch envía JWT de sesión Supabase. GAS API keys reservadas para llamadas server-to-server GAS↔GAS.

## Documentación actualizada

- ARCHITECTURE.md — verificarOTP retorna access_token + refresh_token + token_verificacion, flujo login con GAS→tokens→setSession, auth_user_id null hasta primer login, profiles: nombre+apellido (no nombre_completo)
- SECURITY.md — flujo auth completo con Auth Admin API, tokens transitorios en tabla de secretos
- SETUP.md — service_role para crear sesiones, eliminada mención de Edge Functions, seed con nombre+apellido
- QUALITY.md — PostgREST joins con nombre+apellido
- VISTAS-FIRMA.md — 3 vistas de referencia visual (natural, jurídica, solicitada por analista)

## Página firma standalone — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/firma.html | Página standalone de firma de consentimientos (se abre desde link en email, sin sesión Supabase) |

Flujo: carga datos via GAS obtenerDatosFirma → página continua (sin stepper): tarjeta firmante readonly (tipo_documento legible via formatear_tipo_documento) con reloj COT en vivo → iframe SICE-POL-01 + iframe F-DATO-01 (Google Docs embebidos) → 7 consentimientos F-DATO-01 (ninguno pre-seleccionado, checkbox "Leí y acepto" al final de cada uno, Ley 1581/2012) → verificación OTP inline (acto indivisible con consentimiento) → firma via GAS → completar_tarea si es firma solicitada → confirmación con tabla resumen (código/decisión/folio/hash), fecha, IP, email (PDF enviado por email, no descargable). Soporta firma externa (perfil_id: null con firmante_externo en detalle).

Características: página continua sin stepper (Vista 3), campo cargo editable si falta para jurídica, obligatorios configurables por analista (C1+C2 siempre + C3-C7 según tarea.detalle), tarea_id en payload para completar_tarea, CSP frame-src https://docs.google.com, accesibilidad (skip link, aria-labels, focus management, keyboard nav), responsive 480px.

## Página registro — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/registro.html | Página de auto-registro para perfiles externos (3 pasos) |

Flujo: selección tipo perfil (4 cards: beneficiario/aliado/contratista/proveedor) → datos básicos (natural vs jurídica dinámico, validación inline blur) → paso 3 "Consentimiento y firma" (acto indivisible): tarjeta firmante readonly (tipo_documento legible via formatear_tipo_documento) con reloj COT en vivo → iframe SICE-POL-01 + iframe F-DATO-01 (Google Docs embebidos) → 7 consentimientos F-DATO-01 (ninguno pre-seleccionado, checkbox "Leí y acepto" al final de cada uno, Ley 1581/2012) → verificación OTP inline → firma via GAS → perfil INSERT en Supabase (estado pendiente, auth_user_id null) → confirmación con tabla resumen (código/decisión/folio/hash), fecha, IP (PDF enviado por email, no descargable).

Características: stepper 3 pasos (fusión consentimiento+verificación como acto indivisible), campos dinámicos (natural: nombre+apellido+documento personal, jurídica: razón social+NIT+representante+cargo), tipos documento CC/CE/NIT/PA/PEP/PPT/TI (nombres legibles, PEP y PPT completos), detección duplicados (idx_profiles_doc + email_principal), CSP frame-src https://docs.google.com + *.supabase.co, accesibilidad (skip link, aria-labels, focus management, keyboard nav), responsive 480px.

## Página login — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/login.html | Inicio de sesión con OTP (2 estados) |

Flujo: email → validar formato → solicitar OTP via GAS (GAS valida perfil: no encontrado/pendiente/suspendido/activo) → 6 dígitos OTP (auto-advance, paste, backspace, Enter) → verificar OTP → setSession(access_token, refresh_token) → query profile_type → redirect (miembro → dashboard, externo → mi-expediente).

Características: encabezado-app unificado (logo + "Iniciar sesión"), verifica sesión existente al cargar (redirect si ya autenticado), timer 60s reenvío, "Usar otro correo" regresa a estado email, validación blur en email, Supabase JS SDK via CDN, CSP (cdn.jsdelivr.net, *.supabase.co, script.google.com), accesibilidad (skip link, aria-labels, focus management, keyboard nav), responsive 480px.

## Página gestión accesos — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/accesos.html | Panel de gestión con 3 tabs (requiere gestion_accesos o gestion_plataforma) |

Tab 1 — Perfiles pendientes: tabla con nombre/razón, tipo (badge), documento, email, fecha. Botones Aprobar (PATCH activo → GAS Drive crear_carpeta → GAS OTP notificar_email) y Rechazar (PATCH inactivo → notificar_email). GAS calls non-blocking.

Tab 2 — Miembros del equipo: tabla con nombre, email, permisos (badges). Botón "Nuevo miembro" → modal (nombre, email @diversolab.org validado, tipo/número documento, 4 checkboxes permisos). Click fila → modal editar permisos (UPSERT via resolution=merge-duplicates).

Tab 3 — Asignaciones: selector de analista → tabla de perfiles asignados. Botón "Asignar perfil" → modal con selector de perfiles activos no asignados. Botón "Finalizar" por fila (PATCH estado=finalizada + fecha_fin).

Características: verificación permisos al cargar (redirect si no autorizado), tabs ARIA (role=tablist/tab/tabpanel), 3 modales (cerrar con X/ESC/click fuera), event delegation en tablas, Supabase JS SDK via CDN, CSP, responsive 480px.

## Migración 003 — RLS gestion_accesos

Migración `003_rls_accesos.sql` ejecutada en BD remota (2026-05-11 via MCP execute_sql):
- profiles SELECT: agregado `tiene_permiso('gestion_accesos')` — necesario para que Tab 1 y Tab 2 de accesos.html funcionen con gestion_accesos
- profiles UPDATE: agregado `tiene_permiso('gestion_accesos')` — necesario para aprobar/rechazar perfiles

## Migración 006 — Fix auth token defaults

Migración `006_fix_auth_token_defaults.sql` ejecutada en BD remota (2026-05-12 via MCP apply_migration):
- Trigger `BEFORE INSERT` en `auth.users`: convierte NULL a '' en `confirmation_token`, `recovery_token`, `email_change_token_new`
- Previene crash de GoTrue "converting NULL to string is unsupported"
- No se puede ALTER TABLE auth.users (owner: supabase_auth_admin), el trigger es la alternativa viable

## Migración 005 — CHECK tipo_documento

Migración `005_check_tipo_documento.sql` ejecutada en BD remota (2026-05-11 via MCP execute_sql):
- `profiles.tipo_documento`: CHECK IN ('CC','CE','NIT','PA','PEP','PPT','TI')
- `consentimientos.tipo_documento_firmante`: CHECK IN ('CC','CE','NIT','PA','PEP','PPT','TI')
- `catalogo_docs.tipo_documento`: sin CHECK (es tipo de documento del expediente, no identificación personal)

## Página mi expediente — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/mi-expediente.html | Dashboard del perfil externo (beneficiario, aliado, contratista, proveedor) |

Flujo: verificar_sesion → obtener perfil (redirect miembro → dashboard) → Promise.all(tareas, documentos, consentimientos).

Secciones:
1. Perfil: nombre/razón social + badge tipo + badge estado + documento + email
2. Progreso: stepper 4 pasos (Registro ✓, Consentimientos ✓/pendiente, Ubicación pendiente, Documentación pendiente)
3. Tareas pendientes: lista con tipo, detalle, urgencia, fecha límite. Botón "Firmar" en tareas tipo consentimiento → /firma.html?token={tarea_id}
4. Documentos: tabla con tipo, categoría, estado (badge semántico), fecha
5. Consentimientos firmados: tabla con código, fecha, folio

Características: queries con columnas específicas (no SELECT *), LIMIT 50, event delegation, CSP, accesibilidad (skip link, aria-labels, focus), responsive 480px, cerrar sesión.

## Dashboard miembro — Implementado

| Archivo | Contenido |
|---------|-----------|
| pages/dashboard.html | Panel del miembro interno con expedientes, tareas, firma |

Flujo: verificar_sesion → profile + permisos (join PostgREST) → determinar modo vista → cargar expedientes + datos secundarios (Promise.all).

Modos vista:
- gestion_plataforma: todos los perfiles no-miembro activos
- gestion_beneficiarios: beneficiarios + aliados asignados
- gestion_proveedores: contratistas + proveedores asignados
- Sin permisos: mensaje "Contacta al administrador"

Secciones:
1. Header: encabezado-app (logo + "Panel de gestión" + cerrar sesión), info usuario (nombre + badges permisos + link accesos) debajo
2. KPIs: perfiles asignados, tareas activas, docs pendientes revision
3. Expedientes: tabla con nombre, tipo (badge), estado (badge), completitud por capas (C0/F/C1/C2), ultima actividad
4. Tareas recientes: tabla con tipo, perfil, detalle, estado, fecha
5. Modal "Nueva tarea": selector perfil, tipo, detalle, fecha limite, urgencia → INSERT tareas
6. Modal "Solicitar firma": toggle Perfil existente (búsqueda nombre/email/doc + chip selección) | Externo (formulario: tipo persona, nombre, apellido, doc, email, teléfono; si jurídica: empresa, NIT, cargo), programa, C3-C7 obligatorios (C1+C2 disabled checked) → CREATE tarea consentimiento (perfil_id o null + firmante_externo en detalle) + notificar_email con link /firma.html?token={tarea_id}

Caracteristicas: filtrado por permisos + asignaciones, batch query consentimientos para completitud, event delegation, CSP, accesibilidad, responsive 480px.

## Todas las paginas construidas

| Pagina | Archivo | Rol |
|--------|---------|-----|
| Login | pages/login.html | Todos |
| Registro | pages/registro.html | Externos nuevos |
| Firma standalone | pages/firma.html | Link desde email (sin sesion) |
| Mi expediente | pages/mi-expediente.html | Perfiles externos autenticados |
| Dashboard | pages/dashboard.html | Miembros internos |
| Gestion accesos | pages/accesos.html | Miembros con gestion_accesos/plataforma |

Header unificado: todas las páginas usan `.encabezado-app` (logo + título). Páginas con sesión (mi-expediente, dashboard, accesos) incluyen botón "Cerrar sesión". index.html (landing) mantiene su propio diseño.

## Errores resueltos — Login OTP (2026-05-12)

Secuencia de errores durante implementación de verificarOTP → sesión Supabase:

| Error | Causa raíz | Fix |
|-------|-----------|-----|
| Error 25: `[hidden]` override | `.campo-mensaje-error { display: flex }` sobreescribe `hidden` del UA stylesheet | Regla global `[hidden] { display: none !important; }` en componentes.css |
| Error 26: diagnóstico repetido | Re-auditar el mismo problema gasta contexto | Diagnosticar UNA vez, implementar, verificar |
| Error 27: generate_link/verify no retorna tokens | `POST /auth/v1/verify` con `token_hash` no devuelve `access_token` + `refresh_token` como se esperaba | Cambiar a password temporal: `PUT /admin/users/{id}` + `POST /token?grant_type=password` |
| Error 28: GAS ignora Content-Type en headers | En GAS UrlFetchApp, `'Content-Type': 'application/json'` dentro de `headers` puede ser ignorado, defaulting a `x-www-form-urlencoded` | Usar `contentType: 'application/json'` como propiedad top-level (patrón de gas/firma/Supabase.gs) |
| Error 29: auth user creado via SQL malformado | INSERT manual en `auth.users` no incluye todos los campos requeridos por GoAuth (confirmed_at, etc.), causando `500: Database error querying schema` en sign-in | NUNCA insertar manualmente en auth.users/identities — usar Admin API (`POST /admin/users`) que genera usuario con todos los defaults correctos |

**Regla**: los auth users SIEMPRE se crean vía Supabase Auth Admin API (service_role), NUNCA con INSERT SQL directo. GoAuth espera campos internos, triggers y relaciones que el INSERT manual no genera.

## Preguntas arquitectónicas resueltas

1. Sesión Supabase Auth: GAS crea auth user via Edge Function proxy, genera tokens con password temporal + /token, frontend hace setSession()
2. auth_user_id: null hasta primer login post-aprobación
3. GAS API keys: frontend envía JWT de sesión Supabase (no API keys). API keys solo para server-to-server GAS↔GAS
4. referencia-corex.gs: existe en `docs/referencia-corex.gs` como referencia (actualizado: CacheService en vez de ScriptProperties)
5. Monday.com: futuro, no entra en esta fase
6. GAS ↔ Supabase Auth: Edge Function proxy obligatorio porque GAS UrlFetchApp envía User-Agent de browser y Supabase gateway bloquea sb_secret desde browsers. Ver `docs/SUPABASE.md`
