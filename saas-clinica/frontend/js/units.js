/* ============================================================
   units.js – apenas para super admin
   ============================================================ */

const currentUser = getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
  window.location.href = '/index.html';
}

let allUnits      = [];
let editingUnitId = null;

// ── Carregamento ──────────────────────────────────────────────────────────────

async function loadUnits() {
  try {
    allUnits = await apiFetch('/units');
    renderUnits(allUnits);
  } catch (err) {
    showToast('Erro ao carregar unidades: ' + err.message, 'error');
  }
}

// ── Renderização ──────────────────────────────────────────────────────────────

function renderUnits(list) {
  const tbody = document.getElementById('unitsBody');

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Nenhuma unidade cadastrada.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.address || '<span class="text-muted">—</span>'}</td>
      <td>${u.phone   || '<span class="text-muted">—</span>'}</td>
      <td>${u.user_count || 0}</td>
      <td>
        <span class="badge ${u.active ? 'badge-success' : 'badge-gray'}">
          ${u.active ? 'Ativa' : 'Inativa'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openEditUnit(${u.id})" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deactivateUnit(${u.id}, '${u.name.replace(/'/g, "\\'")}')" title="Desativar">
            <i class="fas fa-power-off"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Controle do modal ─────────────────────────────────────────────────────────

function resetUnitForm() {
  editingUnitId = null;
  document.getElementById('unitId').value      = '';
  document.getElementById('unitName').value    = '';
  document.getElementById('unitAddress').value = '';
  document.getElementById('unitPhone').value   = '';
  document.getElementById('unitActiveGroup').style.display = 'none';
  document.getElementById('unitModalTitle').textContent    = 'Nova Unidade';
}

document.getElementById('btnNewUnit').addEventListener('click', () => {
  resetUnitForm();
  openModal('unitModal');
});

document.getElementById('closeUnitModal').addEventListener('click',  () => closeModal('unitModal'));
document.getElementById('cancelUnitModal').addEventListener('click', () => closeModal('unitModal'));

function openEditUnit(id) {
  const u = allUnits.find(x => x.id === id);
  if (!u) return;

  editingUnitId = id;
  document.getElementById('unitId').value      = id;
  document.getElementById('unitName').value    = u.name;
  document.getElementById('unitAddress').value = u.address || '';
  document.getElementById('unitPhone').value   = u.phone   || '';
  document.getElementById('unitActive').value  = String(u.active);
  document.getElementById('unitActiveGroup').style.display = '';
  document.getElementById('unitModalTitle').textContent    = 'Editar Unidade';

  openModal('unitModal');
}

// ── Salvar ────────────────────────────────────────────────────────────────────

document.getElementById('unitForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id      = document.getElementById('unitId').value;
  const name    = document.getElementById('unitName').value.trim();
  const address = document.getElementById('unitAddress').value.trim();
  const phone   = document.getElementById('unitPhone').value.trim();
  const active  = document.getElementById('unitActive').value === 'true';

  if (!name) {
    showToast('Nome da unidade é obrigatório.', 'error');
    return;
  }

  const body = { name, address: address || null, phone: phone || null };
  if (id) body.active = active;

  try {
    if (id) {
      await apiFetch(`/units/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Unidade atualizada.', 'success');
    } else {
      await apiFetch('/units', { method: 'POST', body: JSON.stringify(body) });
      showToast('Unidade criada.', 'success');
    }
    closeModal('unitModal');
    loadUnits();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
});

// ── Desativar ─────────────────────────────────────────────────────────────────

async function deactivateUnit(id, name) {
  if (!confirm(`Desativar a unidade "${name}"?\nUsuários ativos vinculados a ela impedirão esta ação.`)) return;

  try {
    await apiFetch(`/units/${id}`, { method: 'DELETE' });
    showToast('Unidade desativada.', 'success');
    loadUnits();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadUnits();
