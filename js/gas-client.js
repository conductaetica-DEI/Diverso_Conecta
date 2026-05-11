// Cliente GAS — helpers para llamar servicios OTP, Firma, Drive

async function gas_fetch(url, datos) {
  var payload = Object.assign({}, datos);

  if (typeof obtener_sesion === 'function') {
    try {
      var sesion = await obtener_sesion();
      if (sesion) {
        payload.jwt = sesion.access_token;
      }
    } catch (e) {
      // Sin sesión — continuar sin JWT
    }
  }

  var respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });

  var resultado = await respuesta.json();

  if (!resultado.ok) {
    throw new Error(resultado.error || 'ERROR_SERVIDOR');
  }

  return resultado;
}

// --- OTP ---

async function solicitar_otp(email, nombre, empresa) {
  var datos = {
    action: 'solicitarOTP',
    email: email,
    nombre: nombre
  };
  if (empresa) {
    datos.empresa = empresa;
  }
  return gas_fetch(CONFIG.GAS_OTP_URL, datos);
}

async function verificar_otp(email, codigo) {
  return gas_fetch(CONFIG.GAS_OTP_URL, {
    action: 'verificarOTP',
    email: email,
    codigo: codigo
  });
}

// --- Firma ---

async function firmar_consentimientos(datos) {
  datos.action = 'firmar';
  return gas_fetch(CONFIG.GAS_FIRMA_URL, datos);
}

async function verificar_firma(folio) {
  return gas_fetch(CONFIG.GAS_FIRMA_URL, {
    action: 'verificarFirma',
    folio: folio
  });
}

async function obtener_datos_firma(token) {
  return gas_fetch(CONFIG.GAS_FIRMA_URL, {
    action: 'obtenerDatosFirma',
    token: token
  });
}

async function notificar_email(destinatario, asunto, cuerpo) {
  return gas_fetch(CONFIG.GAS_OTP_URL, {
    action: 'notificarEmail',
    destinatario: destinatario,
    asunto: asunto,
    cuerpo: cuerpo
  });
}

// --- Drive ---

async function crear_carpeta(datos) {
  datos.action = 'crearCarpeta';
  return gas_fetch(CONFIG.GAS_DRIVE_URL, datos);
}
