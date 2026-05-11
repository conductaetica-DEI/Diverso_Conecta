// Lógica principal — crear carpetas de expedientes en Google Drive

function crear_carpeta_expediente(datos) {
  var error_validacion = validar_datos_carpeta(datos);
  if (error_validacion) return error_validacion;

  var props = PropertiesService.getScriptProperties();
  var carpeta_raiz = DriveApp.getFolderById(props.getProperty('CARPETA_RAIZ_ID'));

  var nombres_tipo = {
    'beneficiario': 'beneficiarios',
    'aliado': 'aliados',
    'contratista': 'contratistas',
    'proveedor': 'proveedores'
  };

  var carpeta_tipo = obtener_o_crear_subcarpeta(carpeta_raiz, nombres_tipo[datos.profile_type]);

  var nombre_persona = datos.profile_type === 'aliado' || datos.profile_type === 'proveedor'
    ? datos.razon_social
    : datos.nombre;
  var nombre_carpeta = datos.profile_id + '_' + nombre_persona;

  // Verificar si ya existe (no duplicar)
  var existentes = carpeta_tipo.getFoldersByName(nombre_carpeta);
  if (existentes.hasNext()) {
    var carpeta_existente = existentes.next();
    return {
      ok: true,
      carpeta_drive_id: carpeta_existente.getId(),
      url: carpeta_existente.getUrl(),
      ya_existia: true
    };
  }

  var carpeta_perfil = carpeta_tipo.createFolder(nombre_carpeta);
  var subcarpetas = obtener_subcarpetas_por_tipo(datos.profile_type);

  for (var i = 0; i < subcarpetas.length; i++) {
    var partes = subcarpetas[i].split('/');
    var carpeta_padre = carpeta_perfil;

    for (var j = 0; j < partes.length; j++) {
      carpeta_padre = obtener_o_crear_subcarpeta(carpeta_padre, partes[j]);
    }
  }

  // Actualizar perfil en Supabase
  var carpeta_id = carpeta_perfil.getId();
  actualizar_carpeta_perfil(datos.profile_id, carpeta_id);

  return {
    ok: true,
    carpeta_drive_id: carpeta_id,
    url: carpeta_perfil.getUrl()
  };
}

function obtener_o_crear_subcarpeta(carpeta_padre, nombre) {
  var existentes = carpeta_padre.getFoldersByName(nombre);
  if (existentes.hasNext()) {
    return existentes.next();
  }
  return carpeta_padre.createFolder(nombre);
}

function obtener_subcarpetas_por_tipo(profile_type) {
  var estructura = {
    'beneficiario': [
      'kyc',
      'administrativos',
      'diversolab',
      'diversolab/qol',
      'diversolab/intervencion',
      'diversolab/analisis'
    ],
    'aliado': [
      'kyc',
      'administrativos',
      'diversolab',
      'diversolab/dei',
      'diversolab/consultoria',
      'diversolab/analisis'
    ],
    'contratista': [
      'kyc',
      'administrativos',
      'financieros'
    ],
    'proveedor': [
      'kyc',
      'administrativos',
      'financieros'
    ]
  };

  return estructura[profile_type] || [];
}

function validar_datos_carpeta(datos) {
  if (!datos.profile_id || !datos.profile_type) {
    return { ok: false, error: 'DATOS_REQUERIDOS' };
  }

  var tipos_validos = ['beneficiario', 'aliado', 'contratista', 'proveedor'];
  if (tipos_validos.indexOf(datos.profile_type) === -1) {
    return { ok: false, error: 'TIPO_PERFIL_INVALIDO' };
  }

  var es_empresa = datos.profile_type === 'aliado' || datos.profile_type === 'proveedor';
  if (es_empresa && !datos.razon_social) {
    return { ok: false, error: 'RAZON_SOCIAL_REQUERIDA' };
  }
  if (!es_empresa && !datos.nombre) {
    return { ok: false, error: 'NOMBRE_REQUERIDO' };
  }

  return null;
}
