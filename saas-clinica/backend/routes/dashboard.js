const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { unitScope } = require('../middleware/unit');

// authMiddleware já aplicado no server.js antes de rotear para cá
router.use(unitScope);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const unitFilter   = req.unitId !== null ? 'WHERE unit_id = $1' : '';
    const dateFilter   = req.unitId !== null
      ? 'WHERE unit_id = $1 AND DATE(appointment_date) = CURRENT_DATE'
      : 'WHERE DATE(appointment_date) = CURRENT_DATE';
    const params = req.unitId !== null ? [req.unitId] : [];

    const [patientsResult, todayResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM patients ${unitFilter}`, params),
      pool.query(`SELECT COUNT(*) FROM appointments ${dateFilter}`, params),
    ]);

    res.json({
      totalPatients:     parseInt(patientsResult.rows[0].count),
      todayAppointments: parseInt(todayResult.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
