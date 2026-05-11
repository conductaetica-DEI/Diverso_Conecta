// Generación de folios secuenciales y hashes SHA-256

function generar_folio(codigo) {
  var props = PropertiesService.getScriptProperties();
  var prefijo = props.getProperty('FOLIO_PREFIJO') || 'DL';
  var anio = new Date().getFullYear();
  var clave = 'folio_' + codigo + '_' + anio;

  var secuencial = parseInt(props.getProperty(clave) || '0', 10) + 1;
  props.setProperty(clave, String(secuencial));

  var secuencial_str = String(secuencial);
  while (secuencial_str.length < 4) {
    secuencial_str = '0' + secuencial_str;
  }

  return prefijo + '-' + codigo + '-' + anio + '-' + secuencial_str;
}

function generar_hash(email, codigo, version, timestamp, ip) {
  var cadena = email + '|' + codigo + '|' + version + '|' + timestamp + '|' + ip;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, cadena);
  return bytes_a_hex(bytes);
}

function bytes_a_hex(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}
