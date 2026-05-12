// Lógica principal — firmar consentimientos y verificar folios

function firmar(datos) {
  // 1. Verificar token OTP
  var verificacion = verificar_token_otp(datos.firmante.email, datos.token_verificacion);
  if (!verificacion.ok) {
    return { ok: false, error: 'TOKEN_INVALIDO' };
  }

  // 2. Validar firmante
  var error_firmante = validar_firmante(datos.tipo_firma, datos.firmante);
  if (error_firmante) return error_firmante;

  // 3. Validar consentimientos obligatorios
  var error_consentimientos = validar_consentimientos(datos.consentimientos);
  if (error_consentimientos) return error_consentimientos;

  // 4. Generar folios y hashes por cada consentimiento
  var timestamp = new Date().toISOString();
  var registros = [];
  var folios = [];

  for (var i = 0; i < datos.consentimientos.length; i++) {
    var c = datos.consentimientos[i];
    var folio = generar_folio(c.codigo);
    var hash = generar_hash(
      datos.firmante.email,
      c.codigo,
      c.version,
      timestamp,
      datos.ip_address || ''
    );

    folios.push(folio);

    var registro = {
      perfil_id: datos.perfil_id || null,
      tipo_firma: datos.tipo_firma,
      email_firmante: datos.firmante.email,
      nombre_firmante: datos.firmante.nombre,
      tipo_documento_firmante: datos.firmante.tipo_documento,
      numero_documento_firmante: datos.firmante.numero_documento,
      empresa: null,
      nit_empresa: null,
      cargo_firmante: null,
      codigo: c.codigo,
      version: c.version,
      texto_aceptado: c.texto,
      aceptado: c.aceptado,
      es_obligatorio: c.es_obligatorio || false,
      folio: folio,
      hash_firma: hash,
      ip_address: datos.ip_address || null,
      user_agent: datos.user_agent || null,
      solicitado_por: datos.solicitado_por || null,
      programa: datos.programa || null
    };

    if (datos.tipo_firma === 'persona_juridica') {
      registro.empresa = datos.firmante.empresa;
      registro.nit_empresa = datos.firmante.nit_empresa;
      registro.cargo_firmante = datos.firmante.cargo;
    }

    registros.push(registro);
  }

  // 5. Insertar en Supabase
  var insercion = insertar_consentimientos(registros);
  if (!insercion.ok) {
    return { ok: false, error: 'ERROR_REGISTRO_BD' };
  }

  // 6. Generar PDF con anexos legales
  var pdf = generar_pdf_constancia(datos, registros, timestamp);

  // 7. Enviar email con PDF adjunto
  try {
    var reply_to = PropertiesService.getScriptProperties().getProperty('EMAIL_REPLY_TO');

    MailApp.sendEmail({
      to: datos.firmante.email,
      subject: '[DiversoLab] Constancia de consentimiento informado',
      body: 'Adjunto encontrará la constancia de consentimiento informado firmado.\n\n' +
            'Folios: ' + folios.join(', ') + '\n\n' +
            'Este documento incluye como anexos la Política de Protección de Datos (SICE-POL-01) ' +
            'y el Consentimiento Informado Integral (F-DATO-01), disponibles en diversolab.org/politica\n\n' +
            '— DiversoLab',
      attachments: [pdf.archivo],
      replyTo: reply_to,
      name: 'DiversoLab'
    });
  } catch (err) {
    // PDF ya se generó y subió a Drive — el email es best-effort
  }

  // 8. Completar tarea si viene de firma solicitada
  if (datos.tarea_id) {
    completar_tarea(datos.tarea_id);
  }

  // 9. Registrar en logs
  registrar_log(datos.perfil_id, 'FIRMA_CONSENTIMIENTOS', 'firma', {
    folios: folios,
    tipo_firma: datos.tipo_firma,
    email: datos.firmante.email,
    programa: datos.programa
  });

  var c1 = null;
  for (var r = 0; r < registros.length; r++) {
    if (registros[r].codigo === 'C1') { c1 = registros[r]; break; }
  }

  return {
    ok: true,
    folios: folios,
    pdf_url: pdf.url,
    c1: c1 ? {
      decision: c1.aceptado ? 'ACEPTADO' : 'RECHAZADO',
      folio: c1.folio,
      hash: c1.hash_firma
    } : null
  };
}

function verificarFirma(folio) {
  if (!folio) return { ok: false, error: 'DATOS_REQUERIDOS' };

  var resultado = consultar_por_folio(folio);
  if (!resultado) {
    return { ok: false, error: 'FOLIO_NO_ENCONTRADO' };
  }

  return {
    ok: true,
    datos_firma: {
      folio: resultado.folio,
      tipo_firma: resultado.tipo_firma,
      nombre_firmante: resultado.nombre_firmante,
      email_firmante: resultado.email_firmante,
      codigo: resultado.codigo,
      version: resultado.version,
      aceptado: resultado.aceptado,
      programa: resultado.programa,
      created_at: resultado.created_at
    }
  };
}

function obtener_datos_firma(token) {
  if (!token) return { ok: false, error: 'DATOS_REQUERIDOS' };

  var tarea = consultar_tarea_firma(token);
  if (!tarea) {
    return { ok: false, error: 'TAREA_NO_ENCONTRADA' };
  }

  if (tarea.estado !== 'pendiente') {
    return { ok: false, error: 'TAREA_YA_COMPLETADA' };
  }

  if (tarea.tipo_tarea !== 'consentimiento') {
    return { ok: false, error: 'TAREA_NO_ES_CONSENTIMIENTO' };
  }

  var perfil = consultar_perfil(tarea.perfil_id);
  if (!perfil) {
    return { ok: false, error: 'PERFIL_NO_ENCONTRADO' };
  }

  var config = {};
  try {
    config = JSON.parse(tarea.detalle);
  } catch (e) {
    config = {};
  }

  var tipo_firma = config.tipo_firma || 'persona_natural';
  var es_empresa = perfil.profile_type === 'aliado' || perfil.profile_type === 'proveedor';

  var firmante = {
    nombre: perfil.razon_social || ((perfil.nombre || '') + ' ' + (perfil.apellido || '')).trim(),
    email: perfil.email_principal,
    tipo_documento: perfil.tipo_documento,
    numero_documento: perfil.numero_documento,
    telefono: perfil.telefono || null
  };

  if (es_empresa) {
    firmante.empresa = perfil.razon_social;
    firmante.nit_empresa = perfil.numero_documento;
    firmante.cargo = config.cargo || null;
    tipo_firma = 'persona_juridica';
  }

  return {
    ok: true,
    tarea_id: tarea.id,
    perfil_id: tarea.perfil_id,
    tipo_firma: tipo_firma,
    firmante: firmante,
    programa: config.programa || null,
    obligatorios: config.obligatorios || ['C1', 'C2']
  };
}

function verificar_token_otp(email, token) {
  var props = PropertiesService.getScriptProperties();
  var otp_url = props.getProperty('OTP_URL');
  var otp_api_key = props.getProperty('OTP_API_KEY');

  var respuesta = UrlFetchApp.fetch(otp_url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      api_key: otp_api_key,
      action: 'verificarTokenVerificacion',
      email: email,
      token: token
    }),
    muteHttpExceptions: true
  });

  return JSON.parse(respuesta.getContentText());
}

function validar_firmante(tipo_firma, firmante) {
  if (!firmante || !firmante.nombre || !firmante.email ||
      !firmante.tipo_documento || !firmante.numero_documento) {
    return { ok: false, error: 'DATOS_FIRMANTE_INCOMPLETOS' };
  }

  if (tipo_firma === 'persona_juridica') {
    if (!firmante.cargo || !firmante.empresa || !firmante.nit_empresa) {
      return { ok: false, error: 'DATOS_EMPRESA_REQUERIDOS' };
    }
  }

  return null;
}

function validar_consentimientos(consentimientos) {
  if (!consentimientos || !consentimientos.length) {
    return { ok: false, error: 'CONSENTIMIENTOS_REQUERIDOS' };
  }

  var faltantes = [];
  for (var i = 0; i < consentimientos.length; i++) {
    var c = consentimientos[i];
    if (c.es_obligatorio && !c.aceptado) {
      faltantes.push(c.codigo);
    }
  }

  if (faltantes.length > 0) {
    return { ok: false, error: 'OBLIGATORIOS_FALTANTES', faltantes: faltantes };
  }

  return null;
}
