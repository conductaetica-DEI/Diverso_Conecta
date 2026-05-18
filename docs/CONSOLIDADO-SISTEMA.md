# CONSOLIDADO-SISTEMA.md — DiversoLab Members Conecta

> Documento de referencia integral: mockups, pipelines de datos, pipelines UI,
> arquitectura de servicios, schema BD y modelo de seguridad.
>
> Generado: 2026-05-18 | Versión: 1.0

---

## Tabla de contenido

1. [Vision general](#1-vision-general)
2. [Mockup — Login + OTP](#2-mockup--login--otp)
3. [Mockup — Registro (3 pasos)](#3-mockup--registro-3-pasos)
4. [Mockup — Firma standalone](#4-mockup--firma-standalone)
5. [Mockup — Mi Expediente (externo)](#5-mockup--mi-expediente-externo)
6. [Mockup — Dashboard analista](#6-mockup--dashboard-analista)
7. [Mockup — Accesos (admin)](#7-mockup--accesos-admin)
8. [Pipeline: Registro E2E](#8-pipeline-registro-e2e)
9. [Pipeline: Login E2E](#9-pipeline-login-e2e)
10. [Pipeline: Solicitar firma (analista)](#10-pipeline-solicitar-firma-analista)
11. [Pipeline: Aprobacion accesos](#11-pipeline-aprobacion-accesos)
12. [Componentes UI](#12-componentes-ui)
13. [Schema BD](#13-schema-bd)
14. [Servicios GAS](#14-servicios-gas)
15. [Modelo de seguridad](#15-modelo-de-seguridad)
16. [Estado actual](#16-estado-actual)

---

## 1. Vision general

### Stack

```
+-----------------------+       +------------------------+       +-------------------+
|   GitHub Pages        |       |   Supabase             |       |   Google Apps     |
|   (app.diversolab.org)|       |   (PostgreSQL + Auth)  |       |   Script (GAS)    |
|                       | fetch |                        | Edge  |                   |
|   HTML/CSS/JS static  |------>|   RLS + JWT            |<----->|   OTP service     |
|   CSP headers         |       |   Edge Fn otp-admin    |       |   Firma service   |
|   Zero inline JS      |       |   Edge Fn db-admin     |       |   Drive service   |
+-----------------------+       +------------------------+       +-------------------+
                                         |                              |
                                         v                              v
                                  +-------------+               +---------------+
                                  | 8 tablas    |               | Google Drive  |
                                  | 7 migrations|               | expedientes/  |
                                  | 24 RLS pol. |               | PDFs firma    |
                                  +-------------+               +---------------+
```

### Paginas (6)

| Pagina | Ruta | Rol | Funcion |
|--------|------|-----|---------|
| Landing | `/index.html` | Publico | Entrada, links login/registro |
| Login | `/pages/login.html` | Publico | OTP email → session |
| Registro | `/pages/registro.html` | Publico | Auto-registro perfil externo |
| Firma | `/pages/firma.html` | Publico (token) | Firma consentimientos standalone |
| Mi Expediente | `/pages/mi-expediente.html` | Externo autenticado | Dashboard perfil externo |
| Dashboard | `/pages/dashboard.html` | Miembro autenticado | Panel gestion interno |
| Accesos | `/pages/accesos.html` | Admin (gestion_accesos) | Gestion miembros y perfiles |

### Servicios GAS (3)

| Servicio | Version | Acciones |
|----------|---------|----------|
| OTP | v1.21 @24 | solicitarOTP, verificarOTP, verificarTokenVerificacion, notificarEmail |
| Firma | v1.7 @10 | firmar, verificarFirma, obtenerDatosFirma |
| Drive | v1.0 | crearCarpeta |

---

## 2. Mockup — Login + OTP

### Layout

```
+----------------------------------------------------------+
| [Logo DiversoLab]        Iniciar sesion                   |
+----------------------------------------------------------+
|                                                          |
|   +--------------------------------------------------+   |
|   |              ESTADO 1: EMAIL                      |   |
|   |                                                  |   |
|   |   Correo electronico                             |   |
|   |   +------------------------------------------+   |   |
|   |   | usuario@ejemplo.com                      |   |   |
|   |   +------------------------------------------+   |   |
|   |   (validacion en blur: campo-error/campo-valido) |   |
|   |                                                  |   |
|   |   [====== Enviar codigo ======]  btn-primario    |   |
|   |                                                  |   |
|   |   No tienes cuenta? Registrate →                 |   |
|   +--------------------------------------------------+   |
|                                                          |
|   +--------------------------------------------------+   |
|   |              ESTADO 2: OTP                        |   |
|   |   (hidden hasta envio exitoso)                   |   |
|   |                                                  |   |
|   |   Enviamos un codigo a:                          |   |
|   |   usuario@ejemplo.com                            |   |
|   |                                                  |   |
|   |   +----+ +----+ +----+ +----+ +----+ +----+     |   |
|   |   | 4  | | 7  | | 2  | | 9  | | 1  | | 5  |    |   |
|   |   +----+ +----+ +----+ +----+ +----+ +----+     |   |
|   |   .otp-digito (auto-advance, paste, backspace)   |   |
|   |                                                  |   |
|   |   Codigo valido por 00:47  .otp-temporizador     |   |
|   |                                                  |   |
|   |   [====== Verificar ======]  (disabled < 6 dig)  |   |
|   |                                                  |   |
|   |   [Reenviar codigo]  (visible cuando timer = 0)  |   |
|   |   [Usar otro correo] → vuelve a Estado 1         |   |
|   +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
| Footer: Politica de datos                                 |
+----------------------------------------------------------+
```

### Estados de input OTP

```
Vacio:        [ ] [ ] [ ] [ ] [ ] [ ]   btn disabled
Parcial:      [4] [7] [2] [ ] [ ] [ ]   btn disabled
Completo:     [4] [7] [2] [9] [1] [5]   btn enabled (sol bg)
Verificando:  [4] [7] [2] [9] [1] [5]   btn "Verificando..." (spinner)
Error:        [4] [7] [2] [9] [1] [5]   toast error + limpiar inputs
```

### Interacciones

- **Enter** en campo email → submit
- **Digito** → auto-avanza al siguiente input
- **Backspace** → retrocede + limpia
- **Paste** 6 digitos → distribuye en los 6 campos
- **Timer**: 60s countdown, oculta btn-reenviar durante cuenta
- **Reenviar**: visible cuando timer=0, reinicia ciclo OTP

---

## 3. Mockup — Registro (3 pasos)

### Stepper

```
   ( 1 )----( 2 )----( 3 )
   Tipo     Datos    Firma
   
   Activo:    .paso-activo   (sol bg, violeta texto)
   Completo:  .paso-completo (aqua bg, check)
   Pendiente: .paso          (lavanda bg, gris)
```

### Paso 1 — Tipo de perfil

```
+----------------------------------------------------------+
|   Selecciona tu tipo de perfil                            |
|                                                          |
|   +------------+  +------------+  +------------+  +-----+|
|   | Benefi-    |  | Aliado     |  | Contra-    |  |Prov-||
|   | ciario     |  |            |  | tista      |  |eed- ||
|   |            |  |            |  |            |  |or   ||
|   | Persona    |  | Persona    |  | Persona    |  |Pers.||
|   | natural    |  | juridica   |  | natural    |  |jur. ||
|   +------------+  +------------+  +------------+  +-----+|
|                                                          |
|   Seleccion: .tipo-card.seleccionado (borde sol 3px)     |
|                                                          |
|   [Continuar]  (disabled hasta seleccion)                 |
+----------------------------------------------------------+
```

### Paso 2 — Datos basicos

```
+----------------------------------------------------------+
|   PERSONA NATURAL (beneficiario/contratista)              |
|   +------------------------+ +------------------------+   |
|   | Nombre*                | | Apellido*              |   |
|   +------------------------+ +------------------------+   |
|   +------------------------+ +------------------------+   |
|   | Tipo documento* [CC v]  | | Numero documento*      |   |
|   +------------------------+ +------------------------+   |
|   +------------------------+ +------------------------+   |
|   | Email*                 | | Telefono (+57)*         |   |
|   +------------------------+ +------------------------+   |
|                                                          |
|   PERSONA JURIDICA (aliado/proveedor)                     |
|   +------------------------+ +------------------------+   |
|   | Razon social*          | | NIT*                   |   |
|   +------------------------+ +------------------------+   |
|   +------------------------+ +------------------------+   |
|   | Email contacto*        | | Telefono (+57)*         |   |
|   +------------------------+ +------------------------+   |
|   --- Datos del firmante ---                              |
|   +------------------------+ +------------------------+   |
|   | Nombre firmante*       | | Apellido firmante*     |   |
|   +------------------------+ +------------------------+   |
|   +------------------------+                              |
|   | Cargo*                 |                              |
|   +------------------------+                              |
|   +------------------------+ +------------------------+   |
|   | Tipo documento* [CC v]  | | Numero documento*      |   |
|   +------------------------+ +------------------------+   |
|                                                          |
|   [Volver]                        [Continuar]             |
+----------------------------------------------------------+

Validacion por campo (blur):
  campo-error:  borde coral + mensaje debajo
  campo-valido: borde aqua
  Email: regex
  Documento: segun tipo (CC 5-15 dig, NIT 6-12, PA alfanum)
  Telefono: >= 7 chars
```

### Paso 3 — Consentimiento y firma

```
+----------------------------------------------------------+
|   RESUMEN FIRMANTE (tarjeta read-only)                    |
|   +------------------------------------------------------+|
|   | Juan Perez | CC 1234567890 | juan@email.com          ||
|   +------------------------------------------------------+|
|                                                          |
|   DOCUMENTOS LEGALES                                      |
|   +------------------------------------------------------+|
|   | SICE-POL-01 Politica de Datos  [Ver completo →]      ||
|   | [======================== iframe ==================] ||
|   +------------------------------------------------------+|
|   +------------------------------------------------------+|
|   | F-DATO-01 Consentimiento       [Ver completo →]      ||
|   | [======================== iframe ==================] ||
|   +------------------------------------------------------+|
|                                                          |
|   CONSENTIMIENTOS (7)                                     |
|   +------------------------------------------------------+|
|   | [x] C1 - Datos basicos (OBLIGATORIO)          Art.12 ||
|   |     > texto_obligatorio expandible                   ||
|   | [x] C2 - Identificacion (OBLIGATORIO)         Art.13 ||
|   |     > texto_obligatorio expandible                   ||
|   | [ ] C3 - Datos sensibles (voluntario)         Art.14 ||
|   |     > texto_voluntario expandible                    ||
|   | [ ] C4 - Analitica/IA (voluntario)            Art.15 ||
|   | [ ] C5 - Comunicaciones (voluntario)          Art.16 ||
|   | [ ] C6 - Imagen/voz (voluntario)              Art.17 ||
|   | [ ] C7 - Seguimiento (voluntario)             Art.18 ||
|   +------------------------------------------------------+|
|                                                          |
|   [Enviar codigo de verificacion]                         |
|   (requiere C1+C2 marcados)                               |
|                                                          |
|   --- OTP inline (misma pagina) ---                       |
|   +----+ +----+ +----+ +----+ +----+ +----+              |
|   |    | |    | |    | |    | |    | |    |               |
|   +----+ +----+ +----+ +----+ +----+ +----+              |
|   [Firmar]  (completa registro + firma atomica)           |
|                                                          |
|   --- CONFIRMACION (reemplaza formulario) ---             |
|   +------------------------------------------------------+|
|   |  [check] Registro exitoso                            ||
|   |                                                      ||
|   |  Codigo | Decision  | Folio           | Hash SHA-256 ||
|   |  -------|-----------|-----------------|------------- ||
|   |  C1     | ACEPTADO  | DL-C1-2026-0001| a3f2b9c...  ||
|   |  C2     | ACEPTADO  | DL-C2-2026-0001| 7d1e4a8...  ||
|   |  C3     | RECHAZADO | DL-C3-2026-0001| b8c3f1d...  ||
|   |  ...    |           |                 |             ||
|   |                                                      ||
|   |  IP: 190.25.xxx.xxx                                  ||
|   |  Fecha: 18/05/2026, 3:45:22 p.m.                    ||
|   |  Confirmacion enviada a: juan@email.com              ||
|   +------------------------------------------------------+|
+----------------------------------------------------------+
```

---

## 4. Mockup — Firma standalone

Acceso: `firma.html?token={tarea_id}` (link desde email)

### Estados de carga

```
CARGANDO:
+----------------------------------------------------------+
|   [spinner]                                               |
|   Cargando datos de firma...                              |
+----------------------------------------------------------+

ERROR:
+----------------------------------------------------------+
|   [!] No se pudieron cargar los datos                     |
|   Contacto: info@diversolab.org                           |
+----------------------------------------------------------+
```

### Contenido principal

```
+----------------------------------------------------------+
| [Logo]              Firma electronica                     |
+----------------------------------------------------------+
|                                                          |
|   DATOS DEL FIRMANTE (read-only, desde GAS)               |
|   +------------------------------------------------------+|
|   | PERSONA NATURAL                                      ||
|   | Nombre: Juan Perez                                   ||
|   | Documento: CC 1234567890                             ||
|   | Email: juan@email.com                                ||
|   | Telefono: +57 3001234567                             ||
|   +------------------------------------------------------+|
|                              O                            |
|   +------------------------------------------------------+|
|   | PERSONA JURIDICA                                     ||
|   | Empresa: Acme SAS | NIT: 900123456-7                ||
|   | Firmante: Maria Lopez | Cargo: [______] (editable)  ||
|   | Documento: CC 9876543210                             ||
|   | Email: maria@acme.com                                ||
|   +------------------------------------------------------+|
|                                                          |
|   Programa: Programa de Cualificacion Laboral             |
|   Solicitado por: ana.garcia@diversolab.org               |
|                                                          |
|   --- Documentos legales (iframes) ---                    |
|   --- 7 Consentimientos (C1-C7) ---                       |
|   (obligatorios segun tarea.detalle.obligatorios[])       |
|                                                          |
|   Fecha/hora COT: 18/05/2026, 3:45:22 p.m. (reloj vivo) |
|                                                          |
|   [Enviar codigo]                                         |
|   [OTP 6 digitos] → [Firmar]                              |
|                                                          |
|   --- CONFIRMACION ---                                    |
|   Tabla resumen (codigo/decision/folio/hash)              |
|   PDF enviado por email                                   |
+----------------------------------------------------------+
```

### Dual-path de datos

```
obtenerDatosFirma(token = tarea_id):

  tarea.perfil_id != null?
    SI  → fetch profile → firmante = {nombre, doc, email, ...}
    NO  → parse tarea.detalle.firmante_externo → firmante = {...}

  return { tarea_id, perfil_id, tipo_firma, firmante, programa, obligatorios[] }
```

---

## 5. Mockup — Mi Expediente (externo)

```
+----------------------------------------------------------+
| [Logo]        Mi expediente         [Cerrar sesion]       |
+----------------------------------------------------------+
|                                                          |
|   PERFIL                                                  |
|   +------------------------------------------------------+|
|   | Juan Perez                                           ||
|   | [beneficiario] [activo]    ← badges                  ||
|   | Email: juan@email.com                                ||
|   | CC 1234567890 | +57 3001234567                       ||
|   +------------------------------------------------------+|
|                                                          |
|   TAREAS PENDIENTES                                       |
|   +------------------------------------------------------+|
|   | .tarea-item                                          ||
|   | Firmar consentimiento                                ||
|   | Programa de Cualificacion Laboral                    ||
|   | Solicitado: 15/05/2026         [!urgente]            ||
|   |                          [Firmar →] btn-accion-firmar||
|   +------------------------------------------------------+|
|   | .tarea-item                                          ||
|   | Subir documento                                      ||
|   | Cedula de ciudadania (frente)                        ||
|   | Fecha limite: 20/05/2026                             ||
|   +------------------------------------------------------+|
|   | (vacio): "No tienes tareas pendientes"               ||
|   +------------------------------------------------------+|
|                                                          |
|   DOCUMENTOS                                              |
|   +------------------------------------------------------+|
|   | Tipo documento  | Categoria | Estado    | Fecha      ||
|   |-----------------|-----------|-----------|------------ ||
|   | Cedula frente   | kyc       | aprobado  | 10/05/2026 ||
|   | Cedula reverso  | kyc       | pendiente | —          ||
|   +------------------------------------------------------+|
|                                                          |
|   CONSENTIMIENTOS FIRMADOS                                |
|   +------------------------------------------------------+|
|   | Codigo | Fecha      | Folio                          ||
|   |--------|------------|--------------------------------||
|   | C1     | 01/05/2026 | DL-C1-2026-0001               ||
|   | C2     | 01/05/2026 | DL-C2-2026-0001               ||
|   +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
```

---

## 6. Mockup — Dashboard analista

```
+----------------------------------------------------------+
| [Logo]     Panel de gestion          [Cerrar sesion]      |
+----------------------------------------------------------+
| Hola, Ana Garcia                                          |
| [gestion_beneficiarios] [gestion_proveedores]  ← badges  |
| [Ir a Accesos →]  (solo si gestion_accesos)               |
+----------------------------------------------------------+
|                                                          |
|   KPIs                                                    |
|   +----------------+ +----------------+ +----------------+|
|   | Perfiles       | | Tareas         | | Docs           ||
|   | asignados      | | activas        | | pendientes     ||
|   |     12         | |      5         | |      7         ||
|   +----------------+ +----------------+ +----------------+|
|                                                          |
|   EXPEDIENTES            [Solicitar firma] [Nueva tarea]  |
|   +------------------------------------------------------+|
|   | Nombre         | Tipo        | Estado    | Docs  | > ||
|   |----------------|-------------|-----------|-------|---||
|   | Juan Perez     | benefic.    | activo    |  2    | > ||
|   | Acme SAS       | proveedor   | pendiente |  0    | > ||
|   | Maria Lopez    | contratista | activo    |  5    | > ||
|   +------------------------------------------------------+|
|                                                          |
|   TAREAS RECIENTES                                        |
|   +------------------------------------------------------+|
|   | Completar KYC — Juan Perez      [en_curso] 20/05     ||
|   | Firmar consent — Acme SAS       [pendiente] 18/05    ||
|   | Revision docs — Maria Lopez     [completada] 15/05   ||
|   +------------------------------------------------------+|
+----------------------------------------------------------+

MODAL: NUEVA TAREA
+----------------------------------------------+
|  Nueva tarea                           [X]   |
|                                              |
|  Buscar perfil:                              |
|  +------------------------------------------+|
|  | [Juan Perez x]  ← chip seleccionado      ||
|  +------------------------------------------+|
|  Dropdown (max 5 resultados, 200ms debounce) |
|                                              |
|  Tipo de tarea:  [documento v]               |
|  Detalle:        [________________]          |
|  Fecha limite:   [2026-05-25]                |
|  [ ] Urgente                                 |
|                                              |
|  [Cancelar]              [Crear tarea]       |
+----------------------------------------------+

MODAL: SOLICITAR FIRMA
+----------------------------------------------+
|  Solicitar firma                       [X]   |
|                                              |
|  [Perfil existente] | [Externo]  ← toggle   |
|                                              |
|  --- Si existente: ---                       |
|  Buscar perfil: [_______] → chip             |
|                                              |
|  --- Si externo: ---                         |
|  Tipo persona: [natural v]                   |
|  +------------------------------------------+|
|  | Nombre*      | Apellido*                  ||
|  | Tipo doc*    | Numero*                    ||
|  | Email*       | Telefono                   ||
|  +------------------------------------------+|
|  (si juridica: + Razon social, NIT, Cargo)   |
|                                              |
|  Programa*: [Programa de Cualificacion]      |
|                                              |
|  Consentimientos obligatorios:               |
|  [x] C1 (siempre)  [x] C2 (siempre)         |
|  [ ] C3  [ ] C4  [ ] C5  [ ] C6  [ ] C7     |
|                                              |
|  [Cancelar]         [Enviar solicitud]       |
+----------------------------------------------+
```

---

## 7. Mockup — Accesos (admin)

```
+----------------------------------------------------------+
| [Logo]     Gestion de accesos        [Cerrar sesion]      |
+----------------------------------------------------------+
| [Pendientes] [Miembros] [Asignaciones]    [← Dashboard]  |
+----------------------------------------------------------+

TAB 1: PENDIENTES
+----------------------------------------------------------+
| Nombre         | Tipo        | Email           | Accion  |
|----------------|-------------|-----------------|---------|
| Carlos Ruiz    | benefic.    | carlos@mail.com | [v] [x] |
| Tech SAS       | proveedor   | tech@sas.com    | [v] [x] |
+----------------------------------------------------------+
  [v] = Aprobar (PATCH activo + crear carpeta Drive + email)
  [x] = Rechazar (PATCH inactivo + email rechazo)

TAB 2: MIEMBROS
+----------------------------------------------------------+
| [+ Nuevo miembro]                                         |
|                                                          |
| Nombre         | Email                | Permisos  | >    |
|----------------|----------------------|-----------|------|
| Ana Garcia     | ana@diversolab.org   | [3 badges]| edit |
| Pedro Diaz     | pedro@diversolab.org | [2 badges]| edit |
+----------------------------------------------------------+

MODAL: NUEVO MIEMBRO
+----------------------------------------------+
|  Crear miembro                         [X]   |
|  Nombre*       | Apellido*                   |
|  Email* (@diversolab.org obligatorio)         |
|  Tipo doc*     | Numero*                     |
|                                              |
|  Permisos:                                   |
|  [ ] gestion_beneficiarios                   |
|  [ ] gestion_proveedores                     |
|  [ ] gestion_accesos                         |
|  [ ] gestion_plataforma                      |
|                                              |
|  [Cancelar]             [Crear miembro]      |
+----------------------------------------------+

TAB 3: ASIGNACIONES
+----------------------------------------------------------+
| Analista: [Ana Garcia v]       [+ Asignar perfil]        |
|                                                          |
| Perfil asignado  | Tipo     | Estado     | Desde  | Fin |
|------------------|----------|------------|--------|-----|
| Juan Perez       | benefic. | activa     | 01/05  | —   |
| Maria Lopez      | contrat. | finalizada | 10/04  | 15/05|
+----------------------------------------------------------+
```

---

## 8. Pipeline: Registro E2E

```
USUARIO                   FRONTEND                GAS OTP              SUPABASE             GAS FIRMA            DRIVE
  |                         |                       |                    |                     |                   |
  |  1. Selecciona tipo     |                       |                    |                     |                   |
  |  2. Llena datos         |                       |                    |                     |                   |
  |  3. Marca C1+C2         |                       |                    |                     |                   |
  |  4. Click "Enviar cod"  |                       |                    |                     |                   |
  |------------------------>|                       |                    |                     |                   |
  |                         | solicitar_otp(email)  |                    |                     |                   |
  |                         |---------------------->|                    |                     |                   |
  |                         |                       | gen 6-dig          |                     |                   |
  |                         |                       | cache 10min        |                     |                   |
  |                         |                       | send Gmail ------->| (no DB write)       |                   |
  |                         |                       |                    |                     |                   |
  |  5. Ingresa OTP         |                       |                    |                     |                   |
  |------------------------>|                       |                    |                     |                   |
  |                         | verificar_otp(email,  |                    |                     |                   |
  |                         |   codigo)             |                    |                     |                   |
  |                         |---------------------->|                    |                     |                   |
  |                         |                       | verify code        |                     |                   |
  |                         |                       | call Edge Fn ----->| crear_usuario       |                   |
  |                         |                       |                    | set_password        |                   |
  |                         |                       |                    | vincular_perfil     |                   |
  |                         |                       | /token password -->| access_token        |                   |
  |                         |                       | gen token_verif    |                     |                   |
  |                         |<--- {access_token,    |                    |                     |                   |
  |                         |      refresh_token,   |                    |                     |                   |
  |                         |      token_verif} ----|                    |                     |                   |
  |                         |                       |                    |                     |                   |
  |                         | POST /profiles ------>|                    |                     |                   |
  |                         | (access_token header) | INSERT profile     |                     |                   |
  |                         |                       | estado=pendiente   |                     |                   |
  |                         |                       | auth_user_id=null  |                     |                   |
  |                         |                       |                    |                     |                   |
  |                         | firmar_consentimientos|                    |                     |                   |
  |                         | (token_verif, email,  |                    |                     |                   |
  |                         |  tipo_firma, firmante,|                    |                     |                   |
  |                         |  consentimientos[],   |                    |                     |                   |
  |                         |  perfil_id, ip, ua)   |                    |                     |                   |
  |                         |----------------------------------------------->|                   |
  |                         |                       |                    |    |                  |
  |                         |                       |                    | verificar token_verif|
  |                         |                       |<----------------------------------|       |
  |                         |                       | ok                 |    |                  |
  |                         |                       |                    | validar firmante     |
  |                         |                       |                    | validar C1+C2 acepta |
  |                         |                       |                    |    |                  |
  |                         |                       |                    | siguiente_folio() x7 |
  |                         |                       |                    |<---|                  |
  |                         |                       |                    | INSERT consent x7    |
  |                         |                       |                    |<---|                  |
  |                         |                       |                    |    |                  |
  |                         |                       |                    | generar PDF template |
  |                         |                       |                    |    |----------------->|
  |                         |                       |                    |    | upload PDF Drive |
  |                         |                       |                    |    |                  |
  |                         |                       |                    | send email + PDF adj |
  |                         |                       |                    |    |                  |
  |                         |<--- {folios[], pdf_url, resumen[]} -----------|                   |
  |                         |                       |                    |                     |
  |  6. Ve confirmacion     |                       |                    |                     |
  |  (tabla folios/hash)    |                       |                    |                     |
  |<------------------------|                       |                    |                     |

Estado final:
  - profiles: 1 row (estado=pendiente, auth_user_id=null)
  - consentimientos: 7 rows (inmutables, con folio y hash)
  - PDF en Drive (carpeta_firmas fallback)
  - Email de confirmacion enviado
```

---

## 9. Pipeline: Login E2E

```
USUARIO              FRONTEND              GAS OTP           EDGE FN           SUPABASE
  |                    |                     |                  |                  |
  | email              |                     |                  |                  |
  |------------------>|                     |                  |                  |
  |                    | solicitar_otp       |                  |                  |
  |                    | (email)             |                  |                  |
  |                    |------------------->|                  |                  |
  |                    |                     | check rate limit |                  |
  |                    |                     | (20/10min)       |                  |
  |                    |                     | gen 6-dig code   |                  |
  |                    |                     | cache 10min      |                  |
  |                    |                     | send Gmail       |                  |
  |                    |<-- {ok: true} ------|                  |                  |
  |                    |                     |                  |                  |
  |  OTP 6 digitos     |                     |                  |                  |
  |------------------>|                     |                  |                  |
  |                    | verificar_otp       |                  |                  |
  |                    | (email, codigo)     |                  |                  |
  |                    |------------------->|                  |                  |
  |                    |                     | verify (max 5)   |                  |
  |                    |                     |                  |                  |
  |                    |                     | crear_usuario -->|                  |
  |                    |                     |                  | upsert auth.users|
  |                    |                     |                  |---------------->|
  |                    |                     |                  |<-- auth_user_id |
  |                    |                     |                  |                  |
  |                    |                     | set_password --->|                  |
  |                    |                     |                  | update password  |
  |                    |                     |                  |---------------->|
  |                    |                     |                  |                  |
  |                    |                     | vincular_perfil->|                  |
  |                    |                     |                  | UPDATE profiles  |
  |                    |                     |                  | SET auth_user_id |
  |                    |                     |                  |---------------->|
  |                    |                     |                  |                  |
  |                    |                     | POST /token      |                  |
  |                    |                     | grant=password   |                  |
  |                    |                     | (publishable key)|                  |
  |                    |                     |----------------->| authenticate     |
  |                    |                     |<-- access_token  |                  |
  |                    |                     |    refresh_token |                  |
  |                    |                     |                  |                  |
  |                    |<-- {access_token,   |                  |                  |
  |                    |     refresh_token}  |                  |                  |
  |                    |                     |                  |                  |
  |                    | setSession(tokens)  |                  |                  |
  |                    |                     |                  |                  |
  |                    | fetch profile       |                  |                  |
  |                    | (auth_user_id)      |                  |                  |
  |                    |-------------------------------------------------->|
  |                    |<-- {profile_type}  --------------------------------|
  |                    |                     |                  |                  |
  |                    | redirect:           |                  |                  |
  |                    |   miembro →         |                  |                  |
  |                    |     dashboard.html  |                  |                  |
  |                    |   externo →         |                  |                  |
  |                    |     mi-expediente   |                  |                  |
  |<-- pagina cargada -|                     |                  |                  |
```

---

## 10. Pipeline: Solicitar firma (analista)

```
ANALISTA          DASHBOARD           SUPABASE          GAS OTP           FIRMANTE           GAS FIRMA
  |                 |                    |                 |                  |                   |
  | Click "Solicitar|                    |                 |                  |                   |
  | firma" modal    |                    |                 |                  |                   |
  |---------------->|                    |                 |                  |                   |
  |                 |                    |                 |                  |                   |
  | Toggle: perfil  |                    |                 |                  |                   |
  | existente O     |                    |                 |                  |                   |
  | externo         |                    |                 |                  |                   |
  |                 |                    |                 |                  |                   |
  | Selecciona C3-C7|                    |                 |                  |                   |
  | obligatorios    |                    |                 |                  |                   |
  | + programa      |                    |                 |                  |                   |
  |                 |                    |                 |                  |                   |
  | Click "Enviar"  |                    |                 |                  |                   |
  |---------------->|                    |                 |                  |                   |
  |                 | POST /tareas       |                 |                  |                   |
  |                 | tipo=consentimiento|                 |                  |                   |
  |                 | detalle={programa, |                 |                  |                   |
  |                 |  obligatorios[],   |                 |                  |                   |
  |                 |  firmante_externo?}|                 |                  |                   |
  |                 |------------------->|                 |                  |                   |
  |                 |<-- tarea_id -------|                 |                  |                   |
  |                 |                    |                 |                  |                   |
  |                 | notificar_email    |                 |                  |                   |
  |                 | (email, asunto,    |                 |                  |                   |
  |                 |  link firma.html   |                 |                  |                   |
  |                 |  ?token=tarea_id)  |                 |                  |                   |
  |                 |----------------------------------->|                  |                   |
  |                 |                    |                 | send email ----->|                   |
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |                  | Abre link email   |
  |                 |                    |                 |                  | firma.html?token= |
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |  obtenerDatos    |                   |
  |                 |                    |                 |  Firma(token) <--|                   |
  |                 |                    |                 |                  |                   |
  |                 |                    |<-- query tarea--|                  |                   |
  |                 |                    |-- tarea data -->|                  |                   |
  |                 |                    |                 |                  |                   |
  |                 |                    |                 | {firmante,       |                   |
  |                 |                    |                 |  obligatorios[], |                   |
  |                 |                    |                 |  programa}  ---->|                   |
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |                  | Marca C1-C7       |
  |                 |                    |                 |                  | Enviar codigo     |
  |                 |                    |                 |                  |------------------>|
  |                 |                    |                 |<-- solicitar_otp |                   |
  |                 |                    |                 | send code email  |                   |
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |                  | Ingresa OTP       |
  |                 |                    |                 |<-- verificar_otp |                   |
  |                 |                    |                 |-- token_verif -->|                   |
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |                  | firmar_consenti-  |
  |                 |                    |                 |                  | mientos(token,    |
  |                 |                    |                 |                  |  email, firmante, |
  |                 |                    |                 |                  |  consent[], ip,   |
  |                 |                    |                 |                  |  tarea_id) ------>|
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |                  |               validar
  |                 |                    |                 |                  |               folio x7
  |                 |                    |<---------------------------------------------- INSERT x7
  |                 |                    |                 |                  |               PDF
  |                 |                    |                 |                  |               email
  |                 |                    |<---------------------------------------------- completar_tarea
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |                  |<-- {folios,       |
  |                 |                    |                 |                  |     resumen[]}    |
  |                 |                    |                 |                  |                   |
  |                 |                    |                 |                  | Ve confirmacion   |
```

---

## 11. Pipeline: Aprobacion accesos

```
ADMIN             ACCESOS              SUPABASE           GAS DRIVE          GAS OTP (email)
  |                 |                    |                   |                   |
  | Tab Pendientes  |                    |                   |                   |
  |---------------->|                    |                   |                   |
  |                 | GET /profiles      |                   |                   |
  |                 | ?estado=pendiente  |                   |                   |
  |                 |------------------->|                   |                   |
  |                 |<-- [{perfiles}] ---|                   |                   |
  |                 |                    |                   |                   |
  | Click APROBAR   |                    |                   |                   |
  |---------------->|                    |                   |                   |
  |                 | PATCH /profiles/id |                   |                   |
  |                 | estado=activo      |                   |                   |
  |                 |------------------->|                   |                   |
  |                 |<-- ok -------------|                   |                   |
  |                 |                    |                   |                   |
  |                 | crear_carpeta      |                   |                   |
  |                 | (profile_id, type, |                   |                   |
  |                 |  nombre)           |                   |                   |
  |                 |---------------------------------------->|                   |
  |                 |                    |                   | crear estructura  |
  |                 |                    |                   | /expedientes/     |
  |                 |                    |                   |   tipo_plural/    |
  |                 |                    |                   |     id_nombre/    |
  |                 |                    |                   |       kyc/        |
  |                 |                    |                   |       admin/      |
  |                 |                    |                   |       ...         |
  |                 |                    |                   |                   |
  |                 |                    |<-- UPDATE profiles.carpeta_drive_id --|
  |                 |                    |                   |                   |
  |                 |<-- {carpeta_id, url} ------------------|                   |
  |                 |                    |                   |                   |
  |                 | notificar_email    |                   |                   |
  |                 | (email, "Perfil    |                   |                   |
  |                 |  aprobado", body)  |                   |                   |
  |                 |----------------------------------------------------->|
  |                 |                    |                   |           send email
  |                 |                    |                   |                   |
  | Click RECHAZAR  |                    |                   |                   |
  |---------------->|                    |                   |                   |
  |                 | PATCH /profiles/id |                   |                   |
  |                 | estado=inactivo    |                   |                   |
  |                 |------------------->|                   |                   |
  |                 |                    |                   |                   |
  |                 | notificar_email    |                   |                   |
  |                 | (email, "Solicitud |                   |                   |
  |                 |  rechazada", body) |                   |                   |
  |                 |----------------------------------------------------->|
  |                 |                    |                   |           send email

ESTRUCTURAS DE CARPETA POR TIPO:

beneficiario/
  kyc/
  administrativos/
  diversolab/
    qol/
    intervencion/
    analisis/

aliado/
  kyc/
  administrativos/
  diversolab/
    dei/
    consultoria/
    analisis/

contratista/
  kyc/
  administrativos/
  financieros/

proveedor/
  kyc/
  administrativos/
  financieros/
```

---

## 12. Componentes UI

### Design tokens (CSS custom properties)

```css
/* Colores */
--color-sol:      #fdda64    /* primario, amarillo */
--color-aqua:     #a2ddd2    /* exito, verde menta */
--color-coral:    #ff8e6f    /* alerta, naranja */
--color-lavanda:  #cad2e9    /* neutro, lila claro */
--color-violeta:  #3f2b56    /* texto/oscuro, purpura */
--color-crema:    #fffaef    /* fondo, crema */
--color-mn:       #1f1845    /* fondo oscuro, media noche */

/* Variantes generadas con color-mix(in srgb) */
--color-sol-10, --color-sol-30, --color-aqua-30, --color-coral-30, etc.

/* Tipografia */
--font-titulos:  'Titillium Web' (600, 700, 900)
--font-cuerpo:   'PT Sans' (400, 700)
--font-datos:    'PT Sans Narrow' (400, 700)

/* Escala tipografica */
--texto-xs: 0.72rem | --texto-sm: 0.85rem | --texto-base: 1rem
--texto-lg: 1.15rem | --texto-xl: 1.4rem  | --texto-2xl: 1.7rem | --texto-3xl: 2rem

/* Espaciado */
--espacio-xs: 4px | --espacio-sm: 8px  | --espacio-md: 16px
--espacio-lg: 24px| --espacio-xl: 32px | --espacio-2xl: 48px

/* Radio */
--radio-sm: 6px | --radio-md: 12px | --radio-lg: 16px | --radio-full: 9999px

/* Sombras */
--sombra-sm: 0 2px 12px rgba(63,43,86,0.08)
--sombra-md: 0 4px 24px rgba(63,43,86,0.12)
```

### Catalogo de componentes

| Componente | Clase CSS | Variantes |
|------------|-----------|-----------|
| **Boton primario** | `.btn-primario` | sol bg, violeta texto, 44px min-height |
| **Boton secundario** | `.btn-secundario` | borde violeta, fondo transparente |
| **Boton ghost** | `.btn-ghost` | sin borde, solo texto |
| **Boton cargando** | `.btn-cargando` | spinner animado, disabled |
| **Input texto** | `.campo-texto` | focus: violeta borde + sol outline |
| **Input error** | `.campo-error` | coral borde |
| **Input valido** | `.campo-valido` | aqua borde |
| **Select** | `.campo-select` | flecha SVG custom |
| **Tarjeta** | `.tarjeta` | fondo blanco, sombra, 4 variantes: exito/progreso/alerta/neutra |
| **Badge exito** | `.insignia-exito` | aqua bg |
| **Badge progreso** | `.insignia-progreso` | sol bg |
| **Badge alerta** | `.insignia-alerta` | coral bg |
| **Badge neutro** | `.insignia-neutra` | lavanda bg |
| **Tabla** | `.tabla-datos` | violeta header, crema bordes, sol hover |
| **Modal** | `.modal-overlay` + `.modal` | fixed overlay, 560px max, animacion |
| **Toast** | `.notificacion` | fixed top-right, slide-in, 5s auto-hide |
| **Stepper** | `.paso` + `.paso-activo` + `.paso-completo` | circulos con lineas |
| **OTP input** | `.otp-digito` | 6x 48px, monospace, auto-advance |
| **Header** | `.encabezado-app` | sticky, violeta bg, sol borde inferior |
| **Busqueda** | `.buscar-contenedor` | dropdown 240px max, hover highlight |
| **Chip** | `.chip` + `.chip-quitar` | lavanda bg, boton quitar coral |
| **Toggle** | `.toggle-grupo` + `.toggle-btn` | segmented control, sol activo |
| **Consentimiento** | `.consentimiento` | checkbox + titulo + detalle colapsable |
| **Skip link** | `.saltar-contenido` | accesibilidad teclado |
| **Sr-only** | `.sr-only` | solo lectores de pantalla |

### Patron de accesibilidad

- Minimo 44px touch target (botones, inputs)
- Focus visible: 2px sol outline, 2px offset
- Skip link para navegacion por teclado
- aria-label, aria-required, aria-describedby
- `[hidden] { display: none !important; }` global

---

## 13. Schema BD

### 8 tablas

```
profiles (5 tipos)
  id uuid PK
  auth_user_id uuid UNIQUE (null hasta primer login)
  profile_type text NOT NULL
  nombre text
  apellido text
  razon_social text
  tipo_documento text CHECK (CC|CE|NIT|PA|PEP|PPT|TI)
  numero_documento text
  email_principal text UNIQUE NOT NULL
  telefono text
  estado_perfil text DEFAULT 'pendiente'
  carpeta_drive_id text
  fecha_registro timestamptz DEFAULT now()
  created_at, updated_at (trigger)
  UNIQUE(tipo_documento, numero_documento)

permisos_miembro (4 permisos)
  id uuid PK
  perfil_id uuid FK → profiles
  permiso text CHECK (gestion_beneficiarios|gestion_proveedores|gestion_accesos|gestion_plataforma)
  activo boolean DEFAULT true
  created_at
  UNIQUE(perfil_id, permiso)

asignaciones (analista → perfil)
  id uuid PK
  analista_id uuid FK → profiles
  perfil_id uuid FK → profiles
  estado text DEFAULT 'activa' CHECK (activa|finalizada)
  fecha_inicio timestamptz DEFAULT now()
  fecha_fin timestamptz
  motivo_cambio text
  created_at
  UNIQUE(analista_id, perfil_id) WHERE estado='activa'

tareas
  id uuid PK
  perfil_id uuid FK → profiles
  solicitado_por uuid FK → profiles
  tipo_tarea text NOT NULL
  detalle text
  estado text DEFAULT 'pendiente' CHECK (pendiente|en_curso|completada|vencida)
  es_urgente boolean DEFAULT false
  fecha_limite date
  fecha_completada timestamptz
  created_at

catalogo_docs
  id uuid PK
  perfil_id uuid FK → profiles
  tipo_documento text NOT NULL
  categoria text
  estado text DEFAULT 'pendiente' CHECK (pendiente|aprobado|rechazado)
  drive_file_id text
  drive_url text
  subido_por uuid FK → profiles
  revisado_por uuid FK → profiles
  fecha_subida timestamptz
  fecha_revision timestamptz
  notas_revision text
  created_at

consentimientos (INMUTABLE — sin UPDATE ni DELETE)
  id uuid PK
  perfil_id uuid FK → profiles
  tipo_firma text CHECK (persona_natural|persona_juridica)
  email_firmante text NOT NULL
  nombre_firmante text NOT NULL
  tipo_documento_firmante text
  numero_documento_firmante text
  empresa text
  nit_empresa text
  cargo_firmante text
  codigo text NOT NULL (C1-C7)
  version text NOT NULL
  texto_aceptado text
  aceptado boolean NOT NULL
  es_obligatorio boolean DEFAULT false
  folio text UNIQUE NOT NULL
  hash_firma text NOT NULL
  ip_address text
  user_agent text
  solicitado_por text
  programa text
  created_at

logs_actividad (INMUTABLE — solo INSERT + SELECT)
  id uuid PK
  persona_id uuid
  accion text NOT NULL
  modulo text
  detalle jsonb
  created_at

folios_secuencial (solo service_role)
  codigo text PK (parte 1)
  anio integer PK (parte 2)
  secuencial integer DEFAULT 0
  → funcion: siguiente_folio(p_codigo, p_anio) RETURNS integer
    INSERT ... ON CONFLICT DO UPDATE SET secuencial = secuencial + 1
```

### RLS — Funciones base

```sql
get_profile_id()       → uuid del perfil del usuario actual
es_miembro()           → true si profile_type = 'miembro'
tiene_permiso(p text)  → true si tiene permiso p activo
es_miembro_de(pid uuid)→ true si analista asignado al perfil
```

### RLS — Matriz de politicas

```
                    SELECT              INSERT           UPDATE           DELETE
profiles            self |              public           self |           gestion_
                    asignado |          (registro)       gestion_        plataforma
                    gestion_accesos |                    accesos |
                    gestion_plataforma                   gestion_
                                                        plataforma

permisos_miembro    gestion_accesos |   gestion_        gestion_        gestion_
                    gestion_plataforma  accesos          accesos         plataforma

asignaciones        own (analista) |    gestion_        gestion_        gestion_
                    gestion_plataforma  accesos          accesos         plataforma

tareas              self |              es_miembro()    self (completar) gestion_
                    asignado |                          | miembro        plataforma
                    gestion_plataforma

catalogo_docs       self |              authenticated   miembro          gestion_
                    asignado |                          (revision)       plataforma
                    gestion_plataforma

consentimientos     self |              authenticated   NUNCA            NUNCA
                    gestion_plataforma  + service_role

logs_actividad      gestion_plataforma  authenticated   NUNCA            NUNCA
                                        + service_role

folios_secuencial   NUNCA (false)       NUNCA           NUNCA            NUNCA
```

---

## 14. Servicios GAS

### GAS OTP — Acciones

```
solicitarOTP
  IN:  { email, nombre?, empresa? }
  OUT: { ok: true }
  LOGICA:
    1. Rate limit: 20 requests / 10min (CacheService key: rate_{email})
    2. Generar codigo 6 digitos aleatorio
    3. Cache 10min (CacheService key: otp_{email})
    4. Enviar Gmail con template HTML (violeta header, sol code bg)
    5. replyTo: EMAIL_REPLY_TO (conducta.etica@diversolab.org)

verificarOTP
  IN:  { email, codigo }
  OUT: { ok, access_token, refresh_token, token_verificacion }
  LOGICA:
    1. Leer OTP de cache
    2. Max 5 intentos (blacklist CacheService)
    3. Llamar Edge Fn otp-admin: crear_usuario(email)
    4. Llamar Edge Fn otp-admin: set_password(auth_user_id, uuid+uuid)
    5. Llamar Edge Fn otp-admin: vincular_perfil(email, auth_user_id)
    6. POST /auth/v1/token?grant_type=password → {access_token, refresh_token}
    7. Generar token_verificacion (UUID hex), cache 5min
    8. Marcar OTP como usado

verificarTokenVerificacion
  IN:  { email, token }
  OUT: { ok: true }
  LOGICA: Buscar en CacheService (TTL 5min)

notificarEmail
  IN:  { destinatario, asunto, cuerpo }
  OUT: { ok: true }
  LOGICA: MailApp.sendEmail con replyTo
```

### GAS Firma — Acciones

```
firmar
  IN:  { token_verificacion, email, tipo_firma, firmante{}, consentimientos[],
         perfil_id?, tarea_id?, ip_address?, user_agent?, solicitado_por?, programa? }
  OUT: { ok, folios[], pdf_url, resumen[{codigo, decision, folio, hash}] }
  LOGICA:
    1. Verificar token_verificacion via GAS OTP
    2. Validar firmante (nombre, email, doc, numero; +cargo/empresa si juridica)
    3. Validar C1+C2 aceptados; validar obligatorios segun payload
    4. Para cada consentimiento (C1-C7):
       a. siguiente_folio(codigo, anio) → secuencial atomico
       b. Formato: DL-{codigo}-{year}-{00000seq}
       c. Hash SHA-256: email|codigo|version|timestamp|ip
    5. INSERT consentimientos x7 via Edge Fn db-admin
    6. Generar PDF:
       a. Copiar template Google Doc (DOC_ID_PLANTILLA_FIRMA)
       b. replaceText: {{nombre}}, {{codigo_c1_decision}}, {{c1_folio}}, {{c1_hash}}, etc.
       c. Exportar como PDF
       d. Subir a carpeta_perfil o carpeta_firmas fallback
    7. Enviar email con PDF adjunto
    8. Si tarea_id: completar_tarea via Edge Fn
    9. Registrar log via Edge Fn

verificarFirma
  IN:  { folio }
  OUT: { ok, datos_firma: {folio, tipo_firma, nombre, email, codigo, version, aceptado, ...} }
  LOGICA: Query consentimientos by folio (sin auth requerida)

obtenerDatosFirma
  IN:  { token (= tarea_id) }
  OUT: { ok, tarea_id, perfil_id, tipo_firma, firmante{}, programa, obligatorios[] }
  LOGICA:
    1. Query tarea by id
    2. Si perfil_id != null → fetch profile → armar firmante
    3. Si perfil_id == null → parse tarea.detalle.firmante_externo
    4. Extraer obligatorios[] de tarea.detalle
```

### GAS Drive — Acciones

```
crearCarpeta
  IN:  { jwt, profile_id, profile_type, nombre? | razon_social? }
  OUT: { ok, carpeta_drive_id, url, ya_existia? }
  LOGICA:
    1. Validar JWT
    2. Validar profile_type ∈ {beneficiario, aliado, contratista, proveedor}
    3. Navegar/crear arbol:
       CARPETA_RAIZ / {tipo_plural} / {id}_{nombre} /
         beneficiario: kyc/ administrativos/ diversolab/(qol,intervencion,analisis)/
         aliado:       kyc/ administrativos/ diversolab/(dei,consultoria,analisis)/
         contratista:  kyc/ administrativos/ financieros/
         proveedor:    kyc/ administrativos/ financieros/
    4. UPDATE profiles.carpeta_drive_id via Edge Fn
```

### Comunicacion GAS ↔ Edge Function

```
GAS → Edge Function:
  URL:     SUPABASE_URL + '/functions/v1/{fn-name}'
  Method:  POST
  Headers: apikey: SUPABASE_PUBLISHABLE_KEY
           x-gas-secret: GAS_SHARED_SECRET
  Body:    JSON { action, ...datos }
  contentType: 'application/json'  (top-level, NO dentro de headers)

Edge Function → Supabase Admin:
  Usa sb_secret (service_role key) internamente
  Expone acciones: crear_usuario, set_password, vincular_perfil,
                   insertar_consentimientos, siguiente_folio,
                   completar_tarea, registrar_log
```

### Properties Service (secrets por servicio)

```
OTP:
  API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GAS_SHARED_SECRET, EMAIL_REPLY_TO

Firma:
  API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GAS_SHARED_SECRET, EMAIL_REPLY_TO,
  DOC_ID_PLANTILLA_FIRMA, CARPETA_RAIZ_ID, DRIVE_CARPETA_FIRMAS,
  OTP_URL, OTP_API_KEY, FOLIO_PREFIJO (default 'DL')

Drive:
  API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GAS_SHARED_SECRET,
  CARPETA_RAIZ_ID
```

---

## 15. Modelo de seguridad

### Autenticacion — OTP sin password

```
Flujo:
  Email → GAS genera 6 digitos → Gmail → usuario ingresa → GAS verifica
  → Edge Fn crea/obtiene auth user → temp password (UUID+UUID)
  → /token?grant_type=password → access_token + refresh_token
  → Frontend: setSession()

Por que Edge Function:
  GAS UrlFetchApp siempre envia User-Agent: Mozilla/5.0
  Supabase bloquea sb_secret desde "browser" User-Agents
  Edge Function es el unico puente seguro GAS → Admin API
```

### Firma electronica — 6 capas de proteccion

```
Capa 1: OTP               → Identidad (token_verificacion < 5min)
Capa 2: Hash SHA-256       → Integridad (email|codigo|version|timestamp|ip)
Capa 3: BD inmutable       → No repudio (consentimientos: sin UPDATE/DELETE)
Capa 4: Folio UNIQUE       → Trazabilidad (DL-C1-2026-00001, verificable)
Capa 5: PDF constancia     → Evidencia legal (email + Drive, adjunto)
Capa 6: JWT + token_verif  → Control acceso (sesion autenticada)

Cumplimiento legal:
  Ley 527/1999:  Integridad (hash) + Autenticidad (OTP) + No repudio (folio+PDF)
  Ley 1581/2012: Consentimiento verificable + Revocatoria (nuevo registro, no edicion)
```

### Secretos — Clasificacion

```
PUBLICO (frontend):
  sb_publishable_* (anon key) → en config.js, seguro por diseno
  URLs GAS                    → en config.js, protegidas por GAS routing
  Doc IDs                     → en config.js, Google Docs publicos

PRIVADO (servidor):
  sb_secret_*    → SOLO en Edge Function env, NUNCA en frontend
  GAS_SHARED_SECRET → SOLO en GAS Properties + Edge Function env
  API_KEY (GAS)  → SOLO en GAS Properties (server-to-server)

TRANSITORIO:
  JWT (access_token) → memoria JS, 1hr TTL, HTTPS only
  token_verificacion → GAS CacheService, 5min TTL
  OTP codigo         → GAS CacheService, 10min TTL
```

### Validacion — 3 capas

```
Capa 1 (Frontend):
  - Email regex, campos requeridos, tipo documento, longitud minima
  - UX: campo-error / campo-valido en blur
  - NO es barrera de seguridad, solo UX

Capa 2 (GAS):
  - JWT valido, rate limit, email existe, token no expirado
  - Datos completos, tipos correctos, cargo si juridica
  - Logica de negocio: C1+C2 obligatorios

Capa 3 (Supabase):
  - CHECK constraints (tipo_documento, estado_perfil, etc.)
  - NOT NULL, UNIQUE, FK references
  - RLS filtra todo SELECT/INSERT/UPDATE/DELETE
```

### CORS y CSP

```
CSP (meta tag en cada HTML):
  default-src:  'self'
  script-src:   'self' https://cdn.jsdelivr.net
  connect-src:  'self' https://*.supabase.co
                https://script.google.com
                https://script.googleusercontent.com
  style-src:    'self' 'unsafe-inline' https://fonts.googleapis.com
  font-src:     https://fonts.gstatic.com
  img-src:      'self' data:
  frame-src:    https://docs.google.com

  CERO 'unsafe-inline' en script-src — todo JS es archivos externos
```

---

## 16. Estado actual

### Desplegado y funcional

| Componente | Version | Estado |
|------------|---------|--------|
| Supabase schema | 7 migrations | Live |
| Edge Fn otp-admin | v3 | Deployed |
| GAS OTP | v1.21 @24 | Live, verificado E2E |
| GAS Firma | v1.7 @10 | Live, schema listo |
| GAS Drive | v1.0 | Live, schema listo |
| Frontend (6 paginas) | — | Live en app.diversolab.org |
| CSS design system | — | tokens.css + componentes.css |
| Landing page | — | index.html con CONECTA |

### Consentimientos (C1-C7) — Textos aprobados

| Codigo | Titulo | Obligatorio | Ref SICE-POL-01 |
|--------|--------|-------------|-----------------|
| C1 | Datos basicos | SI (sistema) | Art. 12 |
| C2 | Identificacion | SI (sistema) | Art. 13 |
| C3 | Datos sensibles | Configurable | Art. 14 |
| C4 | Analitica/IA | Configurable | Art. 15 |
| C5 | Comunicaciones | Configurable | Art. 16 |
| C6 | Imagen/voz | Configurable | Art. 17 |
| C7 | Seguimiento | Configurable | Art. 18 |

### No implementado (futuro)

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Formularios multi-capa (ubicacion, KYC, caracterizacion) | Solo mockup | Sin tablas BD |
| Google Sheets integration | Pendiente | Para forms externos |
| Monday.com mirror | Futuro | Board operacional |
| UI de revocatoria consentimientos | Pendiente | Backend listo (nuevo registro) |
| Analitica Gemini | Futuro | Fase posterior |
| Subida de documentos frontend | Pendiente | catalogo_docs existe, UI basica |

### Defecto conocido

**Registro orphan:** Si la firma falla despues de crear el perfil en registro, queda un perfil huerfano (sin auth_user_id, sin consentimientos). No hay auto-rollback porque consentimientos es inmutable y el perfil sin auth_user_id no puede auto-eliminarse via RLS.

---

## Inventario de mockups (docs/mockups/)

| Archivo | Pagina representada |
|---------|-------------------|
| `login.html` | Login OTP 2 estados |
| `registro.html` | Registro 4 pasos (mockup tiene paso extra vs implementacion) |
| `mi-expediente.html` | Dashboard perfil externo completo |
| `firma.html` | Firma standalone (no existe como mockup separado) |
| `formulario-ubicacion.html` | Capa 1: formulario ubicacion (no implementado) |
| `formulario-kyc.html` | Capa 2: KYC/compliance con tabs natural/juridica (no implementado) |
| `dashboard-analista.html` | Panel interno con KPIs, tabla, tareas |
| `detalle-expediente-analista.html` | Vista detalle con tabs datos/docs/tareas/historial |
| `solicitar-tarea-modal.html` | Modal solicitud tarea con 4 tipos |
| `Manual_Marca_DiversoLab.html` | Manual de marca completo (paleta, tipo, tokens) |
| `matriz-instrumentos-diversolab.html` | Matriz 14 instrumentos, 7 tabs |

---

*Fin del documento consolidado.*
