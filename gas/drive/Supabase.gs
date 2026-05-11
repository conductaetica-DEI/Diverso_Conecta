// Comunicación con Supabase — actualizar perfil con carpeta Drive

function actualizar_carpeta_perfil(profile_id, carpeta_drive_id) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL') +
    '/rest/v1/profiles?id=eq.' + encodeURIComponent(profile_id);
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
      carpeta_drive_id: carpeta_drive_id
    }),
    muteHttpExceptions: true
  });

  var codigo_http = respuesta.getResponseCode();
  return codigo_http >= 200 && codigo_http < 300;
}
