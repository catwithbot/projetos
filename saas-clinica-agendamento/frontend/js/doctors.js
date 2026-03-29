const docObj = {
    loadDoctors: async () => {
        try {
            const res = await api.getDoctors();
            const tbody = document.querySelector('#doctors-table tbody');
            
            if (res.data && res.data.length > 0) {
                tbody.innerHTML = res.data.map(d => `
                    <tr>
                        <td style="font-weight: 500; color: var(--text-main);">
                            ${d.name} <span class="badge ${d.active ? 'concluido' : 'cancelado'}">${d.active ? 'Ativo' : 'Inativo'}</span>
                        </td>
                        <td>${d.specialty || '-'}</td>
                        <td>
                            <div style="font-size: 0.875rem;">${d.email || '-'}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${d.phone || '-'}</div>
                        </td>
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem" onclick="window.doc.openAgenda(${d.id}, '${d.name}')"><i class="fas fa-calendar-alt"></i> Ver Agenda</button>
                            <button class="btn-icon-only" onclick="window.doc.editDoctor(${d.id})" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon-only danger" onclick="window.doc.deleteDoctor(${d.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum médico cadastrado.</td></tr>`;
            }
        } catch (err) {
            console.error(err);
        }
    },

    openCreateModal: () => {
        document.getElementById('doctor-form').reset();
        document.getElementById('doc-id').value = '';
        document.getElementById('modal-title').textContent = 'Novo Médico';
        showModal('doctor-modal');
    },

    editDoctor: async (id) => {
        try {
            const res = await api.getDoctor(id);
            const d = res.data;
            if (d) {
                document.getElementById('doc-id').value = d.id;
                document.getElementById('doc-name').value = d.name;
                document.getElementById('doc-spec').value = d.specialty || '';
                document.getElementById('doc-email').value = d.email || '';
                document.getElementById('doc-phone').value = d.phone || '';
                
                document.getElementById('modal-title').textContent = 'Editar Médico';
                showModal('doctor-modal');
            }
        } catch(err) {
            console.error(err);
            alert("Erro ao buscar dados do médico.");
        }
    },

    saveDoctor: async () => {
        const id = document.getElementById('doc-id').value;
        const data = {
            name: document.getElementById('doc-name').value,
            specialty: document.getElementById('doc-spec').value,
            email: document.getElementById('doc-email').value,
            phone: document.getElementById('doc-phone').value
        };

        if(!data.name) {
            alert('Nome é obrigatório!');
            return;
        }

        try {
            if (id) await api.updateDoctor(id, data);
            else await api.createDoctor(data);
            
            hideModal('doctor-modal');
            docObj.loadDoctors(); 
        } catch(err) {
            console.error(err);
            alert("Erro ao salvar médico.");
        }
    },

    deleteDoctor: async (id) => {
        if(confirm('Tem certeza? Removerá também a agenda e pode corromper agendamentos se houverem vinculados.')) {
            try {
                await api.deleteDoctor(id);
                docObj.loadDoctors();
            } catch(err) {
                console.error(err);
                alert("Erro ao excluir médico.");
            }
        }
    },

    // --- AVAILABILITIES (AGENDA) LOGIC ---
    
    openAgenda: async (doctorId, doctorName) => {
        document.getElementById('agenda-doctor-name').textContent = doctorName;
        document.getElementById('agenda-doc-id').value = doctorId;
        
        // Fix calendar input to today's date
        const today = new Date();
        document.getElementById('avail-date').value = today.toISOString().split('T')[0];
        document.getElementById('avail-start').value = "08:00";
        document.getElementById('avail-end').value = "18:00";

        await docObj.loadAvailabilities(doctorId);
        showModal('agenda-modal');
    },

    loadAvailabilities: async (doctorId) => {
        try {
            const res = await api.getDoctorAvailabilities(doctorId);
            const tbody = document.querySelector('#availabilities-table tbody');
            
            if (res.data && res.data.length > 0) {
                tbody.innerHTML = res.data.map(av => `
                    <tr>
                        <td><strong>${formatDates(av.work_date)}</strong></td>
                        <td>${av.start_time} às ${av.end_time}</td>
                        <td style="text-align: right;">
                             <button class="btn-icon-only danger" onclick="window.doc.deleteAvailability(${av.doctor_id}, ${av.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1rem;">Nenhum turno aberto.</td></tr>`;
            }
        } catch(err) {
            console.error(err);
        }
    },

    addAvailability: async () => {
        const doctorId = document.getElementById('agenda-doc-id').value;
        const data = {
            work_date: document.getElementById('avail-date').value,
            start_time: document.getElementById('avail-start').value,
            end_time: document.getElementById('avail-end').value
        };

        if(!data.work_date || !data.start_time || !data.end_time) {
            alert('Preencha os dados do turno corretamente.');
            return;
        }

        try {
            await api.createDoctorAvailability(doctorId, data);
            docObj.loadAvailabilities(doctorId); // reload table
        } catch(err) {
            console.error(err);
            alert("Erro ao abrir agenda.");
        }
    },

    deleteAvailability: async (doctorId, availId) => {
        if(confirm('Remover este turno de disponibilidade?')) {
            try {
                await api.deleteDoctorAvailability(doctorId, availId);
                docObj.loadAvailabilities(doctorId);
            } catch(err) {
                console.error(err);
                alert("Erro ao excluir turno.");
            }
        }
    }
};

window.doc = docObj;
document.addEventListener('DOMContentLoaded', docObj.loadDoctors);
