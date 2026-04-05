/* ============================================================
   main.js – utilitários compartilhados em todas as páginas
   ============================================================ */

const API = '/api';

// ── Auth ───────────────────────────────────────────────────
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('clinica_user'));
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('clinica_token');
}

function logout() {
  localStorage.removeItem('clinica_token');
  localStorage.removeItem('clinica_user');
  window.location.href = '/login.html';
}

// Guard: redireciona para login se não autenticado
(function authGuard() {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  if (!isLoginPage && !getToken()) {
    window.location.href = '/login.html';
  }
})();

// ── Theme ──────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
})();

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
});

// ── Logout ─────────────────────────────────────────────────
document.getElementById('btnLogout')?.addEventListener('click', logout);

// ── Sidebar: user info + links por role ────────────────────
(function initSidebar() {
  const user = getCurrentUser();
  if (!user) return;

  const roleLabel = {
    admin:      'Super Admin',
    unit_admin: 'Admin de Unidade',
    recepcao:   'Recepção',
    medico:     'Médico',
  };
  const roleCls = {
    admin:      'role-admin',
    unit_admin: 'role-unit-admin',
    recepcao:   'role-recepcao',
    medico:     'role-medico',
  };

  const sidebarUser = document.getElementById('sidebarUser');
  if (sidebarUser) {
    const unitLine = user.unit_name
      ? `<div class="sidebar-user-unit">${user.unit_name}</div>`
      : '';
    sidebarUser.innerHTML = `
      <div class="sidebar-user-name">${user.name}</div>
      <div class="sidebar-user-role ${roleCls[user.role] || ''}">${roleLabel[user.role] || user.role}</div>
      ${unitLine}
    `;
  }

  // Usuários: admin e unit_admin
  if (user.role === 'admin' || user.role === 'unit_admin') {
    document.getElementById('navUsers')?.removeAttribute('style');
  }

  // Unidades: só super admin
  if (user.role === 'admin') {
    document.getElementById('navUnits')?.removeAttribute('style');
  }
})();

// ── Date display ───────────────────────────────────────────
const dateEl = document.getElementById('topbarDate');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ── Toast ──────────────────────────────────────────────────
let toastContainer;
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function showToast(message, type = 'info') {
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
  getToastContainer().appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal helpers ──────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── CPF utilities ──────────────────────────────────────────
function maskCpf(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatCpf(cpf) {
  const c = cpf.replace(/\D/g, '');
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function validateCpf(cpf) {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(c[10]);
}

// Apply CPF mask to inputs with data-mask="cpf"
document.querySelectorAll('[data-mask="cpf"], #patientCpf, #apptCpf').forEach(input => {
  input.addEventListener('input', () => {
    input.value = maskCpf(input.value);
  });
});

// ── Date format ────────────────────────────────────────────
function formatDateTime(dt) {
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDate(d) {
  // Extrai só YYYY-MM-DD para não duplicar timezone (ex: "2026-03-30T00:00:00.000Z")
  const dateOnly = String(d).slice(0, 10);
  return new Date(dateOnly + 'T00:00:00').toLocaleDateString('pt-BR');
}

// ── Status badge ───────────────────────────────────────────
function statusBadge(status) {
  const map = {
    agendado:  ['badge-info',    'Agendado'],
    concluido: ['badge-success', 'Concluído'],
    cancelado: ['badge-danger',  'Cancelado'],
    falta:     ['badge-warning', 'Falta'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── API fetch helper ───────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API + path, { headers, ...options });

  // Token expirado ou inválido
  if (res.status === 401) {
    logout();
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}
