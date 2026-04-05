/* ============================================================
   appointments.js
   ============================================================ */

let allAppointments = [];
let allDoctors = [];
let calendar = null;
let editingId = null;
let calendarDoctorFilter = '';  // '' = all doctors
let availabilityBgEvents = [];  // background events for calendar

// ── Date picker state ──────────────────────────────────────
let availableDates = new Set();   // "YYYY-MM-DD" strings for selected doctor
let pickerYear  = new Date().getFullYear();
let pickerMonth = new Date().getMonth();   // 0-based

// ── Init ───────────────────────────────────────────────────
async function init() {
  try {
    [allAppointments, allDoctors] = await Promise.all([
      apiFetch('/appointments'),
      apiFetch('/doctors')
    ]);
    renderAppointmentsList(allAppointments);
    populateDoctorSelect();
    populateCalendarDoctorFilter();
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
  const filtered = calendarDoctorFilter
    ? allAppointments.filter(a => String(a.doctor_id) === String(calendarDoctorFilter))
    : allAppointments;

  const appointmentEvents = filtered.map(a => {
    const cfg = statusConfig[a.status] || { bg: '#64748b', border: '#475569' };
    const firstName = a.patient_name.split(' ')[0];
    const lastName  = a.patient_name.split(' ').slice(-1)[0];
    const shortName = firstName === lastName ? firstName : `${firstName} ${lastName}`;

    const startStr = a.appointment_date.replace(' ', 'T').slice(0, 19);
    const [datePart, timePart] = startStr.split('T');
    const [h, m] = timePart.split(':').map(Number);
    const totalMins = h * 60 + m + 30;
    const endStr = `${datePart}T${String(Math.floor(totalMins / 60) % 24).padStart(2,'0')}:${String(totalMins % 60).padStart(2,'0')}:00`;

    return {
      id: String(a.id),
      title: shortName,
      start: startStr,
      end: endStr,
      backgroundColor: cfg.bg,
      borderColor: cfg.border,
      extendedProps: { appointment: a, doctor: a.doctor_name, status: a.status }
    };
  });

  return [...availabilityBgEvents, ...appointmentEvents];
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
    slotDuration: '01:00:00',
    slotLabelInterval: '01:00:00',
    scrollTime: '08:00:00',
    nowIndicator: true,
    allDaySlot: false,
    expandRows: true,
    customButtons: {
      customPrev: {
        text: '',
        click() { calendar.prev(); },
      },
      customNext: {
        text: '',
        click() { calendar.next(); },
      },
    },
    headerToolbar: {
      left: 'customPrev,customNext today',
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
      if (!info.event.extendedProps.appointment) return; // skip bg events
      openEditAppointment(info.event.extendedProps.appointment.id);
    },
    async datesSet() {
      if (calendarDoctorFilter) {
        await loadAvailabilityBgEvents();
        refreshCalendar();
      }
    },
    height: 1000,
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

// ── Doctor select ──────────────────────────────────────────
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

// ── Calendar doctor filter ─────────────────────────────────
function populateCalendarDoctorFilter() {
  const sel = document.getElementById('calendarDoctorFilter');
  sel.innerHTML = '<option value="">Todos os médicos</option>';
  allDoctors.filter(d => d.active).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name}${d.specialty ? ' – ' + d.specialty : ''}`;
    sel.appendChild(opt);
  });
}

document.getElementById('calendarDoctorFilter').addEventListener('change', async function () {
  calendarDoctorFilter = this.value;
  const legend = document.getElementById('calendarLegend');
  legend.style.display = calendarDoctorFilter ? '' : 'none';
  await refreshCalendarWithAvailability();
});

async function loadAvailabilityBgEvents() {
  if (!calendarDoctorFilter || !calendar) {
    availabilityBgEvents = [];
    return;
  }

  const viewStart = calendar.view.currentStart;
  const viewEnd   = calendar.view.currentEnd;
  const fmt = d => d.toISOString().slice(0, 10);

  try {
    const rows = await apiFetch(
      `/doctors/${calendarDoctorFilter}/availabilities-range?start=${fmt(viewStart)}&end=${fmt(viewEnd)}`
    );
    availabilityBgEvents = rows.map(r => ({
      id: `avail-${r.id}`,
      start: `${r.work_date.slice(0, 10)}T${r.start_time.slice(0, 5)}`,
      end:   `${r.work_date.slice(0, 10)}T${r.end_time.slice(0, 5)}`,
      display: 'background',
      backgroundColor: '#22c55e',
      classNames: ['availability-bg-event']
    }));
  } catch {
    availabilityBgEvents = [];
  }
}

async function refreshCalendarWithAvailability() {
  await loadAvailabilityBgEvents();
  refreshCalendar();
}

// When doctor changes: fetch availabilities, reset date & slots
document.getElementById('apptDoctor').addEventListener('change', async function () {
  clearDateAndSlots();
  availableDates.clear();

  const doctorId = this.value;
  if (!doctorId) {
    renderDatePicker();
    return;
  }

  try {
    const rows = await apiFetch(`/doctors/${doctorId}/availabilities`);
    rows.forEach(r => availableDates.add(r.work_date.slice(0, 10)));
    renderDatePicker();
  } catch {
    availableDates.clear();
    renderDatePicker();
  }
});

// ── Date Picker ────────────────────────────────────────────
function openDatePicker() {
  document.getElementById('apptDatePicker').classList.add('open');
}

function closeDatePicker() {
  document.getElementById('apptDatePicker').classList.remove('open');
}

function renderDatePicker() {
  const monthNames = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  document.getElementById('dpMonthYear').textContent =
    `${monthNames[pickerMonth]} ${pickerYear}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedVal = document.getElementById('apptDate').value; // dd/mm/yyyy
  let selectedISO = null;
  if (selectedVal.length === 10) {
    const [dd, mm, yyyy] = selectedVal.split('/');
    selectedISO = `${yyyy}-${mm}-${dd}`;
  }

  const firstDay = new Date(pickerYear, pickerMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const daysInPrev  = new Date(pickerYear, pickerMonth, 0).getDate();

  const grid = document.getElementById('dpDays');
  grid.innerHTML = '';

  // Cells before first of month (prev month overflow)
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + 1 + i;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dp-day dp-other';
    btn.textContent = d;
    grid.appendChild(btn);
  }

  // Days of current month
  const doctorSelected = !!document.getElementById('apptDoctor').value;
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${pickerYear}-${String(pickerMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayDate = new Date(pickerYear, pickerMonth, day);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = day;
    btn.dataset.date = iso;

    const isSelected  = iso === selectedISO;
    const isToday     = dayDate.getTime() === today.getTime();
    const isAvailable = !doctorSelected || availableDates.has(iso);

    if (!isAvailable) {
      btn.className = 'dp-day dp-disabled';
    } else if (isSelected) {
      btn.className = 'dp-day dp-available dp-selected';
    } else if (isToday) {
      btn.className = 'dp-day dp-available dp-today';
    } else {
      btn.className = 'dp-day dp-available';
    }

    if (isAvailable) {
      btn.addEventListener('click', () => pickDate(iso));
    }

    grid.appendChild(btn);
  }

  // Cells after last day (next month overflow)
  const totalCells = firstDay + daysInMonth;
  const remainder  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainder; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dp-day dp-other';
    btn.textContent = i;
    grid.appendChild(btn);
  }
}

function pickDate(iso) {
  const [yyyy, mm, dd] = iso.split('-');
  document.getElementById('apptDate').value = `${dd}/${mm}/${yyyy}`;
  closeDatePicker();
  renderDatePicker(); // update selected highlight
  loadTimeSlots(iso);
}

document.getElementById('dpPrev').addEventListener('click', () => {
  pickerMonth--;
  if (pickerMonth < 0) { pickerMonth = 11; pickerYear--; }
  renderDatePicker();
});

document.getElementById('dpNext').addEventListener('click', () => {
  pickerMonth++;
  if (pickerMonth > 11) { pickerMonth = 0; pickerYear++; }
  renderDatePicker();
});

// Open picker on click, close on outside click
document.getElementById('apptDate').addEventListener('click', () => {
  const doctorId = document.getElementById('apptDoctor').value;
  if (!doctorId) {
    showToast('Selecione um médico primeiro.', 'info');
    return;
  }
  openDatePicker();
  renderDatePicker();
});

document.addEventListener('click', e => {
  const wrap = document.querySelector('.date-picker-wrap');
  if (wrap && !wrap.contains(e.target)) {
    closeDatePicker();
  }
});

// Manual typing fallback: parse on input, load slots if complete valid date
document.getElementById('apptDate').addEventListener('input', function () {
  maskDate(this);
  const val = this.value;
  if (val.length === 10) {
    const [dd, mm, yyyy] = val.split('/');
    const iso = `${yyyy}-${mm}-${dd}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      loadTimeSlots(iso);
    }
  } else {
    clearSlots();
  }
});

// ── Time Slots ─────────────────────────────────────────────
function clearSlots() {
  document.getElementById('apptTime').value = '';
  document.getElementById('timeSlotsGrid').innerHTML = '';
  document.getElementById('timeSlotGroup').style.display = 'none';
}

function clearDateAndSlots() {
  document.getElementById('apptDate').value = '';
  clearSlots();
}

async function loadTimeSlots(dateISO) {
  const doctorId = document.getElementById('apptDoctor').value;
  if (!doctorId) return;

  const grid  = document.getElementById('timeSlotsGrid');
  const group = document.getElementById('timeSlotGroup');
  group.style.display = '';
  grid.innerHTML = `<div class="time-slots-msg">Carregando horários...</div>`;
  document.getElementById('apptTime').value = '';

  try {
    const excludeParam = editingId ? `&exclude_appointment_id=${editingId}` : '';
    const data = await apiFetch(`/doctors/${doctorId}/available-slots?date=${dateISO}${excludeParam}`);
    renderTimeSlots(data.slots);
  } catch (err) {
    grid.innerHTML = `<div class="time-slots-msg">Erro ao carregar horários.</div>`;
  }
}

function renderTimeSlots(slots) {
  const grid = document.getElementById('timeSlotsGrid');
  const currentTime = document.getElementById('apptTime').value;

  if (!slots || slots.length === 0) {
    grid.innerHTML = `<div class="time-slots-msg">Nenhum horário disponível para esta data.</div>`;
    return;
  }

  grid.innerHTML = slots.map(s => {
    const isSelected = s.time === currentTime;
    const cls = s.available
      ? (isSelected ? 'time-slot-btn slot-selected' : 'time-slot-btn')
      : 'time-slot-btn slot-occupied';
    const disabled = s.available ? '' : 'disabled';
    const title = s.available ? '' : `title="Horário ocupado"`;
    return `<button type="button" class="${cls}" ${disabled} ${title} onclick="selectSlot('${s.time}')">${s.time}</button>`;
  }).join('');
}

function selectSlot(time) {
  document.getElementById('apptTime').value = time;
  // Update button highlight
  document.querySelectorAll('#timeSlotsGrid .time-slot-btn').forEach(btn => {
    btn.classList.toggle('slot-selected', btn.textContent === time);
  });
}

// ── Modal reset/open ───────────────────────────────────────
function resetAppointmentModal() {
  editingId = null;
  availableDates.clear();

  const now = new Date();
  pickerYear  = now.getFullYear();
  pickerMonth = now.getMonth();

  document.getElementById('appointmentId').value = '';
  document.getElementById('appointmentModalTitle').textContent = 'Novo Agendamento';
  document.getElementById('apptCpf').value = '';
  document.getElementById('apptDoctor').value = '';
  document.getElementById('apptDate').value = '';
  document.getElementById('apptTime').value = '';
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

  clearSlots();
  closeDatePicker();

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

async function openNewAppointment(dateStr) {
  resetAppointmentModal();

  if (dateStr) {
    const dt = new Date(dateStr);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('apptDate').value =
      `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()}`;
    // Time slots can't load without a doctor; field stays empty until doctor chosen
  }

  openModal('appointmentModal');
}

async function openEditAppointment(id) {
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

  // Parse date/time without timezone shift
  const [apptDatePart, apptTimePart] = a.appointment_date.replace(' ', 'T').split('T');
  const [yyyy, mm, dd] = apptDatePart.split('-');
  const [hh, mi] = apptTimePart.split(':');
  const dateDisplay = `${dd}/${mm}/${yyyy}`;
  document.getElementById('apptDate').value = dateDisplay;
  document.getElementById('apptTime').value = `${hh}:${mi}`;

  document.getElementById('apptNotes').value = a.notes || '';
  document.getElementById('btnDeleteAppointment').style.display = '';

  // Show tabs and fill audit
  document.getElementById('appointmentTabs').style.display = '';
  fillAuditPanel(a);

  // Load availabilities for the doctor so date picker works
  try {
    const rows = await apiFetch(`/doctors/${a.doctor_id}/availabilities`);
    rows.forEach(r => availableDates.add(r.work_date.slice(0, 10)));
  } catch { /* non-fatal */ }

  // Load time slots (excluding this appointment)
  loadTimeSlots(apptDatePart).then(() => {
    // Pre-select the current time after slots are rendered
    selectSlot(`${hh}:${mi}`);
  });

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

function maskDate(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length >= 5) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
  else if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
}

document.getElementById('apptPatientBirth').addEventListener('input', function () { maskDate(this); });

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

  const id        = document.getElementById('appointmentId').value;
  const doctor_id = document.getElementById('apptDoctor').value;
  const apptDate  = document.getElementById('apptDate').value;
  const apptTime  = document.getElementById('apptTime').value;
  const notes     = document.getElementById('apptNotes').value.trim();

  if (!doctor_id || apptDate.length < 10 || apptTime.length < 5) {
    showToast('Médico, data e horário são obrigatórios.', 'error');
    return;
  }

  const [dd, mm, yyyy] = apptDate.split('/');
  const appointment_date = `${yyyy}-${mm}-${dd}T${apptTime}:00`;

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
      const name  = newPatientVisible ? document.getElementById('apptPatientName').value.trim()  : '';
      const phone = newPatientVisible ? document.getElementById('apptPatientPhone').value.trim() : '';
      const rawBirth = newPatientVisible ? document.getElementById('apptPatientBirth').value : '';
      const birthParts = rawBirth.split('/');
      const birth_date = birthParts.length === 3 ? `${birthParts[2]}-${birthParts[1]}-${birthParts[0]}` : '';

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
