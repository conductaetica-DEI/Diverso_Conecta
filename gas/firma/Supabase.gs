// Comunicación con Supabase — inserts y consultas via REST API

function insertar_consentimientos(registros) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') + '/rest/v1/consentimientos';
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=minimal'
    },
    payload: JSON.stringify(registros),
    muteHttpExceptions: true
  });

  var codigo_http = respuesta.getResponseCode();
  if (codigo_http >= 200 && codigo_http < 300) {
    return { ok: true };
  }

  return { ok: false, codigo: codigo_http };
}

function consultar_por_folio(folio) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') +
    '/rest/v1/consentimientos?folio=eq.' + encodeURIComponent(folio) +
    '&select=folio,tipo_firma,nombre_firmante,email_firmante,codigo,version,aceptado,programa,created_at' +
    '&limit=1';
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    muteHttpExceptions: true
  });

  var datos = JSON.parse(respuesta.getContentText());
  if (datos && datos.length > 0) {
    return datos[0];
  }

  return null;
}

function registrar_log(persona_id, accion, modulo, detalle) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') + '/rest/v1/logs_actividad';
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=minimal'
    },
    payload: JSON.stringify({
      persona_id: persona_id || null,
      accion: accion,
      modulo: modulo,
      detalle: detalle
    }),
    muteHttpExceptions: true
  });
}

function obtener_carpeta_perfil(perfil_id) {
  if (!perfil_id) return null;

  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') +
    '/rest/v1/profiles?id=eq.' + encodeURIComponent(perfil_id) +
    '&select=carpeta_drive_id' +
    '&limit=1';
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    muteHttpExceptions: true
  });

  var datos = JSON.parse(respuesta.getContentText());
  if (datos && datos.length > 0 && datos[0].carpeta_drive_id) {
    return datos[0].carpeta_drive_id;
  }

  return null;
}

function consultar_tarea_firma(token) {
  if (!token) return null;

  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') +
    '/rest/v1/tareas?id=eq.' + encodeURIComponent(token) +
    '&select=id,perfil_id,tipo_tarea,detalle,estado' +
    '&limit=1';
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    muteHttpExceptions: true
  });

  var datos = JSON.parse(respuesta.getContentText());
  if (datos && datos.length > 0) {
    return datos[0];
  }

  return null;
}

function completar_tarea(tarea_id) {
  if (!tarea_id) return { ok: false };

  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') +
    '/rest/v1/tareas?id=eq.' + encodeURIComponent(tarea_id);
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=minimal'
    },
    payload: JSON.stringify({
      estado: 'completada',
      fecha_completada: new Date().toISOString()
    }),
    muteHttpExceptions: true
  });

  var codigo_http = respuesta.getResponseCode();
  return { ok: codigo_http >= 200 && codigo_http < 300 };
}

function consultar_perfil(perfil_id) {
  if (!perfil_id) return null;

  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') +
    '/rest/v1/profiles?id=eq.' + encodeURIComponent(perfil_id) +
    '&select=nombre,apellido,razon_social,email_principal,tipo_documento,numero_documento,profile_type' +
    '&limit=1';
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    muteHttpExceptions: true
  });

  var datos = JSON.parse(respuesta.getContentText());
  if (datos && datos.length > 0) {
    return datos[0];
  }

  return null;
}
