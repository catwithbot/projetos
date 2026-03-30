/* ============================================================
   doctors.js
   ============================================================ */

let allDoctors = [];
let currentDoctorId = null;

// ── Load & render ──────────────────────────────────────────
async function loadDoctors() {
  try {
    allDoctors = await apiFetch('/doctors');
    renderDoctors(allDoctors);
  } catch (err) {
    showToast('Erro ao carregar médicos: ' + err.message, 'error');
  }
}

function renderDoctors(list) {
  const tbody = document.getElementById('doctorsBody');

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">Nenhum médico cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(d => `
    <tr>
      <td>${d.id}</td>
      <td><strong>${d.name}</strong></td>
      <td>${d.specialty || '–'}</td>
      <td>${d.email || '–'}</td>
      <td>${d.phone || '–'}</td>
      <td>
        <span class="badge ${d.active ? 'badge-success' : 'badge-gray'}">
          ${d.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openScheduleModal(${d.id}, '${d.name.replace(/'/g, "\\'")}')" title="Ver Agenda">
            <i class="fas fa-calendar-alt"></i>
          </button>
          <button class="btn btn-sm btn-secondary" onclick="openEditDoctor(${d.id})" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteDoctor(${d.id}, '${d.name.replace(/'/g, "\\'")}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Doctor modal ───────────────────────────────────────────
function clearDoctorForm() {
  document.getElementById('doctorId').value = '';
  document.getElementById('doctorName').value = '';
  document.getElementById('doctorSpecialty').value = '';
  document.getElementById('doctorEmail').value = '';
  document.getElementById('doctorPhone').value = '';
  document.getElementById('doctorActive').checked = true;
  document.getElementById('doctorActiveGroup').style.display = 'none';
}

document.getElementById('btnNewDoctor').addEventListener('click', () => {
  clearDoctorForm();
  document.getElementById('doctorModalTitle').textContent = 'Novo Médico';
  openModal('doctorModal');
});

document.getElementById('closeDoctorModal').addEventListener('click', () => closeModal('doctorModal'));
document.getElementById('cancelDoctorModal').addEventListener('click', () => closeModal('doctorModal'));

function openEditDoctor(id) {
  const d = allDoctors.find(x => x.id === id);
  if (!d) return;

  document.getElementById('doctorId').value = d.id;
  document.getElementById('doctorName').value = d.name;
  document.getElementById('doctorSpecialty').value = d.specialty || '';
  document.getElementById('doctorEmail').value = d.email || '';
  document.getElementById('doctorPhone').value = d.phone || '';
  document.getElementById('doctorActive').checked = d.active;
  document.getElementById('doctorActiveGroup').style.display = 'block';

  document.getElementById('doctorModalTitle').textContent = 'Editar Médico';
  openModal('doctorModal');
}

async function deleteDoctor(id, name) {
  if (!confirm(`Excluir o médico "${name}"?\n\nAtenção: a agenda e os agendamentos vinculados serão removidos.`)) return;

  try {
    await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
    showToast('Médico removido com sucesso.', 'success');
    loadDoctors();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

document.getElementById('doctorForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('doctorId').value;
  const name = document.getElementById('doctorName').value.trim();
  const specialty = document.getElementById('doctorSpecialty').value.trim();
  const email = document.getElementById('doctorEmail').value.trim();
  const phone = document.getElementById('doctorPhone').value.trim();
  const active = document.getElementById('doctorActive').checked;

  if (!name) {
    showToast('Nome é obrigatório.', 'error');
    return;
  }

  const body = { name, specialty, email, phone, active };

  try {
    if (id) {
      await apiFetch(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Médico atualizado.', 'success');
    } else {
      await apiFetch('/doctors', { method: 'POST', body: JSON.stringify(body) });
      showToast('Médico cadastrado.', 'success');
    }
    closeModal('doctorModal');
    loadDoctors();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
});

// ── Schedule (availabilities) modal ───────────────────────
async function openScheduleModal(doctorId, doctorName) {
  currentDoctorId = doctorId;
  document.getElementById('scheduleModalTitle').textContent = `Agenda – ${doctorName}`;

  // Reset form
  document.getElementById('availDate').value = '';
  document.getElementById('availStart').value = '';
  document.getElementById('availEnd').value = '';

  openModal('scheduleModal');
  await loadAvailabilities(doctorId);
}

document.getElementById('closeScheduleModal').addEventListener('click', () => closeModal('scheduleModal'));

async function loadAvailabilities(doctorId) {
  try {
    const list = await apiFetch(`/doctors/${doctorId}/availabilities`);
    renderAvailabilities(list);
  } catch (err) {
    showToast('Erro ao carregar disponibilidades: ' + err.message, 'error');
  }
}

function renderAvailabilities(list) {
  const tbody = document.getElementById('availabilityBody');

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">Nenhuma disponibilidade cadastrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td>${formatDate(a.work_date)}</td>
      <td>${a.start_time.slice(0, 5)}</td>
      <td>${a.end_time.slice(0, 5)}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteAvailability(${a.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('availabilityForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const work_date = document.getElementById('availDate').value;
  const start_time = document.getElementById('availStart').value;
  const end_time = document.getElementById('availEnd').value;

  if (!work_date || !start_time || !end_time) {
    showToast('Preencha data, hora início e hora fim.', 'error');
    return;
  }

  if (start_time >= end_time) {
    showToast('Hora início deve ser antes da hora fim.', 'error');
    return;
  }

  try {
    await apiFetch(`/doctors/${currentDoctorId}/availabilities`, {
      method: 'POST',
      body: JSON.stringify({ work_date, start_time, end_time })
    });
    showToast('Disponibilidade adicionada.', 'success');
    document.getElementById('availDate').value = '';
    document.getElementById('availStart').value = '';
    document.getElementById('availEnd').value = '';
    loadAvailabilities(currentDoctorId);
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
});

async function deleteAvailability(availId) {
  if (!confirm('Remover esta disponibilidade?')) return;

  try {
    await apiFetch(`/doctors/${currentDoctorId}/availabilities/${availId}`, { method: 'DELETE' });
    showToast('Disponibilidade removida.', 'success');
    loadAvailabilities(currentDoctorId);
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

// ── Init ───────────────────────────────────────────────────
loadDoctors();
