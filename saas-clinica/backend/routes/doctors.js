const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { unitScope, unitFilter } = require('../middleware/unit');

router.use(authMiddleware, unitScope);

// GET /api/doctors
router.get('/', async (req, res) => {
  try {
    const { clause, params } = unitFilter(req.unitId);
    const result = await pool.query(
      `SELECT * FROM doctors ${clause} ORDER BY name ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar médicos' });
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  try {
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const idClause = clause
      ? `${clause} AND id = $${nextIdx}`
      : 'WHERE id = $1';
    const allParams = clause ? [...params, req.params.id] : [req.params.id];

    const result = await pool.query(`SELECT * FROM doctors ${idClause}`, allParams);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar médico' });
  }
});

// POST /api/doctors
router.post('/', async (req, res) => {
  const { name, specialty, email, phone, appointment_interval } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  const interval = parseInt(appointment_interval) || 30;

  try {
    const result = await pool.query(
      `INSERT INTO doctors (name, specialty, email, phone, unit_id, appointment_interval)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, specialty || null, email || null, phone || null, req.unitId, interval]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar médico' });
  }
});

// PUT /api/doctors/:id
router.put('/:id', async (req, res) => {
  const { name, specialty, email, phone, active, appointment_interval } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  const interval = parseInt(appointment_interval) || 30;

  try {
    const unitCheck = req.unitId ? 'AND unit_id = $8' : '';
    const extraParams = req.unitId ? [req.unitId] : [];

    const result = await pool.query(
      `UPDATE doctors SET name=$1, specialty=$2, email=$3, phone=$4, active=$5, appointment_interval=$6
       WHERE id=$7 ${unitCheck}
       RETURNING *`,
      [name, specialty || null, email || null, phone || null,
       active !== undefined ? active : true, interval, req.params.id, ...extraParams]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar médico' });
  }
});

// DELETE /api/doctors/:id
router.delete('/:id', async (req, res) => {
  try {
    const unitCheck = req.unitId ? 'AND unit_id = $2' : '';
    const params = req.unitId ? [req.params.id, req.unitId] : [req.params.id];

    const result = await pool.query(
      `DELETE FROM doctors WHERE id=$1 ${unitCheck} RETURNING id`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }
    res.json({ message: 'Médico removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover médico' });
  }
});

// GET /api/doctors/:id/available-slots?date=YYYY-MM-DD[&exclude_appointment_id=X]
router.get('/:id/available-slots', async (req, res) => {
  const { date, exclude_appointment_id } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Parâmetro date inválido (use YYYY-MM-DD)' });
  }

  try {
    // Confirm doctor belongs to user's unit
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const idClause = clause
      ? `${clause} AND id = $${nextIdx}`
      : 'WHERE id = $1';
    const docParams = clause ? [...params, req.params.id] : [req.params.id];

    const docResult = await pool.query(
      `SELECT id, unit_id, appointment_interval FROM doctors ${idClause}`,
      docParams
    );
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Use doctor's own interval (set per doctor); fall back to unit interval
    const interval = docResult.rows[0].appointment_interval || 30;

    // Get doctor's availability for that date
    const availResult = await pool.query(
      `SELECT start_time, end_time FROM doctor_availabilities
       WHERE doctor_id = $1 AND work_date = $2
       ORDER BY start_time ASC`,
      [req.params.id, date]
    );

    if (availResult.rows.length === 0) {
      return res.json({ slots: [], interval });
    }

    // Generate all slots from availability windows
    const allSlots = [];
    const seen = new Set();
    for (const avail of availResult.rows) {
      const [startH, startM] = avail.start_time.split(':').map(Number);
      const [endH,   endM]   = avail.end_time.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins   = endH   * 60 + endM;

      for (let t = startMins; t < endMins; t += interval) {
        const h = String(Math.floor(t / 60)).padStart(2, '0');
        const m = String(t % 60).padStart(2, '0');
        const slot = `${h}:${m}`;
        if (!seen.has(slot)) {
          seen.add(slot);
          allSlots.push(slot);
        }
      }
    }

    // Get occupied time slots (exclude current appointment if editing)
    let occupiedQuery = `
      SELECT appointment_date FROM appointments
      WHERE doctor_id = $1
        AND DATE(appointment_date) = $2
        AND status != 'cancelado'
    `;
    const occupiedParams = [req.params.id, date];
    if (exclude_appointment_id) {
      occupiedQuery += ` AND id != $3`;
      occupiedParams.push(exclude_appointment_id);
    }

    const occupiedResult = await pool.query(occupiedQuery, occupiedParams);
    const occupiedTimes = new Set(
      occupiedResult.rows.map(r =>
        String(r.appointment_date).replace(' ', 'T').slice(11, 16)
      )
    );

    const slots = allSlots.map(time => ({
      time,
      available: !occupiedTimes.has(time),
    }));

    res.json({ slots, interval });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
});

// GET /api/doctors/:id/availabilities
router.get('/:id/availabilities', async (req, res) => {
  try {
    // Confirma que o médico pertence à unidade antes de retornar disponibilidades
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const idClause = clause
      ? `${clause} AND id = $${nextIdx}`
      : 'WHERE id = $1';
    const docParams = clause ? [...params, req.params.id] : [req.params.id];

    const docCheck = await pool.query(`SELECT id FROM doctors ${idClause}`, docParams);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const result = await pool.query(
      `SELECT * FROM doctor_availabilities
       WHERE doctor_id=$1
       ORDER BY work_date ASC, start_time ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar disponibilidades' });
  }
});

// POST /api/doctors/:id/availabilities
router.post('/:id/availabilities', async (req, res) => {
  const { work_date, start_time, end_time } = req.body;

  if (!work_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Data, hora início e hora fim são obrigatórios' });
  }

  if (start_time >= end_time) {
    return res.status(400).json({ error: 'Hora início deve ser anterior à hora fim' });
  }

  try {
    // Confirma que o médico pertence à unidade
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const idClause = clause
      ? `${clause} AND id = $${nextIdx}`
      : 'WHERE id = $1';
    const docParams = clause ? [...params, req.params.id] : [req.params.id];

    const docCheck = await pool.query(`SELECT id FROM doctors ${idClause}`, docParams);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO doctor_availabilities (doctor_id, work_date, start_time, end_time)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, work_date, start_time, end_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar disponibilidade' });
  }
});

// GET /api/doctors/:id/availabilities-range?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:id/availabilities-range', async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'Parâmetros start e end são obrigatórios (YYYY-MM-DD)' });
  }

  try {
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const idClause = clause
      ? `${clause} AND id = $${nextIdx}`
      : 'WHERE id = $1';
    const docParams = clause ? [...params, req.params.id] : [req.params.id];

    const docCheck = await pool.query(`SELECT id FROM doctors ${idClause}`, docParams);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const result = await pool.query(
      `SELECT * FROM doctor_availabilities
       WHERE doctor_id = $1 AND work_date >= $2 AND work_date <= $3
       ORDER BY work_date ASC, start_time ASC`,
      [req.params.id, start, end]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar disponibilidades no período' });
  }
});

// DELETE /api/doctors/:id/availabilities/:avail_id
router.delete('/:id/availabilities/:avail_id', async (req, res) => {
  try {
    // Confirma que o médico pertence à unidade
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const idClause = clause
      ? `${clause} AND id = $${nextIdx}`
      : 'WHERE id = $1';
    const docParams = clause ? [...params, req.params.id] : [req.params.id];

    const docCheck = await pool.query(`SELECT id FROM doctors ${idClause}`, docParams);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const result = await pool.query(
      'DELETE FROM doctor_availabilities WHERE id=$1 AND doctor_id=$2 RETURNING id',
      [req.params.avail_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Disponibilidade não encontrada' });
    }
    res.json({ message: 'Disponibilidade removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover disponibilidade' });
  }
});

module.exports = router;
