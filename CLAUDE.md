# CLAUDE.md — DiversoLab Members Conecta

## Ciclo obligatorio (aplica a TODA tarea)

1. **AUDITAR** — Lee archivos relevantes, verifica estado actual del código y BD
2. **DIAGNOSTICAR** — Qué hay que hacer, dónde, por qué
3. **PLANIFICAR** — Cambios específicos: qué archivos, qué cambia en cada uno
4. **PEDIR APROBACIÓN** — Mostrar plan al usuario, esperar OK
5. **IMPLEMENTAR** — Solo después de aprobación
6. **VERIFICAR** — Funciona, cumple convenciones, cumple seguridad, cumple calidad

No existe "cambio simple". No saltar pasos.

---

## Qué leer antes de escribir código

| Tarea | Leer SIEMPRE | Leer según contexto |
|-------|-------------|-------------------|
| Cualquier código | `docs/CONVENTIONS.md` + `docs/QUALITY.md` | — |
| BD, auth, roles, integración | — | `docs/ARCHITECTURE.md` + `docs/SUPABASE.md` |
| Auth, datos sensibles, endpoints GAS | — | `docs/SECURITY.md` |
| UI, frontend, HTML, CSS | — | `docs/DESIGN.md` |
| Configuración inicial de servicios | — | `docs/SETUP.md` |

---

## Reglas de oro

- Si no está en los docs, **pregunta**. No inventes.
- Si hay conflicto entre docs y BD real, **la BD gana**.
- Si un patrón ya existe en otro archivo, **cópialo exacto** y solo cambia contenido de dominio.
- Si vas a eliminar código, **grep todos los usos primero**. Si no se pidió quitar, no se toca.
- Si hay discrepancia código vs BD, **confirma dirección del cambio** antes de tocar.

---

## Estructura del proyecto

```
diversolab-app/
  CLAUDE.md                 ← este archivo
  index.html                ← landing page / entry point
  DiversoLab_Logo.gif       ← logo institucional
  referencia-corex.gs       ← referencia GAS (CacheService, no producción)
  docs/
    ARCHITECTURE.md         ← schema, roles, permisos, flujos, Drive, servicios GAS
    CONVENTIONS.md          ← nomenclatura, verbos, prefijos, idioma, estructura
    SECURITY.md             ← RLS, auth, firma, validación, CORS, CSP
    DESIGN.md               ← paleta, tipografía, tokens, accesibilidad
    QUALITY.md              ← rendimiento, mantenibilidad, error handling, testing
    SETUP.md                ← configuración manual de Supabase, GAS (clasp), GitHub Pages, DNS
    SUPABASE.md             ← integración GAS↔Supabase Auth, Edge Function proxy, keys sb_
    STATUS.md               ← estado actual de infraestructura y servicios
    VISTAS-FIRMA.md         ← referencia visual de las 3 vistas de firma
    CLAUDE-ERROR.md         ← registro de errores resueltos (35 errores documentados)
    F-DATO-01_Consentimiento-Integral.md  ← textos aprobados 7 consentimientos
    SICE-POL-01_Politica-Datos.md         ← política protección de datos (39 artículos)
    mockups/                ← mockups HTML de referencia visual
  gas/
    otp/                    ← servicio OTP (Codigo.gs, Auth.gs, Otp.gs, Email.gs, Supabase.gs)
    firma/                  ← servicio firma electrónica (Codigo.gs, Auth.gs, Firma.gs, Folio.gs, Pdf.gs, Supabase.gs)
    drive/                  ← servicio Drive (Codigo.gs, Auth.gs, Drive.gs, Supabase.gs)
  css/
    tokens.css              ← design system
    componentes.css         ← botones, inputs, cards, badges, toggles, búsqueda, chips
  js/
    config.js               ← URLs Supabase + GAS + Doc IDs (públicas)
    supabase-client.js      ← init Supabase + auth helpers
    gas-client.js           ← helpers para llamar servicios GAS
    utils.js                ← toasts, mensajes, validación, formato, helpers UI
    consentimientos.js      ← catálogo F-DATO-01 v1.0 (C1-C7, textos aprobados)
    labels.js               ← constantes LABELS_*, badges, formateo compartido
    otp-ui.js               ← lógica OTP parametrizada (inputs, timer, paste)
    modales.js              ← abrir/cerrar/vincular modales compartido
    dashboard.js            ← lógica panel miembro interno
    accesos.js              ← lógica gestión accesos (admin)
    registro.js             ← lógica auto-registro perfiles externos
  pages/
    login.html              ← inicio de sesión OTP
    registro.html           ← auto-registro perfiles externos
    firma.html              ← página standalone de firma (link desde email)
    mi-expediente.html      ← dashboard perfil externo
    dashboard.html          ← panel miembro interno
    accesos.html            ← gestión accesos (admin)
  supabase/
    migrations/
      001_schema.sql
      002_seed.sql
      003_rls_accesos.sql
      004_nombre_apellido.sql
      005_check_tipo_documento.sql
      006_fix_auth_token_defaults.sql
      007_folios_secuencial.sql
```
