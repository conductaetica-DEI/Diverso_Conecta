// Cliente GAS — helpers para llamar servicios OTP, Firma, Drive

var GAS_API_KEYS = {
  OTP: 'REEMPLAZAR_CON_OTP_API_KEY',
  FIRMA: 'REEMPLAZAR_CON_FIRMA_API_KEY',
  DRIVE: 'REEMPLAZAR_CON_DRIVE_API_KEY'
};

async function gas_fetch(url, api_key, datos) {
  var payload = Object.assign({}, datos, { api_key: api_key });

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
  return gas_fetch(CONFIG.GAS_OTP_URL, GAS_API_KEYS.OTP, datos);
}

async function verificar_otp(email, codigo) {
  var resultado = await gas_fetch(CONFIG.GAS_OTP_URL, GAS_API_KEYS.OTP, {
    action: 'verificarOTP',
    email: email,
    codigo: codigo
  });
  return resultado;
}

// --- Firma ---

async function firmar_consentimientos(datos) {
  datos.action = 'firmar';
  return gas_fetch(CONFIG.GAS_FIRMA_URL, GAS_API_KEYS.FIRMA, datos);
}

async function verificar_firma(folio) {
  return gas_fetch(CONFIG.GAS_FIRMA_URL, GAS_API_KEYS.FIRMA, {
    action: 'verificarFirma',
    folio: folio
  });
}

async function obtener_datos_firma(token) {
  return gas_fetch(CONFIG.GAS_FIRMA_URL, GAS_API_KEYS.FIRMA, {
    action: 'obtenerDatosFirma',
    token: token
  });
}

// --- Drive ---

async function crear_carpeta(datos) {
  datos.action = 'crearCarpeta';
  return gas_fetch(CONFIG.GAS_DRIVE_URL, GAS_API_KEYS.DRIVE, datos);
}
