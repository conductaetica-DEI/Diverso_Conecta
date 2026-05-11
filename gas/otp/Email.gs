// Envío de emails — templates HTML con diseño DiversoLab

function enviar_otp_email(email, codigo, nombre, empresa) {
  var nombre_display = escapar_html(nombre || 'Usuario');
  var contexto = empresa
    ? 'Código de verificación para ' + nombre_display + ' en representación de ' + escapar_html(empresa)
    : 'Código de verificación para ' + nombre_display;

  var html = generar_html_otp(codigo, nombre_display, contexto);

  var texto_plano = contexto + '\n\n' +
    'Tu código de verificación es: ' + codigo + '\n\n' +
    'Válido por 10 minutos. No lo compartas con nadie.\n\n' +
    '— DiversoLab';

  MailApp.sendEmail({
    to: email,
    subject: '[DiversoLab] Tu código de verificación',
    body: texto_plano,
    htmlBody: html
  });
}

function notificarEmail(destinatario, asunto, cuerpo) {
  if (!destinatario || !asunto || !cuerpo) {
    return { ok: false, error: 'DATOS_REQUERIDOS' };
  }

  try {
    MailApp.sendEmail({
      to: destinatario,
      subject: asunto,
      body: cuerpo
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'EMAIL_ENVIO_FALLIDO' };
  }
}

function generar_html_otp(codigo, nombre, contexto) {
  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background-color:#fffaef;font-family:PT Sans,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffaef;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(63,43,86,0.08);">' +

    '<tr><td style="background-color:#3f2b56;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">' +
    '<h1 style="margin:0;color:#fdda64;font-family:Titillium Web,Arial,sans-serif;font-size:22px;font-weight:700;">DiversoLab</h1>' +
    '</td></tr>' +

    '<tr><td style="padding:32px;">' +
    '<p style="margin:0 0 8px;color:#3f2b56;font-size:15px;">' + contexto + '</p>' +
    '<p style="margin:0 0 24px;color:#3f2b56;font-size:15px;">Hola <strong>' + nombre + '</strong>, usa este código para verificar tu identidad:</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    '<tr><td align="center" style="padding:16px;background-color:#fffaef;border:2px solid #fdda64;border-radius:8px;">' +
    '<span style="font-family:Titillium Web,monospace;font-size:36px;font-weight:900;letter-spacing:8px;color:#3f2b56;">' + codigo + '</span>' +
    '</td></tr></table>' +
    '<p style="margin:24px 0 0;color:#3f2b56;font-size:13px;opacity:0.7;text-align:center;">Válido por 10 minutos. No lo compartas con nadie.</p>' +
    '</td></tr>' +

    '<tr><td style="padding:16px 32px;border-top:1px solid #cad2e9;text-align:center;">' +
    '<p style="margin:0;color:#3f2b56;font-size:12px;opacity:0.5;">DiversoLab — Transformación desde el Potencial Humano Diverso</p>' +
    '</td></tr>' +

    '</table></td></tr></table>' +
    '</body></html>';
}

function escapar_html(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
