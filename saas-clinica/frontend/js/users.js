/* ============================================================
   users.js – admin (super) e unit_admin
   ============================================================ */

// Acesso restrito a admin e unit_admin
const currentUser = getCurrentUser();
if (!currentUser || !['admin', 'unit_admin'].includes(currentUser.role)) {
  window.location.href = '/index.html';
}

const IS_SUPER_ADMIN = currentUser.role === 'admin';

let allUsers = [];
let allUnits = [];
let editingUserId = null;

const roleLabel = {
  admin:      'Super Admin',
  unit_admin: 'Admin de Unidade',
  recepcao:   'Recepção',
  medico:     'Médico',
};
const roleBadge = {
  admin:      'badge-danger',
  unit_admin: 'badge-warning',
  recepcao:   'badge-info',
  medico:     'badge-success',
};

// ── Carregamento ──────────────────────────────────────────────────────────────

async function loadUsers() {
  try {
    allUsers = await apiFetch('/users');
    renderUsers(allUsers);
  } catch (err) {
    showToast('Erro ao carregar usuários: ' + err.message, 'error');
  }
}

async function loadUnits() {
  if (!IS_SUPER_ADMIN) return;
  try {
    allUnits = await apiFetch('/units');
    const sel = document.getElementById('userUnit');
    sel.innerHTML = '<option value="">Selecione a unidade...</option>';
    allUnits
      .filter(u => u.active)
      .forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name;
        sel.appendChild(opt);
      });
  } catch (err) {
    showToast('Erro ao carregar unidades: ' + err.message, 'error');
  }
}

// ── Renderização ──────────────────────────────────────────────────────────────

function renderUsers(list) {
  const tbody = document.getElementById('usersBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">Nenhum usuário cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>
        <span class="badge ${roleBadge[u.role] || 'badge-gray'}">
          ${roleLabel[u.role] || u.role}
        </span>
      </td>
      <td>${u.unit_name || '<span class="text-muted">—</span>'}</td>
      <td>
        <span class="badge ${u.active ? 'badge-success' : 'badge-gray'}">
          ${u.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td>${new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openEditUser(${u.id})" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Controle do modal ─────────────────────────────────────────────────────────

function buildRoleOptions(selectedRole) {
  const options = IS_SUPER_ADMIN
    ? [
        { value: 'recepcao',   label: 'Recepção' },
        { value: 'medico',     label: 'Médico' },
        { value: 'unit_admin', label: 'Admin de Unidade' },
        { value: 'admin',      label: 'Super Administrador' },
      ]
    : [
        { value: 'recepcao', label: 'Recepção' },
        { value: 'medico',   label: 'Médico' },
      ];

  return options.map(o =>
    `<option value="${o.value}" ${o.value === selectedRole ? 'selected' : ''}>${o.label}</option>`
  ).join('');
}

function updateUnitFieldVisibility() {
  if (!IS_SUPER_ADMIN) {
    document.getElementById('userUnitGroup').style.display = 'none';
    return;
  }
  const role = document.getElementById('userRole').value;
  const show = role !== 'admin';
  document.getElementById('userUnitGroup').style.display = show ? '' : 'none';
}

document.getElementById('userRole').addEventListener('change', updateUnitFieldVisibility);

function resetUserForm() {
  editingUserId = null;
  document.getElementById('userId').value       = '';
  document.getElementById('userName').value     = '';
  document.getElementById('userEmail').value    = '';
  document.getElementById('userPassword').value = '';
  document.getElementById('userRole').innerHTML = buildRoleOptions('recepcao');
  document.getElementById('userUnit').value     = '';
  document.getElementById('userActiveGroup').style.display = 'none';
  document.getElementById('userUnitGroup').style.display   = IS_SUPER_ADMIN ? '' : 'none';
  document.getElementById('passwordLabel').innerHTML = 'Senha <span class="required">*</span>';
  document.getElementById('passwordHint').textContent = '';
  document.getElementById('userModalTitle').textContent = 'Novo Usuário';
  updateUnitFieldVisibility();
}

document.getElementById('btnNewUser').addEventListener('click', () => {
  resetUserForm();
  openModal('userModal');
});

document.getElementById('closeUserModal').addEventListener('click',  () => closeModal('userModal'));
document.getElementById('cancelUserModal').addEventListener('click', () => closeModal('userModal'));

function openEditUser(id) {
  const u = allUsers.find(x => x.id === id);
  if (!u) return;

  editingUserId = id;
  document.getElementById('userId').value       = id;
  document.getElementById('userName').value     = u.name;
  document.getElementById('userEmail').value    = u.email;
  document.getElementById('userRole').innerHTML = buildRoleOptions(u.role);
  document.getElementById('userActive').value   = String(u.active);
  document.getElementById('userActiveGroup').style.display = '';
  document.getElementById('userModalTitle').textContent    = 'Editar Usuário';
  document.getElementById('passwordLabel').innerHTML       = 'Nova Senha';
  document.getElementById('passwordHint').textContent      = 'Deixe em branco para manter a senha atual.';
  document.getElementById('userPassword').value            = '';

  // Campo unidade
  if (IS_SUPER_ADMIN && u.unit_id) {
    document.getElementById('userUnit').value = u.unit_id;
  }
  updateUnitFieldVisibility();

  openModal('userModal');
}

// ── Salvar ────────────────────────────────────────────────────────────────────

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id       = document.getElementById('userId').value;
  const name     = document.getElementById('userName').value.trim();
  const email    = document.getElementById('userEmail').value.trim();
  const role     = document.getElementById('userRole').value;
  const active   = document.getElementById('userActive').value === 'true';
  const password = document.getElementById('userPassword').value;
  const unit_id  = document.getElementById('userUnit').value || null;

  if (!name || !email) {
    showToast('Nome e e-mail são obrigatórios.', 'error');
    return;
  }

  if (!id && !password) {
    showToast('Senha é obrigatória para novo usuário.', 'error');
    return;
  }

  if (password && password.length < 6) {
    showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
    return;
  }

  // Super admin deve selecionar unidade para roles não-admin
  if (IS_SUPER_ADMIN && role !== 'admin' && !unit_id && !id) {
    showToast('Selecione a unidade do usuário.', 'error');
    return;
  }

  const body = { name, email, role, active };
  if (password) body.password = password;
  if (IS_SUPER_ADMIN && unit_id) body.unit_id = parseInt(unit_id);

  try {
    if (id) {
      await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Usuário atualizado.', 'success');
    } else {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) });
      showToast('Usuário criado.', 'success');
    }
    closeModal('userModal');
    loadUsers();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
});

// ── Excluir ───────────────────────────────────────────────────────────────────

async function deleteUser(id, name) {
  if (!confirm(`Excluir o usuário "${name}"? Esta ação não pode ser desfeita.`)) return;

  try {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    showToast('Usuário removido.', 'success');
    loadUsers();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadUnits();
loadUsers();
