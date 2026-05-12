// Lógica de firma electrónica standalone — firma.html

var estado = {
  datos: null,
  ip_cliente: null,
  token_verificacion: null,
  temporizador_id: null,
  segundos_reenvio: 0,
  reloj_id: null
};

document.addEventListener('DOMContentLoaded', function() {
  inicializar_docs();
  al_cargar_pagina();
});

function inicializar_docs() {
  var base = 'https://docs.google.com/document/d/';
  document.getElementById('iframe-sice-pol-01').src = base + CONFIG.DOC_SICE_POL_01 + '/preview';
  document.getElementById('link-sice-pol-01').href = base + CONFIG.DOC_SICE_POL_01;
  document.getElementById('iframe-f-dato-01').src = base + CONFIG.DOC_F_DATO_01 + '/preview';
  document.getElementById('link-f-dato-01').href = base + CONFIG.DOC_F_DATO_01;
}

async function al_cargar_pagina() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');

  if (!token) {
    mostrar_error_fatal('Enlace inválido. No se encontró el identificador de firma.');
    return;
  }

  try {
    var resultados = await Promise.all([
      obtener_datos_firma(token),
      obtener_ip()
    ]);

    estado.datos = resultados[0];
    estado.ip_cliente = resultados[1];

    poblar_firmante();
    poblar_consentimientos();
    vincular_eventos();
    iniciar_reloj();

    document.getElementById('seccion-cargando').hidden = true;
    document.getElementById('seccion-contenido').hidden = false;
  } catch (error) {
    mostrar_error_fatal(mensaje_usuario(error.message));
  }
}

function poblar_firmante() {
  var f = estado.datos.firmante;

  if (estado.datos.tipo_firma === 'persona_juridica') {
    document.getElementById('resumen-natural').hidden = true;
    document.getElementById('resumen-juridica').hidden = false;
    document.getElementById('firmante-razon-social').textContent = f.empresa || '';
    document.getElementById('firmante-nit').textContent = f.nit_empresa || '';
    document.getElementById('firmante-email-empresa').textContent = f.email || '';
    document.getElementById('firmante-telefono-empresa').textContent = f.telefono || '';
    document.getElementById('firmante-nombre-rep').textContent = f.nombre || '';
    document.getElementById('firmante-apellido-rep').textContent = f.apellido || '';
    document.getElementById('firmante-doc-rep').textContent = formatear_tipo_documento(f.tipo_documento) + ' ' + f.numero_documento;

    if (f.cargo) {
      document.getElementById('firmante-cargo-rep').textContent = f.cargo;
      document.getElementById('firmante-cargo-texto').hidden = false;
    } else {
      document.getElementById('firmante-cargo-input').hidden = false;
    }
  } else {
    document.getElementById('resumen-natural').hidden = false;
    document.getElementById('resumen-juridica').hidden = true;
    document.getElementById('firmante-nombre').textContent = f.nombre || '';
    document.getElementById('firmante-apellido').textContent = f.apellido || '';
    document.getElementById('firmante-documento').textContent = formatear_tipo_documento(f.tipo_documento) + ' ' + f.numero_documento;
    document.getElementById('firmante-email').textContent = f.email || '';
  }

  if (estado.datos.programa) {
    document.getElementById('firmante-programa').textContent = estado.datos.programa;
    document.getElementById('info-programa').hidden = false;
  }

  if (estado.datos.solicitado_por) {
    document.getElementById('firmante-solicitado-por').textContent = estado.datos.solicitado_por;
    document.getElementById('info-solicitado-por').hidden = false;
  }
}

function iniciar_reloj() {
  if (estado.reloj_id) clearInterval(estado.reloj_id);
  var el = document.getElementById('firmante-fecha');
  el.textContent = formatear_fecha_cot();
  estado.reloj_id = setInterval(function() {
    el.textContent = formatear_fecha_cot();
  }, 1000);
}

function poblar_consentimientos() {
  var contenedor = document.getElementById('lista-consentimientos');
  var obligatorios = estado.datos.obligatorios || ['C1', 'C2'];
  var html = '';

  for (var i = 0; i < CONSENTIMIENTOS.length; i++) {
    var c = CONSENTIMIENTOS[i];
    var es_obligatorio = c.obligatorio_sistema || obligatorios.indexOf(c.codigo) !== -1;
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
      (c.texto_html || (es_obligatorio ? c.texto_obligatorio : c.texto_voluntario)) +
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
  var todos_marcados = true;

  for (var i = 0; i < checkboxes.length; i++) {
    if (!checkboxes[i].checked) {
      todos_marcados = false;
      break;
    }
  }

  if (estado.datos && estado.datos.tipo_firma === 'persona_juridica' && estado.datos.firmante && !estado.datos.firmante.cargo) {
    var cargo_input = document.getElementById('input-cargo');
    if (cargo_input && !cargo_input.value.trim()) {
      todos_marcados = false;
    }
  }

  document.getElementById('btn-enviar-codigo').disabled = !todos_marcados;
}

function vincular_eventos() {
  document.getElementById('btn-enviar-codigo').addEventListener('click', al_enviar_otp);
  document.getElementById('btn-verificar-otp').addEventListener('click', al_verificar_otp);
  document.getElementById('btn-reenviar').addEventListener('click', al_reenviar_otp);

  var cargo_input = document.getElementById('input-cargo');
  if (cargo_input) {
    cargo_input.addEventListener('input', verificar_obligatorios);
  }
}

async function al_enviar_otp() {
  var btn = document.getElementById('btn-enviar-codigo');
  deshabilitar_boton(btn, 'Enviando...');

  try {
    var email = estado.datos.firmante.email;
    var nombre = estado.datos.firmante.nombre;
    var empresa = estado.datos.tipo_firma === 'persona_juridica' ? estado.datos.firmante.empresa : null;

    await solicitar_otp(email, nombre, empresa);

    document.getElementById('otp-email-confirmado').textContent = email;
    document.getElementById('sub-enviar-otp').hidden = true;
    document.getElementById('sub-ingresar-otp').hidden = false;
    configurar_otp('btn-verificar-otp');
    iniciar_temporizador(estado);
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  } finally {
    habilitar_boton(btn, 'Enviar código de verificación');
  }
}

async function al_reenviar_otp() {
  var btn = document.getElementById('btn-reenviar');
  btn.disabled = true;

  try {
    var email = estado.datos.firmante.email;
    var nombre = estado.datos.firmante.nombre;
    var empresa = estado.datos.tipo_firma === 'persona_juridica' ? estado.datos.firmante.empresa : null;

    await solicitar_otp(email, nombre, empresa);
    mostrar_exito('Código reenviado a ' + email);
    iniciar_temporizador(estado);
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
    btn.disabled = false;
  }
}

async function al_verificar_otp() {
  var codigo = obtener_codigo_otp();
  if (codigo.length !== 6) return;

  var btn = document.getElementById('btn-verificar-otp');
  deshabilitar_boton(btn, 'Verificando...');

  try {
    var otp_resultado = await verificar_otp(estado.datos.firmante.email, codigo);
    estado.token_verificacion = otp_resultado.token_verificacion;

    btn.textContent = 'Registrando firma...';

    var consentimientos = obtener_consentimientos_marcados();
    var firmante = Object.assign({}, estado.datos.firmante);

    if (estado.datos.tipo_firma === 'persona_juridica' && !firmante.cargo) {
      var cargo_input = document.getElementById('input-cargo');
      if (cargo_input) firmante.cargo = cargo_input.value.trim();
    }

    var resultado = await firmar_consentimientos({
      token_verificacion: estado.token_verificacion,
      perfil_id: estado.datos.perfil_id,
      tipo_firma: estado.datos.tipo_firma,
      firmante: firmante,
      consentimientos: consentimientos,
      ip_address: estado.ip_cliente,
      user_agent: navigator.userAgent,
      programa: estado.datos.programa,
      tarea_id: estado.datos.tarea_id || null
    });

    if (estado.reloj_id) clearInterval(estado.reloj_id);

    poblar_confirmacion(resultado);
    document.getElementById('seccion-verificacion').hidden = true;
    document.getElementById('seccion-confirmacion').hidden = false;

  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
    limpiar_otp_inputs('btn-verificar-otp');
  } finally {
    habilitar_boton(btn, 'Firmar');
  }
}

function obtener_consentimientos_marcados() {
  var resultado = [];
  var obligatorios = estado.datos.obligatorios || ['C1', 'C2'];

  for (var i = 0; i < CONSENTIMIENTOS.length; i++) {
    var c = CONSENTIMIENTOS[i];
    var checkbox = document.getElementById('check-' + c.codigo.toLowerCase());
    var es_obligatorio = c.obligatorio_sistema || obligatorios.indexOf(c.codigo) !== -1;

    resultado.push({
      codigo: c.codigo,
      version: c.version,
      texto: limpiar_html(c.texto_html || (es_obligatorio ? c.texto_obligatorio : c.texto_voluntario)),
      aceptado: checkbox ? checkbox.checked : false,
      es_obligatorio: es_obligatorio
    });
  }

  return resultado;
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
  document.getElementById('confirmacion-email').textContent = estado.datos.firmante.email;
}

function mostrar_error_fatal(mensaje) {
  document.getElementById('seccion-cargando').hidden = true;
  document.getElementById('seccion-contenido').hidden = true;
  document.getElementById('seccion-error').hidden = false;
  document.getElementById('mensaje-error-fatal').textContent = mensaje;
}
