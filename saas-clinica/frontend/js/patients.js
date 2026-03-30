/* ============================================================
   patients.js
   ============================================================ */

let allPatients = [];

// ── Load & render ──────────────────────────────────────────
async function loadPatients() {
  try {
    allPatients = await apiFetch('/patients');
    renderPatients(allPatients);
  } catch (err) {
    showToast('Erro ao carregar pacientes: ' + err.message, 'error');
  }
}

function renderPatients(list) {
  const tbody = document.getElementById('patientsBody');

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">Nenhum paciente cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${p.id}</td>
      <td><strong>${p.name}</strong></td>
      <td>${formatCpf(p.cpf)}</td>
      <td>${p.email || '–'}</td>
      <td>${p.phone}</td>
      <td>${formatDate(p.birth_date)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openEditPatient(${p.id})" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deletePatient(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Search ─────────────────────────────────────────────────
document.getElementById('searchPatient').addEventListener('input', function () {
  const q = this.value.toLowerCase().replace(/\D/g, '') || this.value.toLowerCase();
  const filtered = allPatients.filter(p =>
    p.name.toLowerCase().includes(this.value.toLowerCase()) ||
    p.cpf.includes(q)
  );
  renderPatients(filtered);
});

// ── Modal open/close ───────────────────────────────────────
function clearPatientForm() {
  document.getElementById('patientId').value = '';
  document.getElementById('patientCpf').value = '';
  document.getElementById('patientName').value = '';
  document.getElementById('patientEmail').value = '';
  document.getElementById('patientPhone').value = '';
  document.getElementById('patientBirthDate').value = '';
  document.getElementById('patientObs').value = '';
}

document.getElementById('btnNewPatient').addEventListener('click', () => {
  clearPatientForm();
  document.getElementById('patientModalTitle').textContent = 'Novo Paciente';
  document.getElementById('patientCpf').removeAttribute('readonly');
  openModal('patientModal');
});

document.getElementById('closePatientModal').addEventListener('click', () => closeModal('patientModal'));
document.getElementById('cancelPatientModal').addEventListener('click', () => closeModal('patientModal'));

// ── CPF mask ───────────────────────────────────────────────
document.getElementById('patientCpf').addEventListener('input', function () {
  this.value = maskCpf(this.value);
});

// ── Edit ───────────────────────────────────────────────────
function openEditPatient(id) {
  const p = allPatients.find(x => x.id === id);
  if (!p) return;

  document.getElementById('patientId').value = p.id;
  document.getElementById('patientCpf').value = formatCpf(p.cpf);
  document.getElementById('patientName').value = p.name;
  document.getElementById('patientEmail').value = p.email || '';
  document.getElementById('patientPhone').value = p.phone;
  document.getElementById('patientBirthDate').value = p.birth_date.split('T')[0];
  document.getElementById('patientObs').value = p.observations || '';

  document.getElementById('patientModalTitle').textContent = 'Editar Paciente';
  openModal('patientModal');
}

// ── Delete ─────────────────────────────────────────────────
async function deletePatient(id, name) {
  if (!confirm(`Excluir paciente "${name}"?\n\nAtenção: consultas vinculadas também serão removidas.`)) return;

  try {
    await apiFetch(`/patients/${id}`, { method: 'DELETE' });
    showToast('Paciente removido com sucesso.', 'success');
    loadPatients();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

// ── Save (create / update) ─────────────────────────────────
document.getElementById('patientForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('patientId').value;
  const cpf = document.getElementById('patientCpf').value;
  const name = document.getElementById('patientName').value.trim();
  const email = document.getElementById('patientEmail').value.trim();
  const phone = document.getElementById('patientPhone').value.trim();
  const birth_date = document.getElementById('patientBirthDate').value;
  const observations = document.getElementById('patientObs').value.trim();

  if (!validateCpf(cpf)) {
    showToast('CPF inválido.', 'error');
    return;
  }
  if (!name || !phone || !birth_date) {
    showToast('Nome, telefone e data de nascimento são obrigatórios.', 'error');
    return;
  }

  const body = { cpf, name, email, phone, birth_date, observations };

  try {
    if (id) {
      await apiFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Paciente atualizado.', 'success');
    } else {
      await apiFetch('/patients', { method: 'POST', body: JSON.stringify(body) });
      showToast('Paciente cadastrado.', 'success');
    }
    closeModal('patientModal');
    loadPatients();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
});

// ── Init ───────────────────────────────────────────────────
loadPatients();
