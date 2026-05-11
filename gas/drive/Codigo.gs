// Servicio Drive — gestión de carpetas de expedientes para DiversoLab

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var clave_esperada = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!body.api_key || body.api_key !== clave_esperada) {
      return respuesta_json({ ok: false, error: 'NO_AUTORIZADO' });
    }

    var resultado;
    switch (body.action) {
      case 'crearCarpeta':
        resultado = crear_carpeta_expediente(body);
        break;
      default:
        resultado = { ok: false, error: 'ACCION_INVALIDA' };
    }

    return respuesta_json(resultado);
  } catch (err) {
    return respuesta_json({ ok: false, error: 'ERROR_SERVIDOR' });
  }
}

function doGet() {
  return respuesta_json({ ok: true, servicio: 'DiversoLab Drive', version: '1.0' });
}

function respuesta_json(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON);
}
