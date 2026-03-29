const API_BASE = '/api';
// const API_BASE = 'http://localhost:3000/api'; // Local

const api = {
    // Patients API
    getPatients: async () => { const res = await fetch(`${API_BASE}/patients`); return res.json(); },
    getPatient: async (id) => { const res = await fetch(`${API_BASE}/patients/${id}`); return res.json(); },
    getPatientByCpf: async (cpf) => {
        const res = await fetch(`${API_BASE}/patients/cpf/${cpf}`);
        return res.ok ? res.json() : null;
    },
    createPatient: async (data) => {
        const res = await fetch(`${API_BASE}/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    updatePatient: async (id, data) => {
        const res = await fetch(`${API_BASE}/patients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    deletePatient: async (id) => { const res = await fetch(`${API_BASE}/patients/${id}`, { method: 'DELETE' }); return res.json(); },

    // Doctors API
    getDoctors: async () => { const res = await fetch(`${API_BASE}/doctors`); return res.json(); },
    getDoctor: async (id) => { const res = await fetch(`${API_BASE}/doctors/${id}`); return res.json(); },
    createDoctor: async (data) => {
        const res = await fetch(`${API_BASE}/doctors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    updateDoctor: async (id, data) => {
        const res = await fetch(`${API_BASE}/doctors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    deleteDoctor: async (id) => { const res = await fetch(`${API_BASE}/doctors/${id}`, { method: 'DELETE' }); return res.json(); },

    // Doctor Availabilities API
    getDoctorAvailabilities: async (doctorId) => {
        const res = await fetch(`${API_BASE}/doctors/${doctorId}/availabilities`); return res.json();
    },
    createDoctorAvailability: async (doctorId, data) => {
        const res = await fetch(`${API_BASE}/doctors/${doctorId}/availabilities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    deleteDoctorAvailability: async (doctorId, availId) => {
        const res = await fetch(`${API_BASE}/doctors/${doctorId}/availabilities/${availId}`, { method: 'DELETE' }); return res.json();
    },

    // Appointments API
    getAppointments: async () => { const res = await fetch(`${API_BASE}/appointments`); return res.json(); },
    getTodayAppointments: async () => { const res = await fetch(`${API_BASE}/appointments/today`); return res.json(); },
    createAppointment: async (data) => {
        const res = await fetch(`${API_BASE}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
        return json;
    },
    updateAppointmentStatus: async (id, status) => {
        const res = await fetch(`${API_BASE}/appointments/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        return res.json();
    },
    rescheduleAppointment: async (id, data) => {
        const res = await fetch(`${API_BASE}/appointments/${id}/reschedule`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    deleteAppointment: async (id) => { const res = await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' }); return res.json(); },

    // Dashboard
    getStats: async () => { const res = await fetch(`${API_BASE}/dashboard/stats`); return res.json(); },

    // Validator (Receita Federal Algorithm)
    validateCpf: (cpf) => {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let add = 0;
        for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(9))) return false;
        add = 0;
        for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(10))) return false;
        return true;
    }
};

// UI Utils
function formatDates(dateString) {
    if (!dateString) return '-';
    let date = new Date(dateString);
    if (dateString.length === 10) date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function showModal(id) { document.getElementById(id).classList.add('show'); }
function hideModal(id) { document.getElementById(id).classList.remove('show'); }

// Theme Toggle Logic
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Load theme on start
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }
});
