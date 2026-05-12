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

function insertar_consentimientos(registros) {
  return llamar_edge_function('insertar_consentimientos', { registros: registros });
}

function consultar_por_folio(folio) {
  var resultado = llamar_edge_function('consultar_por_folio', { folio: folio });
  if (resultado.ok && resultado.data) {
    return resultado.data;
  }
  return null;
}

function registrar_log(persona_id, accion, modulo, detalle) {
  llamar_edge_function('registrar_log', {
    persona_id: persona_id || null,
    accion: accion,
    modulo: modulo,
    detalle: detalle
  });
}

function obtener_carpeta_perfil(perfil_id) {
  if (!perfil_id) return null;

  var resultado = llamar_edge_function('consultar_perfil', { perfil_id: perfil_id });
  if (resultado.ok && resultado.data && resultado.data.carpeta_drive_id) {
    return resultado.data.carpeta_drive_id;
  }
  return null;
}

function consultar_tarea_firma(token) {
  if (!token) return null;

  var resultado = llamar_edge_function('consultar_tarea', { tarea_id: token });
  if (resultado.ok && resultado.data) {
    return resultado.data;
  }
  return null;
}

function completar_tarea(tarea_id) {
  if (!tarea_id) return { ok: false };
  return llamar_edge_function('completar_tarea', { tarea_id: tarea_id });
}

function consultar_perfil(perfil_id) {
  if (!perfil_id) return null;

  var resultado = llamar_edge_function('consultar_perfil', { perfil_id: perfil_id });
  if (resultado.ok && resultado.data) {
    return resultado.data;
  }
  return null;
}
