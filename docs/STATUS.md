# Status — DiversoLab Members Conecta

Última actualización: 2026-05-11

---

## Infraestructura conectada

| Servicio | Estado | Detalle |
|----------|--------|---------|
| Supabase | Migrado | Proyecto `nrqmnaktnpcgqrqpoksi`, 7 tablas + RLS, CLI local en `supabase/` |
| GAS OTP | Desplegado | Script `13lSaw-...`, deployment v1.2 funcionando (GET OK) |
| GAS Firma | Desplegado | Script `16yZGc-...`, deployment v1.1 funcionando (GET OK) |
| GAS Drive | Desplegado | Script `1pMbDQ-...`, deployment v1.0 funcionando (GET OK) |

## GAS OTP — Servicio implementado

| Archivo | Contenido |
|---------|-----------|
| appsscript.json | Timezone Bogotá, webapp ANYONE_ANONYMOUS |
| Codigo.gs | Router: doPost, doGet, respuesta_json |
| Otp.gs | solicitarOTP, verificarOTP, verificarTokenVerificacion, generar_token_verificacion |
| Email.gs | enviar_otp_email, notificarEmail, generar_html_otp, escapar_html |

Script Properties configuradas: API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

Pendiente: pruebas con POST real (requiere API_KEY).

## GAS Firma — Servicio implementado

| Archivo | Contenido |
|---------|-----------|
| appsscript.json | Timezone Bogotá, webapp ANYONE_ANONYMOUS |
| Codigo.gs | Router: doPost (firmar, verificarFirma, obtenerDatosFirma), doGet, respuesta_json |
| Firma.gs | firmar, verificarFirma, obtener_datos_firma, verificar_token_otp, validar_firmante, validar_consentimientos |
| Folio.gs | generar_folio (DL-{codigo}-{año}-{secuencial}), generar_hash (SHA-256), bytes_a_hex |
| Pdf.gs | generar_pdf_constancia, construir_encabezado/datos/tabla/evidencia, anexos legales (F-DATO-01, SICE-POL-01), estilos |
| Supabase.gs | insertar_consentimientos, consultar_por_folio, registrar_log, obtener_carpeta_perfil, consultar_tarea_firma, consultar_perfil |

Script Properties configuradas (9):
- API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
| Codigo.gs | Router: doPost (crearCarpeta), doGet, respuesta_json |
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

Seed `002_seed.sql` ejecutado: 8 profiles, 7 permisos, 4 asignaciones, 2 tareas.

## Design system CSS — Implementado

| Archivo | Contenido |
|---------|-----------|
| css/tokens.css | @import Google Fonts, 7 colores base, 6 variantes (color-mix), 6 estados semánticos, 3 fuentes, 7 tamaños, 6 espaciados, 4 radios, 2 sombras, --color-borde-tabla |
| css/componentes.css | body base, botones (primario/secundario/ghost + disabled + loading), inputs/selects (focus/error/válido), cards (4 variantes), badges (4 estados), tabla, modal, toast (éxito/error), stepper, skip link, focus visible global |

Cero colores hardcodeados en componentes. Variantes generadas con color-mix(in srgb).

## Clientes JS — Implementados

| Archivo | Contenido |
|---------|-----------|
| js/config.js | CONFIG con SUPABASE_URL, SUPABASE_ANON_KEY (placeholder), 3 URLs GAS (reales) |
| js/supabase-client.js | iniciar_supabase, obtener_sesion, verificar_sesion, supabase_fetch (retry 401 + refresh), cerrar_sesion |
| js/gas-client.js | gas_fetch, solicitar_otp, verificar_otp, firmar_consentimientos, verificar_firma, obtener_datos_firma, notificar_email, crear_carpeta |
| js/utils.js | mostrar_error/exito (toast), mensaje_usuario (27 códigos), escapar_html, formatear_fecha, deshabilitar/habilitar_boton, validar_email/documento, obtener_ip |

Pendiente: reemplazar SUPABASE_ANON_KEY y GAS_API_KEYS con valores reales.

## Documentación actualizada

- ARCHITECTURE.md — verificarOTP retorna access_token + refresh_token + token_verificacion, flujo login con GAS→tokens→setSession, auth_user_id null hasta primer login
- SECURITY.md — flujo auth completo con Auth Admin API, tokens transitorios en tabla de secretos
- SETUP.md — service_role para crear sesiones, eliminada mención de Edge Functions

## Página firma standalone — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/firma.html | Página standalone de firma de consentimientos (se abre desde link en email, sin sesión Supabase) |

Flujo: carga datos via GAS obtenerDatosFirma → muestra datos firmante + 7 consentimientos F-DATO-01 con textos legales completos siempre visibles → verificación OTP (6 dígitos, auto-advance, reenvío 60s) → firma via GAS → confirmación con folios + link PDF.

Características: stepper 3 pasos, campo cargo dinámico para persona jurídica, obligatorios configurables por analista (C1+C2 siempre + C3-C7 según tarea.detalle), CSP meta tag, accesibilidad (skip link, aria-labels, focus management, keyboard nav), responsive 480px.

## Página registro — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/registro.html | Página de auto-registro para perfiles externos (4 pasos) |

Flujo: selección tipo perfil (4 cards: beneficiario/aliado/contratista/proveedor) → datos básicos (natural vs jurídica dinámico, validación inline blur) → 7 consentimientos F-DATO-01 siempre visibles (C1+C2 obligatorios, C3-C7 voluntarios) → verificación OTP → firma via GAS → perfil INSERT en Supabase (estado pendiente, auth_user_id null) → confirmación con folios.

Características: stepper 4 pasos, campos dinámicos (natural: nombre+documento personal, jurídica: razón social+NIT+representante+cargo), tipos documento CC/CE/NIT/PA/PEP/PPT/TI, detección duplicados (idx_profiles_doc + email_principal), CSP incluye *.supabase.co, accesibilidad (skip link, aria-labels, focus management, keyboard nav), responsive 480px.

## Página login — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/login.html | Inicio de sesión con OTP (2 estados) |

Flujo: email → validar formato → solicitar OTP via GAS (GAS valida perfil: no encontrado/pendiente/suspendido/activo) → 6 dígitos OTP (auto-advance, paste, backspace, Enter) → verificar OTP → setSession(access_token, refresh_token) → query profile_type → redirect (miembro → dashboard, externo → mi-expediente).

Características: tarjeta centrada sobre fondo violeta, verifica sesión existente al cargar (redirect si ya autenticado), timer 60s reenvío, "Usar otro correo" regresa a estado email, validación blur en email, Supabase JS SDK via CDN, CSP (cdn.jsdelivr.net, *.supabase.co, script.google.com), accesibilidad (skip link, aria-labels, focus management, keyboard nav), responsive 480px.

## Página gestión accesos — Implementada

| Archivo | Contenido |
|---------|-----------|
| pages/accesos.html | Panel de gestión con 3 tabs (requiere gestion_accesos o gestion_plataforma) |

Tab 1 — Perfiles pendientes: tabla con nombre/razón, tipo (badge), documento, email, fecha. Botones Aprobar (PATCH activo → GAS Drive crear_carpeta → GAS OTP notificar_email) y Rechazar (PATCH inactivo → notificar_email). GAS calls non-blocking.

Tab 2 — Miembros del equipo: tabla con nombre, email, permisos (badges). Botón "Nuevo miembro" → modal (nombre, email @diversolab.org validado, tipo/número documento, 4 checkboxes permisos). Click fila → modal editar permisos (UPSERT via resolution=merge-duplicates).

Tab 3 — Asignaciones: selector de analista → tabla de perfiles asignados. Botón "Asignar perfil" → modal con selector de perfiles activos no asignados. Botón "Finalizar" por fila (PATCH estado=finalizada + fecha_fin).

Características: verificación permisos al cargar (redirect si no autorizado), tabs ARIA (role=tablist/tab/tabpanel), 3 modales (cerrar con X/ESC/click fuera), event delegation en tablas, Supabase JS SDK via CDN, CSP, responsive 480px.

## Migración 003 — RLS gestion_accesos

Migración `003_rls_accesos.sql` creada (pendiente ejecutar en BD remota):
- profiles SELECT: agregado `tiene_permiso('gestion_accesos')` — necesario para que Tab 1 y Tab 2 de accesos.html funcionen con gestion_accesos
- profiles UPDATE: agregado `tiene_permiso('gestion_accesos')` — necesario para aprobar/rechazar perfiles

Pendiente: ejecutar con `supabase db push` o SQL Editor en dashboard Supabase.

## Pendiente por construir

| Prioridad | Componente | Archivos |
|-----------|-----------|----------|
| 1 | Mi expediente | pages/mi-expediente.html |
| 2 | Dashboard | pages/dashboard.html |

## Preguntas arquitectónicas resueltas

1. Sesión Supabase Auth: GAS crea auth user y genera tokens con service_role, frontend hace setSession()
2. auth_user_id: null hasta primer login post-aprobación
3. GAS API keys: directo en frontend para esta fase
4. referencia-corex.gs: existe en docs/ como referencia
5. Monday.com: futuro, no entra en esta fase
