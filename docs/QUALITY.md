# QUALITY.md — DiversoLab Members Conecta

Matriz de requisitos de código. Todo código generado debe cumplir estos estándares ANTES de considerarse completo. No es auditoría post-hoc — es especificación pre-código.

---

## 1. Rendimiento

### Supabase / PostgreSQL

- SELECT solo las columnas necesarias. NUNCA `SELECT *` en producción.
- LIMIT en todos los listados (default 50).
- Paginación con cursor (no OFFSET) para listas grandes.
- Usar PostgREST joins (`?select=*,profiles(nombre,apellido)`) en vez de N+1 queries.
- Consolidar llamadas: si una página necesita 3 datos, hacer 1 llamada combinada.
- Índices en campos de filtrado frecuente (ya definidos en ARCHITECTURE.md).

### Frontend (JS en GitHub Pages)

- Debounce en búsquedas y filtros (300ms mínimo).
- No hacer fetch() en loops. Batchar operaciones.
- Lazy loading para secciones que no se ven al cargar (tabs, acordeones).
- Cache de catálogos estáticos en memoria (tipos de documento, estados).
- Imágenes/avatares: usar thumbnail si existe.
- Promise.all() para llamadas paralelas sin dependencia entre ellas.

### GAS

- Batch writes a Sheets (setValues de rango, no setValue celda por celda).
- PropertiesService para cache de datos que no cambian frecuentemente.
- Ejecución máxima: 6 minutos. Chunking para operaciones largas.
- No hacer fetch duplicados al mismo endpoint en una misma ejecución.

---

## 2. Mantenibilidad

### Estructura

- Un archivo = una responsabilidad. No god files (>300 líneas con múltiples propósitos).
- Una función = una responsabilidad. Si necesitas "y" para describir qué hace, sepárala.
- Máximo 50 líneas por función. Si crece más, descomponer.
- No duplicar lógica. Si algo se repite 2+ veces, extraer a función reutilizable.
- Constantes centralizadas (URLs, límites, mensajes) — no hardcodeadas en el código.

### Código muerto

- No dejar funciones que nadie llama.
- No dejar imports no utilizados.
- No dejar variables declaradas pero nunca leídas.
- No dejar código comentado ("por si acaso"). Si no se usa, se borra. Git tiene el historial.
- No dejar TODOs sin fecha ni responsable.

### Dependencias

- No queries directas a Supabase desde funciones de UI. Siempre pasar por helpers en `supabase-client.js`.
- No llamadas directas a GAS desde funciones de UI. Siempre pasar por `gas-client.js`.
- No dependencias circulares (A importa B, B importa A).
- Minimizar dependencias externas. Si se puede hacer con JS nativo, no instalar librería.

### Estructura frontend

- Todo JavaScript va en archivos .js separados. NUNCA `<script>` inline con lógica dentro de HTML.
- HTML solo contiene estructura y elementos del DOM. Cero lógica.
- Cada página carga sus JS con `<script src="../js/archivo.js"></script>`
- **Deuda técnica:** login.html, firma.html y mi-expediente.html aún tienen inline script (<330 líneas cada uno). Al tocar estas páginas, migrar su JS a archivo externo y quitar `'unsafe-inline'` de CSP.

Clasificación de archivos JS:
- **Compartido** (2+ páginas lo usan): `js/utils.js`, `js/labels.js`, `js/otp-ui.js`, `js/modales.js`, `js/consentimientos.js`
- **De página** (1 sola página lo usa): `js/dashboard.js`, `js/accesos.js`, `js/registro.js`

Antes de crear una función:
- Buscar si ya existe en los JS compartidos
- Si existe, usarla. No duplicar.
- Si no existe y se usará en 2+ páginas, agregarla al archivo compartido correspondiente
- Si no existe y es específica de una página, agregarla al JS de esa página

Orden de carga (dependencias primero):
1. Supabase CDN (si la página usa sesión)
2. `config.js`
3. `supabase-client.js` (si la página usa sesión)
4. `gas-client.js`
5. `utils.js`
6. Compartidos específicos (`labels.js`, `otp-ui.js`, `modales.js`, `consentimientos.js`)
7. JS de página (`dashboard.js`, `accesos.js`, etc.)

---

## 3. Error handling

### Regla general

No try/catch vacío. No console.log solo. Cada error se maneja explícitamente.

### En el frontend

```javascript
// ❌ MAL
try { await guardar(); } catch(e) { console.log(e); }

// ❌ MAL
try { await guardar(); } catch(e) { alert(e.message); }

// ✅ BIEN
try {
  deshabilitar_boton(boton, 'Guardando...');
  await guardar();
  mostrar_exito('Guardado correctamente');
} catch (error) {
  mostrar_error(mensaje_usuario(error.message));
  // TODO: implementar registrar_error() para logging centralizado
  // registrar_error('guardar_expediente', error);
} finally {
  habilitar_boton(boton, 'Guardar');
}
```

### Mensajes al usuario

Crear mapa de mensajes amigables. El usuario NUNCA ve códigos técnicos.

| Código interno | Mensaje al usuario |
|---------------|-------------------|
| NO_AUTORIZADO | No tienes permiso para realizar esta acción. |
| OTP_RATE_LIMIT | Has solicitado demasiados códigos. Espera 10 minutos. |
| OTP_EXPIRADO | El código expiró. Solicita uno nuevo. |
| OTP_INCORRECTO | Código incorrecto. Intenta de nuevo. |
| OTP_BLOQUEADO | Demasiados intentos. Espera 10 minutos e intenta de nuevo. |
| PERFIL_NO_ENCONTRADO | No encontramos una cuenta con ese correo. |
| PERFIL_INACTIVO | Tu cuenta está suspendida. Contacta a DiversoLab. |
| PERFIL_PENDIENTE | Tu solicitud está en revisión. Te notificaremos por email. |
| DOCUMENTO_DUPLICADO | Ya existe un registro con ese tipo y número de documento. |
| FIRMA_OBLIGATORIOS_FALTANTES | Debes aceptar todos los consentimientos obligatorios. |
| ERROR_SERVIDOR | Ocurrió un error. Intenta de nuevo o contacta soporte. |

Mensaje de fallback para cualquier error no mapeado: "Ocurrió un error. Intenta de nuevo o contacta soporte."

### Lo que NUNCA se muestra al usuario

- Stack traces
- Nombres de tablas o columnas de BD
- UUIDs internos
- Mensajes de error de PostgreSQL
- Detalles técnicos de por qué falló

---

## 4. Feedback UX

### Botones de acción

Todo botón que ejecuta una operación async debe:
1. Deshabilitarse al hacer click (`disabled = true`)
2. Cambiar texto a estado de carga ("Enviando...", "Guardando...", "Verificando...")
3. Mostrar spinner o indicador visual
4. Rehabilitarse en `finally` (éxito o error)
5. Prevenir doble click

### Feedback post-acción

| Tipo | Cómo |
|------|------|
| Éxito | Toast o mensaje temporal verde (aqua) — "Guardado correctamente" |
| Error | Mensaje rojo (coral) con texto amigable — permanece hasta que el usuario lo cierre |
| Cargando | Spinner o skeleton en el área donde aparecerán los datos |
| Vacío | Mensaje + icono cuando una lista no tiene items — "No tienes tareas pendientes" |

### Formularios

- Validación inline al salir del campo (blur), no solo al submit.
- Campos con error: borde coral + mensaje debajo + icono de error.
- Campos válidos: borde aqua (sutil, no distraer).
- Progreso visible en formularios multi-paso (stepper con estado actual).
- Botón submit deshabilitado hasta que campos obligatorios estén completos.

---

## 5. Testing / Verificación

### Verificación post-implementación (manual, cada prompt)

Después de cada tarea completada, verificar:

1. **Funcional**: ¿hace lo que se pidió? Probar el flujo completo.
2. **RLS**: ¿un usuario puede ver datos de otro? Probar con diferentes perfiles.
3. **Errores**: ¿qué pasa si el input está vacío? ¿Si el servidor no responde? ¿Si el OTP expiró?
4. **Accesibilidad**: ¿se puede navegar con teclado? ¿Los inputs tienen labels?
5. **Convenciones**: ¿los nombres siguen CONVENTIONS.md? ¿Hay verbos prohibidos?
6. **Rendimiento**: ¿hay fetch en loops? ¿Se piden solo las columnas necesarias?
7. **Seguridad**: ¿se expone service_role? ¿Se validan inputs en backend?

### Testing automatizado (futuro)

Cuando el proyecto madure:
- Unit tests para funciones puras (cálculos, validaciones, formateo)
- Integration tests para flujos GAS (OTP + Firma)
- Verificación de RLS con usuarios de prueba de cada perfil

---

## 6. Checklist pre-merge

Antes de considerar cualquier tarea como completa:

- [ ] ¿Funciona el flujo completo end-to-end?
- [ ] ¿Los nombres de funciones/variables/archivos siguen CONVENTIONS.md?
- [ ] ¿No hay verbos prohibidos (get_, set_, handle_, fetch_)?
- [ ] ¿No hay colores hardcodeados? ¿Todo usa tokens de DESIGN.md?
- [ ] ¿Los elementos ocultos usan atributo `hidden` (no `display:none` inline)? Ver regla `[hidden]` en DESIGN.md.
- [ ] ¿Los inputs se validan en frontend Y en backend (GAS)?
- [ ] ¿Los errores muestran mensajes amigables, no códigos técnicos?
- [ ] ¿Los botones se deshabilitan durante carga?
- [ ] ¿Se puede navegar con teclado?
- [ ] ¿Los labels de formulario están asociados a los inputs?
- [ ] ¿No se expone service_role key ni datos internos?
- [ ] ¿No hay fetch dentro de loops?
- [ ] ¿No hay código muerto (funciones sin usar, imports muertos)?
- [ ] ¿Los comentarios explican el por qué, no el qué?
- [ ] ¿Se actualizaron los docs si se creó un patrón nuevo?
