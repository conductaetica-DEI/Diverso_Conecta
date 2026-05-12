// Lógica de inicio de sesión OTP — login.html

var estado = {
  email: null,
  temporizador_id: null,
  segundos_reenvio: 0
};

document.addEventListener('DOMContentLoaded', function() {
  verificar_sesion_existente();
  vincular_eventos();
});

async function verificar_sesion_existente() {
  try {
    var sesion = await obtener_sesion();
    if (sesion) redirigir_segun_perfil(sesion);
  } catch (e) {
    // Sin sesión, continuar con login
  }
}

function vincular_eventos() {
  document.getElementById('btn-enviar').addEventListener('click', al_enviar_email);
  document.getElementById('btn-verificar').addEventListener('click', al_verificar_codigo);
  document.getElementById('btn-reenviar').addEventListener('click', al_reenviar_otp);
  document.getElementById('btn-otro-correo').addEventListener('click', al_usar_otro_correo);

  document.getElementById('campo-email').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') al_enviar_email();
  });

  document.getElementById('campo-email').addEventListener('blur', al_blur_email);

  configurar_otp('btn-verificar');

  var otp_inputs = document.querySelectorAll('.otp-digito');
  for (var i = 0; i < otp_inputs.length; i++) {
    otp_inputs[i].addEventListener('keydown', function(e) {
      if (e.key === 'Enter') al_verificar_codigo();
    });
  }
}

function al_blur_email() {
  var email = document.getElementById('campo-email').value.trim();
  var input = document.getElementById('campo-email');
  var error_el = document.getElementById('campo-email-error');

  if (!email) {
    input.classList.remove('campo-error', 'campo-valido');
    error_el.hidden = true;
    return;
  }

  var valido = validar_email(email);
  input.classList.toggle('campo-error', !valido);
  input.classList.toggle('campo-valido', valido);
  error_el.hidden = valido;
}

async function al_enviar_email() {
  var input = document.getElementById('campo-email');
  var email = input.value.trim();
  var error_el = document.getElementById('campo-email-error');

  if (!validar_email(email)) {
    input.classList.add('campo-error');
    input.classList.remove('campo-valido');
    error_el.hidden = false;
    input.focus();
    return;
  }

  input.classList.remove('campo-error');
  error_el.hidden = true;

  var btn = document.getElementById('btn-enviar');
  deshabilitar_boton(btn, 'Verificando...');

  try {
    await solicitar_otp(email, null, null);
    estado.email = email;
    mostrar_estado_otp();
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message, error.detalle));
  } finally {
    habilitar_boton(btn, 'Enviar código');
  }
}

function mostrar_estado_otp() {
  document.getElementById('estado-email').hidden = true;
  document.getElementById('estado-otp').hidden = false;
  document.getElementById('otp-email').textContent = estado.email;
  limpiar_otp_inputs('btn-verificar');
  iniciar_temporizador(estado);
}

function mostrar_estado_email() {
  document.getElementById('estado-otp').hidden = true;
  document.getElementById('estado-email').hidden = false;
  if (estado.temporizador_id) clearInterval(estado.temporizador_id);
  document.getElementById('campo-email').focus();
}

function al_usar_otro_correo() {
  estado.email = null;
  mostrar_estado_email();
}

async function al_reenviar_otp() {
  var btn = document.getElementById('btn-reenviar');
  btn.disabled = true;
  try {
    await solicitar_otp(estado.email, null, null);
    mostrar_exito('Código reenviado a ' + estado.email);
    iniciar_temporizador(estado);
  } catch (error) {
    mostrar_error(mensaje_usuario(error.message, error.detalle));
    btn.disabled = false;
  }
}

async function al_verificar_codigo() {
  var codigo = obtener_codigo_otp();
  if (codigo.length !== 6) return;

  var btn = document.getElementById('btn-verificar');
  deshabilitar_boton(btn, 'Verificando...');

  try {
    var resultado = await verificar_otp(estado.email, codigo);

    btn.textContent = 'Iniciando sesión...';

    var cliente = iniciar_supabase();
    await cliente.auth.setSession({
      access_token: resultado.access_token,
      refresh_token: resultado.refresh_token
    });

    var sesion = await obtener_sesion();
    redirigir_segun_perfil(sesion);

  } catch (error) {
    mostrar_error(mensaje_usuario(error.message, error.detalle));
    limpiar_otp_inputs('btn-verificar');
    habilitar_boton(btn, 'Verificar');
  }
}

async function redirigir_segun_perfil(sesion) {
  try {
    var perfiles = await supabase_fetch(
      '/profiles?auth_user_id=eq.' + sesion.user.id + '&select=profile_type&limit=1',
      sesion.access_token
    );
    if (perfiles && perfiles.length > 0 && perfiles[0].profile_type === 'miembro') {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'mi-expediente.html';
    }
  } catch (e) {
    window.location.href = 'mi-expediente.html';
  }
}
