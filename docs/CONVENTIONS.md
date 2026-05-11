# CONVENTIONS.md — DiversoLab Members Conecta

## Idioma

| Español ✅ | Inglés ✅ |
|------------|----------|
| Funciones propias | APIs de Supabase, JS nativo |
| Variables | Métodos nativos (.filter, .map, .find) |
| Campos BD | Palabras técnicas sin traducción (fetch, async, await, hash, token, callback) |
| Comentarios | Librerías externas |
| Mensajes al usuario | |
| Nombres de archivos | |
| Constantes | |

---

## Estructura de archivos

```
gas/
  otp/Codigo.gs              ← servicio OTP (router)
  otp/Auth.gs                ← verificar_jwt + autenticar
  firma/Codigo.gs             ← servicio firma electrónica (router)
  firma/Auth.gs               ← verificar_jwt + autenticar
  drive/Codigo.gs             ← servicio Drive (router)
  drive/Auth.gs               ← verificar_jwt + autenticar
css/
  tokens.css                  ← variables CSS del design system
  componentes.css             ← estilos de botones, inputs, cards, badges, tablas
js/
  config.js                   ← URLs Supabase + GAS (públicas)
  supabase-client.js          ← init Supabase, auth helpers, fetch wrappers
  gas-client.js               ← helpers para llamar servicios GAS
  utils.js                    ← toasts, mensajes, validación, formato, helpers UI
pages/
  login.html                  ← inicio de sesión OTP
  registro.html               ← auto-registro perfiles externos
  firma.html                  ← firma standalone (link desde email)
  mi-expediente.html          ← dashboard perfil externo
  dashboard.html              ← panel miembro interno
  accesos.html                ← gestión accesos (admin)
supabase/
  migrations/001_schema.sql
  migrations/002_seed.sql
  migrations/003_rls_accesos.sql
```

---

## Verbos estándar

### JavaScript (frontend + GAS)

| Contexto | Verbos permitidos |
|----------|-----------------|
| Obtener datos | obtener_, listar_, buscar_, contar_ |
| Escribir datos | crear_, actualizar_, desactivar_, eliminar_ |
| Lógica | validar_, calcular_, verificar_, transformar_, generar_ |
| UI / eventos | al_cargar_, al_click_, al_cambiar_, al_enviar_ |
| Mostrar/ocultar | mostrar_, ocultar_, poblar_, preparar_ |
| Formato | formatear_, convertir_, limpiar_, escapar_ |

### Verbos PROHIBIDOS

| ❌ Prohibido | ✅ Usar |
|-------------|--------|
| get_ | obtener_ |
| set_ | actualizar_ / asignar_ |
| handle_ | al_click_ / al_cambiar_ |
| process_ | transformar_ / calcular_ |
| fetch_ | obtener_ / buscar_ |
| do_ / manage_ | el verbo real de la acción |
| load_ | cargar_ / obtener_ |
| save_ | guardar_ / crear_ / actualizar_ |

---

## Campos BD — Prefijos semánticos

| Tipo | Prefijo | Ejemplo |
|------|---------|---------|
| Referencia FK | ref_ o _{tabla}_id | perfil_id, analista_id |
| Fecha | fecha_ | fecha_registro, fecha_revision |
| Estado | estado_ | estado_perfil |
| Booleano | es_ | es_urgente, es_obligatorio |
| Contador | total_ | total_tareas |
| Texto largo | descripcion_ o detalle | detalle, notas_revision |
| Enum/Catálogo | tipo_ | tipo_documento, tipo_tarea |

**PROHIBIDO**: campos genéricos: data, status, value, info, flag, type, result, temp, obj, item.

---

## Nombres de archivos

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| HTML pages | kebab-case en español | mi-expediente.html, solicitar-firma.html |
| CSS | kebab-case | tokens.css, componentes.css |
| JS modules | kebab-case en español | supabase-client.js, gas-client.js |
| GAS | PascalCase (requerido por GAS) | Codigo.gs, Otp.gs, Firma.gs |
| SQL migrations | número_descripción | 001_schema.sql |

---

## Funciones — Patrones obligatorios

### Toda función que accede a Supabase valida auth primero

```javascript
async function obtener_mi_expediente() {
  const sesion = await verificar_sesion(); // retorna JWT o redirige a login
  const respuesta = await supabase_fetch('/profiles?id=eq.' + sesion.perfil_id, sesion.jwt);
  // ...
}
```

### Toda función que llama a GAS usa gas_fetch (JWT automático)

```javascript
async function solicitar_otp(email, nombre) {
  try {
    const respuesta = await gas_fetch(CONFIG.GAS_OTP_URL, {
      action: 'solicitarOTP',
      email: email,
      nombre: nombre
    });
    return respuesta;
  } catch (error) {
    mostrar_error(error.message);
  }
}
```

### Toda función GAS usa autenticar() para acciones protegidas

```javascript
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var acciones_publicas = ['solicitarOTP', 'verificarOTP'];
    if (acciones_publicas.indexOf(body.action) === -1) {
      var auth = autenticar(body);
      if (!auth.ok) {
        return respuesta_json({ ok: false, error: 'NO_AUTORIZADO' });
      }
    }
    // ... lógica
  } catch (err) {
    return respuesta_json({ ok: false, error: 'ERROR_SERVIDOR' });
  }
}
```

---

## Comentarios

- En español
- Explican el POR QUÉ, no el QUÉ
- Cada archivo empieza con comentario de propósito: `// Servicio de firma electrónica — genera folios, hashes, PDFs`
- Funciones complejas tienen JSDoc en español

```javascript
/**
 * Genera folio único para una firma de consentimiento.
 * Formato: DL-{codigo}-{año}-{secuencial}
 * El secuencial se obtiene de PropertiesService para garantizar unicidad.
 * @param {string} codigo - Código del consentimiento (C1-C7)
 * @returns {string} Folio generado
 */
function generar_folio(codigo) {
  // ...
}
```

---

## Commits

Conventional Commits en español:

```
feat(gas): servicio OTP — solicitar, verificar, rate limit
feat(firma): servicio firma electrónica con folio y hash
feat(ui): página login — 2 pasos OTP con errores amigables
fix(rls): política profiles no incluía miembro asignado
docs: actualizar ARCHITECTURE.md con tabla consentimientos
```
