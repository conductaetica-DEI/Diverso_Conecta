// Lógica OTP — generación, verificación, rate limit, token de verificación

var OTP_MAX_SOLICITUDES = 3;
var OTP_VENTANA_SEG = 600;
var OTP_MAX_INTENTOS = 5;
var OTP_TTL_SEG = 600;
var TOKEN_TTL_SEG = 300;

function solicitarOTP(email, nombre, empresa) {
  if (!email) return { ok: false, error: 'EMAIL_REQUERIDO' };

  var cache = CacheService.getScriptCache();
  var clave_otp = 'otp_' + email;
  var clave_rate = 'rate_' + email;

  var ahora = Date.now();

  // Rate limit
  var datos_rate = cache.get(clave_rate);
  if (datos_rate) {
    var rate = JSON.parse(datos_rate);
    var solicitudes_en_ventana = rate.timestamps.filter(function(t) {
      return (ahora - t) < (OTP_VENTANA_SEG * 1000);
    });
    if (solicitudes_en_ventana.length >= OTP_MAX_SOLICITUDES) {
      return { ok: false, error: 'OTP_RATE_LIMIT' };
    }
    solicitudes_en_ventana.push(ahora);
    cache.put(clave_rate, JSON.stringify({ timestamps: solicitudes_en_ventana }), OTP_VENTANA_SEG);
  } else {
    cache.put(clave_rate, JSON.stringify({ timestamps: [ahora] }), OTP_VENTANA_SEG);
  }

  var codigo = String(Math.floor(100000 + Math.random() * 900000));

  cache.put(clave_otp, JSON.stringify({
    codigo: codigo,
    creado: ahora,
    intentos: 0
  }), OTP_TTL_SEG);

  try {
    enviar_otp_email(email, codigo, nombre, empresa);
  } catch (err) {
    cache.remove(clave_otp);
    return { ok: false, error: 'OTP_ENVIO_FALLIDO' };
  }

  return { ok: true };
}

function verificarOTP(email, codigo) {
  if (!email || !codigo) return { ok: false, error: 'DATOS_REQUERIDOS' };

  var cache = CacheService.getScriptCache();
  var clave_otp = 'otp_' + email;
  var datos = cache.get(clave_otp);

  if (!datos) return { ok: false, error: 'OTP_EXPIRADO' };

  var otp = JSON.parse(datos);
  var ahora = Date.now();

  if ((ahora - otp.creado) > (OTP_TTL_SEG * 1000)) {
    cache.remove(clave_otp);
    return { ok: false, error: 'OTP_EXPIRADO' };
  }

  if (otp.intentos >= OTP_MAX_INTENTOS) {
    cache.remove(clave_otp);
    return { ok: false, error: 'OTP_BLOQUEADO' };
  }

  if (String(codigo).trim() !== String(otp.codigo).trim()) {
    otp.intentos++;
    cache.put(clave_otp, JSON.stringify(otp), OTP_TTL_SEG);
    if (otp.intentos >= OTP_MAX_INTENTOS) {
      return { ok: false, error: 'OTP_BLOQUEADO' };
    }
    return { ok: false, error: 'OTP_INCORRECTO', intentos_restantes: OTP_MAX_INTENTOS - otp.intentos };
  }

  var usuario_auth = obtener_o_crear_usuario_auth(email);
  if (!usuario_auth) {
    return { ok: false, error: 'ERROR_CREAR_USUARIO' };
  }

  vincular_auth_user_id(email, usuario_auth.id);

  var sesion = generar_sesion_supabase(email, usuario_auth.id);
  if (!sesion) {
    return { ok: false, error: 'ERROR_GENERAR_SESION' };
  }

  cache.remove(clave_otp);

  var token = generar_token_verificacion();
  cache.put('tkn_' + email, JSON.stringify({
    token: token,
    creado: ahora
  }), TOKEN_TTL_SEG);

  return {
    ok: true,
    access_token: sesion.access_token,
    refresh_token: sesion.refresh_token,
    token_verificacion: token
  };
}

function verificarTokenVerificacion(email, token) {
  if (!email || !token) return { ok: false, error: 'DATOS_REQUERIDOS' };

  var cache = CacheService.getScriptCache();
  var clave_token = 'tkn_' + email;
  var datos = cache.get(clave_token);

  if (!datos) return { ok: false, error: 'TOKEN_EXPIRADO' };

  var info = JSON.parse(datos);
  var ahora = Date.now();

  if ((ahora - info.creado) > (TOKEN_TTL_SEG * 1000)) {
    cache.remove(clave_token);
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
