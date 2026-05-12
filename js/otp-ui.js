// OTP UI — manejo de inputs de dígitos, timer, reenvío
// Usado por: login.html, registro.html, firma.html

var _otp_vinculado = false;

function configurar_otp(id_btn_verificar) {
  var inputs = document.querySelectorAll('.otp-digito');
  for (var i = 0; i < inputs.length; i++) inputs[i].value = '';

  if (!_otp_vinculado) {
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].addEventListener('input', function(e) { _otp_al_input(e, id_btn_verificar); });
      inputs[j].addEventListener('keydown', _otp_al_keydown);
      inputs[j].addEventListener('paste', function(e) { _otp_al_paste(e, id_btn_verificar); });
    }
    _otp_vinculado = true;
  }

  inputs[0].focus();
}

function _otp_al_input(e, id_btn_verificar) {
  var valor = e.target.value.replace(/[^0-9]/g, '');
  e.target.value = valor;
  if (valor && e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('otp-digito')) {
    e.target.nextElementSibling.focus();
  }
  _otp_verificar_completo(id_btn_verificar);
}

function _otp_al_keydown(e) {
  if (e.key === 'Backspace' && !e.target.value) {
    if (e.target.previousElementSibling && e.target.previousElementSibling.classList.contains('otp-digito')) {
      e.target.previousElementSibling.focus();
      e.target.previousElementSibling.value = '';
    }
  }
}

function _otp_al_paste(e, id_btn_verificar) {
  e.preventDefault();
  var texto = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
  var digitos = texto.split('');
  var inputs = document.querySelectorAll('.otp-digito');
  for (var i = 0; i < Math.min(digitos.length, inputs.length); i++) {
    inputs[i].value = digitos[i];
  }
  var ultimo = Math.min(digitos.length, inputs.length) - 1;
  if (ultimo >= 0) inputs[ultimo].focus();
  _otp_verificar_completo(id_btn_verificar);
}

function _otp_verificar_completo(id_btn_verificar) {
  var btn = document.getElementById(id_btn_verificar);
  if (btn) btn.disabled = obtener_codigo_otp().length !== 6;
}

function obtener_codigo_otp() {
  var inputs = document.querySelectorAll('.otp-digito');
  var codigo = '';
  for (var i = 0; i < inputs.length; i++) codigo += inputs[i].value;
  return codigo;
}

function limpiar_otp_inputs(id_btn_verificar) {
  var inputs = document.querySelectorAll('.otp-digito');
  for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
  var btn = document.getElementById(id_btn_verificar);
  if (btn) btn.disabled = true;
  if (inputs.length) inputs[0].focus();
}

function iniciar_temporizador(estado_obj) {
  estado_obj.segundos_reenvio = 60;
  var btn_reenviar = document.getElementById('btn-reenviar');
  var span_timer = document.getElementById('otp-timer');

  btn_reenviar.hidden = true;
  span_timer.hidden = false;
  span_timer.textContent = '60s';

  if (estado_obj.temporizador_id) clearInterval(estado_obj.temporizador_id);

  estado_obj.temporizador_id = setInterval(function() {
    estado_obj.segundos_reenvio--;
    span_timer.textContent = estado_obj.segundos_reenvio + 's';
    if (estado_obj.segundos_reenvio <= 0) {
      clearInterval(estado_obj.temporizador_id);
      span_timer.hidden = true;
      btn_reenviar.hidden = false;
      btn_reenviar.disabled = false;
    }
  }, 1000);
}
