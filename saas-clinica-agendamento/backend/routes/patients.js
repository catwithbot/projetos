const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all patients
router.get('/', (req, res) => {
    db.all("SELECT * FROM patients ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// GET single patient by ID
router.get('/:id', (req, res) => {
    db.get("SELECT * FROM patients WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: row });
    });
});

// GET patient by CPF
router.get('/cpf/:cpf', (req, res) => {
    // Only numbers to standardize
    const cleanCpf = req.params.cpf.replace(/\D/g, ''); 
    db.get("SELECT * FROM patients WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ? OR cpf = ?", [cleanCpf, req.params.cpf], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Patient not found" });
        res.json({ data: row });
    });
});

// POST new patient
router.post('/', (req, res) => {
    const { cpf, name, email, phone, dob, notes } = req.body;
    
    // Check for duplicate CPF
    db.get("SELECT id FROM patients WHERE cpf = ?", [cpf], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: "Este CPF já está cadastrado no sistema!" });

        db.run(
            `INSERT INTO patients (cpf, name, email, phone, dob, notes) VALUES (?, ?, ?, ?, ?, ?)`,
            [cpf, name, email, phone, dob, notes],
            function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({
                    message: "success",
                    data: { id: this.lastID, cpf, name, email, phone, dob, notes }
                });
            }
        );
    });
});

// PUT update patient
router.put('/:id', (req, res) => {
    const { cpf, name, email, phone, dob, notes } = req.body;
    
    // Check if CPF belongs to another user
    db.get("SELECT id FROM patients WHERE cpf = ? AND id != ?", [cpf, req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: "Este CPF já pertence a outro paciente cadastrado!" });

        db.run(
            `UPDATE patients set 
               cpf = COALESCE(?,cpf),
               name = COALESCE(?,name), 
               email = COALESCE(?,email),
               phone = COALESCE(?,phone),
               dob = COALESCE(?,dob),
               notes = COALESCE(?,notes)
               WHERE id = ?`,
            [cpf, name, email, phone, dob, notes, req.params.id],
            function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ message: "success" });
            }
        );
    });
});

// DELETE patient
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM patients WHERE id = ?", [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "success" });
    });
});

module.exports = router;
