const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { unitScope } = require('../middleware/unit');

router.use(authMiddleware, unitScope);

// GET /api/reports/appointments?doctor_id=&date_from=&date_to=&status=
router.get('/appointments', async (req, res) => {
  const { doctor_id, date_from, date_to, status } = req.query;

  const conditions = [];
  const params     = [];
  let i = 1;

  // Escopo de unidade sempre primeiro
  if (req.unitId !== null) { conditions.push(`a.unit_id = $${i++}`); params.push(req.unitId); }

  if (doctor_id) { conditions.push(`a.doctor_id = $${i++}`); params.push(doctor_id); }
  if (date_from) { conditions.push(`DATE(a.appointment_date) >= $${i++}`); params.push(date_from); }
  if (date_to)   { conditions.push(`DATE(a.appointment_date) <= $${i++}`); params.push(date_to); }
  if (status)    { conditions.push(`a.status = $${i++}`); params.push(status); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const result = await pool.query(`
      SELECT
        a.id, a.appointment_date, a.status, a.notes,
        a.created_at, a.updated_at,
        p.name  AS patient_name,
        p.cpf   AS patient_cpf,
        d.name  AS doctor_name,
        d.specialty AS doctor_specialty,
        u1.name AS created_by_name,
        u2.name AS updated_by_name
      FROM appointments a
      JOIN patients p  ON p.id  = a.patient_id
      JOIN doctors  d  ON d.id  = a.doctor_id
      LEFT JOIN users u1 ON u1.id = a.created_by
      LEFT JOIN users u2 ON u2.id = a.updated_by
      ${where}
      ORDER BY a.appointment_date DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar relatório de agendamentos' });
  }
});

// GET /api/reports/summary?doctor_id=&date_from=&date_to=
router.get('/summary', async (req, res) => {
  const { doctor_id, date_from, date_to } = req.query;

  const conditions = [];
  const params     = [];
  let i = 1;

  if (req.unitId !== null) { conditions.push(`a.unit_id = $${i++}`); params.push(req.unitId); }

  if (doctor_id) { conditions.push(`a.doctor_id = $${i++}`); params.push(doctor_id); }
  if (date_from) { conditions.push(`DATE(a.appointment_date) >= $${i++}`); params.push(date_from); }
  if (date_to)   { conditions.push(`DATE(a.appointment_date) <= $${i++}`); params.push(date_to); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const result = await pool.query(`
      SELECT
        d.id          AS doctor_id,
        d.name        AS doctor_name,
        d.specialty,
        COUNT(*)      AS total,
        SUM(CASE WHEN a.status = 'agendado'  THEN 1 ELSE 0 END) AS agendado,
        SUM(CASE WHEN a.status = 'concluido' THEN 1 ELSE 0 END) AS concluido,
        SUM(CASE WHEN a.status = 'cancelado' THEN 1 ELSE 0 END) AS cancelado,
        SUM(CASE WHEN a.status = 'falta'     THEN 1 ELSE 0 END) AS falta
      FROM appointments a
      JOIN doctors d ON d.id = a.doctor_id
      ${where}
      GROUP BY d.id, d.name, d.specialty
      ORDER BY d.name ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar resumo por médico' });
  }
});

module.exports = router;
