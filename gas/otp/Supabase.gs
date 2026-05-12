// Supabase Admin API — crear usuarios auth, vincular profiles, generar sesiones

function obtener_o_crear_usuario_auth(email) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url + '/auth/v1/admin/users', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    payload: JSON.stringify({
      email: email,
      email_confirm: true
    }),
    muteHttpExceptions: true
  });

  var codigo = respuesta.getResponseCode();
  if (codigo === 200 || codigo === 201) {
    return JSON.parse(respuesta.getContentText());
  }

  if (codigo === 422 || codigo === 400) {
    return buscar_usuario_por_email(email);
  }

  return null;
}

function buscar_usuario_por_email(email) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  var respuesta = UrlFetchApp.fetch(url + '/auth/v1/admin/users', {
    method: 'get',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    muteHttpExceptions: true
  });

  if (respuesta.getResponseCode() !== 200) return null;

  var datos = JSON.parse(respuesta.getContentText());
  var usuarios = datos.users || [];
  for (var i = 0; i < usuarios.length; i++) {
    if (usuarios[i].email === email) return usuarios[i];
  }
  return null;
}

function vincular_auth_user_id(email, auth_user_id) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  UrlFetchApp.fetch(
    url + '/rest/v1/profiles?email_principal=eq.' + encodeURIComponent(email) + '&auth_user_id=is.null',
    {
      method: 'patch',
      contentType: 'application/json',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'return=minimal'
      },
      payload: JSON.stringify({
        auth_user_id: auth_user_id,
        updated_at: new Date().toISOString()
      }),
      muteHttpExceptions: true
    }
  );
}

function generar_sesion_supabase(email, auth_user_id) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  // Contraseña temporal aleatoria — solo vive durante este request
  var clave_temporal = Utilities.getUuid() + Utilities.getUuid();

  var resp_clave = UrlFetchApp.fetch(url + '/auth/v1/admin/users/' + auth_user_id, {
    method: 'put',
    contentType: 'application/json',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    payload: JSON.stringify({
      password: clave_temporal
    }),
    muteHttpExceptions: true
  });

  if (resp_clave.getResponseCode() !== 200) return null;

  var resp_sesion = UrlFetchApp.fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': key
    },
    payload: JSON.stringify({
      email: email,
      password: clave_temporal
    }),
    muteHttpExceptions: true
  });

  if (resp_sesion.getResponseCode() !== 200) return null;

  return JSON.parse(resp_sesion.getContentText());
}
