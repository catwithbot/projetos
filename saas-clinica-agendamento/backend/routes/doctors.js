const express = require('express');
const router = express.Router();
const db = require('../db');

// --- DOCTOR CRUD ---

// GET all doctors
router.get('/', (req, res) => {
    db.all("SELECT * FROM doctors ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET single doctor
router.get('/:id', (req, res) => {
    db.get("SELECT * FROM doctors WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: row });
    });
});

// POST new doctor
router.post('/', (req, res) => {
    const { name, specialty, email, phone } = req.body;
    db.run(
        `INSERT INTO doctors (name, specialty, email, phone) VALUES (?, ?, ?, ?)`,
        [name, specialty, email, phone],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: "success",
                data: { id: this.lastID, name, specialty }
            });
        }
    );
});

// PUT update doctor
router.put('/:id', (req, res) => {
    const { name, specialty, email, phone } = req.body;
    db.run(
        `UPDATE doctors set 
           name = COALESCE(?,name), 
           specialty = COALESCE(?,specialty),
           email = COALESCE(?,email),
           phone = COALESCE(?,phone)
           WHERE id = ?`,
        [name, specialty, email, phone, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "success" });
        }
    );
});

// DELETE doctor
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM doctors WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success" });
    });
});

// --- AVAILABILITY (AGENDA) ENDPOINTS ---

// GET availabilities for a doctor
router.get('/:id/availabilities', (req, res) => {
    db.all("SELECT * FROM doctor_availabilities WHERE doctor_id = ? ORDER BY work_date, start_time ASC", 
        [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// POST open new availability block
router.post('/:id/availabilities', (req, res) => {
    const { work_date, start_time, end_time } = req.body;
    const doctor_id = req.params.id;
    // Basic validation
    if (!work_date || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required fields: work_date, start_time, end_time" });
    }

    db.run(
        `INSERT INTO doctor_availabilities (doctor_id, work_date, start_time, end_time) VALUES (?, ?, ?, ?)`,
        [doctor_id, work_date, start_time, end_time],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: "success",
                data: { id: this.lastID, doctor_id, work_date, start_time, end_time }
            });
        }
    );
});

// DELETE an availability block
router.delete('/:id/availabilities/:avail_id', (req, res) => {
    db.run("DELETE FROM doctor_availabilities WHERE id = ? AND doctor_id = ?", 
        [req.params.avail_id, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success" });
    });
});

module.exports = router;
