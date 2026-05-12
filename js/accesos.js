// Accesos — gestión de accesos, miembros y asignaciones
// Depende de: config.js, supabase-client.js, gas-client.js, utils.js, labels.js, modales.js

var CLAVES_PERMISOS = ['gestion_beneficiarios', 'gestion_proveedores', 'gestion_accesos', 'gestion_plataforma'];

var estado = {
  sesion: null,
  perfil_id: null,
  jwt: null,
  tab_activa: 'pendientes',
  pendientes: [],
  miembros: [],
  asignaciones: [],
  analista_seleccionado: null,
  miembro_editando_id: null
};

document.addEventListener('DOMContentLoaded', function() {
  cargar_pagina();
});

async function cargar_pagina() {
  estado.sesion = await verificar_sesion();
  if (!estado.sesion) return;
  estado.jwt = estado.sesion.access_token;

  var perfiles = await supabase_fetch(
    '/profiles?auth_user_id=eq.' + estado.sesion.user.id + '&select=id,profile_type&limit=1',
    estado.jwt
  );

  if (!perfiles || perfiles.length === 0 || perfiles[0].profile_type !== 'miembro') {
    window.location.href = 'mi-expediente.html';
    return;
  }

  estado.perfil_id = perfiles[0].id;

  var permisos = await supabase_fetch(
    '/permisos_miembro?perfil_id=eq.' + estado.perfil_id + '&activo=eq.true&select=permiso',
    estado.jwt
  );

  var lista_permisos = (permisos || []).map(function(p) { return p.permiso; });

  if (lista_permisos.indexOf('gestion_accesos') === -1 && lista_permisos.indexOf('gestion_plataforma') === -1) {
    window.location.href = 'dashboard.html';
    return;
  }

  vincular_eventos();
  cargar_pendientes();
}

function vincular_eventos() {
  document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrar_sesion);

  var tabs = document.querySelectorAll('.accesos-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', al_click_tab);
  }

  document.getElementById('btn-nuevo-miembro').addEventListener('click', al_click_nuevo_miembro);
  document.getElementById('btn-crear-miembro').addEventListener('click', al_crear_miembro);
  document.getElementById('btn-guardar-permisos').addEventListener('click', al_guardar_permisos);
  document.getElementById('selector-analista').addEventListener('change', al_cambiar_analista);
  document.getElementById('btn-asignar-perfil').addEventListener('click', al_click_asignar_perfil);
  document.getElementById('btn-confirmar-asignacion').addEventListener('click', al_confirmar_asignacion);

  document.getElementById('contenido-pendientes').addEventListener('click', al_click_tabla_pendientes);
  document.getElementById('contenido-miembros').addEventListener('click', al_click_tabla_miembros);
  document.getElementById('contenido-asignaciones').addEventListener('click', al_click_tabla_asignaciones);

  vincular_modales_cierre(function() {
    estado.miembro_editando_id = null;
  });
}

// --- Tabs ---

function al_click_tab(e) {
  var nombre = e.target.id.replace('tab-', '');
  activar_tab(nombre);
}

function activar_tab(nombre) {
  estado.tab_activa = nombre;

  var tabs = document.querySelectorAll('.accesos-tab');
  var paneles = ['panel-pendientes', 'panel-miembros', 'panel-asignaciones'];

  for (var i = 0; i < tabs.length; i++) {
    var es_activa = tabs[i].id === 'tab-' + nombre;
    tabs[i].setAttribute('aria-selected', es_activa ? 'true' : 'false');
  }

  for (var j = 0; j < paneles.length; j++) {
    document.getElementById(paneles[j]).hidden = paneles[j] !== 'panel-' + nombre;
  }

  if (nombre === 'pendientes') cargar_pendientes();
  if (nombre === 'miembros') cargar_miembros();
  if (nombre === 'asignaciones') cargar_datos_asignaciones();
}

// --- Tab 1: Pendientes ---

async function cargar_pendientes() {
  var contenedor = document.getElementById('contenido-pendientes');
  contenedor.innerHTML = '<p class="cargando-texto" aria-busy="true">Cargando...</p>';

  try {
    var datos = await supabase_fetch(
      '/profiles?estado_perfil=eq.pendiente&select=id,nombre,apellido,razon_social,profile_type,tipo_documento,numero_documento,email_principal,fecha_registro&order=fecha_registro.asc&limit=100',
      estado.jwt
    );

    estado.pendientes = datos || [];
    poblar_tabla_pendientes();
  } catch (error) {
    contenedor.innerHTML = '<p class="estado-vacio">Error al cargar perfiles pendientes.</p>';
  }
}

function poblar_tabla_pendientes() {
  var contenedor = document.getElementById('contenido-pendientes');

  if (estado.pendientes.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">No hay perfiles pendientes de aprobación.</p>';
    return;
  }

  var html = '<div class="tabla-contenedor"><table class="tabla-datos"><thead><tr>' +
    '<th scope="col">Nombre / Razón social</th>' +
    '<th scope="col">Tipo</th>' +
    '<th scope="col">Documento</th>' +
    '<th scope="col">Email</th>' +
    '<th scope="col">Fecha</th>' +
    '<th scope="col">Acciones</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < estado.pendientes.length; i++) {
    var p = estado.pendientes[i];
    html += '<tr>' +
      '<td>' + escapar_html(nombre_display(p)) + '</td>' +
      '<td>' + badge_tipo(p.profile_type) + '</td>' +
      '<td>' + escapar_html(p.tipo_documento + ' ' + p.numero_documento) + '</td>' +
      '<td>' + escapar_html(p.email_principal) + '</td>' +
      '<td>' + formatear_fecha(p.fecha_registro) + '</td>' +
      '<td><div class="tabla-acciones">' +
      '<button type="button" class="btn-accion btn-accion-aprobar" data-accion="aprobar" data-indice="' + i + '">Aprobar</button>' +
      '<button type="button" class="btn-accion btn-accion-rechazar" data-accion="rechazar" data-indice="' + i + '">Rechazar</button>' +
      '</div></td></tr>';
  }

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

function al_click_tabla_pendientes(e) {
  var btn = e.target.closest('[data-accion]');
  if (!btn) return;
  var indice = parseInt(btn.dataset.indice);
  if (btn.dataset.accion === 'aprobar') al_aprobar_perfil(indice, btn);
  if (btn.dataset.accion === 'rechazar') al_rechazar_perfil(indice, btn);
}

async function al_aprobar_perfil(indice, btn) {
  var perfil = estado.pendientes[indice];
  if (!perfil) return;

  btn.disabled = true;
  btn.textContent = 'Aprobando...';

  try {
    await supabase_fetch('/profiles?id=eq.' + perfil.id, estado.jwt, {
      metodo: 'PATCH',
      cuerpo: { estado_perfil: 'activo' },
      prefer: 'return=minimal'
    });

    await Promise.all([
      crear_carpeta({
        profile_id: perfil.id,
        profile_type: perfil.profile_type,
        nombre: ((perfil.nombre || '') + ' ' + (perfil.apellido || '')).trim(),
        razon_social: perfil.razon_social
      }).catch(function() {}),
      notificar_email(
        perfil.email_principal,
        'Tu cuenta ha sido aprobada — DiversoLab',
        'Hola ' + escapar_html(nombre_display(perfil)) + ', tu cuenta en DiversoLab ha sido aprobada. Ya puedes iniciar sesión en app.diversolab.org.'
      ).catch(function() {})
    ]);

    mostrar_exito('Perfil aprobado: ' + nombre_display(perfil));
    cargar_pendientes();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
    btn.disabled = false;
    btn.textContent = 'Aprobar';
  }
}

async function al_rechazar_perfil(indice, btn) {
  var perfil = estado.pendientes[indice];
  if (!perfil) return;
  if (!confirm('¿Rechazar el perfil de ' + nombre_display(perfil) + '? Esta acción no se puede deshacer.')) return;

  btn.disabled = true;
  btn.textContent = 'Rechazando...';

  try {
    await supabase_fetch('/profiles?id=eq.' + perfil.id, estado.jwt, {
      metodo: 'PATCH',
      cuerpo: { estado_perfil: 'inactivo' },
      prefer: 'return=minimal'
    });

    try {
      await notificar_email(
        perfil.email_principal,
        'Actualización sobre tu solicitud — DiversoLab',
        'Hola ' + escapar_html(nombre_display(perfil)) + ', lamentamos informarte que tu solicitud no fue aprobada. Para más información, contacta a info@diversolab.org.'
      );
    } catch (e) { /* notificacion no bloquea */ }

    mostrar_exito('Perfil rechazado');
    cargar_pendientes();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
    btn.disabled = false;
    btn.textContent = 'Rechazar';
  }
}

// --- Tab 2: Miembros ---

async function cargar_miembros() {
  var contenedor = document.getElementById('contenido-miembros');
  contenedor.innerHTML = '<p class="cargando-texto" aria-busy="true">Cargando...</p>';

  try {
    var datos = await supabase_fetch(
      '/profiles?profile_type=eq.miembro&estado_perfil=eq.activo&select=id,nombre,apellido,email_principal,permisos_miembro(permiso,activo)&order=nombre.asc',
      estado.jwt
    );

    estado.miembros = datos || [];
    poblar_tabla_miembros();
  } catch (error) {
    contenedor.innerHTML = '<p class="estado-vacio">Error al cargar miembros.</p>';
  }
}

function poblar_tabla_miembros() {
  var contenedor = document.getElementById('contenido-miembros');

  if (estado.miembros.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">No hay miembros registrados.</p>';
    return;
  }

  var html = '<div class="tabla-contenedor"><table class="tabla-datos"><thead><tr>' +
    '<th scope="col">Nombre</th>' +
    '<th scope="col">Email</th>' +
    '<th scope="col">Permisos</th>' +
    '<th scope="col">Acciones</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < estado.miembros.length; i++) {
    var m = estado.miembros[i];
    var permisos_activos = (m.permisos_miembro || []).filter(function(p) { return p.activo; });

    html += '<tr>' +
      '<td>' + escapar_html(((m.nombre || '') + ' ' + (m.apellido || '')).trim() || '—') + '</td>' +
      '<td>' + escapar_html(m.email_principal) + '</td>' +
      '<td><div class="permisos-grupo">' + badges_permisos(permisos_activos) + '</div></td>' +
      '<td><button type="button" class="btn-accion btn-accion-editar" data-accion="editar" data-indice="' + i + '">Editar</button></td>' +
      '</tr>';
  }

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

function al_click_tabla_miembros(e) {
  var btn = e.target.closest('[data-accion="editar"]');
  if (!btn) return;
  var indice = parseInt(btn.dataset.indice);
  mostrar_modal_editar_permisos(indice);
}

// --- Nuevo miembro ---

function al_click_nuevo_miembro() {
  document.getElementById('nuevo-nombre').value = '';
  document.getElementById('nuevo-apellido').value = '';
  document.getElementById('nuevo-email').value = '';
  document.getElementById('nuevo-tipo-doc').value = 'CC';
  document.getElementById('nuevo-num-doc').value = '';
  document.getElementById('nuevo-email-ayuda').hidden = true;

  var checks = document.querySelectorAll('#nuevo-permisos .modal-permiso-check');
  for (var i = 0; i < checks.length; i++) checks[i].checked = false;

  abrir_modal('modal-nuevo-miembro');
  document.getElementById('nuevo-nombre').focus();
}

async function al_crear_miembro() {
  var nombre = document.getElementById('nuevo-nombre').value.trim();
  var apellido = document.getElementById('nuevo-apellido').value.trim();
  var email = document.getElementById('nuevo-email').value.trim();
  var tipo_doc = document.getElementById('nuevo-tipo-doc').value;
  var num_doc = document.getElementById('nuevo-num-doc').value.trim();

  if (!nombre || !apellido || !email || !tipo_doc || !num_doc) {
    mostrar_error(mensaje_usuario('CAMPOS_OBLIGATORIOS'));
    return;
  }

  if (!validar_email(email) || !email.endsWith('@diversolab.org')) {
    document.getElementById('nuevo-email-ayuda').hidden = false;
    return;
  }
  document.getElementById('nuevo-email-ayuda').hidden = true;

  if (!validar_documento(tipo_doc, num_doc)) {
    mostrar_error(mensaje_usuario('DOCUMENTO_INVALIDO'));
    return;
  }

  var btn = document.getElementById('btn-crear-miembro');
  deshabilitar_boton(btn, 'Creando...');

  try {
    var resultado = await supabase_fetch('/profiles', estado.jwt, {
      metodo: 'POST',
      cuerpo: {
        profile_type: 'miembro',
        nombre: nombre,
        apellido: apellido,
        email_principal: email,
        tipo_documento: tipo_doc,
        numero_documento: num_doc,
        estado_perfil: 'activo'
      },
      prefer: 'return=representation'
    });

    var nuevo_id = resultado[0].id;

    var permisos_seleccionados = obtener_permisos_modal('nuevo-permisos');
    if (permisos_seleccionados.length > 0) {
      var filas = permisos_seleccionados.map(function(p) {
        return { perfil_id: nuevo_id, permiso: p, activo: true };
      });
      await supabase_fetch('/permisos_miembro', estado.jwt, {
        metodo: 'POST',
        cuerpo: filas,
        prefer: 'return=minimal'
      });
    }

    cerrar_todos_modales();
    mostrar_exito('Miembro creado: ' + nombre);
    cargar_miembros();
  } catch (error) {
    var msg = error.message;
    if (msg && msg.indexOf('email_principal') !== -1) {
      mostrar_error(mensaje_usuario('MIEMBRO_EMAIL_DUPLICADO'));
    } else if (msg && msg.indexOf('idx_profiles_doc') !== -1) {
      mostrar_error(mensaje_usuario('MIEMBRO_DOC_DUPLICADO'));
    } else {
      mostrar_error(mensaje_usuario(msg));
    }
  } finally {
    habilitar_boton(btn, 'Crear miembro');
  }
}

// --- Editar permisos ---

function mostrar_modal_editar_permisos(indice) {
  var miembro = estado.miembros[indice];
  if (!miembro) return;

  estado.miembro_editando_id = miembro.id;

  document.getElementById('editar-info-miembro').textContent =
    (((miembro.nombre || '') + ' ' + (miembro.apellido || '')).trim() || '—') + ' — ' + miembro.email_principal;

  var permisos_activos = (miembro.permisos_miembro || [])
    .filter(function(p) { return p.activo; })
    .map(function(p) { return p.permiso; });

  var checks = document.querySelectorAll('#editar-permisos .modal-permiso-check');
  for (var i = 0; i < checks.length; i++) {
    checks[i].checked = permisos_activos.indexOf(checks[i].value) !== -1;
  }

  abrir_modal('modal-editar-permisos');
}

async function al_guardar_permisos() {
  if (!estado.miembro_editando_id) return;

  var btn = document.getElementById('btn-guardar-permisos');
  deshabilitar_boton(btn, 'Guardando...');

  try {
    var seleccionados = obtener_permisos_modal('editar-permisos');

    var filas = CLAVES_PERMISOS.map(function(clave) {
      return {
        perfil_id: estado.miembro_editando_id,
        permiso: clave,
        activo: seleccionados.indexOf(clave) !== -1
      };
    });

    await supabase_fetch('/permisos_miembro', estado.jwt, {
      metodo: 'POST',
      cuerpo: filas,
      prefer: 'resolution=merge-duplicates,return=minimal'
    });

    cerrar_todos_modales();
    mostrar_exito('Permisos actualizados');
    cargar_miembros();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  } finally {
    habilitar_boton(btn, 'Guardar');
  }
}

// --- Tab 3: Asignaciones ---

async function cargar_datos_asignaciones() {
  try {
    var miembros = await supabase_fetch(
      '/profiles?profile_type=eq.miembro&estado_perfil=eq.activo&select=id,nombre,apellido&order=nombre.asc',
      estado.jwt
    );
    poblar_selector_analistas(miembros || []);
  } catch (error) {
    document.getElementById('contenido-asignaciones').innerHTML =
      '<p class="estado-vacio">Error al cargar datos.</p>';
  }
}

function poblar_selector_analistas(miembros) {
  var selector = document.getElementById('selector-analista');
  var html = '<option value="">Seleccionar miembro...</option>';
  for (var i = 0; i < miembros.length; i++) {
    html += '<option value="' + miembros[i].id + '">' +
      escapar_html(((miembros[i].nombre || '') + ' ' + (miembros[i].apellido || '')).trim() || '—') + '</option>';
  }
  selector.innerHTML = html;
}

async function al_cambiar_analista() {
  var id = document.getElementById('selector-analista').value;
  estado.analista_seleccionado = id || null;
  document.getElementById('btn-asignar-perfil').disabled = !id;

  if (!id) {
    document.getElementById('contenido-asignaciones').innerHTML =
      '<p class="estado-vacio">Selecciona un miembro para ver sus asignaciones.</p>';
    return;
  }

  var contenedor = document.getElementById('contenido-asignaciones');
  contenedor.innerHTML = '<p class="cargando-texto" aria-busy="true">Cargando...</p>';

  try {
    var asigs = await supabase_fetch(
      '/asignaciones?analista_id=eq.' + id + '&estado=eq.activa&select=id,perfil_id,fecha_inicio&order=fecha_inicio.asc',
      estado.jwt
    );

    asigs = asigs || [];

    if (asigs.length === 0) {
      estado.asignaciones = [];
      contenedor.innerHTML = '<p class="estado-vacio">Este miembro no tiene perfiles asignados.</p>';
      return;
    }

    var ids = asigs.map(function(a) { return a.perfil_id; });
    var perfiles = await supabase_fetch(
      '/profiles?id=in.(' + ids.join(',') + ')&select=id,nombre,apellido,razon_social,profile_type,email_principal',
      estado.jwt
    );

    var mapa_perfiles = {};
    (perfiles || []).forEach(function(p) { mapa_perfiles[p.id] = p; });

    estado.asignaciones = asigs.map(function(a) {
      return {
        id: a.id,
        fecha_inicio: a.fecha_inicio,
        perfil: mapa_perfiles[a.perfil_id] || null
      };
    });

    poblar_tabla_asignaciones();
  } catch (error) {
    contenedor.innerHTML = '<p class="estado-vacio">Error al cargar asignaciones.</p>';
  }
}

function poblar_tabla_asignaciones() {
  var contenedor = document.getElementById('contenido-asignaciones');

  if (estado.asignaciones.length === 0) {
    contenedor.innerHTML = '<p class="estado-vacio">Este miembro no tiene perfiles asignados.</p>';
    return;
  }

  var html = '<div class="tabla-contenedor"><table class="tabla-datos"><thead><tr>' +
    '<th scope="col">Nombre / Razón social</th>' +
    '<th scope="col">Tipo</th>' +
    '<th scope="col">Email</th>' +
    '<th scope="col">Desde</th>' +
    '<th scope="col">Acciones</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < estado.asignaciones.length; i++) {
    var a = estado.asignaciones[i];
    var p = a.perfil;
    html += '<tr>' +
      '<td>' + (p ? escapar_html(nombre_display(p)) : '—') + '</td>' +
      '<td>' + (p ? badge_tipo(p.profile_type) : '—') + '</td>' +
      '<td>' + (p ? escapar_html(p.email_principal) : '—') + '</td>' +
      '<td>' + (a.fecha_inicio || '—') + '</td>' +
      '<td><button type="button" class="btn-accion btn-accion-finalizar" data-accion="finalizar" data-indice="' + i + '">Finalizar</button></td>' +
      '</tr>';
  }

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

function al_click_tabla_asignaciones(e) {
  var btn = e.target.closest('[data-accion="finalizar"]');
  if (!btn) return;
  var indice = parseInt(btn.dataset.indice);
  al_finalizar_asignacion(indice, btn);
}

async function al_finalizar_asignacion(indice, btn) {
  var asig = estado.asignaciones[indice];
  if (!asig) return;
  if (!confirm('¿Finalizar esta asignación?')) return;

  btn.disabled = true;
  btn.textContent = 'Finalizando...';

  try {
    await supabase_fetch('/asignaciones?id=eq.' + asig.id, estado.jwt, {
      metodo: 'PATCH',
      cuerpo: {
        estado: 'finalizada',
        fecha_fin: new Date().toISOString().split('T')[0]
      },
      prefer: 'return=minimal'
    });

    mostrar_exito('Asignación finalizada');
    al_cambiar_analista();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
    btn.disabled = false;
    btn.textContent = 'Finalizar';
  }
}

// --- Asignar perfil ---

async function al_click_asignar_perfil() {
  if (!estado.analista_seleccionado) return;

  try {
    var todos = await supabase_fetch(
      '/profiles?estado_perfil=eq.activo&profile_type=neq.miembro&select=id,nombre,apellido,razon_social,profile_type&order=nombre.asc',
      estado.jwt
    );

    var asignados_ids = estado.asignaciones.map(function(a) {
      return a.perfil ? a.perfil.id : null;
    });

    var disponibles = (todos || []).filter(function(p) {
      return asignados_ids.indexOf(p.id) === -1;
    });

    var selector = document.getElementById('selector-perfil-asignar');
    var html = '<option value="">Seleccionar perfil...</option>';
    for (var i = 0; i < disponibles.length; i++) {
      var p = disponibles[i];
      html += '<option value="' + p.id + '">' +
        escapar_html(nombre_display(p)) + ' (' + (LABELS_TIPOS[p.profile_type] || p.profile_type) + ')' +
        '</option>';
    }
    selector.innerHTML = html;

    if (disponibles.length === 0) {
      selector.innerHTML = '<option value="">No hay perfiles disponibles</option>';
    }

    abrir_modal('modal-asignar');
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  }
}

async function al_confirmar_asignacion() {
  var perfil_id = document.getElementById('selector-perfil-asignar').value;
  if (!perfil_id || !estado.analista_seleccionado) {
    mostrar_error(mensaje_usuario('SELECCIONAR_PERFIL_ASIGNAR'));
    return;
  }

  var btn = document.getElementById('btn-confirmar-asignacion');
  deshabilitar_boton(btn, 'Asignando...');

  try {
    await supabase_fetch('/asignaciones', estado.jwt, {
      metodo: 'POST',
      cuerpo: {
        analista_id: estado.analista_seleccionado,
        perfil_id: perfil_id,
        estado: 'activa'
      },
      prefer: 'return=minimal'
    });

    cerrar_todos_modales();
    mostrar_exito('Perfil asignado correctamente');
    al_cambiar_analista();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message));
  } finally {
    habilitar_boton(btn, 'Asignar');
  }
}

// --- Helpers ---

function obtener_permisos_modal(contenedor_id) {
  var checks = document.querySelectorAll('#' + contenedor_id + ' .modal-permiso-check');
  var seleccionados = [];
  for (var i = 0; i < checks.length; i++) {
    if (checks[i].checked) seleccionados.push(checks[i].value);
  }
  return seleccionados;
}
