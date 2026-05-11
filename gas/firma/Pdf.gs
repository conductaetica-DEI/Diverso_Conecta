// Generación de PDF — constancia + anexos legales desde Google Docs

function generar_pdf_constancia(datos, registros, timestamp) {
  var doc = DocumentApp.create('Constancia_' + datos.firmante.nombre + '_' + timestamp);
  var cuerpo = doc.getBody();
  cuerpo.clear();

  construir_encabezado(cuerpo);
  construir_datos_firmante(cuerpo, datos);
  construir_mensaje_introductorio(cuerpo);
  construir_tabla_consentimientos(cuerpo, registros);
  construir_evidencia(cuerpo, registros, timestamp, datos);
  construir_anexo_fdato01(cuerpo);
  construir_anexo_sicepol01(cuerpo);

  doc.saveAndClose();

  var pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  var carpeta = obtener_carpeta_destino(datos.perfil_id);
  var archivo_pdf = carpeta.createFile(pdf);
  archivo_pdf.setName('Constancia_Consentimiento_' + datos.firmante.numero_documento + '_' + timestamp.substring(0, 10) + '.pdf');

  DriveApp.getFileById(doc.getId()).setTrashed(true);

  return {
    url: archivo_pdf.getUrl(),
    archivo: archivo_pdf.getAs('application/pdf')
  };
}

function obtener_carpeta_destino(perfil_id) {
  var carpeta_perfil_id = obtener_carpeta_perfil(perfil_id);
  if (carpeta_perfil_id) {
    try {
      return DriveApp.getFolderById(carpeta_perfil_id);
    } catch (e) {
      // Carpeta no accesible, usar carpeta de firmas
    }
  }

  var props = PropertiesService.getScriptProperties();
  return DriveApp.getFolderById(props.getProperty('DRIVE_CARPETA_FIRMAS'));
}

// --- SECCIONES DE LA CONSTANCIA ---

function construir_encabezado(cuerpo) {
  var titulo = cuerpo.appendParagraph('DIVERSOLAB');
  titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  titulo.setAttributes(estilo_titulo());

  var subtitulo = cuerpo.appendParagraph('Constancia de Consentimiento Informado');
  subtitulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  subtitulo.setAttributes(estilo_subtitulo());

  cuerpo.appendParagraph('');
}

function construir_datos_firmante(cuerpo, datos) {
  var seccion = cuerpo.appendParagraph('DATOS DEL FIRMANTE');
  seccion.setAttributes(estilo_seccion());

  if (datos.tipo_firma === 'persona_juridica') {
    agregar_campo(cuerpo, 'Empresa', datos.firmante.empresa);
    agregar_campo(cuerpo, 'NIT', datos.firmante.nit_empresa);
    agregar_campo(cuerpo, 'Representante', datos.firmante.nombre);
    agregar_campo(cuerpo, 'Cargo', datos.firmante.cargo);
  } else {
    agregar_campo(cuerpo, 'Nombre', datos.firmante.nombre);
  }

  agregar_campo(cuerpo, 'Documento', datos.firmante.tipo_documento + ' ' + datos.firmante.numero_documento);
  agregar_campo(cuerpo, 'Email', datos.firmante.email);

  if (datos.programa) {
    agregar_campo(cuerpo, 'Programa', datos.programa);
  }

  cuerpo.appendParagraph('');
}

function construir_mensaje_introductorio(cuerpo) {
  var mensaje = cuerpo.appendParagraph(
    'En cumplimiento de la Política de Protección y Uso de Datos Personales (SICE-POL-01) ' +
    'y el Consentimiento Informado Integral (F-DATO-01) de DiversoLAB, disponibles en ' +
    'diversolab.org/politica, declaro que he leído ambos documentos y manifiesto mi voluntad ' +
    'frente a cada uno de los siguientes consentimientos:'
  );
  mensaje.setAttributes(estilo_cuerpo());
  cuerpo.appendParagraph('');
}

function construir_tabla_consentimientos(cuerpo, registros) {
  var tabla = cuerpo.appendTable();

  var encabezado = tabla.appendTableRow();
  agregar_celda_header(encabezado, 'Consentimiento');
  agregar_celda_header(encabezado, 'Texto');
  agregar_celda_header(encabezado, 'Decisión');
  agregar_celda_header(encabezado, 'Folio');

  var nombres = {
    'C1': 'Consentimiento 1 — General obligatorio',
    'C2': 'Consentimiento 2 — Identificación mínima',
    'C3': 'Consentimiento 3 — Datos sensibles',
    'C4': 'Consentimiento 4 — Analítica, modelos predictivos e inteligencia artificial',
    'C5': 'Consentimiento 5 — Comunicaciones',
    'C6': 'Consentimiento 6 — Imagen, voz y testimonios',
    'C7': 'Consentimiento 7 — Psicosocial y educativo'
  };

  for (var i = 0; i < registros.length; i++) {
    var r = registros[i];
    var fila = tabla.appendTableRow();
    agregar_celda(fila, nombres[r.codigo] || r.codigo);
    agregar_celda(fila, r.texto_aceptado);
    agregar_celda(fila, r.aceptado ? 'ACEPTADO' : 'RECHAZADO');
    agregar_celda(fila, r.folio);
  }

  cuerpo.appendParagraph('');
}

function construir_evidencia(cuerpo, registros, timestamp, datos) {
  var seccion = cuerpo.appendParagraph('EVIDENCIA JURÍDICA');
  seccion.setAttributes(estilo_seccion());

  agregar_campo(cuerpo, 'Fecha y hora', timestamp);
  agregar_campo(cuerpo, 'IP', datos.ip_address || 'No disponible');
  agregar_campo(cuerpo, 'User Agent', datos.user_agent || 'No disponible');
  agregar_campo(cuerpo, 'Versión documento', 'F-DATO-01 v1.0');

  cuerpo.appendParagraph('');
  var hash_titulo = cuerpo.appendParagraph('Hashes SHA-256 por consentimiento:');
  hash_titulo.setAttributes(estilo_cuerpo());

  for (var i = 0; i < registros.length; i++) {
    var linea = cuerpo.appendParagraph(registros[i].folio + ': ' + registros[i].hash_firma);
    linea.setAttributes(estilo_hash());
  }

  cuerpo.appendParagraph('');
}

// --- ANEXOS LEGALES ---

function construir_anexo_fdato01(cuerpo) {
  cuerpo.appendPageBreak();
  var titulo = cuerpo.appendParagraph('ANEXO 1 — F-DATO-01 v1.0 Consentimiento Informado Integral');
  titulo.setAttributes(estilo_seccion());
  cuerpo.appendParagraph('');

  copiar_documento_legal(cuerpo, 'DOC_ID_FDATO01');
}

function construir_anexo_sicepol01(cuerpo) {
  cuerpo.appendPageBreak();
  var titulo = cuerpo.appendParagraph('ANEXO 2 — SICE-POL-01 v1.0 Política de Protección y Uso de Datos Personales');
  titulo.setAttributes(estilo_seccion());
  cuerpo.appendParagraph('');

  copiar_documento_legal(cuerpo, 'DOC_ID_SICEPOL01');
}

function copiar_documento_legal(cuerpo_destino, property_id) {
  var props = PropertiesService.getScriptProperties();
  var doc_id = props.getProperty(property_id);

  try {
    var doc_origen = DocumentApp.openById(doc_id);
    var cuerpo_origen = doc_origen.getBody();
    var total_elementos = cuerpo_origen.getNumChildren();

    for (var i = 0; i < total_elementos; i++) {
      var elemento = cuerpo_origen.getChild(i);
      var tipo = elemento.getType();

      if (tipo === DocumentApp.ElementType.PARAGRAPH) {
        var parrafo_origen = elemento.asParagraph();
        var parrafo_nuevo = cuerpo_destino.appendParagraph(parrafo_origen.getText());
        copiar_atributos_parrafo(parrafo_origen, parrafo_nuevo);
      } else if (tipo === DocumentApp.ElementType.LIST_ITEM) {
        var item_origen = elemento.asListItem();
        var item_nuevo = cuerpo_destino.appendListItem(item_origen.getText());
        item_nuevo.setGlyphType(item_origen.getGlyphType());
        item_nuevo.setNestingLevel(item_origen.getNestingLevel());
      } else if (tipo === DocumentApp.ElementType.TABLE) {
        copiar_tabla(cuerpo_destino, elemento.asTable());
      }
    }
  } catch (err) {
    var error_msg = cuerpo_destino.appendParagraph(
      '[Documento no disponible — consultar en diversolab.org/politica]'
    );
    error_msg.setAttributes(estilo_cuerpo());
  }
}

function copiar_atributos_parrafo(origen, destino) {
  try {
    destino.setHeading(origen.getHeading());
    destino.setAlignment(origen.getAlignment());
  } catch (e) {
    // Atributos no copiables — continuar
  }
}

function copiar_tabla(cuerpo_destino, tabla_origen) {
  var num_filas = tabla_origen.getNumRows();
  if (num_filas === 0) return;

  var num_cols = tabla_origen.getRow(0).getNumCells();
  var tabla_nueva = cuerpo_destino.appendTable();

  for (var f = 0; f < num_filas; f++) {
    var fila_origen = tabla_origen.getRow(f);
    var fila_nueva = tabla_nueva.appendTableRow();
    for (var c = 0; c < fila_origen.getNumCells(); c++) {
      var celda = fila_nueva.appendTableCell(fila_origen.getCell(c).getText());
    }
  }
}

// --- HELPERS DE FORMATO ---

function agregar_campo(cuerpo, etiqueta, valor) {
  var parrafo = cuerpo.appendParagraph(etiqueta + ': ' + (valor || ''));
  parrafo.setAttributes(estilo_cuerpo());
  // Negrita solo en la etiqueta
  var texto = parrafo.editAsText();
  texto.setBold(0, etiqueta.length, true);
  texto.setBold(etiqueta.length, parrafo.getText().length - 1, false);
}

function agregar_celda_header(fila, texto) {
  var celda = fila.appendTableCell(texto);
  celda.editAsText().setBold(true);
  celda.editAsText().setFontSize(9);
}

function agregar_celda(fila, texto) {
  var celda = fila.appendTableCell(texto || '');
  celda.editAsText().setFontSize(8);
}

function estilo_titulo() {
  return {
    FONT_SIZE: 18,
    BOLD: true,
    FOREGROUND_COLOR: '#3f2b56'
  };
}

function estilo_subtitulo() {
  return {
    FONT_SIZE: 14,
    BOLD: true,
    FOREGROUND_COLOR: '#3f2b56'
  };
}

function estilo_seccion() {
  return {
    FONT_SIZE: 12,
    BOLD: true,
    FOREGROUND_COLOR: '#3f2b56'
  };
}

function estilo_cuerpo() {
  return {
    FONT_SIZE: 10,
    BOLD: false,
    FOREGROUND_COLOR: '#000000'
  };
}

function estilo_hash() {
  return {
    FONT_SIZE: 7,
    BOLD: false,
    FOREGROUND_COLOR: '#666666',
    FONT_FAMILY: 'Courier New'
  };
}
