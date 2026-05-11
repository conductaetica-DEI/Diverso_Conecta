# Claude-error — Registro de errores de Claude en este proyecto

Registro de errores cometidos por Claude durante el desarrollo. Propósito: evitar repetirlos y mantener el estándar de rigurosidad que el proyecto exige.

---

## Error 1 — Alucinación sobre npm install global

**Qué pasó:** Sugerí eliminar package.json y node_modules porque "la CLI de Supabase se puede instalar global con npm i -g supabase". No verifiqué que fuera posible. No lo es — la CLI de Supabase bloquea instalación global vía npm.

**Qué debí hacer:** Auditar primero. Ejecutar `npm i -g supabase` o leer la documentación antes de proponer eliminar archivos.

**Regla violada:** Ciclo obligatorio paso 1 (AUDITAR). Regla de oro: "Si no está en los docs, pregunta. No inventes."

---

## Error 2 — Saltar el ciclo obligatorio

**Qué pasó:** En múltiples ocasiones fui directo a implementar sin presentar plan ni pedir aprobación. Ejemplos: editar appsscript.json sin plan, proponer eliminar archivos sin diagnosticar.

**Qué debí hacer:** Siempre seguir AUDITAR → DIAGNOSTICAR → PLANIFICAR → PEDIR APROBACIÓN → IMPLEMENTAR → VERIFICAR. Sin importar qué tan simple parezca el cambio.

**Regla violada:** CLAUDE.md: "No existe cambio simple. No saltar pasos."

---

## Error 3 — Conflicto de namespace en GAS

**Qué pasó:** Subí referencia-corex.gs junto con el código nuevo a GAS. Como GAS carga todos los .gs en un namespace plano, las funciones doPost/doGet de CoreX pisaron a las de DiversoLab. El servicio respondía con branding de CoreX.

**Qué debí hacer:** Antes de hacer push, identificar que referencia-corex.gs tiene funciones con los mismos nombres que Codigo.gs. Excluirlo desde el inicio o no subirlo.

**Regla violada:** Ciclo obligatorio paso 6 (VERIFICAR). Debí anticipar el conflicto al auditar el archivo de referencia.

---

## Error 4 — Llamar "código muerto" a un archivo de referencia

**Qué pasó:** Cuando se preguntó si referencia-corex.gs era código muerto, dije que sí y propuse eliminarlo. Es un archivo de referencia documentado en ARCHITECTURE.md, útil para el equipo en un proyecto que está empezando.

**Qué debí hacer:** Distinguir entre código muerto (funciones sin llamar, imports no usados) y archivos de referencia. QUALITY.md habla de código muerto en producción, no de documentación de referencia.

**Regla violada:** Regla de oro: "Si vas a eliminar código, grep todos los usos primero."

---

## Error 5 — Dejar .claspignore como código muerto

**Qué pasó:** Después de mover referencia-corex.gs a docs/, no noté que .claspignore quedó ignorando un archivo que ya no existía en el directorio. Fue el usuario quien señaló que había código muerto.

**Qué debí hacer:** Al mover el archivo, verificar qué otros archivos dependían de su ubicación y limpiar.

**Regla violada:** QUALITY.md: "No dejar funciones que nadie llama" (aplica también a archivos de configuración sin propósito).

---

## Error 6 — No generar API keys para el usuario

**Qué pasó:** Le dije al usuario "ejecuta `openssl rand -hex 32` para obtener la API key" sin explicar que eso genera un valor aleatorio que debe copiar. El usuario escribió literalmente `openssl rand -hex 32` como valor de la API key en Script Properties.

**Qué debí hacer:** Generar la key directamente con bash y entregar el valor listo para copiar. No asumir que el usuario sabe cómo funciona openssl.

**Regla violada:** QUALITY.md: mensajes al usuario claros. Regla de oro: no asumir conocimiento técnico del usuario.

---

## Error 7 — Auditoría incompleta para GAS Firma

**Qué pasó:** Al iniciar la implementación de Firma, no verifiqué qué archivos ya existían en gas/firma/ ni cuáles había que crear vs modificar. El usuario tuvo que señalar que la auditoría estaba incompleta.

**Qué debí hacer:** Antes de planificar, listar archivos existentes en gas/firma/, verificar su contenido, y presentar explícitamente qué se crea nuevo vs qué se modifica.

**Regla violada:** Ciclo obligatorio paso 1 (AUDITAR): auditar implica conocer el estado actual completo.

---

## Error 8 — Múltiples iteraciones en textos de consentimiento

**Qué pasó:** Los textos de consentimiento requirieron muchas correcciones: formato incorrecto (C1 vs "Consentimiento 1"), faltaba "Declaro que leí", incluían paréntesis innecesarios, nombre de C4 truncado ("Analítica" en vez de "Analítica, modelos predictivos e inteligencia artificial").

**Qué debí hacer:** Presentar los textos exactos desde el primer intento, verificando que cumplieran con el formato del documento F-DATO-01 y los nombres completos de cada consentimiento.

**Regla violada:** Ciclo obligatorio paso 3 (PLANIFICAR): el plan debe ser preciso. Regla de oro: "Si no está en los docs, pregunta."

---

## Error 9 — GAS Firma deployment "Access Denied"

**Qué pasó:** Después de hacer `clasp push` y `clasp deploy`, el GET al servicio Firma retornó "Access Denied". Esto ya había ocurrido conceptualmente con OTP — `clasp deploy` no siempre aplica la configuración de webapp del appsscript.json. Se requirió configuración manual de permisos en la consola de GAS.

**Qué debí hacer:** Anticipar el problema basado en la experiencia con OTP. Advertir al usuario que los permisos de webapp deben verificarse manualmente en Deploy → Manage deployments → "Who has access" → "Anyone".

**Regla violada:** Ciclo obligatorio paso 6 (VERIFICAR): no anticipé un problema conocido. Debí documentar el patrón desde el primer servicio.
