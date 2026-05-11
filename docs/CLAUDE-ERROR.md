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
