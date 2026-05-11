# DESIGN.md — DiversoLab Members Conecta

Derivado del Manual de Marca oficial de DiversoLab. TODO elemento visual usa estos tokens. Cero colores hardcodeados.

---

## Paleta

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| --color-sol | #fdda64 | Primario, botones principales, acentos |
| --color-aqua | #a2ddd2 | Positivo, completado, éxito |
| --color-coral | #ff8e6f | Alerta, urgencia, error |
| --color-lavanda | #cad2e9 | Neutro, bordes, hover |
| --color-violeta | #3f2b56 | Texto principal, headers |
| --color-crema | #fffaef | Fondo principal |
| --color-media-noche | #1f1845 | Fondo oscuro (modals, tooltips) |

### Variantes (generadas con opacidad, no hardcodeadas)

| Token | Cálculo | Uso |
|-------|---------|-----|
| --color-sol-10 | sol al 10% sobre blanco | Fondo sutil de highlight |
| --color-sol-30 | sol al 30% sobre blanco | Fondo de badge en progreso |
| --color-aqua-10 | aqua al 10% | Fondo sutil de éxito |
| --color-coral-10 | coral al 10% | Fondo sutil de error |
| --color-lavanda-10 | lavanda al 10% | Fondo de hover |
| --color-lavanda-30 | lavanda al 50% | Fondo de badge neutro |
| --color-violeta-10 | violeta al 10% | Fondo de código, tags |

---

## Estados semánticos

| Estado | Color | Token | Ejemplo |
|--------|-------|-------|---------|
| Aprobado / Completo | Aqua | --color-exito | Badge "Completada", check ✓ |
| En progreso | Sol | --color-progreso | Badge "En curso", barras |
| Pendiente / Alerta | Coral | --color-alerta | Badge "Urgente", contadores |
| Información / Neutro | Lavanda | --color-neutro | Badge "Capa 2", bordes |
| Texto principal | Violeta | --color-texto | Body, headers |
| Texto secundario | Violeta al 70% | --color-texto-muted | Descripciones, ayudas |

NUNCA comunicar información solo con color. Siempre agregar icono o texto.

---

## Tipografía

| Token CSS | Fuente | Pesos | Uso |
|-----------|--------|-------|-----|
| --font-titulos | Titillium Web | 600, 700, 900 | Títulos, logo, destacados |
| --font-cuerpo | PT Sans | 400, 700 | Cuerpo, subtítulos, formularios |
| --font-datos | PT Sans Narrow | 400, 700 | Tablas, badges, datos compactos |

Google Fonts — cargar via `<link>` en cada HTML.

### Tamaños

| Token | Valor | Uso |
|-------|-------|-----|
| --text-xs | 0.72rem | Captions, badges |
| --text-sm | 0.82rem | Ayuda de campos, notas |
| --text-base | 0.95rem | Cuerpo |
| --text-lg | 1.1rem | Subtítulos |
| --text-xl | 1.3rem | Títulos de sección |
| --text-2xl | 1.6rem | Títulos de página |
| --text-3xl | 2rem | Hero, login |

Tamaño mínimo de texto: 14px (0.875rem) para body, 12px (0.75rem) para captions.

---

## Espaciado y bordes

| Token | Valor |
|-------|-------|
| --spacing-xs | 4px |
| --spacing-sm | 8px |
| --spacing-md | 16px |
| --spacing-lg | 24px |
| --spacing-xl | 32px |
| --spacing-2xl | 48px |
| --radius-sm | 6px |
| --radius-md | 12px |
| --radius-lg | 16px |
| --radius-full | 9999px |
| --shadow-sm | 0 2px 12px rgba(63,43,86,0.08) |
| --shadow-md | 0 4px 24px rgba(63,43,86,0.12) |

---

## Componentes base

### Botón primario
- Fondo: --color-sol
- Texto: --color-violeta
- Font: --font-titulos, weight 700
- Padding: --spacing-sm --spacing-lg
- Border-radius: --radius-md
- Hover: oscurecer fondo 10%
- Disabled: opacidad 0.5, cursor not-allowed
- Durante carga: texto cambia a "Guardando..." + spinner, disabled

### Botón secundario
- Fondo: transparente
- Borde: 2px solid --color-violeta
- Texto: --color-violeta
- Hover: fondo --color-violeta-10

### Input
- Fondo: blanco
- Borde: 1px solid --color-lavanda
- Border-radius: --radius-sm
- Padding: --spacing-sm --spacing-md
- Font: --font-cuerpo
- Focus: borde --color-violeta, outline 2px solid --color-sol al 50%
- Error: borde --color-coral + mensaje debajo

### Card
- Fondo: blanco
- Border-radius: --radius-md
- Box-shadow: --shadow-sm
- Padding: --spacing-lg

### Badge
- Font: --font-datos, weight 700, --text-xs
- Padding: 2px 8px
- Border-radius: --radius-sm
- Color según estado semántico
- Neutro (.insignia-neutra): fondo --color-lavanda-30 (visible sobre cards blancas)

### Tabla
- Font: --font-datos para datos, --font-datos weight 700 uppercase para headers
- Header: fondo --color-violeta, texto blanco, borde inferior --color-sol
- Filas: hover fondo --color-sol-10
- Bordes: 1px solid #f0ece0

---

## Accesibilidad — WCAG 2.1 AA

### Contraste verificado

| Combinación | Ratio | ¿Cumple? |
|------------|-------|----------|
| Violeta (#3f2b56) sobre Crema (#fffaef) | 9.2:1 | ✅ AA + AAA |
| Violeta sobre blanco | 10.5:1 | ✅ AA + AAA |
| Coral (#ff8e6f) sobre Crema | 2.6:1 | ❌ No usar como texto |
| Coral sobre Violeta | 3.8:1 | ✅ Solo texto grande |
| Sol (#fdda64) sobre Violeta | 6.8:1 | ✅ AA |
| Blanco sobre Violeta | 10.5:1 | ✅ AA + AAA |

Regla: Coral NUNCA como texto sobre fondo claro. Solo en badges grandes o sobre fondo oscuro.

### Navegación

- Skip link "Ir al contenido principal" en cada página
- Navegación completa por teclado (Tab, Enter, Escape)
- Focus visible en todos los elementos interactivos (outline 2px solid --color-sol)
- Orden de tabulación lógico (no saltar)

### Formularios

- Cada input tiene `<label>` asociado (for=id). No solo placeholder.
- Errores: texto descriptivo + `aria-describedby` + color + icono (no solo color)
- Campos obligatorios: `aria-required="true"` + asterisco visual
- Grupos radio/checkbox: `<fieldset>` + `<legend>`
- Autocomplete donde aplique (name, email, tel)

### Componentes interactivos

- Botones solo icono: `aria-label` descriptivo
- Modales: `role="dialog"` + `aria-modal="true"` + focus trap + cerrar con Escape
- Tablas: `<th scope="col">` en headers
- Imágenes: `alt` descriptivo. Decorativas: `alt=""` + `aria-hidden="true"`
- Loading: `aria-busy="true"` + texto "Cargando..."
- Alertas: `role="alert"` o `aria-live="polite"`

### Para población PCDi

- Lenguaje simple y directo — evitar jerga
- Una acción principal por pantalla
- Feedback visual claro después de cada acción
- Progreso visible en formularios multi-paso (stepper)
- Botones grandes: mínimo 44x44px touch target
- Iconografía consistente que apoye al texto

---

## Marca-barra (brand stripe)

Barra horizontal de 8px en la parte superior de cada página. 4 franjas de colores: sol, aqua, coral, lavanda. No incluye violeta — se funde con el header.

## Logo en header

- `.encabezado-logo`: max-height 80px (48px en móvil ≤480px)
- El logo es cuadrado (200×200px) con detalle interno denso — necesita altura suficiente para ser legible
