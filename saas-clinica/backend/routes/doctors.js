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
  const { name, specialty, email, phone } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO doctors (name, specialty, email, phone, unit_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, specialty || null, email || null, phone || null, req.unitId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar médico' });
  }
});

// PUT /api/doctors/:id
router.put('/:id', async (req, res) => {
  const { name, specialty, email, phone, active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  try {
    const unitCheck = req.unitId ? 'AND unit_id = $7' : '';
    const extraParams = req.unitId ? [req.unitId] : [];

    const result = await pool.query(
      `UPDATE doctors SET name=$1, specialty=$2, email=$3, phone=$4, active=$5
       WHERE id=$6 ${unitCheck}
       RETURNING *`,
      [name, specialty || null, email || null, phone || null,
       active !== undefined ? active : true, req.params.id, ...extraParams]
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
