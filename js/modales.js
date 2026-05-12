// Modales — abrir, cerrar, vincular eventos de cierre
// Usado por: dashboard.html, accesos.html

var _modal_callback_cierre = null;

function abrir_modal(id) {
  var overlay = document.getElementById(id);
  overlay.classList.add('modal-visible');
  var primer_input = overlay.querySelector('select, input:not([type="checkbox"]):not([readonly])');
  if (primer_input) primer_input.focus();
}

function cerrar_todos_modales() {
  var overlays = document.querySelectorAll('.modal-overlay');
  for (var i = 0; i < overlays.length; i++) {
    overlays[i].classList.remove('modal-visible');
  }
  if (_modal_callback_cierre) _modal_callback_cierre();
}

function vincular_modales_cierre(callback_cierre) {
  _modal_callback_cierre = callback_cierre || null;

  var cerrar_btns = document.querySelectorAll('[data-cerrar-modal]');
  for (var j = 0; j < cerrar_btns.length; j++) {
    cerrar_btns[j].addEventListener('click', cerrar_todos_modales);
  }

  var overlays = document.querySelectorAll('.modal-overlay');
  for (var k = 0; k < overlays.length; k++) {
    overlays[k].addEventListener('click', function(e) {
      if (e.target === this) cerrar_todos_modales();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') cerrar_todos_modales();
  });
}
