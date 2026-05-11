// Cliente Supabase — init, sesión, fetch con JWT, manejo de 401

var _supabase = null;

function iniciar_supabase() {
  if (_supabase) return _supabase;
  _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return _supabase;
}

async function obtener_sesion() {
  var cliente = iniciar_supabase();
  var resultado = await cliente.auth.getSession();
  if (resultado.data && resultado.data.session) {
    return resultado.data.session;
  }
  return null;
}

async function verificar_sesion() {
  var sesion = await obtener_sesion();
  if (!sesion) {
    window.location.href = '/pages/login.html';
    return null;
  }
  return sesion;
}

async function supabase_fetch(ruta, jwt, opciones) {
  var url = CONFIG.SUPABASE_URL + '/rest/v1' + ruta;
  var metodo = (opciones && opciones.metodo) || 'GET';
  var cuerpo = (opciones && opciones.cuerpo) || null;

  var headers = {
    'apikey': CONFIG.SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + jwt,
    'Content-Type': 'application/json'
  };

  if (opciones && opciones.prefer) {
    headers['Prefer'] = opciones.prefer;
  }

  var config_fetch = {
    method: metodo,
    headers: headers
  };

  if (cuerpo && metodo !== 'GET') {
    config_fetch.body = JSON.stringify(cuerpo);
  }

  var respuesta = await fetch(url, config_fetch);

  // JWT expirado — intentar refresh
  if (respuesta.status === 401) {
    var nueva_sesion = await _intentar_refresh();
    if (nueva_sesion) {
      headers['Authorization'] = 'Bearer ' + nueva_sesion.access_token;
      config_fetch.headers = headers;
      respuesta = await fetch(url, config_fetch);
    } else {
      window.location.href = '/pages/login.html';
      return null;
    }
  }

  if (!respuesta.ok) {
    var error_texto = await respuesta.text();
    throw new Error('ERROR_SERVIDOR');
  }

  var texto = await respuesta.text();
  if (!texto) return null;
  return JSON.parse(texto);
}

async function cerrar_sesion() {
  var cliente = iniciar_supabase();
  await cliente.auth.signOut();
  window.location.href = '/pages/login.html';
}

async function _intentar_refresh() {
  try {
    var cliente = iniciar_supabase();
    var resultado = await cliente.auth.refreshSession();
    if (resultado.data && resultado.data.session) {
      return resultado.data.session;
    }
    return null;
  } catch (e) {
    return null;
  }
}
