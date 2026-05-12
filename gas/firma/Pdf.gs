// Generación de PDF — constancia desde plantilla Google Docs

function generar_pdf_constancia(datos, registros, timestamp) {
  var props = PropertiesService.getScriptProperties();
  var plantilla_id = props.getProperty('DOC_ID_PLANTILLA_FIRMA');

  var copia = DriveApp.getFileById(plantilla_id).makeCopy(
    'Constancia_' + datos.firmante.nombre + '_' + timestamp
  );
  var doc = DocumentApp.openById(copia.getId());
  var cuerpo = doc.getBody();

  // Datos del firmante
  reemplazar(cuerpo, '{{nombre}}', datos.firmante.nombre);
  reemplazar(cuerpo, '{{tipo_documento}}', datos.firmante.tipo_documento);
  reemplazar(cuerpo, '{{numero_documento}}', datos.firmante.numero_documento);
  reemplazar(cuerpo, '{{email}}', datos.firmante.email);
  reemplazar(cuerpo, '{{telefono}}', datos.firmante.telefono);
  reemplazar(cuerpo, '{{empresa}}', datos.firmante.empresa);
  reemplazar(cuerpo, '{{nit_empresa}}', datos.firmante.nit_empresa);
  reemplazar(cuerpo, '{{cargo}}', datos.firmante.cargo);
  reemplazar(cuerpo, '{{programa}}', datos.programa);

  // Evidencia jurídica
  reemplazar(cuerpo, '{{timestamp}}', timestamp);
  reemplazar(cuerpo, '{{ip_address}}', datos.ip_address);
  reemplazar(cuerpo, '{{user_agent}}', datos.user_agent);

  // Consentimientos C1-C7
  var mapa = {};
  for (var i = 0; i < registros.length; i++) {
    mapa[registros[i].codigo] = registros[i];
  }

  var codigos = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
  for (var j = 0; j < codigos.length; j++) {
    var cod = codigos[j];
    var prefijo = '{{' + cod.toLowerCase() + '_';
    var r = mapa[cod];
    if (r) {
      reemplazar(cuerpo, prefijo + 'decision}}', r.aceptado ? 'ACEPTADO' : 'RECHAZADO');
      reemplazar(cuerpo, prefijo + 'folio}}', r.folio);
      reemplazar(cuerpo, prefijo + 'hash}}', r.hash_firma);
    } else {
      reemplazar(cuerpo, prefijo + 'decision}}', '—');
      reemplazar(cuerpo, prefijo + 'folio}}', '—');
      reemplazar(cuerpo, prefijo + 'hash}}', '—');
    }
  }

  doc.saveAndClose();

  var pdf = copia.getAs('application/pdf');
  var carpeta = obtener_carpeta_destino(datos.perfil_id);
  var archivo_pdf = carpeta.createFile(pdf);
  archivo_pdf.setName(
    'Constancia_Consentimiento_' +
    datos.firmante.numero_documento + '_' +
    timestamp.substring(0, 10) + '.pdf'
  );

  copia.setTrashed(true);

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
      // Carpeta no accesible — usar carpeta de firmas
    }
  }

  var props = PropertiesService.getScriptProperties();
  return DriveApp.getFolderById(props.getProperty('DRIVE_CARPETA_FIRMAS'));
}

function reemplazar(cuerpo, placeholder, valor) {
  cuerpo.replaceText(placeholder.replace(/[{}]/g, '\\$&'), valor || '');
}
