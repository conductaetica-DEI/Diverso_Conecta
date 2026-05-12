// Dashboard — panel de gestión para miembros internos
// Depende de: config.js, supabase-client.js, gas-client.js, utils.js, labels.js, modales.js

var estado = {
  sesion: null,
  jwt: null,
  perfil: null,
  permisos: [],
  es_plataforma: false,
  tipos_permitidos: [],
  expedientes: [],
  tareas: [],
  total_docs_pendientes: 0
};

document.addEventListener('DOMContentLoaded', function() {
  cargar_pagina();
});

async function cargar_pagina() {
  estado.sesion = await verificar_sesion();
  if (!estado.sesion) return;
  estado.jwt = estado.sesion.access_token;

  try {
    await cargar_perfil_y_permisos();
    if (!estado.perfil) return;

    poblar_encabezado();
    determinar_modo_vista();

    if (estado.tipos_permitidos.length === 0 && !estado.es_plataforma) {
      mostrar_sin_permisos();
      vincular_eventos();
      return;
    }

    await cargar_expedientes();
    await cargar_datos_secundarios();

    poblar_kpis();
    poblar_expedientes();
    poblar_tareas();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  }

  vincular_eventos();
}

// --- Carga de datos ---

async function cargar_perfil_y_permisos() {
  var datos = await supabase_fetch(
    '/profiles?auth_user_id=eq.' + estado.sesion.user.id +
    '&select=id,profile_type,nombre,apellido,email_principal,permisos_miembro(permiso,activo)&limit=1',
    estado.jwt
  );

  if (!datos || datos.length === 0) {
    mostrar_error(mensaje_usuario('PERFIL_PROPIO_NO_ENCONTRADO'));
    return;
  }

  estado.perfil = datos[0];

  if (estado.perfil.profile_type !== 'miembro') {
    window.location.href = 'mi-expediente.html';
    return;
  }

  estado.permisos = (estado.perfil.permisos_miembro || [])
    .filter(function(p) { return p.activo; })
    .map(function(p) { return p.permiso; });
}

function determinar_modo_vista() {
  estado.es_plataforma = estado.permisos.indexOf('gestion_plataforma') !== -1;
  estado.tipos_permitidos = [];

  if (estado.es_plataforma) return;

  if (estado.permisos.indexOf('gestion_beneficiarios') !== -1) {
    estado.tipos_permitidos.push('beneficiario', 'aliado');
  }
  if (estado.permisos.indexOf('gestion_proveedores') !== -1) {
    estado.tipos_permitidos.push('contratista', 'proveedor');
  }
}

async function cargar_expedientes() {
  if (estado.es_plataforma) {
    estado.expedientes = await supabase_fetch(
      '/profiles?profile_type=neq.miembro&estado_perfil=eq.activo' +
      '&select=id,nombre,apellido,razon_social,profile_type,estado_perfil,email_principal,tipo_documento,numero_documento,fecha_registro,updated_at' +
      '&order=fecha_registro.desc&limit=50',
      estado.jwt
    ) || [];
    return;
  }

  var asignaciones = await supabase_fetch(
    '/asignaciones?analista_id=eq.' + estado.perfil.id +
    '&estado=eq.activa&select=perfil_id',
    estado.jwt
  ) || [];

  if (asignaciones.length === 0) {
    estado.expedientes = [];
    return;
  }

  var ids = asignaciones.map(function(a) { return a.perfil_id; });

  var perfiles = await supabase_fetch(
    '/profiles?id=in.(' + ids.join(',') + ')' +
    '&select=id,nombre,apellido,razon_social,profile_type,estado_perfil,email_principal,tipo_documento,numero_documento,fecha_registro,updated_at' +
    '&order=fecha_registro.desc',
    estado.jwt
  ) || [];

  estado.expedientes = perfiles.filter(function(p) {
    return estado.tipos_permitidos.indexOf(p.profile_type) !== -1;
  });
}

async function cargar_datos_secundarios() {
  var ids = estado.expedientes.map(function(e) { return e.id; });
  var ids_str = ids.join(',');

  var consultas = [
    supabase_fetch(
      '/tareas?solicitado_por=eq.' + estado.perfil.id +
      '&select=id,tipo_tarea,detalle,estado,es_urgente,fecha_limite,perfil_id,created_at' +
      '&order=created_at.desc&limit=20',
      estado.jwt
    ).catch(function() { return []; })
  ];

  if (ids.length > 0) {
    consultas.push(
      supabase_fetch(
        '/catalogo_docs?perfil_id=in.(' + ids_str + ')&estado=eq.pendiente&select=id',
        estado.jwt
      ).catch(function() { return []; })
    );
  }

  var resultados = await Promise.all(consultas);

  estado.tareas = resultados[0] || [];
  estado.total_docs_pendientes = (resultados[1] || []).length;
}

// --- Poblar UI ---

function poblar_encabezado() {
  document.getElementById('encabezado-nombre').textContent =
    ((estado.perfil.nombre || '') + ' ' + (estado.perfil.apellido || '')).trim() || estado.perfil.email_principal;

  var badges_html = '';
  for (var i = 0; i < estado.permisos.length; i++) {
    var label = LABELS_PERMISOS[estado.permisos[i]] || estado.permisos[i];
    badges_html += '<span class="dashboard-permiso-badge">' + escapar_html(label) + '</span>';
  }
  document.getElementById('encabezado-permisos').innerHTML = badges_html;

  var tiene_accesos = estado.permisos.indexOf('gestion_accesos') !== -1 || estado.es_plataforma;
  document.getElementById('link-accesos').hidden = !tiene_accesos;
}

function poblar_kpis() {
  document.getElementById('kpi-perfiles').textContent = estado.expedientes.length;

  var tareas_activas = estado.tareas.filter(function(t) {
    return t.estado === 'pendiente' || t.estado === 'en_curso';
  });
  document.getElementById('kpi-tareas').textContent = tareas_activas.length;

  document.getElementById('kpi-docs').textContent = estado.total_docs_pendientes;
}

function poblar_expedientes() {
  var contenedor = document.getElementById('contenido-expedientes');

  if (estado.expedientes.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">No tienes perfiles asignados.</p>';
    return;
  }

  var html = '<div class="tabla-contenedor"><table class="tabla-datos"><thead><tr>' +
    '<th scope="col">Nombre</th>' +
    '<th scope="col">Tipo</th>' +
    '<th scope="col">Estado</th>' +
    '<th scope="col">Actividad</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < estado.expedientes.length; i++) {
    var e = estado.expedientes[i];
    html += '<tr>' +
      '<td>' + escapar_html(nombre_display(e)) + '</td>' +
      '<td>' + badge_tipo(e.profile_type) + '</td>' +
      '<td>' + badge_estado_perfil(e.estado_perfil) + '</td>' +
      '<td>' + formatear_fecha_corta(e.updated_at || e.fecha_registro) + '</td>' +
    '</tr>';
  }

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

function poblar_tareas() {
  var contenedor = document.getElementById('contenido-tareas');

  if (estado.tareas.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">No has creado tareas.</p>';
    return;
  }

  var mapa_nombres = {};
  estado.expedientes.forEach(function(e) {
    mapa_nombres[e.id] = nombre_display(e);
  });

  var html = '<div class="tabla-contenedor"><table class="tabla-datos"><thead><tr>' +
    '<th scope="col">Tipo</th>' +
    '<th scope="col">Perfil</th>' +
    '<th scope="col">Detalle</th>' +
    '<th scope="col">Estado</th>' +
    '<th scope="col">Fecha</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < estado.tareas.length; i++) {
    var t = estado.tareas[i];
    var nombre_perfil = mapa_nombres[t.perfil_id] || extraer_nombre_externo(t.detalle) || '—';
    var detalle = extraer_detalle(t.detalle);

    html += '<tr>' +
      '<td>' + escapar_html(LABELS_TIPO_TAREA[t.tipo_tarea] || t.tipo_tarea) +
        (t.es_urgente ? ' <span class="insignia insignia-alerta">Urgente</span>' : '') + '</td>' +
      '<td>' + escapar_html(nombre_perfil) + '</td>' +
      '<td>' + escapar_html(detalle || '—') + '</td>' +
      '<td>' + badge_estado_tarea(t.estado) + '</td>' +
      '<td>' + formatear_fecha_corta(t.created_at) + '</td>' +
    '</tr>';
  }

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

function mostrar_sin_permisos() {
  document.getElementById('contenido-expedientes').innerHTML =
    '<p class="estado-vacio">No tienes permisos de gestion asignados. Contacta al administrador.</p>';
  document.getElementById('contenido-tareas').innerHTML =
    '<p class="estado-vacio">Sin tareas.</p>';
  document.getElementById('btn-nueva-tarea').hidden = true;
  document.getElementById('btn-solicitar-firma').hidden = true;
  document.getElementById('kpi-perfiles').textContent = '0';
  document.getElementById('kpi-tareas').textContent = '0';
  document.getElementById('kpi-docs').textContent = '0';
}

// --- Eventos ---

function vincular_eventos() {
  document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrar_sesion);
  document.getElementById('btn-nueva-tarea').addEventListener('click', al_abrir_modal_tarea);
  document.getElementById('btn-solicitar-firma').addEventListener('click', al_abrir_modal_firma);
  document.getElementById('btn-crear-tarea').addEventListener('click', al_crear_tarea);
  document.getElementById('btn-enviar-firma').addEventListener('click', al_enviar_firma);
  document.getElementById('firma-toggle-existente').addEventListener('click', function() { al_toggle_firmante('existente'); });
  document.getElementById('firma-toggle-externo').addEventListener('click', function() { al_toggle_firmante('externo'); });
  document.getElementById('firma-buscar').addEventListener('input', al_buscar_firmante);
  document.getElementById('firma-chip-quitar').addEventListener('click', limpiar_busqueda_firma);
  document.getElementById('firma-resultados').addEventListener('click', function(e) {
    var item = e.target.closest('.buscar-resultado-item');
    if (item) al_seleccionar_perfil_firma(item.dataset.perfilId);
  });
  document.getElementById('firma-resultados').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var item = e.target.closest('.buscar-resultado-item');
      if (item) al_seleccionar_perfil_firma(item.dataset.perfilId);
    }
  });
  document.getElementById('firma-ext-tipo').addEventListener('change', al_cambiar_tipo_externo);
  document.getElementById('tarea-buscar').addEventListener('input', al_buscar_perfil_tarea);
  document.getElementById('tarea-chip-quitar').addEventListener('click', limpiar_busqueda_tarea);
  document.getElementById('tarea-resultados').addEventListener('click', function(e) {
    var item = e.target.closest('.buscar-resultado-item');
    if (item) al_seleccionar_perfil_tarea(item.dataset.perfilId);
  });
  document.getElementById('tarea-resultados').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var item = e.target.closest('.buscar-resultado-item');
      if (item) al_seleccionar_perfil_tarea(item.dataset.perfilId);
    }
  });

  vincular_modales_cierre();
}

// --- Modal: Nueva tarea ---

function al_abrir_modal_tarea() {
  limpiar_busqueda_tarea();
  document.getElementById('tarea-tipo').value = '';
  document.getElementById('tarea-detalle').value = '';
  document.getElementById('tarea-fecha').value = '';
  document.getElementById('tarea-urgente').checked = false;
  abrir_modal('modal-nueva-tarea');
}

async function al_crear_tarea() {
  var perfil_id = document.getElementById('tarea-perfil-id').value;
  var tipo = document.getElementById('tarea-tipo').value;
  var detalle = document.getElementById('tarea-detalle').value.trim();
  var fecha = document.getElementById('tarea-fecha').value;
  var urgente = document.getElementById('tarea-urgente').checked;

  if (!perfil_id || !tipo) {
    mostrar_error(mensaje_usuario('SELECCIONAR_PERFIL_TIPO'));
    return;
  }

  var btn = document.getElementById('btn-crear-tarea');
  deshabilitar_boton(btn, 'Creando...');

  try {
    var cuerpo = {
      perfil_id: perfil_id,
      solicitado_por: estado.perfil.id,
      tipo_tarea: tipo,
      estado: 'pendiente',
      es_urgente: urgente
    };
    if (detalle) cuerpo.detalle = detalle;
    if (fecha) cuerpo.fecha_limite = fecha;

    await supabase_fetch('/tareas', estado.jwt, {
      metodo: 'POST',
      cuerpo: cuerpo,
      prefer: 'return=minimal'
    });

    cerrar_todos_modales();
    mostrar_exito('Tarea creada correctamente.');
    await recargar_tareas();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  } finally {
    habilitar_boton(btn, 'Crear tarea');
  }
}

// --- Modal: Solicitar firma ---

function al_abrir_modal_firma() {
  al_toggle_firmante('existente');
  limpiar_busqueda_firma();
  limpiar_campos_externo();
  document.getElementById('firma-programa').value = '';

  var checks = document.querySelectorAll('#firma-consentimientos .firma-consent-check[value]');
  for (var i = 0; i < checks.length; i++) checks[i].checked = false;

  abrir_modal('modal-solicitar-firma');
}

function al_toggle_firmante(modo) {
  var btn_existente = document.getElementById('firma-toggle-existente');
  var btn_externo = document.getElementById('firma-toggle-externo');

  if (modo === 'existente') {
    btn_existente.classList.add('toggle-activo');
    btn_existente.setAttribute('aria-pressed', 'true');
    btn_externo.classList.remove('toggle-activo');
    btn_externo.setAttribute('aria-pressed', 'false');
    document.getElementById('firma-busqueda').hidden = false;
    document.getElementById('firma-datos-externo').hidden = true;
  } else {
    btn_externo.classList.add('toggle-activo');
    btn_externo.setAttribute('aria-pressed', 'true');
    btn_existente.classList.remove('toggle-activo');
    btn_existente.setAttribute('aria-pressed', 'false');
    document.getElementById('firma-busqueda').hidden = true;
    document.getElementById('firma-datos-externo').hidden = false;
    limpiar_busqueda_firma();
  }
}

var _firma_buscar_timeout = null;

function al_buscar_firmante() {
  clearTimeout(_firma_buscar_timeout);
  var termino = document.getElementById('firma-buscar').value.trim();

  if (termino.length < 2) {
    document.getElementById('firma-resultados').hidden = true;
    return;
  }

  _firma_buscar_timeout = setTimeout(function() {
    var resultados = filtrar_perfiles_firma(termino);
    mostrar_resultados_firma(resultados);
  }, 200);
}

function filtrar_perfiles_firma(termino) {
  var t = termino.toLowerCase();
  var resultados = [];

  for (var i = 0; i < estado.expedientes.length; i++) {
    var e = estado.expedientes[i];
    var nombre = nombre_display(e).toLowerCase();
    var email = (e.email_principal || '').toLowerCase();
    var doc = (e.numero_documento || '').toLowerCase();

    if (nombre.indexOf(t) !== -1 || email.indexOf(t) !== -1 || doc.indexOf(t) !== -1) {
      resultados.push(e);
      if (resultados.length >= 5) break;
    }
  }

  return resultados;
}

function mostrar_resultados_firma(resultados) {
  var contenedor = document.getElementById('firma-resultados');

  if (resultados.length === 0) {
    contenedor.innerHTML = '<div class="buscar-resultado-vacio">Sin resultados</div>';
    contenedor.hidden = false;
    return;
  }

  var html = '';
  for (var i = 0; i < resultados.length; i++) {
    var e = resultados[i];
    var tipo_label = LABELS_TIPOS[e.profile_type] || e.profile_type;
    var doc_display = (e.tipo_documento && e.numero_documento)
      ? escapar_html(e.tipo_documento) + ' ' + escapar_html(e.numero_documento)
      : '';

    html += '<div class="buscar-resultado-item" role="option" tabindex="0" data-perfil-id="' + e.id + '">' +
      '<span class="buscar-resultado-nombre">' + escapar_html(nombre_display(e)) + '</span> ' +
      '<span class="insignia insignia-neutra">' + escapar_html(tipo_label) + '</span> ' +
      (doc_display ? '<span class="buscar-resultado-detalle">' + doc_display + '</span> ' : '') +
      '<span class="buscar-resultado-detalle">' + escapar_html(e.email_principal || '') + '</span>' +
    '</div>';
  }

  contenedor.innerHTML = html;
  contenedor.hidden = false;
}

function al_seleccionar_perfil_firma(perfil_id) {
  var perfil = buscar_expediente(perfil_id);
  if (!perfil) return;

  document.getElementById('firma-perfil-id').value = perfil_id;
  document.getElementById('firma-chip-nombre').textContent = nombre_display(perfil);
  document.getElementById('firma-chip-tipo').textContent = LABELS_TIPOS[perfil.profile_type] || perfil.profile_type;

  document.getElementById('firma-seleccion').hidden = false;
  document.getElementById('firma-buscar').hidden = true;
  document.getElementById('firma-resultados').hidden = true;
  document.getElementById('firma-buscar-ayuda').hidden = true;
}

function limpiar_busqueda_firma() {
  document.getElementById('firma-perfil-id').value = '';
  document.getElementById('firma-buscar').value = '';
  document.getElementById('firma-buscar').hidden = false;
  document.getElementById('firma-resultados').hidden = true;
  document.getElementById('firma-seleccion').hidden = true;
  document.getElementById('firma-buscar-ayuda').hidden = false;
}

// --- Busqueda perfil: modal tarea ---

var _tarea_buscar_timeout = null;

function al_buscar_perfil_tarea() {
  clearTimeout(_tarea_buscar_timeout);
  var termino = document.getElementById('tarea-buscar').value.trim();

  if (termino.length < 2) {
    document.getElementById('tarea-resultados').hidden = true;
    return;
  }

  _tarea_buscar_timeout = setTimeout(function() {
    var resultados = filtrar_perfiles_firma(termino);
    mostrar_resultados_tarea(resultados);
  }, 200);
}

function mostrar_resultados_tarea(resultados) {
  var contenedor = document.getElementById('tarea-resultados');

  if (resultados.length === 0) {
    contenedor.innerHTML = '<div class="buscar-resultado-vacio">Sin resultados</div>';
    contenedor.hidden = false;
    return;
  }

  var html = '';
  for (var i = 0; i < resultados.length; i++) {
    var e = resultados[i];
    var tipo_label = LABELS_TIPOS[e.profile_type] || e.profile_type;
    var doc_display = (e.tipo_documento && e.numero_documento)
      ? escapar_html(e.tipo_documento) + ' ' + escapar_html(e.numero_documento)
      : '';

    html += '<div class="buscar-resultado-item" role="option" tabindex="0" data-perfil-id="' + e.id + '">' +
      '<span class="buscar-resultado-nombre">' + escapar_html(nombre_display(e)) + '</span> ' +
      '<span class="insignia insignia-neutra">' + escapar_html(tipo_label) + '</span> ' +
      (doc_display ? '<span class="buscar-resultado-detalle">' + doc_display + '</span> ' : '') +
      '<span class="buscar-resultado-detalle">' + escapar_html(e.email_principal || '') + '</span>' +
    '</div>';
  }

  contenedor.innerHTML = html;
  contenedor.hidden = false;
}

function al_seleccionar_perfil_tarea(perfil_id) {
  var perfil = buscar_expediente(perfil_id);
  if (!perfil) return;

  document.getElementById('tarea-perfil-id').value = perfil_id;
  document.getElementById('tarea-chip-nombre').textContent = nombre_display(perfil);
  document.getElementById('tarea-chip-tipo').textContent = LABELS_TIPOS[perfil.profile_type] || perfil.profile_type;

  document.getElementById('tarea-seleccion').hidden = false;
  document.getElementById('tarea-buscar').hidden = true;
  document.getElementById('tarea-resultados').hidden = true;
  document.getElementById('tarea-buscar-ayuda').hidden = true;
}

function limpiar_busqueda_tarea() {
  document.getElementById('tarea-perfil-id').value = '';
  document.getElementById('tarea-buscar').value = '';
  document.getElementById('tarea-buscar').hidden = false;
  document.getElementById('tarea-resultados').hidden = true;
  document.getElementById('tarea-seleccion').hidden = true;
  document.getElementById('tarea-buscar-ayuda').hidden = false;
}

// --- Firma: tipo externo ---

function al_cambiar_tipo_externo() {
  var es_juridica = document.getElementById('firma-ext-tipo').value === 'persona_juridica';
  document.getElementById('firma-ext-empresa').hidden = !es_juridica;
  document.getElementById('firma-ext-cargo-grupo').hidden = !es_juridica;
}

function limpiar_campos_externo() {
  var ids = ['firma-ext-nombre', 'firma-ext-apellido', 'firma-ext-razon', 'firma-ext-nit',
             'firma-ext-cargo', 'firma-ext-num-doc', 'firma-ext-email', 'firma-ext-telefono'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.value = '';
  }
  document.getElementById('firma-ext-tipo').value = 'persona_natural';
  document.getElementById('firma-ext-tipo-doc').value = 'CC';
  al_cambiar_tipo_externo();
}

function validar_externo() {
  var tipo = document.getElementById('firma-ext-tipo').value;
  var nombre = document.getElementById('firma-ext-nombre').value.trim();
  var apellido = document.getElementById('firma-ext-apellido').value.trim();
  var num_doc = document.getElementById('firma-ext-num-doc').value.trim();
  var email = document.getElementById('firma-ext-email').value.trim();

  if (!nombre || !apellido || !num_doc || !validar_email(email)) return false;

  if (tipo === 'persona_juridica') {
    var razon = document.getElementById('firma-ext-razon').value.trim();
    var nit = document.getElementById('firma-ext-nit').value.trim();
    var cargo = document.getElementById('firma-ext-cargo').value.trim();
    if (!razon || !nit || !cargo) return false;
  }

  return true;
}

function construir_firmante_externo() {
  var tipo = document.getElementById('firma-ext-tipo').value;
  var datos = {
    tipo_firma: tipo,
    nombre: document.getElementById('firma-ext-nombre').value.trim(),
    apellido: document.getElementById('firma-ext-apellido').value.trim(),
    tipo_documento: document.getElementById('firma-ext-tipo-doc').value,
    numero_documento: document.getElementById('firma-ext-num-doc').value.trim(),
    email: document.getElementById('firma-ext-email').value.trim(),
    telefono: document.getElementById('firma-ext-telefono').value.trim() || null,
    empresa: null,
    nit_empresa: null,
    cargo: null
  };

  if (tipo === 'persona_juridica') {
    datos.empresa = document.getElementById('firma-ext-razon').value.trim();
    datos.nit_empresa = document.getElementById('firma-ext-nit').value.trim();
    datos.cargo = document.getElementById('firma-ext-cargo').value.trim();
  }

  return datos;
}

async function al_enviar_firma() {
  var es_externo = document.getElementById('firma-toggle-externo').classList.contains('toggle-activo');
  var perfil_id = es_externo ? null : document.getElementById('firma-perfil-id').value;
  var programa = document.getElementById('firma-programa').value.trim();

  if (!es_externo && !perfil_id) {
    mostrar_error(mensaje_usuario('SELECCIONAR_PERFIL'));
    return;
  }
  if (!programa) {
    mostrar_error(mensaje_usuario('PROGRAMA_REQUERIDO'));
    return;
  }

  var email_destino, nombre, detalle_obj;

  if (es_externo) {
    if (!validar_externo()) {
      mostrar_error(mensaje_usuario('EXTERNO_CAMPOS_OBLIGATORIOS'));
      return;
    }
    var firmante_ext = construir_firmante_externo();
    email_destino = firmante_ext.email;
    nombre = firmante_ext.nombre + ' ' + firmante_ext.apellido;
    detalle_obj = {
      programa: programa,
      obligatorios: ['C1', 'C2'].concat(obtener_obligatorios_seleccionados()),
      firmante_externo: firmante_ext
    };
  } else {
    var perfil = buscar_expediente(perfil_id);
    if (!perfil) {
      mostrar_error(mensaje_usuario('PERFIL_NO_ENCONTRADO'));
      return;
    }
    email_destino = perfil.email_principal;
    nombre = nombre_display(perfil);
    detalle_obj = {
      programa: programa,
      obligatorios: ['C1', 'C2'].concat(obtener_obligatorios_seleccionados())
    };
  }

  var btn = document.getElementById('btn-enviar-firma');
  deshabilitar_boton(btn, 'Enviando...');

  try {
    var cuerpo_tarea = {
      perfil_id: es_externo ? null : perfil_id,
      solicitado_por: estado.perfil.id,
      tipo_tarea: 'consentimiento',
      detalle: JSON.stringify(detalle_obj),
      estado: 'pendiente'
    };

    var resultado = await supabase_fetch('/tareas', estado.jwt, {
      metodo: 'POST',
      cuerpo: cuerpo_tarea,
      prefer: 'return=representation'
    });

    var tarea_id = resultado[0].id;
    var base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    var enlace = base + 'firma.html?token=' + tarea_id;

    try {
      await notificar_email(
        email_destino,
        'Solicitud de firma — DiversoLab',
        'Hola ' + nombre + ',\n\n' +
        'Tienes una solicitud de firma de consentimientos para el programa "' + programa + '".\n\n' +
        'Para completar la firma, abre el siguiente enlace:\n' + enlace + '\n\n' +
        'Este enlace es personal e intransferible.\n\n' +
        'Equipo DiversoLab'
      );
    } catch (e) { /* email no bloquea */ }

    cerrar_todos_modales();
    mostrar_exito('Solicitud de firma enviada a ' + nombre);
    await recargar_tareas();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  } finally {
    habilitar_boton(btn, 'Enviar solicitud');
  }
}

function obtener_obligatorios_seleccionados() {
  var checks = document.querySelectorAll('#firma-consentimientos .firma-consent-check[value]');
  var seleccionados = [];
  for (var i = 0; i < checks.length; i++) {
    if (checks[i].checked) seleccionados.push(checks[i].value);
  }
  return seleccionados;
}

// --- Recargar tareas ---

async function recargar_tareas() {
  try {
    estado.tareas = await supabase_fetch(
      '/tareas?solicitado_por=eq.' + estado.perfil.id +
      '&select=id,tipo_tarea,detalle,estado,es_urgente,fecha_limite,perfil_id,created_at' +
      '&order=created_at.desc&limit=20',
      estado.jwt
    ) || [];
    poblar_tareas();
    poblar_kpis();
  } catch (e) {}
}

// --- Helpers ---

function extraer_nombre_externo(detalle_str) {
  try {
    var d = JSON.parse(detalle_str);
    if (d.firmante_externo) {
      return ((d.firmante_externo.nombre || '') + ' ' + (d.firmante_externo.apellido || '')).trim();
    }
  } catch (e) {}
  return null;
}

function buscar_expediente(perfil_id) {
  for (var i = 0; i < estado.expedientes.length; i++) {
    if (estado.expedientes[i].id === perfil_id) return estado.expedientes[i];
  }
  return null;
}

