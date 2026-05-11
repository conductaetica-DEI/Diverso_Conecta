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
| Codigo.gs | Router: doPost (firmar, verificarFirma), doGet, respuesta_json |
| Firma.gs | firmar, verificarFirma, verificar_token_otp, validar_firmante, validar_consentimientos |
| Folio.gs | generar_folio (DL-{codigo}-{año}-{secuencial}), generar_hash (SHA-256), bytes_a_hex |
| Pdf.gs | generar_pdf_constancia, construir_encabezado/datos/tabla/evidencia, anexos legales (F-DATO-01, SICE-POL-01), estilos |
| Supabase.gs | insertar_consentimientos, consultar_por_folio, registrar_log, obtener_carpeta_perfil |

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

Pendiente: seed de datos de prueba (002_datos_prueba.sql).

## Documentación actualizada

- ARCHITECTURE.md — verificarOTP retorna access_token + refresh_token + token_verificacion, flujo login con GAS→tokens→setSession, auth_user_id null hasta primer login
- SECURITY.md — flujo auth completo con Auth Admin API, tokens transitorios en tabla de secretos
- SETUP.md — service_role para crear sesiones, eliminada mención de Edge Functions

## Pendiente por construir

| Prioridad | Componente | Archivos |
|-----------|-----------|----------|
| 1 | Seed datos prueba | supabase/migrations/002_datos_prueba.sql |
| 2 | Design system CSS | css/tokens.css, css/componentes.css |
| 3 | Clientes JS | js/config.js, js/supabase-client.js, js/gas-client.js |
| 4 | Login | pages/login.html |
| 5 | Registro | pages/registro.html |
| 6 | Firma standalone | pages/firma.html |
| 7 | Mi expediente | pages/mi-expediente.html |
| 8 | Dashboard | pages/dashboard.html |
| 9 | Gestión accesos | pages/accesos.html |

## Preguntas arquitectónicas resueltas

1. Sesión Supabase Auth: GAS crea auth user y genera tokens con service_role, frontend hace setSession()
2. auth_user_id: null hasta primer login post-aprobación
3. GAS API keys: directo en frontend para esta fase
4. referencia-corex.gs: existe en docs/ como referencia
5. Monday.com: futuro, no entra en esta fase
