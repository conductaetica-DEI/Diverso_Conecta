/* ============================================================
   DIVERSOLAB — Helpers compartidos (vanilla JS)
   ============================================================ */

// Perfiles demo
window.DL_PERFILES = {
  beneficiario: {
    key: 'beneficiario', tipo: 'Beneficiario', emoji: '👤',
    nombre: 'María Alejandra Gómez Pérez', alias: 'María Alejandra',
    iniciales: 'MG',
    documento: { tipo: 'CC', numero: '1.023.456.789' },
    email: 'maria.gomez@correo.co', telefono: '+57 311 234 5678',
    persona: 'natural',
    chip: 'perfil-beneficiario',
    avatar: 'avatar-sol',
    descripcion: 'Persona que recibirá acompañamiento de DiversoLab',
  },
  aliado: {
    key: 'aliado', tipo: 'Aliado', emoji: '🤝',
    nombre: 'Inclusión Total SAS', alias: 'Inclusión Total',
    iniciales: 'IT',
    documento: { tipo: 'NIT', numero: '901.234.567-8' },
    email: 'contacto@inclusiontotal.co', telefono: '+57 601 555 0142',
    persona: 'juridica',
    chip: 'perfil-aliado',
    avatar: 'avatar-aqua',
    descripcion: 'Empresa u organización interesada en inclusión',
  },
  contractor: {
    key: 'contractor', tipo: 'Contractor', emoji: '👷',
    nombre: 'Carlos Andrés Ramírez Salgado', alias: 'Carlos',
    iniciales: 'CR',
    documento: { tipo: 'CC', numero: '79.456.123' },
    email: 'carlos.ramirez@gmail.com', telefono: '+57 320 712 3344',
    persona: 'natural',
    chip: 'perfil-contractor',
    avatar: 'avatar-coral',
    descripcion: 'Profesional independiente que prestará servicios',
  },
  supplier: {
    key: 'supplier', tipo: 'Supplier', emoji: '🏢',
    nombre: 'Suministros Andinos S.A.', alias: 'Suministros Andinos',
    iniciales: 'SA',
    documento: { tipo: 'NIT', numero: '900.876.543-2' },
    email: 'ventas@suministrosandinos.co', telefono: '+57 604 333 8801',
    persona: 'juridica',
    chip: 'perfil-supplier',
    avatar: 'avatar-violeta',
    descripcion: 'Empresa proveedora de bienes o servicios',
  },
};

// ============================================================
// KYC: catálogo de requisitos + asignación por perfil
// ============================================================
// Cada requisito tiene un id, label, ayuda, y un "kind":
//   - 'doc'   : documento a subir (dropzone)
//   - 'field' : campo de texto/select
//   - 'group' : grupo de campos repetibles (ej: PEP)
//   - 'decl'  : declaración / checkbox
// La matriz DL_KYC_MATRIX define para cada (req, perfil) si es:
//   'no'  : no aplica
//   'opt' : opcional
//   'req' : obligatorio
window.DL_KYC_CATALOG = [
  { id: 'aml-actividad',    grupo: 'AML',          label: 'Actividad económica',                  kind: 'field', help: 'Selección de tipo de actividad' },
  { id: 'aml-ingresos',     grupo: 'AML',          label: 'Rango de ingresos mensuales',          kind: 'field', help: 'En SMMLV' },
  { id: 'aml-origen',       grupo: 'AML',          label: 'Declaración de origen de fondos',      kind: 'field', help: 'Texto libre describiendo origen' },
  { id: 'aml-licitos',      grupo: 'AML',          label: 'Declaración de fondos lícitos',        kind: 'decl',  help: 'Checkbox de declaración AML' },
  { id: 'aml-ciiu',         grupo: 'AML',          label: 'Actividad CIIU (jurídica)',            kind: 'field', help: 'Solo persona jurídica' },
  { id: 'pep',              grupo: 'PEP',          label: 'Declaración PEP (repetible)',          kind: 'group', help: 'Lista de PEPs vinculados' },
  { id: 'doc-id-frente',    grupo: 'Documentos',   label: 'Documento de identidad — frente',     kind: 'doc',   help: 'JPG, PNG o PDF' },
  { id: 'doc-id-reverso',   grupo: 'Documentos',   label: 'Documento de identidad — reverso',    kind: 'doc',   help: 'JPG, PNG o PDF' },
  { id: 'doc-selfie',       grupo: 'Documentos',   label: 'Selfie con documento',                 kind: 'doc',   help: 'Foto sin filtros' },
  { id: 'doc-residencia',   grupo: 'Documentos',   label: 'Comprobante de residencia',            kind: 'doc',   help: 'Servicio público reciente' },
  { id: 'doc-rut',          grupo: 'Documentos',   label: 'RUT',                                  kind: 'doc',   help: 'Solo persona jurídica' },
  { id: 'doc-camara',       grupo: 'Documentos',   label: 'Cámara de Comercio',                   kind: 'doc',   help: 'No mayor a 30 días' },
  { id: 'doc-rep-legal',    grupo: 'Documentos',   label: 'Cédula del representante legal',       kind: 'doc',   help: 'Persona jurídica' },
  { id: 'doc-financieros',  grupo: 'Documentos',   label: 'Estados financieros',                  kind: 'doc',   help: 'Último año fiscal' },
  { id: 'cert-bancaria',    grupo: 'Bancario',     label: 'Certificación bancaria',               kind: 'doc',   help: 'Para procesar pagos' },
  { id: 'cuenta-bancaria',  grupo: 'Bancario',     label: 'Datos de cuenta bancaria',             kind: 'field', help: 'Banco, tipo y número' },
  { id: 'ubo',              grupo: 'UBO',          label: 'Beneficiarios finales (UBO >25%)',     kind: 'group', help: 'Solo persona jurídica' },
  { id: 'doc-polizas',      grupo: 'Documentos',   label: 'Pólizas de seguros',                   kind: 'doc',   help: 'Aplica a proveedores' },
];

// Matriz por defecto — perfil → { reqId: 'no' | 'opt' | 'req' }
window.DL_KYC_MATRIX_DEFAULT = {
  beneficiario: {
    'aml-actividad':'req','aml-ingresos':'opt','aml-origen':'opt','aml-licitos':'req',
    'pep':'opt',
    'doc-id-frente':'req','doc-id-reverso':'req','doc-selfie':'req','doc-residencia':'opt',
    'cert-bancaria':'no','cuenta-bancaria':'opt',
    'aml-ciiu':'no','doc-rut':'no','doc-camara':'no','doc-rep-legal':'no','doc-financieros':'no','ubo':'no','doc-polizas':'no',
  },
  aliado: {
    'aml-actividad':'no','aml-ingresos':'no','aml-origen':'opt','aml-licitos':'req',
    'aml-ciiu':'req',
    'pep':'opt',
    'doc-id-frente':'no','doc-id-reverso':'no','doc-selfie':'no','doc-residencia':'no',
    'doc-rut':'req','doc-camara':'req','doc-rep-legal':'req','doc-financieros':'opt',
    'cert-bancaria':'no','cuenta-bancaria':'no',
    'ubo':'req','doc-polizas':'no',
  },
  contractor: {
    'aml-actividad':'req','aml-ingresos':'req','aml-origen':'req','aml-licitos':'req',
    'pep':'req',
    'doc-id-frente':'req','doc-id-reverso':'req','doc-selfie':'req','doc-residencia':'opt',
    'cert-bancaria':'req','cuenta-bancaria':'req',
    'aml-ciiu':'no','doc-rut':'no','doc-camara':'no','doc-rep-legal':'no','doc-financieros':'no','ubo':'no','doc-polizas':'no',
  },
  supplier: {
    'aml-actividad':'no','aml-ingresos':'no','aml-origen':'req','aml-licitos':'req',
    'aml-ciiu':'req',
    'pep':'req',
    'doc-id-frente':'no','doc-id-reverso':'no','doc-selfie':'no','doc-residencia':'no',
    'doc-rut':'req','doc-camara':'req','doc-rep-legal':'req','doc-financieros':'req',
    'cert-bancaria':'req','cuenta-bancaria':'req',
    'ubo':'req','doc-polizas':'req',
  },
};

window.DL_getKycMatrix = function() {
  try {
    const stored = localStorage.getItem('dl_kyc_matrix');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return JSON.parse(JSON.stringify(window.DL_KYC_MATRIX_DEFAULT));
};
window.DL_setKycMatrix = function(matrix) {
  localStorage.setItem('dl_kyc_matrix', JSON.stringify(matrix));
};
window.DL_resetKycMatrix = function() {
  localStorage.removeItem('dl_kyc_matrix');
};
// Helper: devuelve [{...req, estado: 'no'|'opt'|'req'}] para el perfil dado
window.DL_getReqsForPerfil = function(perfilKey) {
  const matrix = window.DL_getKycMatrix();
  const config = matrix[perfilKey] || {};
  return window.DL_KYC_CATALOG.map(r => ({ ...r, estado: config[r.id] || 'no' }));
};

// Selector demo de perfil — guarda en localStorage
window.DL_getPerfilActivo = function() {
  const k = localStorage.getItem('dl_perfil') || 'beneficiario';
  return window.DL_PERFILES[k] || window.DL_PERFILES.beneficiario;
};
window.DL_setPerfilActivo = function(k) {
  localStorage.setItem('dl_perfil', k);
};

// Render demo bar
window.DL_renderDemoBar = function(opts = {}) {
  const { onChange, mostrarSelector = true } = opts;
  const activo = window.DL_getPerfilActivo();
  const bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Selector de perfil demo');
  bar.innerHTML = `
    <span aria-hidden="true">⚙</span>
    <span><strong style="font-family:var(--font-primary);font-weight:600;">DEMO</strong> · Perfil activo:</span>
    ${mostrarSelector ? `
      <select id="dl-perfil-select" aria-label="Cambiar perfil demo">
        ${Object.values(window.DL_PERFILES).map(p =>
          `<option value="${p.key}" ${p.key === activo.key ? 'selected' : ''}>${p.emoji} ${p.tipo} — ${p.alias}</option>`
        ).join('')}
      </select>` : `<strong>${activo.emoji} ${activo.tipo}</strong>`}
    <span style="margin-left:auto;opacity:0.7;">Mockup interactivo · DiversoLab</span>
  `;
  if (mostrarSelector) {
    bar.addEventListener('change', (e) => {
      if (e.target.id === 'dl-perfil-select') {
        window.DL_setPerfilActivo(e.target.value);
        if (onChange) onChange(window.DL_getPerfilActivo());
        else location.reload();
      }
    });
  }
  return bar;
};

// Iconos SVG (stroke 2, currentColor)
window.DL_icons = {
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
  cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"/><path d="M22 6l-10 7L2 6"/></svg>',
  message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10"/></svg>',
};

window.DL_icon = function(name) {
  return window.DL_icons[name] || '';
};

// Logo lockup (HTML string)
window.DL_logo = function(opts = {}) {
  const small = opts.small ? `<small>${opts.small}</small>` : '';
  return `<a href="index.html" class="logo" aria-label="DiversoLab inicio">
    <span class="logo-mark" aria-hidden="true">D</span>
    <span style="display:flex;flex-direction:column;line-height:1;">DiversoLab${small}</span>
  </a>`;
};

// Tooltip helper para nodes
window.DL_tip = function(text) {
  return `<button type="button" class="info-icon" data-tip="${text.replace(/"/g, '&quot;')}" aria-label="Información: ${text}">i</button>`;
};

// Top nav entre páginas (link discreto a index)
window.DL_indexLink = function() {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:200;';
  div.innerHTML = `<a href="index.html" class="btn btn-sm btn-ghost" style="background:white;box-shadow:var(--shadow-md);text-decoration:none;">← Mockups</a>`;
  return div;
};
