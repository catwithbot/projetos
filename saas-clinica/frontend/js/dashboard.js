/* ============================================================
   dashboard.js
   ============================================================ */

async function loadDashboard() {
  try {
    const [stats, today] = await Promise.all([
      apiFetch('/dashboard/stats'),
      apiFetch('/appointments/today')
    ]);

    document.getElementById('totalPatients').textContent = stats.totalPatients;
    document.getElementById('todayAppointments').textContent = stats.todayAppointments;

    renderTodayTable(today);
  } catch (err) {
    showToast('Erro ao carregar dashboard: ' + err.message, 'error');
  }
}

function renderTodayTable(appointments) {
  const tbody = document.getElementById('todayBody');

  if (appointments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Nenhuma consulta agendada para hoje.</td></tr>`;
    return;
  }

  tbody.innerHTML = appointments.map(a => `
    <tr>
      <td>${a.appointment_date.replace(' ', 'T').slice(11, 16)}</td>
      <td>
        <strong>${a.patient_name}</strong><br>
        <small style="color:var(--text-muted)">${formatCpf(a.patient_cpf)}</small>
      </td>
      <td>${a.doctor_name}</td>
      <td>${a.doctor_specialty || '–'}</td>
      <td>${statusBadge(a.status)}</td>
    </tr>
  `).join('');
}

loadDashboard();
