/* ============================================================
   users.js – apenas para administradores
   ============================================================ */

let allUsers = [];
let editingUserId = null;

async function loadUsers() {
  try {
    allUsers = await apiFetch('/users');
    renderUsers(allUsers);
  } catch (err) {
    showToast('Erro ao carregar usuários: ' + err.message, 'error');
  }
}

const roleLabel = { admin: 'Administrador', recepcao: 'Recepção', medico: 'Médico' };
const roleBadge = { admin: 'badge-danger', recepcao: 'badge-info', medico: 'badge-success' };

function renderUsers(list) {
  const tbody = document.getElementById('usersBody');

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Nenhum usuário cadastrado.</td></tr>';
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

function resetUserForm() {
  editingUserId = null;
  document.getElementById('userId').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('userEmail').value = '';
  document.getElementById('userRole').value = 'recepcao';
  document.getElementById('userPassword').value = '';
  document.getElementById('userActiveGroup').style.display = 'none';
  document.getElementById('passwordLabel').innerHTML = 'Senha <span class="required">*</span>';
  document.getElementById('passwordHint').textContent = '';
  document.getElementById('userModalTitle').textContent = 'Novo Usuário';
}

document.getElementById('btnNewUser').addEventListener('click', () => {
  resetUserForm();
  openModal('userModal');
});

document.getElementById('closeUserModal').addEventListener('click', () => closeModal('userModal'));
document.getElementById('cancelUserModal').addEventListener('click', () => closeModal('userModal'));

function openEditUser(id) {
  const u = allUsers.find(x => x.id === id);
  if (!u) return;

  editingUserId = id;
  document.getElementById('userId').value = id;
  document.getElementById('userName').value = u.name;
  document.getElementById('userEmail').value = u.email;
  document.getElementById('userRole').value = u.role;
  document.getElementById('userActive').value = String(u.active);
  document.getElementById('userActiveGroup').style.display = '';
  document.getElementById('userModalTitle').textContent = 'Editar Usuário';
  document.getElementById('passwordLabel').innerHTML = 'Nova Senha';
  document.getElementById('passwordHint').textContent = 'Deixe em branco para manter a senha atual.';
  document.getElementById('userPassword').value = '';

  openModal('userModal');
}

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

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id       = document.getElementById('userId').value;
  const name     = document.getElementById('userName').value.trim();
  const email    = document.getElementById('userEmail').value.trim();
  const role     = document.getElementById('userRole').value;
  const active   = document.getElementById('userActive').value === 'true';
  const password = document.getElementById('userPassword').value;

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

  const body = { name, email, role, active };
  if (password) body.password = password;

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

// Acesso restrito a admin
const currentUser = getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
  window.location.href = '/index.html';
}

loadUsers();
