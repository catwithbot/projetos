let calendar = null;
let currentAppointments = [];
let loadedDoctors = [];

const apps = {
    maskCpf: (input) => {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        input.value = v;
    },

    checkPatientCpf: async () => {
        const cpfInput = document.getElementById('app-cpf').value;
        const statusEl = document.getElementById('app-cpf-status');
        const newFields = document.getElementById('app-new-patient-fields');
        const displayField = document.getElementById('app-patient-name-display');
        const nameReadonly = document.getElementById('app-patient-name-readonly');
        const patientIdInput = document.getElementById('app-patient-id');

        if(cpfInput.length < 14) {
            statusEl.textContent = "Digite um CPF completo.";
            return;
        }
        
        if(!api.validateCpf(cpfInput)) {
            statusEl.textContent = "CPF matematicamente inválido.";
            statusEl.style.color = "red";
            newFields.style.display = 'none';
            displayField.style.display = 'none';
            return;
        }

        try {
            statusEl.textContent = "Buscando paciente...";
            statusEl.style.color = "var(--primary)";
            const res = await api.getPatientByCpf(cpfInput);
            
            if(res && res.data) {
                // Patient Found
                patientIdInput.value = res.data.id;
                newFields.style.display = 'none';
                displayField.style.display = 'block';
                nameReadonly.value = res.data.name;
                statusEl.textContent = "Paciente cadastrado localizado.";
                statusEl.style.color = "var(--text-muted)";
            } else {
                // Not found
                patientIdInput.value = "";
                newFields.style.display = 'block';
                displayField.style.display = 'none';
                statusEl.textContent = "Novo paciente. Por favor, preencha os dados.";
                statusEl.style.color = "#f59e0b";
            }
        } catch(err) {
            console.error(err);
        }
    },

    initCalendar: () => {
        const calendarEl = document.getElementById('calendar');
        if(!calendarEl) return;

        calendar = new FullCalendar.Calendar(calendarEl, {
            schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
            initialView: 'resourceTimeGridDay',
            locale: 'pt-br',
            timeZone: 'local',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth'
            },
            buttonText: {
                today: 'Hoje',
                resourceTimeGridDay: 'Múltipla',
                timeGridWeek: 'Semana',
                dayGridMonth: 'Mês',
            },
            slotMinTime: '07:00:00',
            slotMaxTime: '21:00:00',
            slotDuration: '00:15:00',
            slotEventOverlap: false, // Prevents close appointments from overlapping weirdly
            eventMinHeight: 60,      // Ensures UI cards don't squish too much
            allDaySlot: false,
            editable: false,      // Drag Drop DISABLED
            droppable: false,
            resources: [],        
            events: [],           
            
            eventContent: function (arg) {
                let note = arg.event.extendedProps.notes ? `<i class="fas fa-file-medical"></i> ` : '';
                let cpf = arg.event.extendedProps.patient_cpf || '';
                if(cpf) cpf = `CPF: ${cpf.slice(0,3)}.***.***-${cpf.slice(-2)} `;

                return {
                    html: `
                        <div style="padding: 4px 6px; border-left: 4px solid ${arg.event.backgroundColor}; 
                                    background-color: var(--surface); color: var(--text-main); 
                                    height: 100%; border-radius: 0 4px 4px 0; display:flex; flex-direction:column; gap:2px;
                                    box-shadow: var(--shadow-sm);" 
                             title="Detalhes: ${arg.event.title}\nStatus: ${arg.event.extendedProps.status.toUpperCase()}">
                            <div style="font-weight: 600; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${arg.event.title}
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-muted); display:flex; gap:4px; align-items:center; flex-wrap: wrap;">
                                <span>${note}${cpf}</span> <span style="text-transform: capitalize; background: rgba(0,0,0,0.1); padding: 1px 4px; border-radius: 4px;">${arg.event.extendedProps.status}</span>
                            </div>
                        </div>
                    `
                };
            },
            
            dateClick: (info) => {
                apps.openCreateModal(info.dateStr, info.resource ? info.resource.id : null);
            },
            
            eventClick: (info) => {
                const id = info.event.extendedProps.appointment_id;
                apps.openEditModal(id);
            }
        });
        calendar.render();
    },

    loadContext: async () => {
        try {
            const resDocs = await api.getDoctors();
            if (resDocs.data) {
                loadedDoctors = resDocs.data;
                const selectDoc = document.getElementById('app-doctor');
                let docOpts = '<option value="">Selecione o médico...</option>';
                docOpts += loadedDoctors.map(d => `<option value="${d.id}">${d.name} (${d.specialty || 'Geral'})</option>`).join('');
                selectDoc.innerHTML = docOpts;

                const filtersContainer = document.getElementById('doctor-filters');
                filtersContainer.innerHTML = loadedDoctors.map(d => `
                    <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.875rem; cursor: pointer;">
                        <input type="checkbox" data-docid="${d.id}" checked onchange="window.apps.updateResourcesFilter()">
                        ${d.name}
                    </label>
                `).join('');

                apps.updateResourcesFilter(); 
            }
        } catch (err) { console.error(err); }
        
        apps.loadAppointments();
    },

    updateResourcesFilter: () => {
        if(!calendar) return;
        const checkboxes = document.querySelectorAll('#doctor-filters input[type="checkbox"]');
        const activeIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => String(cb.dataset.docid));

        const activeResources = loadedDoctors
            .filter(d => activeIds.includes(String(d.id)))
            .map(d => ({
                id: d.id,
                title: d.name
            }));

        const currentResources = calendar.getResources();
        currentResources.forEach(r => r.remove());
        activeResources.forEach(r => calendar.addResource(r));
    },

    loadAppointments: async () => {
        try {
            const res = await api.getAppointments();
            const tbody = document.querySelector('#appointments-table tbody');
            
            if (res.data) {
                currentAppointments = res.data;
                
                if(currentAppointments.length > 0) {
                    tbody.innerHTML = currentAppointments.map(a => {
                        const dateObj = new Date(a.appointment_date);
                        const formattedDate = dateObj.toLocaleDateString('pt-BR');
                        const formattedTime = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        
                        return `
                        <tr>
                            <td style="font-weight: 500;">
                                ${formattedDate} 
                                <span style="color: var(--text-muted); font-weight: normal;">às ${formattedTime}</span>
                            </td>
                            <td>
                                <div style="font-weight: 500; color: var(--text-main);">${a.patient_name || 'Paciente excluído'}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${a.patient_cpf || ''}</div>
                            </td>
                            <td>${a.doctor_name}</td>
                            <td>
                                <select class="form-control badge ${a.status.toLowerCase()}" style="width: auto; padding: 0.2rem 1rem 0.2rem 0.5rem; text-transform: capitalize;" onchange="window.apps.updateStatus(${a.id}, this.value)">
                                    <option value="agendado" ${a.status === 'agendado' ? 'selected' : ''}>Agendado</option>
                                    <option value="concluido" ${a.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                                    <option value="cancelado" ${a.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                                </select>
                            </td>
                            <td style="text-align: right; white-space: nowrap;">
                                <button class="btn-icon-only" onclick="window.apps.openEditModal(${a.id})" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon-only danger" onclick="window.apps.deleteAppointment(${a.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `}).join('');
                } else {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum agendamento encontrado.</td></tr>`;
                }

                if(calendar) {
                    calendar.removeAllEvents();
                    const events = currentAppointments.map(a => {
                        let color = '#3b82f6';
                        if(a.status === 'agendado') color = '#f59e0b';
                        if(a.status === 'concluido') color = '#10b981';
                        if(a.status === 'cancelado') color = '#ef4444';

                        return {
                            id: String(a.id),
                            resourceId: String(a.doctor_id),
                            title: `${a.patient_name}`,
                            start: a.appointment_date,
                            backgroundColor: color,
                            borderColor: 'transparent',
                            textColor: 'var(--text-main)',
                            allDay: false,
                            extendedProps: { 
                                appointment_id: a.id,
                                status: a.status,
                                notes: a.notes || '',
                                patient_cpf: a.patient_cpf
                            }
                        };
                    });
                    calendar.addEventSource(events);
                }
            }
        } catch (err) {
            console.error(err);
        }
    },

    openCreateModal: (suggestedDateStr = null, suggestedDoctorId = null) => {
        document.getElementById('app-form').reset();
        document.getElementById('app-appointment-id').value = "";
        document.getElementById('app-patient-id').value = "";
        document.getElementById('app-cpf').readOnly = false;
        document.getElementById('app-cpf-status').textContent = "";
        document.getElementById('app-new-patient-fields').style.display = 'none';
        document.getElementById('app-patient-name-display').style.display = 'none';
        
        document.getElementById('app-modal-title').innerText = "Novo Agendamento";
        document.getElementById('app-btn-save').innerText = "Confirmar Encaixe";
        document.getElementById('app-btn-save').setAttribute('onclick', 'window.apps.saveAppointment()');
        document.getElementById('app-btn-delete').style.display = 'none';
        
        // Unblock fields
        document.getElementById('app-doctor').disabled = false;
        document.getElementById('app-datetime').disabled = false;
        document.getElementById('app-notes').disabled = false;

        let targetDate = new Date();
        if(suggestedDateStr) {
            targetDate = new Date(suggestedDateStr);
            if(suggestedDateStr.length <= 10) targetDate.setHours(8, 0, 0); 
        } else {
            // Safe default time when clicking top header button to avoid 3AM invalid availability errors.
            targetDate.setHours(8, 0, 0);
        }

        const offset = targetDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(targetDate - offset)).toISOString().slice(0, 16);
        
        document.getElementById('app-datetime').value = localISOTime;
        if(suggestedDoctorId) {
            document.getElementById('app-doctor').value = suggestedDoctorId;
        }

        showModal('app-modal');
    },

    openEditModal: (id) => {
        const app = currentAppointments.find(a => a.id === id);
        if(!app) return;

        document.getElementById('app-form').reset();
        document.getElementById('app-appointment-id').value = app.id;
        document.getElementById('app-patient-id').value = app.patient_id;
        
        document.getElementById('app-cpf').value = app.patient_cpf || '';
        document.getElementById('app-cpf').readOnly = true;
        document.getElementById('app-cpf-status').textContent = "Consulta existente.";
        
        document.getElementById('app-new-patient-fields').style.display = 'none';
        document.getElementById('app-patient-name-display').style.display = 'block';
        document.getElementById('app-patient-name-readonly').value = app.patient_name;

        document.getElementById('app-doctor').value = app.doctor_id;
        document.getElementById('app-datetime').value = app.appointment_date;
        document.getElementById('app-notes').value = app.notes || '';
        
        document.getElementById('app-modal-title').innerText = "Detalhes e Reagendamento";
        document.getElementById('app-btn-save').innerText = "Salvar Alterações";
        document.getElementById('app-btn-save').setAttribute('onclick', 'window.apps.updateAppointment()');
        document.getElementById('app-btn-delete').style.display = 'inline-flex';

        showModal('app-modal');
    },

    deleteFromModal: () => {
        const id = document.getElementById('app-appointment-id').value;
        if(id) {
            apps.deleteAppointment(id);
            hideModal('app-modal');
        }
    },

    saveAppointment: async () => {
        const cpf = document.getElementById('app-cpf').value;
        let patient_id = document.getElementById('app-patient-id').value;

        if(!patient_id && cpf.length === 14) {
            // Need to create patient first
            const name = document.getElementById('app-patient-name').value;
            if(!name) return alert("Para novo paciente, o Nome é obrigatório!");
            const phone = document.getElementById('app-patient-phone').value;
            const dob = document.getElementById('app-patient-dob').value;
            try {
                const res = await api.createPatient({cpf, name, phone, dob});
                if(res && res.error) throw new Error(res.error);
                patient_id = res.data.id;
            } catch(e) {
                return alert("Erro ao criar paciente: " + e.message);
            }
        } else if (!patient_id) {
            return alert("CPF Invalido ou incompleto.");
        }

        const data = {
            patient_id: patient_id,
            doctor_id: document.getElementById('app-doctor').value,
            appointment_date: document.getElementById('app-datetime').value,
            notes: document.getElementById('app-notes').value,
            status: 'agendado'
        };

        if(!data.doctor_id || !data.appointment_date) {
            return alert('Médico e Data/Hora são obrigatórios!');
        }

        try {
            await api.createAppointment(data);
            hideModal('app-modal');
            apps.loadAppointments();
        } catch(err) {
            console.error(err);
            alert("Erro: " + err.message);
        }
    },

    updateAppointment: async () => {
        const appId = document.getElementById('app-appointment-id').value;
        const newDoc = document.getElementById('app-doctor').value;
        const newDate = document.getElementById('app-datetime').value;
        const newNotes = document.getElementById('app-notes').value;
        
        try {
            // Reschedule and updates notes
            const result = await api.rescheduleAppointment(appId, { appointment_date: newDate, doctor_id: newDoc, notes: newNotes });
            if (result && result.error) throw new Error(result.error);

            hideModal('app-modal');
            apps.loadAppointments();
        } catch(err) {
            console.error(err);
            alert("Erro: " + err.message);
        }
    },

    updateStatus: async (id, status) => {
        try {
            await api.updateAppointmentStatus(id, status);
            apps.loadAppointments();
        } catch(err) {
            apps.loadAppointments(); 
        }
    },

    deleteAppointment: async (id) => {
        if(confirm('Tem certeza que deseja apagar este agendamento?')) {
            try {
                const result = await api.deleteAppointment(id);
                if (result.error) throw new Error(result.error);
                apps.loadAppointments();
            } catch(err) {
                console.error(err);
                alert("Erro ao excluir agendamento: " + (err.message || "Desconhecido"));
            }
        }
    },

    switchView: (viewName) => {
        document.getElementById('list-view').style.display = viewName === 'list' ? 'block' : 'none';
        document.getElementById('calendar-view').style.display = viewName === 'calendar' ? 'flex' : 'none';

        if(viewName === 'list') {
            document.getElementById('btn-view-list').className = 'btn btn-primary';
            document.getElementById('btn-view-cal').className = 'btn btn-outline';
        } else {
            document.getElementById('btn-view-list').className = 'btn btn-outline';
            document.getElementById('btn-view-cal').className = 'btn btn-primary';
            if(calendar) calendar.render(); 
        }
    }
};

window.apps = apps;
document.addEventListener('DOMContentLoaded', () => {
    apps.initCalendar();
    apps.loadContext(); 
});
