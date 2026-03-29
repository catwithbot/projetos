document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load stats
        const stats = await api.getStats();
        document.getElementById('stat-total-patients').textContent = stats.totalPatients || 0;
        document.getElementById('stat-today-appointments').textContent = stats.todayAppointments || 0;

        // Load today's appointments
        const res = await api.getTodayAppointments();
        const tbody = document.querySelector('#today-appointments-table tbody');
        
        if (res.data && res.data.length > 0) {
            tbody.innerHTML = res.data.map(app => `
                <tr>
                    <td style="font-weight: 500;">${new Date(app.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td>
                        <div style="font-weight: 500; color: var(--text-main);">${app.patient_name || 'Paciente excluído'}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">ID: #${app.patient_id}</div>
                    </td>
                    <td>${app.doctor_name}</td>
                    <td><span class="badge ${app.status.toLowerCase()}">${app.status}</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhuma consulta agendada para hoje.</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading dashboard data:", err);
    }
});
