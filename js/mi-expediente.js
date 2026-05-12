// Dashboard perfil externo — mi-expediente.html

var estado = {
  sesion: null,
  jwt: null,
  perfil: null,
  tareas: [],
  documentos: [],
  consentimientos: []
};

document.addEventListener('DOMContentLoaded', function() {
  cargar_pagina();
});

async function cargar_pagina() {
  estado.sesion = await verificar_sesion();
  if (!estado.sesion) return;
  estado.jwt = estado.sesion.access_token;

  try {
    var perfiles = await supabase_fetch(
      '/profiles?auth_user_id=eq.' + estado.sesion.user.id +
      '&select=id,profile_type,nombre,apellido,razon_social,tipo_documento,numero_documento,email_principal,telefono,estado_perfil&limit=1',
      estado.jwt
    );

    if (!perfiles || perfiles.length === 0) {
      mostrar_error(mensaje_usuario('PERFIL_PROPIO_NO_ENCONTRADO'));
      return;
    }

    estado.perfil = perfiles[0];

    if (estado.perfil.profile_type === 'miembro') {
      window.location.href = 'dashboard.html';
      return;
    }

    poblar_perfil();

    var resultados = await Promise.all([
      supabase_fetch(
        '/tareas?perfil_id=eq.' + estado.perfil.id +
        '&estado=in.(pendiente,en_curso)&select=id,tipo_tarea,detalle,estado,es_urgente,fecha_limite' +
        '&order=es_urgente.desc,fecha_limite.asc&limit=50',
        estado.jwt
      ).catch(function() { return []; }),
      supabase_fetch(
        '/catalogo_docs?perfil_id=eq.' + estado.perfil.id +
        '&select=tipo_documento,categoria,estado,fecha_subida' +
        '&order=fecha_subida.desc.nullsfirst&limit=50',
        estado.jwt
      ).catch(function() { return []; }),
      supabase_fetch(
        '/consentimientos?perfil_id=eq.' + estado.perfil.id +
        '&aceptado=eq.true&select=codigo,folio,created_at' +
        '&order=created_at.desc',
        estado.jwt
      ).catch(function() { return []; })
    ]);

    estado.tareas = resultados[0] || [];
    estado.documentos = resultados[1] || [];
    estado.consentimientos = resultados[2] || [];

    poblar_progreso();
    poblar_tareas();
    poblar_documentos();
    poblar_consentimientos();

  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  }

  vincular_eventos();
}

function vincular_eventos() {
  document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrar_sesion);
  document.getElementById('contenido-tareas').addEventListener('click', al_click_tarea);
}

function poblar_perfil() {
  var p = estado.perfil;
  var nombre = nombre_display(p);

  var html = '<div class="perfil-cabecera">' +
    '<div>' +
      '<div class="perfil-nombre">' + escapar_html(nombre) + '</div>' +
      '<div class="perfil-detalle">' +
        '<span>' + escapar_html(p.tipo_documento + ' ' + p.numero_documento) + '</span>' +
        (p.telefono ? '<span>' + escapar_html(p.telefono) + '</span>' : '') +
        '<span>' + escapar_html(p.email_principal) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="perfil-badges">' +
      badge_tipo(p.profile_type) +
      badge_estado_perfil(p.estado_perfil) +
    '</div>' +
  '</div>';

  document.getElementById('contenido-perfil').innerHTML = html;
}

function poblar_progreso() {
  var pasos = [
    { etiqueta: 'Registro', completo: true },
    { etiqueta: 'KYC', completo: false },
    { etiqueta: 'Documentación', completo: false }
  ];

  var html = '<div class="progreso-contenedor">';

  for (var i = 0; i < pasos.length; i++) {
    var paso = pasos[i];
    var clase_circulo = 'progreso-circulo';
    var contenido = String(i + 1);
    var clase_etiqueta = 'progreso-etiqueta';

    if (paso.completo) {
      clase_circulo += ' progreso-circulo-completo';
      contenido = '✓';
      clase_etiqueta += ' progreso-etiqueta-completa';
    }

    html += '<div class="progreso-paso">' +
      '<div class="' + clase_circulo + '" aria-label="Paso ' + (i + 1) + ': ' + paso.etiqueta + (paso.completo ? ' completado' : ' pendiente') + '">' + contenido + '</div>' +
      '<div class="' + clase_etiqueta + '">' + escapar_html(paso.etiqueta) + '</div>' +
    '</div>';

    if (i < pasos.length - 1) {
      var clase_linea = 'progreso-linea';
      if (paso.completo) clase_linea += ' progreso-linea-completa';
      html += '<div class="' + clase_linea + '"></div>';
    }
  }

  html += '</div>';
  document.getElementById('contenido-progreso').innerHTML = html;
}

function poblar_tareas() {
  var contenedor = document.getElementById('contenido-tareas');

  if (estado.tareas.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">No tienes tareas pendientes.</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < estado.tareas.length; i++) {
    var t = estado.tareas[i];
    var es_firma = t.tipo_tarea === 'consentimiento';
    var detalle_texto = extraer_detalle(t.detalle);

    html += '<div class="tarea-item">' +
      '<div class="tarea-info">' +
        '<div class="tarea-tipo">' + escapar_html(LABELS_TIPO_TAREA[t.tipo_tarea] || t.tipo_tarea) + '</div>' +
        (detalle_texto ? '<div class="tarea-detalle">' + escapar_html(detalle_texto) + '</div>' : '') +
        '<div class="tarea-meta">' +
          (t.es_urgente ? '<span class="insignia insignia-alerta">Urgente</span>' : '') +
          badge_estado_tarea(t.estado) +
          (t.fecha_limite ? '<span class="tarea-fecha">Limite: ' + formatear_fecha_corta(t.fecha_limite) + '</span>' : '') +
        '</div>' +
      '</div>' +
      (es_firma ? '<button type="button" class="btn-accion btn-accion-firmar" data-accion="firmar" data-tarea-id="' + t.id + '">Firmar</button>' : '') +
    '</div>';
  }

  contenedor.innerHTML = html;
}

function al_click_tarea(e) {
  var btn = e.target.closest('[data-accion="firmar"]');
  if (!btn) return;
  window.location.href = 'firma.html?token=' + btn.dataset.tareaId;
}

function poblar_documentos() {
  var contenedor = document.getElementById('contenido-documentos');

  if (estado.documentos.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">No tienes documentos registrados.</p>';
    return;
  }

  var html = '<div class="tabla-contenedor"><table class="tabla-datos"><thead><tr>' +
    '<th scope="col">Tipo</th>' +
    '<th scope="col">Categoria</th>' +
    '<th scope="col">Estado</th>' +
    '<th scope="col">Fecha</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < estado.documentos.length; i++) {
    var d = estado.documentos[i];
    html += '<tr>' +
      '<td>' + escapar_html(d.tipo_documento) + '</td>' +
      '<td>' + escapar_html(d.categoria || '—') + '</td>' +
      '<td>' + badge_estado_doc(d.estado) + '</td>' +
      '<td>' + (d.fecha_subida ? formatear_fecha_corta(d.fecha_subida) : '—') + '</td>' +
    '</tr>';
  }

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

function poblar_consentimientos() {
  var contenedor = document.getElementById('contenido-consentimientos');

  if (estado.consentimientos.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">No tienes consentimientos firmados.</p>';
    return;
  }

  var html = '<div class="tabla-contenedor"><table class="tabla-datos"><thead><tr>' +
    '<th scope="col">Consentimiento</th>' +
    '<th scope="col">Fecha</th>' +
    '<th scope="col">Folio</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < estado.consentimientos.length; i++) {
    var c = estado.consentimientos[i];
    var label = LABELS_CONSENTIMIENTOS[c.codigo] || c.codigo;
    html += '<tr>' +
      '<td>' + escapar_html(c.codigo + ' — ' + label) + '</td>' +
      '<td>' + formatear_fecha(c.created_at) + '</td>' +
      '<td><span class="insignia insignia-neutra">' + escapar_html(c.folio) + '</span></td>' +
    '</tr>';
  }

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}
