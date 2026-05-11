# Status — DiversoLab Members Conecta

Última actualización: 2026-05-11

---

## Infraestructura conectada

| Servicio | Estado | Detalle |
|----------|--------|---------|
| Supabase | Vinculado | Proyecto `nrqmnaktnpcgqrqpoksi`, BD vacía, CLI local en `supabase/` |
| GAS OTP | Desplegado | Script `13lSaw-...`, deployment v1.2 funcionando (GET OK) |
| GAS Firma | Conectado | Script `16yZGc-...`, vacío (Codigo.gs placeholder) |
| GAS Drive | Conectado | Script `1pMbDQ-...`, vacío (Codigo.gs placeholder) |

## GAS OTP — Servicio implementado

| Archivo | Contenido |
|---------|-----------|
| appsscript.json | Timezone Bogotá, webapp ANYONE_ANONYMOUS |
| Codigo.gs | Router: doPost, doGet, respuesta_json |
| Otp.gs | solicitarOTP, verificarOTP, verificarTokenVerificacion, generar_token_verificacion |
| Email.gs | enviar_otp_email, notificarEmail, generar_html_otp, escapar_html |

Script Properties configuradas: API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

Pendiente: pruebas con POST real (requiere API_KEY).

## Documentación actualizada

- ARCHITECTURE.md — verificarOTP retorna access_token + refresh_token + token_verificacion, flujo login con GAS→tokens→setSession, auth_user_id null hasta primer login
- SECURITY.md — flujo auth completo con Auth Admin API, tokens transitorios en tabla de secretos
- SETUP.md — service_role para crear sesiones, eliminada mención de Edge Functions

## Pendiente por construir

| Prioridad | Componente | Archivos |
|-----------|-----------|----------|
| 1 | Migración SQL | supabase/migrations/001_schema.sql (7 tablas + funciones RLS + políticas) |
| 2 | GAS Firma | gas/firma/Codigo.gs, Firma.gs, Pdf.gs |
| 3 | GAS Drive | gas/drive/Codigo.gs, Drive.gs |
| 4 | Design system CSS | css/tokens.css, css/componentes.css |
| 5 | Clientes JS | js/config.js, js/supabase-client.js, js/gas-client.js |
| 6 | Login | pages/login.html |
| 7 | Registro | pages/registro.html |
| 8 | Firma standalone | pages/firma.html |
| 9 | Mi expediente | pages/mi-expediente.html |
| 10 | Dashboard | pages/dashboard.html |
| 11 | Gestión accesos | pages/accesos.html |

## Preguntas arquitectónicas resueltas

1. Sesión Supabase Auth: GAS crea auth user y genera tokens con service_role, frontend hace setSession()
2. auth_user_id: null hasta primer login post-aprobación
3. GAS API keys: directo en frontend para esta fase
4. referencia-corex.gs: existe en docs/ como referencia
5. Monday.com: futuro, no entra en esta fase
