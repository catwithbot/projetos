const pts = {
    maskCpf: (input) => {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        input.value = v;
    },

    loadPatients: async () => {
        try {
            const res = await api.getPatients();
            const tbody = document.querySelector('#patients-table tbody');
            
            if (res.data && res.data.length > 0) {
                tbody.innerHTML = res.data.map(p => `
                    <tr>
                        <td style="color: var(--text-muted);">#${p.id}</td>
                        <td style="font-weight: 500; color: var(--text-main);">${p.name}</td>
                        <td style="font-size: 0.85rem; color: var(--text-muted);">${p.cpf || '-'}</td>
                        <td>
                            <div style="font-size: 0.875rem;">${p.email || '-'}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.phone || '-'}</div>
                        </td>
                        <td>${formatDates(p.dob)}</td>
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn-icon-only" onclick="window.pts.editPatient(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon-only danger" onclick="window.pts.deletePatient(${p.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum paciente cadastrado.</td></tr>`;
            }
        } catch (err) {
            console.error(err);
        }
    },

    openCreateModal: () => {
        document.getElementById('patient-form').reset();
        document.getElementById('pt-id').value = '';
        document.getElementById('modal-title').textContent = 'Novo Paciente';
        showModal('patient-modal');
    },

    editPatient: async (id) => {
        try {
            const res = await api.getPatient(id);
            const p = res.data;
            if (p) {
                document.getElementById('pt-id').value = p.id;
                document.getElementById('pt-cpf').value = p.cpf || '';
                document.getElementById('pt-name').value = p.name;
                document.getElementById('pt-email').value = p.email || '';
                document.getElementById('pt-phone').value = p.phone || '';
                document.getElementById('pt-dob').value = p.dob || '';
                document.getElementById('pt-notes').value = p.notes || '';
                
                document.getElementById('modal-title').textContent = 'Editar Paciente';
                showModal('patient-modal');
            }
        } catch(err) {
            console.error(err);
            alert("Erro ao buscar dados do paciente.");
        }
    },

    savePatient: async () => {
        const id = document.getElementById('pt-id').value;
        const data = {
            cpf: document.getElementById('pt-cpf').value,
            name: document.getElementById('pt-name').value,
            email: document.getElementById('pt-email').value,
            phone: document.getElementById('pt-phone').value,
            dob: document.getElementById('pt-dob').value,
            notes: document.getElementById('pt-notes').value
        };

        if(!data.cpf || data.cpf.length < 14) {
            alert('CPF é obrigatório e precisa estar completo (11 dígitos)!');
            return;
        }
        if(!api.validateCpf(data.cpf)) {
            alert('CPF inválido. Verifique os números digitados.');
            return;
        }
        if(!data.name) {
            alert('Nome é obrigatório!');
            return;
        }
        if(!data.phone) {
            alert('Telefone de contato é obrigatório!');
            return;
        }
        if(!data.dob) {
            alert('Data de Nascimento é obrigatória!');
            return;
        }

        try {
            let res;
            if (id) res = await api.updatePatient(id, data);
            else res = await api.createPatient(data);
            
            if(res && res.error) throw new Error(res.error);
            
            hideModal('patient-modal');
            pts.loadPatients(); // refresh data
        } catch(err) {
            console.error(err);
            alert("Erro ao salvar paciente: " + err.message);
        }
    },

    deletePatient: async (id) => {
        if(confirm('Tem certeza que deseja apagar este paciente? As consultas vinculadas também poderão ser afetadas.')) {
            try {
                const result = await api.deletePatient(id);
                if (result.error) throw new Error(result.error);
                pts.loadPatients();
            } catch(err) {
                console.error(err);
                alert("Erro ao excluir paciente: " + (err.message || 'Desconhecido'));
            }
        }
    }
};

window.pts = pts;
document.addEventListener('DOMContentLoaded', pts.loadPatients);
