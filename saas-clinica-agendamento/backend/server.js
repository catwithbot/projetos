const express = require('express');
const cors = require('cors');
const path = require('path');

const patientsRouter = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');
const doctorsRouter = require('./routes/doctors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// For serving static frontend files later
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/doctors', doctorsRouter);

// Dashboard stats endpoint
app.get('/api/dashboard/stats', (req, res) => {
    const db = require('./db');
    
    // Get total patients
    db.get("SELECT COUNT(*) as totalPatients FROM patients", [], (err, ptRes) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Get today's appointments
        const today = new Date().toISOString().split('T')[0];
        db.get("SELECT COUNT(*) as todayAppointments FROM appointments WHERE appointment_date LIKE ?", [`${today}%`], (err, apRes) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                totalPatients: ptRes.totalPatients,
                todayAppointments: apRes.todayAppointments
            });
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
