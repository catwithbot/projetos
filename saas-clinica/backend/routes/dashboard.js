const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [patientsResult, todayResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM patients'),
      pool.query(`
        SELECT COUNT(*) FROM appointments
        WHERE DATE(appointment_date) = CURRENT_DATE
      `)
    ]);

    res.json({
      totalPatients: parseInt(patientsResult.rows[0].count),
      todayAppointments: parseInt(todayResult.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
