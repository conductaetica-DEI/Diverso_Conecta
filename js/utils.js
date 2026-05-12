// Utilidades — toasts, mensajes, validación, formato, helpers de UI

// --- Mapa de mensajes amigables ---

var MENSAJES_USUARIO = {
  'NO_AUTORIZADO': 'No tienes permiso para realizar esta acción.',
  'OTP_RATE_LIMIT': 'Has solicitado demasiados códigos. Espera 10 minutos.',
  'OTP_EXPIRADO': 'El código expiró. Solicita uno nuevo.',
  'OTP_INCORRECTO': 'Código incorrecto. Intenta de nuevo.',
  'OTP_BLOQUEADO': 'Demasiados intentos. Espera 10 minutos e intenta de nuevo.',
  'PERFIL_NO_ENCONTRADO': 'No encontramos una cuenta con ese correo.',
  'PERFIL_INACTIVO': 'Tu cuenta está suspendida. Contacta a DiversoLab.',
  'PERFIL_PENDIENTE': 'Tu solicitud está en revisión. Te notificaremos por email.',
  'DOCUMENTO_DUPLICADO': 'Ya existe un registro con ese tipo y número de documento.',
  'FIRMA_OBLIGATORIOS_FALTANTES': 'Debes aceptar todos los consentimientos obligatorios.',
  'ERROR_SERVIDOR': 'Ocurrió un error. Intenta de nuevo o contacta soporte.',
  'TOKEN_INVALIDO': 'La verificación expiró. Solicita un nuevo código.',
  'DATOS_FIRMANTE_INCOMPLETOS': 'Faltan datos del firmante. Verifica el formulario.',
  'DATOS_EMPRESA_REQUERIDOS': 'Los datos de la empresa son obligatorios.',
  'DATOS_REQUERIDOS': 'Faltan datos obligatorios.',
  'ACCION_INVALIDA': 'Ocurrió un error. Intenta de nuevo o contacta soporte.',
  'ERROR_REGISTRO_BD': 'Ocurrió un error al guardar. Intenta de nuevo.',
  'FOLIO_NO_ENCONTRADO': 'No se encontró un registro con ese folio.',
  'CONSENTIMIENTOS_REQUERIDOS': 'Debes responder todos los consentimientos.',
  'OBLIGATORIOS_FALTANTES': 'Debes aceptar todos los consentimientos obligatorios.',
  'TIPO_PERFIL_INVALIDO': 'Tipo de perfil no válido.',
  'NOMBRE_REQUERIDO': 'El nombre es obligatorio.',
  'RAZON_SOCIAL_REQUERIDA': 'La razón social es obligatoria.',
  'TAREA_NO_ENCONTRADA': 'No se encontró la solicitud de firma. Verifica el enlace.',
  'TAREA_YA_COMPLETADA': 'Esta solicitud de firma ya fue completada.',
  'TAREA_NO_ES_CONSENTIMIENTO': 'El enlace no corresponde a una solicitud de firma.',
  'EMAIL_DUPLICADO': 'Ya existe una cuenta con ese correo electrónico.',
  'CAMPOS_OBLIGATORIOS': 'Todos los campos son obligatorios.',
  'DOCUMENTO_INVALIDO': 'Número de documento no válido.',
  'MIEMBRO_EMAIL_DUPLICADO': 'Ya existe un miembro con ese correo.',
  'MIEMBRO_DOC_DUPLICADO': 'Ya existe un perfil con ese documento.',
  'SELECCIONAR_PERFIL_ASIGNAR': 'Selecciona un perfil para asignar.',
  'PERFIL_PROPIO_NO_ENCONTRADO': 'No se encontró tu perfil.',
  'SELECCIONAR_PERFIL_TIPO': 'Selecciona un perfil y un tipo de tarea.',
  'SELECCIONAR_PERFIL': 'Busca y selecciona un perfil.',
  'PROGRAMA_REQUERIDO': 'Ingresa el programa.',
  'EXTERNO_CAMPOS_OBLIGATORIOS': 'Completa todos los campos obligatorios del firmante externo.',
  'PERFIL_NO_ENCONTRADO': 'Perfil no encontrado.'
};

var MENSAJE_FALLBACK = 'Ocurrió un error. Intenta de nuevo o contacta soporte.';

function mensaje_usuario(codigo_error, detalle) {
  var msg = MENSAJES_USUARIO[codigo_error] || (MENSAJE_FALLBACK + ' [' + codigo_error + ']');
  if (detalle) msg += ' — ' + detalle;
  return msg;
}

// --- Toast / Notificaciones ---

var _toast_timeout = null;

function mostrar_error(mensaje) {
  _mostrar_toast(mensaje, 'notificacion-error');
}

function mostrar_exito(mensaje) {
  _mostrar_toast(mensaje, 'notificacion-exito');
}

function _mostrar_toast(mensaje, clase) {
  var existente = document.querySelector('.notificacion');
  if (existente) existente.remove();

  var toast = document.createElement('div');
  toast.className = 'notificacion ' + clase;
  toast.setAttribute('role', 'alert');
  toast.textContent = mensaje;

  document.body.appendChild(toast);

  requestAnimationFrame(function() {
    toast.classList.add('notificacion-visible');
  });

  if (_toast_timeout) clearTimeout(_toast_timeout);
  _toast_timeout = setTimeout(function() {
    toast.classList.remove('notificacion-visible');
    setTimeout(function() { toast.remove(); }, 300);
  }, 5000);
}

// --- Seguridad ---

function escapar_html(texto) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(texto));
  return div.innerHTML;
}

// --- Formato ---

function formatear_fecha(timestamp) {
  var fecha = new Date(timestamp);
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// --- Botones ---

function deshabilitar_boton(boton, texto_carga) {
  boton.disabled = true;
  boton.dataset.textoOriginal = boton.textContent;
  boton.textContent = texto_carga || 'Procesando...';
  boton.classList.add('btn-cargando');
}

function habilitar_boton(boton, texto_original) {
  boton.disabled = false;
  boton.textContent = texto_original || boton.dataset.textoOriginal || 'Enviar';
  boton.classList.remove('btn-cargando');
}

// --- Validación ---

function validar_email(email) {
  if (!email) return false;
  var patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return patron.test(email);
}

function validar_documento(tipo, numero) {
  if (!tipo || !numero) return false;
  var limpio = numero.replace(/\s/g, '');
  if (!limpio) return false;

  if (tipo === 'CC' || tipo === 'TI' || tipo === 'CE') {
    return /^[0-9]{5,15}$/.test(limpio);
  }
  if (tipo === 'NIT') {
    return /^[0-9]{6,12}(-[0-9])?$/.test(limpio);
  }
  if (tipo === 'PA') {
    return /^[a-zA-Z0-9]{5,20}$/.test(limpio);
  }

  return limpio.length >= 5;
}

// --- Tipo de documento ---

var TIPOS_DOCUMENTO = {
  'CC': 'Cédula de Ciudadanía',
  'CE': 'Cédula de Extranjería',
  'NIT': 'NIT',
  'PA': 'Pasaporte',
  'PEP': 'Permiso Especial de Permanencia',
  'PPT': 'Permiso por Protección Temporal',
  'TI': 'Tarjeta de Identidad'
};

function formatear_tipo_documento(sigla) {
  return TIPOS_DOCUMENTO[sigla] || sigla;
}

// --- IP del cliente ---

async function obtener_ip() {
  try {
    var respuesta = await fetch('https://api.ipify.org?format=json');
    var datos = await respuesta.json();
    return datos.ip;
  } catch (e) {
    return 'No disponible';
  }
}
