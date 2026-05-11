// Autenticación — verificar JWT de Supabase o API key de servicios GAS

function verificar_jwt(token) {
  var props = PropertiesService.getScriptProperties();
  var supabase_url = props.getProperty('SUPABASE_URL');
  var service_key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(supabase_url + '/auth/v1/user', {
    method: 'get',
    headers: {
      'apikey': service_key,
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  });

  if (respuesta.getResponseCode() !== 200) {
    return { ok: false, error: 'JWT_INVALIDO' };
  }

  var usuario = JSON.parse(respuesta.getContentText());
  return { ok: true, usuario: usuario };
}

function autenticar(body) {
  if (body.jwt) {
    return verificar_jwt(body.jwt);
  }

  if (body.api_key) {
    var clave_esperada = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (body.api_key === clave_esperada) {
      return { ok: true, tipo: 'api_key' };
    }
    return { ok: false, error: 'API_KEY_INVALIDA' };
  }

  return { ok: false, error: 'NO_AUTORIZADO' };
}
