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
          <option value="falta"     ${a.status === 'falta'     ? 'selected' : ''}>Falta</option>
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
    const a = allAppointments.find(x => x.id === id);
    if (a) a.status = status;
    if (calendar) refreshCalendar();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
    init();
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
  requestAnimationFrame(() => initCalendar());
});

// ── FullCalendar ───────────────────────────────────────────
const statusConfig = {
  agendado:  { bg: '#2563eb', border: '#1d4ed8', label: 'Agendado' },
  concluido: { bg: '#16a34a', border: '#15803d', label: 'Concluído' },
  cancelado: { bg: '#dc2626', border: '#b91c1c', label: 'Cancelado' },
  falta:     { bg: '#d97706', border: '#b45309', label: 'Falta' },
};

function buildCalendarEvents() {
  return allAppointments.map(a => {
    const cfg = statusConfig[a.status] || { bg: '#64748b', border: '#475569' };
    const firstName = a.patient_name.split(' ')[0];
    const lastName  = a.patient_name.split(' ').slice(-1)[0];
    const shortName = firstName === lastName ? firstName : `${firstName} ${lastName}`;

    return {
      id: String(a.id),
      title: shortName,
      start: a.appointment_date,
      end: new Date(new Date(a.appointment_date).getTime() + 30 * 60000).toISOString(),
      backgroundColor: cfg.bg,
      borderColor: cfg.border,
      extendedProps: { appointment: a, doctor: a.doctor_name, status: a.status }
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
    initialView: 'timeGridDay',
    locale: 'pt-br',
    slotMinTime: '07:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    scrollTime: '08:00:00',
    nowIndicator: true,
    allDaySlot: false,
    expandRows: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridDay,timeGridWeek,dayGridMonth'
    },
    buttonText: { today: 'Hoje', day: 'Dia', week: 'Semana', month: 'Mês' },
    events: buildCalendarEvents(),
    eventContent(arg) {
      const { appointment: a, doctor } = arg.event.extendedProps;
      const start = arg.event.start;
      const end   = arg.event.end;
      const fmt   = d => d ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '';
      return {
        html: `
          <div class="fc-event-inner">
            <span class="fc-event-name">${arg.event.title}</span>
            <span class="fc-event-meta">${fmt(start)}–${fmt(end)}</span>
            <span class="fc-event-doctor">${doctor || ''}</span>
          </div>`
      };
    },
    dateClick(info) { openNewAppointment(info.dateStr); },
    eventClick(info) {
      const a = info.event.extendedProps.appointment;
      openEditAppointment(a.id);
    },
    height: 600,
  });

  calendar.render();
}

function refreshCalendar() {
  if (!calendar) return;
  calendar.removeAllEvents();
  buildCalendarEvents().forEach(e => calendar.addEvent(e));
}

// ── Modal tabs ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tabFormPanel').style.display  = target === 'tabFormPanel'  ? '' : 'none';
    document.getElementById('tabAuditPanel').style.display = target === 'tabAuditPanel' ? '' : 'none';
  });
});

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

  // Reset tabs
  document.getElementById('appointmentTabs').style.display = 'none';
  document.getElementById('tabFormPanel').style.display  = '';
  document.getElementById('tabAuditPanel').style.display = 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="tabFormPanel"]').classList.add('active');
}

function fillAuditPanel(a) {
  document.getElementById('auditCreatedBy').textContent =
    a.created_by_name || 'Sistema';
  document.getElementById('auditCreatedAt').textContent =
    a.created_at ? formatDateTime(a.created_at) : '–';

  const updatedUser = a.updated_by_name || a.created_by_name || 'Sistema';
  const updatedAt   = a.updated_at || a.created_at;
  document.getElementById('auditUpdatedBy').textContent = updatedUser;
  document.getElementById('auditUpdatedAt').textContent = updatedAt ? formatDateTime(updatedAt) : '–';
}

function openNewAppointment(dateStr) {
  resetAppointmentModal();
  if (dateStr) {
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

  document.getElementById('cpfGroup').style.display = 'none';
  document.getElementById('patientReadonly').style.display = '';
  document.getElementById('apptPatientReadonly').value = `${a.patient_name} – ${formatCpf(a.patient_cpf)}`;

  document.getElementById('apptDoctor').value = a.doctor_id;

  const dt = new Date(a.appointment_date);
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('apptDateTime').value =
    `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

  document.getElementById('apptNotes').value = a.notes || '';
  document.getElementById('btnDeleteAppointment').style.display = '';

  // Mostrar tabs e preencher auditoria
  document.getElementById('appointmentTabs').style.display = '';
  fillAuditPanel(a);

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
    document.getElementById('patientFoundName').textContent = `${patient.name} – ${formatCpf(patient.cpf)}`;
    document.getElementById('patientFoundInfo').style.display = '';
    document.getElementById('newPatientFields').style.display = 'none';
    hint.textContent = 'Paciente encontrado.';
    hint.className = 'field-hint success';
    document.getElementById('apptCpf').setAttribute('readonly', true);
  } catch {
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
      await apiFetch(`/appointments/${id}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({ doctor_id, appointment_date, notes })
      });
      showToast('Agendamento atualizado.', 'success');
    } else {
      const cpf = document.getElementById('apptCpf').value;
      if (!validateCpf(cpf)) {
        showToast('CPF inválido.', 'error');
        return;
      }

      const newPatientVisible = document.getElementById('newPatientFields').style.display !== 'none';
      const name       = newPatientVisible ? document.getElementById('apptPatientName').value.trim()  : '';
      const phone      = newPatientVisible ? document.getElementById('apptPatientPhone').value.trim() : '';
      const birth_date = newPatientVisible ? document.getElementById('apptPatientBirth').value        : '';

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
