/* ============================================================
   reports.js
   ============================================================ */

let allDoctors = [];

async function init() {
  try {
    allDoctors = await apiFetch('/doctors');
    populateDoctorFilter();
    setDefaultDates();
  } catch (err) {
    showToast('Erro ao carregar médicos: ' + err.message, 'error');
  }
}

function populateDoctorFilter() {
  const sel = document.getElementById('filterDoctor');
  sel.innerHTML = '<option value="">Todos os médicos</option>';
  allDoctors.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name}${d.specialty ? ' – ' + d.specialty : ''}`;
    sel.appendChild(opt);
  });
}

function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById('filterDateFrom').value = firstDay.toISOString().split('T')[0];
  document.getElementById('filterDateTo').value   = today.toISOString().split('T')[0];
}

document.getElementById('btnGenerate').addEventListener('click', generateReport);

async function generateReport() {
  const doctor_id  = document.getElementById('filterDoctor').value;
  const date_from  = document.getElementById('filterDateFrom').value;
  const date_to    = document.getElementById('filterDateTo').value;
  const status     = document.getElementById('filterStatus').value;

  const params = new URLSearchParams();
  if (doctor_id) params.append('doctor_id', doctor_id);
  if (date_from) params.append('date_from', date_from);
  if (date_to)   params.append('date_to',   date_to);
  if (status)    params.append('status',    status);

  try {
    const [appointments, summary] = await Promise.all([
      apiFetch('/reports/appointments?' + params),
      apiFetch('/reports/summary?' + params)
    ]);

    renderSummary(summary);
    renderDetail(appointments);

    document.getElementById('summarySection').style.display = '';
    document.getElementById('detailSection').style.display  = '';
  } catch (err) {
    showToast('Erro ao gerar relatório: ' + err.message, 'error');
  }
}

function renderSummary(rows) {
  const tbody = document.getElementById('summaryBody');

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">Nenhum dado encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.doctor_name}</strong></td>
      <td>${r.specialty || '–'}</td>
      <td><strong>${r.total}</strong></td>
      <td><span class="badge badge-info">${r.agendado}</span></td>
      <td><span class="badge badge-success">${r.concluido}</span></td>
      <td><span class="badge badge-danger">${r.cancelado}</span></td>
      <td><span class="badge badge-warning">${r.falta}</span></td>
    </tr>
  `).join('');
}

function renderDetail(rows) {
  const tbody = document.getElementById('reportBody');
  const count = document.getElementById('reportCount');
  count.textContent = `${rows.length} registro${rows.length !== 1 ? 's' : ''}`;

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Nenhum agendamento encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${formatDateTime(r.appointment_date)}</td>
      <td>
        <strong>${r.patient_name}</strong><br>
        <small style="color:var(--text-muted)">${formatCpf(r.patient_cpf)}</small>
      </td>
      <td>
        ${r.doctor_name}
        ${r.doctor_specialty ? `<br><small style="color:var(--text-muted)">${r.doctor_specialty}</small>` : ''}
      </td>
      <td>${statusBadge(r.status)}</td>
      <td>
        ${r.created_by_name || '–'}
        ${r.created_at ? `<br><small style="color:var(--text-muted)">${formatDateTime(r.created_at)}</small>` : ''}
      </td>
      <td>
        ${r.updated_by_name || '–'}
        ${r.updated_at && r.updated_by_name ? `<br><small style="color:var(--text-muted)">${formatDateTime(r.updated_at)}</small>` : ''}
      </td>
    </tr>
  `).join('');
}

init();
