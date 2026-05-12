# SECURITY.md — DiversoLab Members Conecta

## Principio general

La seguridad está en Supabase (RLS) y GAS (validación), NO en el frontend. El frontend es público (GitHub Pages). Cualquier persona puede ver el código fuente. La seguridad no depende de esconder código.

---

## Autenticación — OTP via GAS

### Flujo

1. Email en login → JS consulta Supabase (profiles por email, estado activo)
2. JS llama GAS OTP → genera código 6 dígitos → Gmail envía
3. Usuario ingresa código → JS llama GAS verificarOTP
4. GAS verifica código → llama Supabase Auth Admin API (service_role):
   - Busca auth user por email. Si no existe, lo crea (`admin.createUser`)
   - Si es primer login: vincula `auth_user_id` al profile
   - Genera `access_token` + `refresh_token` (`admin.generateLink` o token generation)
   - Genera `token_verificacion` temporal (5 min) para firma
5. GAS retorna `{ ok, access_token, refresh_token, token_verificacion }` al frontend (HTTPS)
6. JS hace `supabase.auth.setSession({ access_token, refresh_token })` → sesión activa
7. JWT se usa para todas las llamadas a Supabase REST → RLS filtra
8. JS usa token_verificacion para operaciones que lo requieran (firma)

### Límites

| Parámetro | Valor |
|-----------|-------|
| Solicitudes por email | 3 cada 10 minutos |
| Intentos de verificación | 5 máximo |
| Vigencia del OTP | 10 minutos |
| Token verificación post-OTP | 5 minutos |
| JWT Supabase | 1 hora (refresh renueva) |

### Reglas

- Supabase Auth NO envía emails. Solo gestiona sesión/JWT.
- Gmail envía el OTP usando cuota de Google Workspace.
- Si OTP falla 5 veces, se bloquea y se borra. El usuario debe solicitar uno nuevo (sujeto a rate limit).

---

## Firma electrónica

### Capas de protección

| Capa | Qué protege | Cómo |
|------|------------|------|
| OTP | Identidad del firmante | Firma solo se acepta con token_verificacion válido (<5 min) |
| Hash SHA-256 | Integridad del contenido | Hash de email+codigo+version+timestamp+ip. Si se modifica un registro, el hash no coincide |
| Inmutabilidad BD | No repudio | Tabla consentimientos: no UPDATE, no DELETE. Ni con service_role |
| Folio único | Trazabilidad | DL-{codigo}-{año}-{secuencial}. Verificable por cualquiera |
| PDF constancia | Evidencia jurídica | PDF con todos los datos de firma depositado en Drive + enviado por email |
| JWT + token_verificacion | Acceso al servicio | Acciones autenticadas requieren JWT válido; firma usa token_verificacion de OTP |

### Cumplimiento legal

| Ley | Requisito | Cómo se cumple |
|-----|----------|---------------|
| Ley 527/1999 | Integridad | Hash SHA-256 por consentimiento |
| Ley 527/1999 | Autenticidad | OTP verifica identidad del firmante |
| Ley 527/1999 | No repudio | Folio + PDF + IP + timestamp + inmutabilidad |
| Ley 1581/2012 | Consentimiento verificable | Registro completo: qué aceptó, cuándo, versión del texto |
| Ley 1581/2012 | Derecho de revocatoria | Revocatoria crea NUEVO registro (no modifica el existente) |

---

## Secretos y llaves

| Secreto | Dónde vive | Quién lo usa | Expuesto al frontend |
|---------|-----------|-------------|---------------------|
| Supabase anon key | JS en GitHub Pages | Frontend (fetch + JWT) | ✅ Sí — es público por diseño |
| Supabase service_role key | GAS Script Properties | Solo GAS | ❌ NUNCA |
| GAS API keys | GAS Script Properties | Solo GAS↔GAS (server-to-server) | ❌ NUNCA |
| JWT Supabase (access_token) | Frontend → GAS en body.jwt | Frontend autenticado → GAS valida contra Supabase Auth | ⚡ Transitorio (1 hora, HTTPS) |
| Token verificación OTP | Memoria temporal GAS | GAS OTP → GAS Firma | ❌ Transitorio (5 min) |
| access_token + refresh_token | Transitan GAS → frontend (HTTPS) | Frontend (setSession) | ⚡ Transitorio (una vez, HTTPS) |

### Regla absoluta

**service_role key NUNCA aparece en el frontend.** Ni en JS, ni en HTML, ni en comentarios, ni en console.log. Si necesitas hacer algo con service_role, va a GAS.

---

## Row Level Security (RLS)

RLS está activo en TODAS las tablas. Es la última línea de defensa — si el frontend tiene un bug, la BD no entrega datos no autorizados.

### Verificación pre-deploy

Para cada tabla, verificar estas preguntas:

1. ¿Un perfil externo puede ver datos de OTRO perfil externo? → Debe ser NO
2. ¿Un miembro sin asignación puede ver un perfil? → Debe ser NO (excepto gestion_accesos y gestion_plataforma)
3. ¿Alguien puede modificar la tabla consentimientos? → Debe ser NO
4. ¿Alguien puede modificar logs_actividad? → Debe ser NO
5. ¿Un perfil pendiente puede hacer queries? → Debe ser NO (no tiene auth_user_id)

---

## Validación de inputs

### En el frontend (primera línea, NO confiable)

- Email: formato válido
- Documento: no vacío, solo alfanumérico
- Teléfono: formato con indicativo
- Selects: valor dentro de opciones válidas
- Campos requeridos: no vacíos

### En GAS (segunda línea, confiable)

- JWT válido (verificado contra Supabase Auth) o API key válida (server-to-server)
- Acciones públicas: rate limit (OTP) o token_verificacion (firma)
- Email existe en profiles (cuando aplica)
- Token verificación válido y no expirado
- Datos completos para la operación
- Tipos correctos (string, number, boolean)

### En Supabase (última línea, inviolable)

- CHECK constraints en columnas
- NOT NULL en campos obligatorios
- UNIQUE donde aplica
- FK references válidas
- RLS filtra todo

### Regla de 3 capas

Todo input se valida 3 veces: frontend (UX), GAS (lógica), Supabase (BD). Si alguna falla, las otras atrapan.

---

## CORS y headers de seguridad

### GitHub Pages

No hay servidor que configure headers HTTP. Se usan meta tags en cada HTML:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  connect-src 'self' https://*.supabase.co https://script.google.com https://script.googleusercontent.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data:;
">
```

Páginas que llaman a `obtener_ip()` (registro, firma) agregan `https://api.ipify.org` en `connect-src`. GAS Web Apps redirigen de `script.google.com` a `script.googleusercontent.com` — ambos dominios son necesarios.

### Supabase

Configurar en dashboard: solo aceptar requests desde `app.diversolab.org` y `localhost` (desarrollo).

### GAS

GAS Web Apps no soportan CORS nativo. Cada servicio usa `autenticar(body)` con dos métodos:

1. **JWT** (`body.jwt`): `verificar_jwt()` llama `SUPABASE_URL/auth/v1/user` — si el token es válido, el usuario está autenticado. Usado por frontend con sesión Supabase.
2. **API key** (`body.api_key`): valida contra Script Property `API_KEY`. Reservado para llamadas server-to-server GAS↔GAS (ej. Firma→OTP para verificarTokenVerificacion).

Acciones públicas (solicitarOTP, verificarOTP, firmar, obtenerDatosFirma) no requieren ninguno — tienen su propia protección (rate limit, token_verificacion, UUID de tarea).

---

## Protección contra ataques comunes

| Ataque | Protección |
|--------|-----------|
| Ver anon key en DevTools | Inútil sin JWT. RLS bloquea todo. |
| Robar JWT de otro usuario | JWT expira en 1 hora. Solo se genera post-OTP al email del dueño. |
| Modificar JS para hacer queries a otras tablas | RLS rechaza. La BD filtra, no el frontend. |
| Llamar directo a GAS sin frontend | Acciones protegidas requieren JWT válido de Supabase. Acciones públicas (OTP, firma) tienen su propia protección (rate limit, token_verificacion). |
| Fuerza bruta OTP | Rate limit: 3/10min, 5 intentos, TTL 10min. |
| Crear perfil falso | Perfil queda en 'pendiente'. No puede hacer nada sin aprobación. |
| Modificar consentimiento firmado | Tabla inmutable (no UPDATE, no DELETE). Hash detecta manipulación. |
| XSS (inyectar HTML/JS) | CSP meta tag. Escapar todo contenido dinámico con escapar_html(). |
| CSRF | GAS valida API key. Supabase valida JWT. No hay formularios que hagan POST directo. |

---

## Lo que NUNCA se expone al usuario

- Stack traces
- Nombres de tablas o columnas
- UUIDs internos de otros usuarios
- Mensajes de error de PostgreSQL
- Service_role key
- Detalles de por qué un OTP falló (solo "código incorrecto")
- Contenido de logs_actividad

---

## Datos sensibles y IA

- Módulos de IA (Gemini) SOLO reciben datos anonimizados
- Jamás enviar a Gemini: nombres, cédulas, emails, teléfonos, direcciones
- Los reportes generados por IA se almacenan en Drive con permisos restringidos
- El prompt del sistema de IA no contiene datos personales — solo puntuaciones y categorías
