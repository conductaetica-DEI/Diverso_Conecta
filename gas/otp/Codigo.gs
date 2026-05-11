// Servicio OTP — verificación de identidad por email para DiversoLab

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var acciones_publicas = ['solicitarOTP', 'verificarOTP'];
    if (acciones_publicas.indexOf(body.action) === -1) {
      var auth = autenticar(body);
      if (!auth.ok) {
        return respuesta_json({ ok: false, error: 'NO_AUTORIZADO' });
      }
    }

    var resultado;
    switch (body.action) {
      case 'solicitarOTP':
        resultado = solicitarOTP(body.email, body.nombre, body.empresa);
        break;
      case 'verificarOTP':
        resultado = verificarOTP(body.email, body.codigo);
        break;
      case 'verificarTokenVerificacion':
        resultado = verificarTokenVerificacion(body.email, body.token);
        break;
      case 'notificarEmail':
        resultado = notificarEmail(body.destinatario, body.asunto, body.cuerpo);
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
  return respuesta_json({ ok: true, servicio: 'DiversoLab OTP', version: '1.0' });
}

function respuesta_json(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON);
}
