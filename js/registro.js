// Registro — lógica de auto-registro de perfiles externos
// Depende de: config.js, gas-client.js, utils.js, labels.js, otp-ui.js, consentimientos.js

var estado = {
  tipo_perfil: null,
  es_juridica: false,
  paso_actual: 1,
  ip_cliente: null,
  token_verificacion: null,
  access_token: null,
  temporizador_id: null,
  segundos_reenvio: 0,
  reloj_id: null
};

document.addEventListener('DOMContentLoaded', function() {
  obtener_ip().then(function(ip) { estado.ip_cliente = ip; }).catch(function() {});
  inicializar_docs();
  vincular_eventos();
});

function inicializar_docs() {
  var base = 'https://docs.google.com/document/d/';
  document.getElementById('iframe-sice-pol-01').src = base + CONFIG.DOC_SICE_POL_01 + '/preview';
  document.getElementById('link-sice-pol-01').href = base + CONFIG.DOC_SICE_POL_01;
  document.getElementById('iframe-f-dato-01').src = base + CONFIG.DOC_F_DATO_01 + '/preview';
  document.getElementById('link-f-dato-01').href = base + CONFIG.DOC_F_DATO_01;
}

function vincular_eventos() {
  document.getElementById('tipo-grid').addEventListener('click', function(e) {
    var card = e.target.closest('.tipo-card');
    if (card) al_seleccionar_tipo(card.dataset.tipo);
  });
  document.getElementById('btn-paso-1').addEventListener('click', function() { avanzar_a_paso(2); });

  document.getElementById('btn-volver-1').addEventListener('click', function() { mostrar_paso(1); });
  document.getElementById('btn-paso-2').addEventListener('click', al_continuar_paso_2);
  vincular_validacion_blur();

  document.getElementById('btn-volver-2').addEventListener('click', volver_desde_paso_3);
  document.getElementById('btn-enviar-codigo').addEventListener('click', al_enviar_otp);
  document.getElementById('btn-verificar-otp').addEventListener('click', al_verificar_y_registrar);
  document.getElementById('btn-reenviar').addEventListener('click', al_reenviar_otp);
}

function vincular_validacion_blur() {
  var campos_blur = [
    'campo-nombre', 'campo-apellido', 'campo-razon-social',
    'campo-nit-empresa', 'campo-nombre-firmante', 'campo-apellido-firmante',
    'campo-cargo', 'campo-tipo-doc', 'campo-num-doc',
    'campo-tipo-doc-firmante', 'campo-num-doc-firmante',
    'campo-email', 'campo-telefono'
  ];
  for (var i = 0; i < campos_blur.length; i++) {
    var el = document.getElementById(campos_blur[i]);
    if (el) el.addEventListener('blur', al_blur_campo);
  }
}

function al_blur_campo(e) {
  validar_campo_individual(e.target.id);
}

// --- Step 1: Tipo de perfil ---

function al_seleccionar_tipo(clave) {
  estado.tipo_perfil = clave;
  estado.es_juridica = (clave === 'aliado' || clave === 'proveedor');

  var cards = document.querySelectorAll('.tipo-card');
  for (var i = 0; i < cards.length; i++) {
    cards[i].classList.toggle('seleccionado', cards[i].dataset.tipo === clave);
  }

  document.getElementById('btn-paso-1').disabled = false;
}

// --- Step 2: Datos ---

function preparar_formulario() {
  document.getElementById('campos-natural').hidden = estado.es_juridica;
  document.getElementById('campos-juridica').hidden = !estado.es_juridica;
  document.getElementById('campos-firmante-juridica').hidden = !estado.es_juridica;
}

function al_continuar_paso_2() {
  if (validar_paso_datos()) {
    avanzar_a_paso(3);
  }
}

function validar_paso_datos() {
  var resultados = [];

  if (estado.es_juridica) {
    resultados.push(validar_campo_individual('campo-razon-social'));
    resultados.push(validar_campo_individual('campo-nit-empresa'));
    resultados.push(validar_campo_individual('campo-nombre-firmante'));
    resultados.push(validar_campo_individual('campo-apellido-firmante'));
    resultados.push(validar_campo_individual('campo-cargo'));
    resultados.push(validar_campo_individual('campo-tipo-doc-firmante'));
    resultados.push(validar_campo_individual('campo-num-doc-firmante'));
  } else {
    resultados.push(validar_campo_individual('campo-nombre'));
    resultados.push(validar_campo_individual('campo-apellido'));
    resultados.push(validar_campo_individual('campo-tipo-doc'));
    resultados.push(validar_campo_individual('campo-num-doc'));
  }

  resultados.push(validar_campo_individual('campo-email'));
  resultados.push(validar_campo_individual('campo-telefono'));

  for (var i = 0; i < resultados.length; i++) {
    if (!resultados[i]) return false;
  }
  return true;
}

function validar_campo_individual(id) {
  var input = document.getElementById(id);
  if (!input) return true;
  if (input.hidden || (input.closest && input.closest('[hidden]'))) return true;

  var valor = input.value.trim();
  var valido = true;

  switch (id) {
    case 'campo-email':
      valido = validar_email(valor);
      break;
    case 'campo-num-doc':
      var tipo = document.getElementById('campo-tipo-doc').value;
      valido = tipo ? validar_documento(tipo, valor) : valor.length > 0;
      break;
    case 'campo-num-doc-firmante':
      var tipo_f = document.getElementById('campo-tipo-doc-firmante').value;
      valido = tipo_f ? validar_documento(tipo_f, valor) : valor.length > 0;
      break;
    case 'campo-nit-empresa':
      valido = validar_documento('NIT', valor);
      break;
    case 'campo-telefono':
      valido = valor.replace(/[\s+\-()]/g, '').length >= 7;
      break;
    case 'campo-tipo-doc':
    case 'campo-tipo-doc-firmante':
      valido = valor.length > 0;
      break;
    default:
      valido = valor.length > 0;
  }

  var error_el = document.getElementById(id + '-error');
  input.classList.toggle('campo-error', !valido);
  input.classList.toggle('campo-valido', valido && valor.length > 0);
  if (error_el) error_el.hidden = valido;

  return valido;
}

// --- Step 3: Firmante resumen ---

function poblar_firmante_resumen() {
  if (estado.es_juridica) {
    document.getElementById('resumen-natural').hidden = true;
    document.getElementById('resumen-juridica').hidden = false;
    document.getElementById('resumen-razon-social').textContent = document.getElementById('campo-razon-social').value.trim();
    document.getElementById('resumen-nit').textContent = document.getElementById('campo-nit-empresa').value.trim();
    document.getElementById('resumen-email-empresa').textContent = obtener_email();
    document.getElementById('resumen-telefono-empresa').textContent = document.getElementById('campo-telefono').value.trim();
    document.getElementById('resumen-nombre-firmante').textContent = document.getElementById('campo-nombre-firmante').value.trim();
    document.getElementById('resumen-apellido-firmante').textContent = document.getElementById('campo-apellido-firmante').value.trim();
    document.getElementById('resumen-cargo').textContent = document.getElementById('campo-cargo').value.trim();
    document.getElementById('resumen-doc-firmante').textContent = formatear_tipo_documento(document.getElementById('campo-tipo-doc-firmante').value) + ' ' + document.getElementById('campo-num-doc-firmante').value.trim();
  } else {
    document.getElementById('resumen-natural').hidden = false;
    document.getElementById('resumen-juridica').hidden = true;
    document.getElementById('resumen-nombre').textContent = document.getElementById('campo-nombre').value.trim();
    document.getElementById('resumen-apellido').textContent = document.getElementById('campo-apellido').value.trim();
    document.getElementById('resumen-documento').textContent = formatear_tipo_documento(document.getElementById('campo-tipo-doc').value) + ' ' + document.getElementById('campo-num-doc').value.trim();
    document.getElementById('resumen-email').textContent = obtener_email();
    document.getElementById('resumen-telefono').textContent = document.getElementById('campo-telefono').value.trim();
  }
}

function iniciar_reloj() {
  if (estado.reloj_id) clearInterval(estado.reloj_id);
  var el = document.getElementById('resumen-fecha');
  el.textContent = formatear_fecha_cot();
  estado.reloj_id = setInterval(function() {
    el.textContent = formatear_fecha_cot();
  }, 1000);
}

// --- Step 3: Consentimientos ---

function poblar_consentimientos() {
  var contenedor = document.getElementById('lista-consentimientos');
  if (contenedor.children.length > 0) return;

  var html = '';
  for (var i = 0; i < CONSENTIMIENTOS.length; i++) {
    var c = CONSENTIMIENTOS[i];
    var es_obligatorio = c.obligatorio_sistema;
    var id = c.codigo.toLowerCase();

    html += '<div class="consentimiento" data-codigo="' + c.codigo + '">' +
      '<div class="consentimiento-cabecera">' +
      '<span class="consentimiento-titulo-texto">' +
      escapar_html(c.codigo + ' — ' + c.titulo) + '</span>' +
      '<span class="insignia ' + (es_obligatorio ? 'insignia-alerta' : 'insignia-neutra') + '">' +
      (es_obligatorio ? 'OBLIGATORIO' : 'VOLUNTARIO') + '</span>' +
      '</div>' +
      '<div id="detalle-' + id + '" class="consentimiento-detalle">' +
      '<p class="consentimiento-ref">' + escapar_html(c.referencia) + '</p>' +
      (c.texto_html || c.texto_voluntario) +
      '<div class="consentimiento-aceptacion">' +
      '<input type="checkbox" id="check-' + id + '" class="consentimiento-check"' +
      ' data-codigo="' + c.codigo + '"' +
      ' data-obligatorio="' + (es_obligatorio ? 'true' : 'false') + '"' +
      ' aria-describedby="detalle-' + id + '">' +
      '<label for="check-' + id + '">Leí y acepto</label>' +
      '</div>' +
      '</div></div>';
  }

  contenedor.innerHTML = html;

  var checkboxes = contenedor.querySelectorAll('.consentimiento-check');
  for (var j = 0; j < checkboxes.length; j++) {
    checkboxes[j].addEventListener('change', verificar_obligatorios);
  }

  verificar_obligatorios();
}

function verificar_obligatorios() {
  var checkboxes = document.querySelectorAll('.consentimiento-check[data-obligatorio="true"]');
  var todos = true;
  for (var i = 0; i < checkboxes.length; i++) {
    if (!checkboxes[i].checked) { todos = false; break; }
  }
  document.getElementById('btn-enviar-codigo').disabled = !todos;
}

// --- Pasos ---

function avanzar_a_paso(numero) {
  if (numero === 2) preparar_formulario();
  if (numero === 3) preparar_paso_firma();
  mostrar_paso(numero);
}

function preparar_paso_firma() {
  poblar_firmante_resumen();
  poblar_consentimientos();
  iniciar_reloj();
  document.getElementById('sub-enviar-otp').hidden = false;
  document.getElementById('sub-ingresar-otp').hidden = true;
  document.getElementById('seccion-verificacion').hidden = false;
  document.getElementById('seccion-confirmacion').hidden = true;
  document.getElementById('nav-paso-3').hidden = false;
}

function mostrar_paso(numero) {
  estado.paso_actual = numero;

  var secciones = ['paso-tipo', 'paso-datos', 'paso-firma'];
  for (var i = 0; i < secciones.length; i++) {
    document.getElementById(secciones[i]).hidden = (i !== numero - 1);
  }

  actualizar_indicador(numero);

  var seccion = document.getElementById(secciones[numero - 1]);
  var heading = seccion.querySelector('h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }

  window.scrollTo(0, 0);
}

function actualizar_indicador(numero) {
  for (var i = 1; i <= 3; i++) {
    var circulo = document.getElementById('paso-circulo-' + i);
    circulo.className = 'paso';
    circulo.removeAttribute('aria-current');

    if (i < numero) {
      circulo.className = 'paso paso-completo';
    } else if (i === numero) {
      circulo.className = 'paso paso-activo';
      circulo.setAttribute('aria-current', 'step');
    }

    if (i < 3) {
      var linea = document.getElementById('paso-linea-' + i);
      linea.className = i < numero ? 'paso-linea paso-linea-completa' : 'paso-linea';
    }
  }
}

function volver_desde_paso_3() {
  estado.token_verificacion = null;
  estado.access_token = null;
  if (estado.temporizador_id) clearInterval(estado.temporizador_id);
  if (estado.reloj_id) clearInterval(estado.reloj_id);
  mostrar_paso(2);
}

// --- OTP ---

async function al_enviar_otp() {
  var btn = document.getElementById('btn-enviar-codigo');
  deshabilitar_boton(btn, 'Enviando...');

  try {
    var email = obtener_email();
    var nombre = obtener_nombre_firmante();
    var empresa = estado.es_juridica ? document.getElementById('campo-razon-social').value.trim() : null;

    await solicitar_otp(email, nombre, empresa);

    document.getElementById('otp-email-confirmado').textContent = email;
    document.getElementById('sub-enviar-otp').hidden = true;
    document.getElementById('sub-ingresar-otp').hidden = false;
    configurar_otp('btn-verificar-otp');
    iniciar_temporizador(estado);
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message, error.detalle));
  } finally {
    habilitar_boton(btn, 'Enviar código de verificación');
  }
}

async function al_reenviar_otp() {
  var btn = document.getElementById('btn-reenviar');
  btn.disabled = true;
  try {
    var email = obtener_email();
    var nombre = obtener_nombre_firmante();
    var empresa = estado.es_juridica ? document.getElementById('campo-razon-social').value.trim() : null;
    await solicitar_otp(email, nombre, empresa);
    mostrar_exito('Código reenviado a ' + email);
    iniciar_temporizador(estado);
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message, error.detalle));
    btn.disabled = false;
  }
}

// --- Verificacion + Firma + Registro ---

async function al_verificar_y_registrar() {
  var codigo = obtener_codigo_otp();
  if (codigo.length !== 6) return;

  var btn = document.getElementById('btn-verificar-otp');
  deshabilitar_boton(btn, 'Verificando...');

  try {
    var otp_resultado = await verificar_otp(obtener_email(), codigo);
    estado.token_verificacion = otp_resultado.token_verificacion;
    estado.access_token = otp_resultado.access_token;

    btn.textContent = 'Creando perfil...';
    var perfil_id = await crear_perfil_supabase();

    btn.textContent = 'Registrando firma...';
    var firma_resultado = await firmar_consentimientos(preparar_payload_firma(perfil_id));

    if (estado.reloj_id) clearInterval(estado.reloj_id);

    poblar_confirmacion(firma_resultado);
    document.getElementById('seccion-verificacion').hidden = true;
    document.getElementById('seccion-confirmacion').hidden = false;
    document.getElementById('nav-paso-3').hidden = true;
    actualizar_indicador(4);

  } catch (error) {
    mostrar_error(mensaje_usuario(error.message, error.detalle));
    limpiar_otp_inputs('btn-verificar-otp');
  } finally {
    habilitar_boton(btn, 'Firmar');
  }
}

function preparar_payload_firma(perfil_id) {
  var firmante;

  if (estado.es_juridica) {
    firmante = {
      nombre: document.getElementById('campo-nombre-firmante').value.trim() + ' ' + document.getElementById('campo-apellido-firmante').value.trim(),
      email: obtener_email(),
      tipo_documento: document.getElementById('campo-tipo-doc-firmante').value,
      numero_documento: document.getElementById('campo-num-doc-firmante').value.trim(),
      empresa: document.getElementById('campo-razon-social').value.trim(),
      nit_empresa: document.getElementById('campo-nit-empresa').value.trim(),
      cargo: document.getElementById('campo-cargo').value.trim(),
      telefono: document.getElementById('campo-telefono').value.trim()
    };
  } else {
    firmante = {
      nombre: document.getElementById('campo-nombre').value.trim() + ' ' + document.getElementById('campo-apellido').value.trim(),
      email: obtener_email(),
      tipo_documento: document.getElementById('campo-tipo-doc').value,
      numero_documento: document.getElementById('campo-num-doc').value.trim(),
      telefono: document.getElementById('campo-telefono').value.trim()
    };
  }

  return {
    perfil_id: perfil_id,
    token_verificacion: estado.token_verificacion,
    tipo_firma: estado.es_juridica ? 'persona_juridica' : 'persona_natural',
    firmante: firmante,
    consentimientos: obtener_consentimientos_marcados(),
    ip_address: estado.ip_cliente,
    user_agent: navigator.userAgent
  };
}

function obtener_consentimientos_marcados() {
  var resultado = [];
  for (var i = 0; i < CONSENTIMIENTOS.length; i++) {
    var c = CONSENTIMIENTOS[i];
    var checkbox = document.getElementById('check-' + c.codigo.toLowerCase());
    resultado.push({
      codigo: c.codigo,
      version: c.version,
      texto: limpiar_html(c.texto_html || c.texto_voluntario),
      aceptado: checkbox ? checkbox.checked : false,
      es_obligatorio: c.obligatorio_sistema
    });
  }
  return resultado;
}

async function crear_perfil_supabase() {
  var perfil_id = crypto.randomUUID();
  var datos_perfil = {
    id: perfil_id,
    profile_type: estado.tipo_perfil,
    email_principal: obtener_email(),
    telefono: document.getElementById('campo-telefono').value.trim(),
    estado_perfil: 'pendiente'
  };

  if (estado.es_juridica) {
    datos_perfil.razon_social = document.getElementById('campo-razon-social').value.trim();
    datos_perfil.nombre = document.getElementById('campo-nombre-firmante').value.trim();
    datos_perfil.apellido = document.getElementById('campo-apellido-firmante').value.trim();
    datos_perfil.tipo_documento = 'NIT';
    datos_perfil.numero_documento = document.getElementById('campo-nit-empresa').value.trim();
  } else {
    datos_perfil.nombre = document.getElementById('campo-nombre').value.trim();
    datos_perfil.apellido = document.getElementById('campo-apellido').value.trim();
    datos_perfil.tipo_documento = document.getElementById('campo-tipo-doc').value;
    datos_perfil.numero_documento = document.getElementById('campo-num-doc').value.trim();
  }

  var url = CONFIG.SUPABASE_URL + '/rest/v1/profiles';
  var respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + estado.access_token,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(datos_perfil)
  });

  if (!respuesta.ok) {
    var texto_error = await respuesta.text();
    if (texto_error.indexOf('idx_profiles_doc') !== -1) {
      throw new Error('DOCUMENTO_DUPLICADO');
    }
    if (texto_error.indexOf('email_principal') !== -1) {
      throw new Error('EMAIL_DUPLICADO');
    }
    throw new Error('ERROR_REGISTRO_BD');
  }

  return perfil_id;
}

function poblar_confirmacion(resultado) {
  var tbody = document.getElementById('tbody-consentimientos');
  tbody.innerHTML = '';
  if (resultado && resultado.resumen) {
    for (var i = 0; i < resultado.resumen.length; i++) {
      var r = resultado.resumen[i];
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapar_html(r.codigo) + '</td>' +
        '<td>' + escapar_html(r.decision) + '</td>' +
        '<td class="tabla-celda-xs">' + escapar_html(r.folio) + '</td>' +
        '<td class="tabla-celda-hash">' + escapar_html(r.hash) + '</td>';
      tbody.appendChild(tr);
    }
  }

  document.getElementById('confirmacion-fecha').textContent = formatear_fecha_cot();
  document.getElementById('confirmacion-ip').textContent = estado.ip_cliente || '';
  document.getElementById('confirmacion-email').textContent = obtener_email();
}

// --- Helpers ---

function obtener_email() {
  return document.getElementById('campo-email').value.trim();
}

function obtener_nombre_firmante() {
  if (estado.es_juridica) {
    return document.getElementById('campo-nombre-firmante').value.trim() + ' ' + document.getElementById('campo-apellido-firmante').value.trim();
  }
  return document.getElementById('campo-nombre').value.trim() + ' ' + document.getElementById('campo-apellido').value.trim();
}
