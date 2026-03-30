/* ============================================================
   appointments.js
   ============================================================ */

let allAppointments = [];
let allDoctors = [];
let calendar = null;
let editingId = null;

// ── Init ───────────────────────────────────────────────────
async function init() {
  try {
    [allAppointments, allDoctors] = await Promise.all([
      apiFetch('/appointments'),
      apiFetch('/doctors')
    ]);
    renderAppointmentsList(allAppointments);
    populateDoctorSelect();
  } catch (err) {
    showToast('Erro ao carregar dados: ' + err.message, 'error');
  }
}

// ── List view ──────────────────────────────────────────────
function renderAppointmentsList(list) {
  const tbody = document.getElementById('appointmentsBody');

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Nenhum agendamento encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td>${formatDateTime(a.appointment_date)}</td>
      <td>
        <strong>${a.patient_name}</strong><br>
        <small style="color:var(--text-muted)">${formatCpf(a.patient_cpf)}</small>
      </td>
      <td>
        ${a.doctor_name}
        ${a.doctor_specialty ? `<br><small style="color:var(--text-muted)">${a.doctor_specialty}</small>` : ''}
      </td>
      <td>
        <select class="status-select" onchange="updateStatus(${a.id}, this.value)">
          <option value="agendado"  ${a.status === 'agendado'  ? 'selected' : ''}>Agendado</option>
          <option value="concluido" ${a.status === 'concluido' ? 'selected' : ''}>Concluído</option>
          <option value="cancelado" ${a.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openEditAppointment(${a.id})" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteAppointment(${a.id})" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Update status ──────────────────────────────────────────
async function updateStatus(id, status) {
  try {
    await apiFetch(`/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    showToast('Status atualizado.', 'success');
    // Update local
    const a = allAppointments.find(x => x.id === id);
    if (a) a.status = status;
    if (calendar) refreshCalendar();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
    init(); // reload to revert select
  }
}

// ── Delete ─────────────────────────────────────────────────
async function deleteAppointment(id) {
  if (!confirm('Confirma a exclusão deste agendamento?')) return;

  try {
    await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
    showToast('Agendamento removido.', 'success');
    init();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

// ── View toggle ────────────────────────────────────────────
document.getElementById('btnListView').addEventListener('click', () => {
  document.getElementById('listView').style.display = '';
  document.getElementById('calendarView').style.display = 'none';
  document.getElementById('btnListView').classList.add('active');
  document.getElementById('btnCalendarView').classList.remove('active');
});

document.getElementById('btnCalendarView').addEventListener('click', () => {
  document.getElementById('listView').style.display = 'none';
  document.getElementById('calendarView').style.display = '';
  document.getElementById('btnListView').classList.remove('active');
  document.getElementById('btnCalendarView').classList.add('active');
  // Aguarda o elemento ser visível antes de renderizar
  requestAnimationFrame(() => initCalendar());
});

// ── FullCalendar ───────────────────────────────────────────
function buildCalendarEvents() {
  return allAppointments.map(a => {
    const colorMap = {
      agendado:  '#3b82f6',
      concluido: '#22c55e',
      cancelado: '#ef4444',
    };
    return {
      id: String(a.id),
      title: `${a.patient_name} (${formatCpf(a.patient_cpf)})`,
      start: a.appointment_date,
      end: new Date(new Date(a.appointment_date).getTime() + 30 * 60000).toISOString(),
      backgroundColor: colorMap[a.status] || '#94a3b8',
      borderColor: 'transparent',
      extendedProps: { appointment: a }
    };
  });
}

function initCalendar() {
  const el = document.getElementById('fullCalendar');
  if (calendar) {
    calendar.updateSize();
    refreshCalendar();
    return;
  }

  calendar = new FullCalendar.Calendar(el, {
    initialView: 'timeGridWeek',
    locale: 'pt-br',
    slotMinTime: '07:00:00',
    slotMaxTime: '21:00:00',
    slotDuration: '00:15:00',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridDay,timeGridWeek,dayGridMonth'
    },
    buttonText: { today: 'Hoje', day: 'Dia', week: 'Semana', month: 'Mês' },
    events: buildCalendarEvents(),
    dateClick(info) {
      openNewAppointment(info.dateStr);
    },
    eventClick(info) {
      const a = info.event.extendedProps.appointment;
      openEditAppointment(a.id);
    },
    height: 'auto',
  });

  calendar.render();
}

function refreshCalendar() {
  if (!calendar) return;
  calendar.removeAllEvents();
  buildCalendarEvents().forEach(e => calendar.addEvent(e));
}

// ── Modal ──────────────────────────────────────────────────
function populateDoctorSelect() {
  const sel = document.getElementById('apptDoctor');
  sel.innerHTML = '<option value="">Selecione o médico...</option>';
  allDoctors
    .filter(d => d.active)
    .forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name}${d.specialty ? ' – ' + d.specialty : ''}`;
      sel.appendChild(opt);
    });
}

function resetAppointmentModal() {
  editingId = null;
  document.getElementById('appointmentId').value = '';
  document.getElementById('appointmentModalTitle').textContent = 'Novo Agendamento';
  document.getElementById('apptCpf').value = '';
  document.getElementById('apptDoctor').value = '';
  document.getElementById('apptDateTime').value = '';
  document.getElementById('apptNotes').value = '';
  document.getElementById('cpfHint').textContent = '';
  document.getElementById('cpfHint').className = 'field-hint';
  document.getElementById('patientFoundInfo').style.display = 'none';
  document.getElementById('newPatientFields').style.display = 'none';
  document.getElementById('patientReadonly').style.display = 'none';
  document.getElementById('cpfGroup').style.display = '';
  document.getElementById('btnDeleteAppointment').style.display = 'none';
  document.getElementById('apptPatientName').value = '';
  document.getElementById('apptPatientPhone').value = '';
  document.getElementById('apptPatientBirth').value = '';
}

function openNewAppointment(dateStr) {
  resetAppointmentModal();
  if (dateStr) {
    // Convert to datetime-local format
    const dt = new Date(dateStr);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('apptDateTime').value =
      `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }
  openModal('appointmentModal');
}

function openEditAppointment(id) {
  const a = allAppointments.find(x => x.id === id);
  if (!a) return;

  resetAppointmentModal();
  editingId = id;
  document.getElementById('appointmentId').value = id;
  document.getElementById('appointmentModalTitle').textContent = 'Editar Agendamento';

  // Hide CPF group, show readonly patient
  document.getElementById('cpfGroup').style.display = 'none';
  document.getElementById('patientReadonly').style.display = '';
  document.getElementById('apptPatientReadonly').value = `${a.patient_name} – ${formatCpf(a.patient_cpf)}`;

  // Fill doctor + date
  document.getElementById('apptDoctor').value = a.doctor_id;

  const dt = new Date(a.appointment_date);
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('apptDateTime').value =
    `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

  document.getElementById('apptNotes').value = a.notes || '';
  document.getElementById('btnDeleteAppointment').style.display = '';

  openModal('appointmentModal');
}

document.getElementById('btnNewAppointment').addEventListener('click', () => openNewAppointment(null));
document.getElementById('closeAppointmentModal').addEventListener('click', () => closeModal('appointmentModal'));
document.getElementById('cancelAppointmentModal').addEventListener('click', () => closeModal('appointmentModal'));

document.getElementById('btnDeleteAppointment').addEventListener('click', () => {
  if (editingId) {
    closeModal('appointmentModal');
    deleteAppointment(editingId);
  }
});

// ── CPF search ─────────────────────────────────────────────
document.getElementById('apptCpf').addEventListener('input', function () {
  this.value = maskCpf(this.value);
});

document.getElementById('btnSearchCpf').addEventListener('click', searchByCpf);
document.getElementById('apptCpf').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); searchByCpf(); }
});

async function searchByCpf() {
  const cpf = document.getElementById('apptCpf').value;
  const hint = document.getElementById('cpfHint');

  if (!validateCpf(cpf)) {
    hint.textContent = 'CPF inválido.';
    hint.className = 'field-hint error';
    return;
  }

  try {
    const patient = await apiFetch(`/patients/cpf/${cpf.replace(/\D/g, '')}`);
    // Found
    document.getElementById('patientFoundName').textContent = `${patient.name} – ${formatCpf(patient.cpf)}`;
    document.getElementById('patientFoundInfo').style.display = '';
    document.getElementById('newPatientFields').style.display = 'none';
    hint.textContent = 'Paciente encontrado.';
    hint.className = 'field-hint success';
    document.getElementById('apptCpf').setAttribute('readonly', true);
  } catch {
    // Not found – show registration fields
    document.getElementById('patientFoundInfo').style.display = 'none';
    document.getElementById('newPatientFields').style.display = '';
    hint.textContent = 'Paciente não encontrado. Preencha os dados para cadastrá-lo.';
    hint.className = 'field-hint';
    document.getElementById('apptCpf').setAttribute('readonly', true);
  }
}

// ── Submit form ────────────────────────────────────────────
document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('appointmentId').value;
  const doctor_id = document.getElementById('apptDoctor').value;
  const appointment_date = document.getElementById('apptDateTime').value;
  const notes = document.getElementById('apptNotes').value.trim();

  if (!doctor_id || !appointment_date) {
    showToast('Médico e data/hora são obrigatórios.', 'error');
    return;
  }

  try {
    if (id) {
      // Reagendar
      await apiFetch(`/appointments/${id}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({ doctor_id, appointment_date, notes })
      });
      showToast('Agendamento atualizado.', 'success');
    } else {
      // Novo
      const cpf = document.getElementById('apptCpf').value;
      if (!validateCpf(cpf)) {
        showToast('CPF inválido.', 'error');
        return;
      }

      const newPatientVisible = document.getElementById('newPatientFields').style.display !== 'none';
      const name  = newPatientVisible ? document.getElementById('apptPatientName').value.trim()  : '';
      const phone = newPatientVisible ? document.getElementById('apptPatientPhone').value.trim() : '';
      const birth_date = newPatientVisible ? document.getElementById('apptPatientBirth').value : '';

      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({ cpf, name, phone, birth_date, doctor_id, appointment_date, notes })
      });
      showToast('Agendamento criado.', 'success');
    }

    closeModal('appointmentModal');
    init();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
});

// ── Start ──────────────────────────────────────────────────
init();
