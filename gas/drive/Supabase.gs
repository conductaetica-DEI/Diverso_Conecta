// Supabase via Edge Function proxy — evita restricción de sb_secret en User-Agent browser
// GAS llama a db-admin Edge Function, que usa service_role internamente

function llamar_edge_function(accion, datos) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var pub = props.getProperty('SUPABASE_PUBLISHABLE_KEY');
  var gasSecret = props.getProperty('GAS_SHARED_SECRET');

  var payload = datos || {};
  payload.action = accion;

  var respuesta = UrlFetchApp.fetch(url + '/functions/v1/db-admin', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': pub,
      'x-gas-secret': gasSecret
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  try {
    return JSON.parse(respuesta.getContentText());
  } catch (e) {
    return { ok: false, error: 'EDGE_PARSE_ERROR', detalle: respuesta.getContentText() };
  }
}

function actualizar_carpeta_perfil(profile_id, carpeta_drive_id) {
  var resultado = llamar_edge_function('actualizar_carpeta', {
    perfil_id: profile_id,
    carpeta_drive_id: carpeta_drive_id
  });
  return resultado.ok;
}
