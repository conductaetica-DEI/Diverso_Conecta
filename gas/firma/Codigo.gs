// Servicio Firma — firma electrónica de consentimientos para DiversoLab

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // token_verificacion y UUID de tarea protegen cada acción
    var acciones_publicas = ['firmar', 'verificarFirma', 'obtenerDatosFirma'];
    if (acciones_publicas.indexOf(body.action) === -1) {
      var auth = autenticar(body);
      if (!auth.ok) {
        return respuesta_json({ ok: false, error: 'NO_AUTORIZADO' });
      }
    }

    var resultado;
    switch (body.action) {
      case 'firmar':
        resultado = firmar(body);
        break;
      case 'verificarFirma':
        resultado = verificarFirma(body.folio);
        break;
      case 'obtenerDatosFirma':
        resultado = obtener_datos_firma(body.token);
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
  return respuesta_json({ ok: true, servicio: 'DiversoLab Firma', version: '1.0' });
}

function respuesta_json(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON);
}
