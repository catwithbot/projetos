const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to pad numbers with zero
const padZero = (num) => String(num).padStart(2, '0');

// GET all appointments
router.get('/', (req, res) => {
    const query = `
        SELECT a.*, p.name as patient_name, p.cpf as patient_cpf, d.name as doctor_name 
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        ORDER BY a.appointment_date ASC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET today's appointments
router.get('/today', (req, res) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const query = `
        SELECT a.*, p.name as patient_name, p.cpf as patient_cpf, d.name as doctor_name 
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.appointment_date LIKE ?
        ORDER BY a.appointment_date ASC
    `;
    db.all(query, [`${todayStr}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// POST new appointment
router.post('/', (req, res) => {
    const { patient_id, doctor_id, appointment_date, status, notes } = req.body;

    // 1. Validate if doctor has open availability for this specific day and time.
    // Assuming appointment_date is in "YYYY-MM-DDTHH:mm" format.
    const dateObj = new Date(appointment_date);
    if(isNaN(dateObj)) {
         return res.status(400).json({ error: "Data do agendamento inválida." });
    }

    const yyyy = dateObj.getFullYear();
    const mm = padZero(dateObj.getMonth() + 1);
    const dd = padZero(dateObj.getDate());
    const work_date = `${yyyy}-${mm}-${dd}`;
    
    // HH:MM string
    const timeStr = `${padZero(dateObj.getHours())}:${padZero(dateObj.getMinutes())}`;

    const checkQuery = `
        SELECT * FROM doctor_availabilities 
        WHERE doctor_id = ? AND work_date = ? 
        AND start_time <= ? AND end_time >= ?
    `;

    db.get(checkQuery, [doctor_id, work_date, timeStr, timeStr], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (!row) {
            // No matching availability found!
            return res.status(400).json({ 
                error: `O médico selecionado não possui agenda aberta para ${work_date} às ${timeStr}.` 
            });
        }

        // 2. If valid, proceed with insert
        db.run(
            `INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?, ?, ?, ?, ?)`,
            [patient_id, doctor_id, appointment_date, status || 'agendado', notes],
            function (insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({
                    message: "success",
                    data: { id: this.lastID, patient_id, doctor_id, appointment_date }
                });
            }
        );
    });
});

// DELETE appointment
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM appointments WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success" });
    });
});

// UPDATE appointment status
router.put('/:id/status', (req, res) => {
    const { status } = req.body;
    db.run("UPDATE appointments SET status = ? WHERE id = ?", [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success" });
    });
});

// RESCHEDULE appointment (Drag and Drop support)
router.put('/:id/reschedule', (req, res) => {
    const { appointment_date, doctor_id, notes } = req.body;
    db.run("UPDATE appointments SET appointment_date = ?, doctor_id = ?, notes = COALESCE(?,notes) WHERE id = ?", 
        [appointment_date, doctor_id, notes, req.params.id], 
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "success" });
    });
});

module.exports = router;
