// ============================================
// REFERENCIA — Código OTP de CoreX
// Adaptar para DiversoLab: cambiar branding,
// API key property, agregar token_verificacion
//
// NOTA: datos efímeros (OTP, rate limit) usan
// CacheService (TTL automático), NO ScriptProperties.
// ScriptProperties solo para configuración permanente.
// ============================================

// --- appsscript.json ---
// {
//   "timeZone": "America/Bogota",
//   "dependencies": {},
//   "exceptionLogging": "STACKDRIVER",
//   "runtimeVersion": "V8",
//   "webapp": {
//     "access": "ANYONE_ANONYMOUS",
//     "executeAs": "USER_DEPLOYING"
//   }
// }

// --- Code.gs ---

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var expectedKey = PropertiesService.getScriptProperties().getProperty('corex_auth');
    if (!body.api_key || body.api_key !== expectedKey) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'NO_AUTORIZADO' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = body.action;

    var result;
    switch (action) {
      case 'solicitarOTP':
        result = solicitarOTP(body.email, body.nombre);
        break;
      case 'verificarOTP':
        result = verificarOTP(body.email, body.codigo);
        break;
      case 'notificarEmail':
        result = notificarEmail(body.destinatario, body.asunto, body.cuerpo);
        break;
      default:
        result = { ok: false, error: 'ACCION_INVALIDA' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'ERROR_SERVIDOR', detalle: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, servicio: 'corex_OTP', version: '1.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- otp.gs ---

var OTP_MAX_SOLICITUDES = 3;
var OTP_VENTANA_SEG = 600;
var OTP_MAX_INTENTOS = 5;
var OTP_TTL_SEG = 600;

function solicitarOTP(email, nombre) {
  if (!email) return { ok: false, error: 'EMAIL_REQUERIDO' };

  var cache = CacheService.getScriptCache();
  var key = 'otp_' + email;
  var rateKey = 'rate_' + email;

  // Rate limit
  var rateData = cache.get(rateKey);
  var ahora = Date.now();
  if (rateData) {
    var rate = JSON.parse(rateData);
    var solicitudesEnVentana = rate.timestamps.filter(function(t) {
      return (ahora - t) < (OTP_VENTANA_SEG * 1000);
    });
    if (solicitudesEnVentana.length >= OTP_MAX_SOLICITUDES) {
      return { ok: false, error: 'OTP_RATE_LIMIT' };
    }
    solicitudesEnVentana.push(ahora);
    cache.put(rateKey, JSON.stringify({ timestamps: solicitudesEnVentana }), OTP_VENTANA_SEG);
  } else {
    cache.put(rateKey, JSON.stringify({ timestamps: [ahora] }), OTP_VENTANA_SEG);
  }

  // Generar código
  var codigo = String(Math.floor(100000 + Math.random() * 900000));

  // Almacenar con TTL
  cache.put(key, JSON.stringify({
    codigo: codigo,
    creado: ahora,
    intentos: 0
  }), OTP_TTL_SEG);

  // Enviar email
  try {
    var nombreDisplay = nombre || 'Usuario';
    MailApp.sendEmail({
      to: email,
      subject: '[corex] Tu código de acceso',
      body: 'Hola ' + nombreDisplay + ',\n\n' +
            'Tu código de acceso a corex es:\n\n' +
            '    ' + codigo + '\n\n' +
            'Válido por 10 minutos. No lo compartas con nadie.\n\n' +
            '---\ncorex'
    });
  } catch (err) {
    cache.remove(key);
    return { ok: false, error: 'OTP_ENVIO_FALLIDO', detalle: err.message };
  }

  return { ok: true };
}

function verificarOTP(email, codigo) {
  if (!email || !codigo) return { ok: false, error: 'DATOS_REQUERIDOS' };

  var cache = CacheService.getScriptCache();
  var key = 'otp_' + email;
  var data = cache.get(key);

  if (!data) return { ok: false, error: 'OTP_EXPIRADO' };

  var otp = JSON.parse(data);
  var ahora = Date.now();

  // Expirado
  if ((ahora - otp.creado) > (OTP_TTL_SEG * 1000)) {
    cache.remove(key);
    return { ok: false, error: 'OTP_EXPIRADO' };
  }

  // Bloqueado por intentos
  if (otp.intentos >= OTP_MAX_INTENTOS) {
    cache.remove(key);
    return { ok: false, error: 'OTP_BLOQUEADO' };
  }

  // Verificar código
  if (String(codigo).trim() !== String(otp.codigo).trim()) {
    otp.intentos++;
    cache.put(key, JSON.stringify(otp), OTP_TTL_SEG);
    if (otp.intentos >= OTP_MAX_INTENTOS) {
      return { ok: false, error: 'OTP_BLOQUEADO' };
    }
    return { ok: false, error: 'OTP_INCORRECTO', intentos_restantes: OTP_MAX_INTENTOS - otp.intentos };
  }

  // Éxito: limpiar
  cache.remove(key);
  return { ok: true };
}

function notificarEmail(destinatario, asunto, cuerpo) {
  if (!destinatario || !asunto || !cuerpo) {
    return { ok: false, error: 'DATOS_REQUERIDOS' };
  }

  try {
    MailApp.sendEmail({
      to: destinatario,
      subject: asunto,
      body: cuerpo
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'EMAIL_ENVIO_FALLIDO', detalle: err.message };
  }
}
