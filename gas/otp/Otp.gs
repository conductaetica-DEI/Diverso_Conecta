// Lógica OTP — generación, verificación, rate limit, token de verificación

var OTP_MAX_SOLICITUDES = 3;
var OTP_VENTANA_MS = 10 * 60 * 1000;
var OTP_MAX_INTENTOS = 5;
var OTP_TTL_MS = 10 * 60 * 1000;
var TOKEN_TTL_MS = 5 * 60 * 1000;

function solicitarOTP(email, nombre, empresa) {
  if (!email) return { ok: false, error: 'EMAIL_REQUERIDO' };

  var props = PropertiesService.getScriptProperties();
  var clave_otp = 'otp_' + email;
  var clave_rate = 'rate_' + email;

  var ahora = Date.now();

  // Rate limit
  var datos_rate = props.getProperty(clave_rate);
  if (datos_rate) {
    var rate = JSON.parse(datos_rate);
    var solicitudes_en_ventana = rate.timestamps.filter(function(t) {
      return (ahora - t) < OTP_VENTANA_MS;
    });
    if (solicitudes_en_ventana.length >= OTP_MAX_SOLICITUDES) {
      return { ok: false, error: 'OTP_RATE_LIMIT' };
    }
    solicitudes_en_ventana.push(ahora);
    props.setProperty(clave_rate, JSON.stringify({ timestamps: solicitudes_en_ventana }));
  } else {
    props.setProperty(clave_rate, JSON.stringify({ timestamps: [ahora] }));
  }

  var codigo = String(Math.floor(100000 + Math.random() * 900000));

  props.setProperty(clave_otp, JSON.stringify({
    codigo: codigo,
    creado: ahora,
    intentos: 0
  }));

  try {
    enviar_otp_email(email, codigo, nombre, empresa);
  } catch (err) {
    props.deleteProperty(clave_otp);
    return { ok: false, error: 'OTP_ENVIO_FALLIDO' };
  }

  return { ok: true };
}

function verificarOTP(email, codigo) {
  if (!email || !codigo) return { ok: false, error: 'DATOS_REQUERIDOS' };

  var props = PropertiesService.getScriptProperties();
  var clave_otp = 'otp_' + email;
  var datos = props.getProperty(clave_otp);

  if (!datos) return { ok: false, error: 'OTP_EXPIRADO' };

  var otp = JSON.parse(datos);
  var ahora = Date.now();

  if ((ahora - otp.creado) > OTP_TTL_MS) {
    props.deleteProperty(clave_otp);
    return { ok: false, error: 'OTP_EXPIRADO' };
  }

  if (otp.intentos >= OTP_MAX_INTENTOS) {
    props.deleteProperty(clave_otp);
    return { ok: false, error: 'OTP_BLOQUEADO' };
  }

  if (String(codigo).trim() !== String(otp.codigo).trim()) {
    otp.intentos++;
    props.setProperty(clave_otp, JSON.stringify(otp));
    if (otp.intentos >= OTP_MAX_INTENTOS) {
      return { ok: false, error: 'OTP_BLOQUEADO' };
    }
    return { ok: false, error: 'OTP_INCORRECTO', intentos_restantes: OTP_MAX_INTENTOS - otp.intentos };
  }

  props.deleteProperty(clave_otp);

  var token = generar_token_verificacion();
  props.setProperty('tkn_' + email, JSON.stringify({
    token: token,
    creado: ahora
  }));

  return { ok: true, token_verificacion: token };
}

function verificarTokenVerificacion(email, token) {
  if (!email || !token) return { ok: false, error: 'DATOS_REQUERIDOS' };

  var props = PropertiesService.getScriptProperties();
  var clave_token = 'tkn_' + email;
  var datos = props.getProperty(clave_token);

  if (!datos) return { ok: false, error: 'TOKEN_EXPIRADO' };

  var info = JSON.parse(datos);
  var ahora = Date.now();

  if ((ahora - info.creado) > TOKEN_TTL_MS) {
    props.deleteProperty(clave_token);
    return { ok: false, error: 'TOKEN_EXPIRADO' };
  }

  if (token !== info.token) {
    return { ok: false, error: 'TOKEN_INVALIDO' };
  }

  return { ok: true };
}

// Utilities.getUuid() usa SecureRandom de Java
function generar_token_verificacion() {
  var uuid1 = Utilities.getUuid().replace(/-/g, '');
  var uuid2 = Utilities.getUuid().replace(/-/g, '');
  return uuid1 + uuid2;
}
