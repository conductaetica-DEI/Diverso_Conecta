// Supabase via Edge Function proxy — evita restricción de sb_secret en User-Agent browser
// GAS llama a otp-admin Edge Function, que usa service_role internamente

function llamar_edge_function(accion, datos) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var pub = props.getProperty('SUPABASE_PUBLISHABLE_KEY');
  var gasSecret = props.getProperty('GAS_SHARED_SECRET');

  var payload = datos || {};
  payload.action = accion;

  var respuesta = UrlFetchApp.fetch(url + '/functions/v1/otp-admin', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': pub,
      'x-gas-secret': gasSecret
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var codigo = respuesta.getResponseCode();
  var body = respuesta.getContentText();

  try {
    return JSON.parse(body);
  } catch (e) {
    return { ok: false, error: 'EDGE_PARSE_ERROR', status: codigo, detalle: body };
  }
}

function obtener_o_crear_usuario_auth(email) {
  var resultado = llamar_edge_function('crear_usuario', { email: email });
  if (resultado.ok && resultado.user) {
    return resultado.user;
  }
  return { _error: true, detalle: resultado.error || JSON.stringify(resultado) };
}

function buscar_usuario_por_email(email) {
  var resultado = llamar_edge_function('crear_usuario', { email: email });
  if (resultado.ok && resultado.user) {
    return resultado.user;
  }
  return null;
}

function vincular_auth_user_id(email, auth_user_id) {
  llamar_edge_function('vincular_perfil', {
    email: email,
    auth_user_id: auth_user_id
  });
}

function generar_sesion_supabase(email, auth_user_id) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var pub = props.getProperty('SUPABASE_PUBLISHABLE_KEY');

  var clave_temporal = Utilities.getUuid() + Utilities.getUuid();

  var resp_set = llamar_edge_function('set_password', {
    auth_user_id: auth_user_id,
    password: clave_temporal
  });

  if (!resp_set.ok) {
    return { _error: true, paso: 'set_password', detalle: resp_set.error || JSON.stringify(resp_set) };
  }

  var resp_sesion = UrlFetchApp.fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': pub
    },
    payload: JSON.stringify({
      email: email,
      password: clave_temporal
    }),
    muteHttpExceptions: true
  });

  if (resp_sesion.getResponseCode() !== 200) {
    return { _error: true, paso: 'token_exchange', status: resp_sesion.getResponseCode(), detalle: resp_sesion.getContentText() };
  }

  return JSON.parse(resp_sesion.getContentText());
}
