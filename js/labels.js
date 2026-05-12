// Labels, badges y helpers compartidos entre páginas

// --- Mapas de etiquetas ---

var LABELS_TIPOS = {
  beneficiario: 'Beneficiario',
  aliado: 'Aliado',
  contratista: 'Contratista',
  proveedor: 'Proveedor',
  miembro: 'Miembro'
};

var LABELS_PERMISOS = {
  gestion_beneficiarios: 'Beneficiarios y aliados',
  gestion_proveedores: 'Contratistas y proveedores',
  gestion_accesos: 'Accesos',
  gestion_plataforma: 'Plataforma'
};

var LABELS_ESTADOS_PERFIL = {
  pendiente: 'Pendiente',
  activo: 'Activo',
  suspendido: 'Suspendido',
  inactivo: 'Inactivo'
};

var LABELS_ESTADOS_TAREA = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  completada: 'Completada',
  vencida: 'Vencida'
};

var LABELS_TIPO_TAREA = {
  consentimiento: 'Firma consentimientos',
  documento: 'Subir documento',
  kyc: 'Documentación KYC',
  revision: 'Revisión'
};

var LABELS_ESTADOS_DOC = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado'
};

var LABELS_CONSENTIMIENTOS = {
  C1: 'Datos básicos',
  C2: 'Identificación',
  C3: 'Datos sensibles',
  C4: 'Analítica/IA',
  C5: 'Comunicaciones',
  C6: 'Imagen/voz',
  C7: 'Seguimiento'
};

// --- Badges ---

function nombre_display(perfil) {
  return perfil.razon_social || ((perfil.nombre || '') + ' ' + (perfil.apellido || '')).trim() || '—';
}

function badge_tipo(tipo) {
  var label = LABELS_TIPOS[tipo] || tipo;
  var clase = 'insignia-neutra';
  if (tipo === 'miembro') clase = 'insignia-exito';
  if (tipo === 'beneficiario' || tipo === 'contratista') clase = 'insignia-progreso';
  return '<span class="insignia ' + clase + '">' + escapar_html(label) + '</span>';
}

function badge_estado_perfil(est) {
  var label = LABELS_ESTADOS_PERFIL[est] || est;
  var clase = 'insignia-neutra';
  if (est === 'activo') clase = 'insignia-exito';
  if (est === 'pendiente') clase = 'insignia-progreso';
  if (est === 'suspendido') clase = 'insignia-alerta';
  return '<span class="insignia ' + clase + '">' + escapar_html(label) + '</span>';
}

function badge_estado_tarea(est) {
  var label = LABELS_ESTADOS_TAREA[est] || est;
  var clase = 'insignia-neutra';
  if (est === 'pendiente') clase = 'insignia-alerta';
  if (est === 'en_curso') clase = 'insignia-progreso';
  if (est === 'completada') clase = 'insignia-exito';
  if (est === 'vencida') clase = 'insignia-alerta';
  return '<span class="insignia ' + clase + '">' + escapar_html(label) + '</span>';
}

function badge_estado_doc(est) {
  var label = LABELS_ESTADOS_DOC[est] || est;
  var clase = 'insignia-neutra';
  if (est === 'aprobado') clase = 'insignia-exito';
  if (est === 'pendiente') clase = 'insignia-progreso';
  if (est === 'rechazado') clase = 'insignia-alerta';
  return '<span class="insignia ' + clase + '">' + escapar_html(label) + '</span>';
}

function badges_permisos(permisos_arr) {
  if (!permisos_arr || permisos_arr.length === 0) return '<span class="texto-muted">Sin permisos</span>';
  var html = '';
  for (var i = 0; i < permisos_arr.length; i++) {
    var label = LABELS_PERMISOS[permisos_arr[i].permiso] || permisos_arr[i].permiso;
    html += '<span class="insignia insignia-exito">' + escapar_html(label) + '</span>';
  }
  return html;
}

// --- Helpers de formato ---

function formatear_fecha_corta(fecha_str) {
  if (!fecha_str) return '—';
  var fecha = new Date(fecha_str);
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatear_fecha_cot() {
  var ahora = new Date();
  return ahora.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' (COT)';
}

function limpiar_html(html) {
  var temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

function extraer_detalle(detalle) {
  if (!detalle) return '';
  try {
    var datos = JSON.parse(detalle);
    if (datos.programa) return datos.programa;
  } catch (e) {}
  return detalle;
}
