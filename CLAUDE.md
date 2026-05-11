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
| BD, auth, roles, integración | — | `docs/ARCHITECTURE.md` |
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
  docs/
    ARCHITECTURE.md         ← schema, roles, permisos, flujos, Drive, servicios GAS
    CONVENTIONS.md          ← nomenclatura, verbos, prefijos, idioma, estructura
    SECURITY.md             ← RLS, auth, firma, validación, CORS, CSP
    DESIGN.md               ← paleta, tipografía, tokens, accesibilidad
    QUALITY.md              ← rendimiento, mantenibilidad, error handling, testing
    SETUP.md                ← configuración manual de Supabase, GAS (clasp), GitHub Pages, DNS
  gas/
    otp/                    ← servicio OTP (Codigo.gs, Auth.gs, Otp.gs, Email.gs)
    firma/                  ← servicio firma electrónica (Codigo.gs, Auth.gs, Firma.gs, Folio.gs, Pdf.gs, Supabase.gs)
    drive/                  ← servicio Drive (Codigo.gs, Auth.gs, Drive.gs, Supabase.gs)
  css/
    tokens.css              ← design system
    componentes.css         ← botones, inputs, cards, badges
  js/
    config.js               ← URLs Supabase + GAS (públicas)
    supabase-client.js      ← init Supabase + auth helpers
    gas-client.js           ← helpers para llamar servicios GAS
    utils.js                ← toasts, mensajes, validación, formato, helpers UI
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
```
