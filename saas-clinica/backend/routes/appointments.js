const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Query base com joins de auditoria
const BASE_SELECT = `
  SELECT
    a.id, a.appointment_date, a.status, a.notes,
    a.created_at, a.updated_at,
    p.id   AS patient_id,  p.name AS patient_name,  p.cpf AS patient_cpf,
    d.id   AS doctor_id,   d.name AS doctor_name,   d.specialty AS doctor_specialty,
    u1.name AS created_by_name,
    u2.name AS updated_by_name
  FROM appointments a
  JOIN patients p  ON p.id  = a.patient_id
  JOIN doctors  d  ON d.id  = a.doctor_id
  LEFT JOIN users u1 ON u1.id = a.created_by
  LEFT JOIN users u2 ON u2.id = a.updated_by
`;

// GET /api/appointments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(BASE_SELECT + ' ORDER BY a.appointment_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

// GET /api/appointments/today
router.get('/today', async (req, res) => {
  try {
    const result = await pool.query(
      BASE_SELECT + ' WHERE DATE(a.appointment_date) = CURRENT_DATE ORDER BY a.appointment_date ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar consultas de hoje' });
  }
});

// POST /api/appointments
router.post('/', async (req, res) => {
  const { cpf, name, phone, birth_date, doctor_id, appointment_date, notes } = req.body;

  if (!cpf || !doctor_id || !appointment_date) {
    return res.status(400).json({ error: 'CPF, médico e data/hora são obrigatórios' });
  }

  const cleanCpf = cpf.replace(/\D/g, '');

  try {
    const apptDate = new Date(appointment_date);
    const apptDateStr = apptDate.toISOString().split('T')[0];
    const apptTimeStr = apptDate.toTimeString().slice(0, 5);

    // Verificar disponibilidade do médico
    const availResult = await pool.query(`
      SELECT id FROM doctor_availabilities
      WHERE doctor_id = $1
        AND work_date = $2
        AND start_time <= $3
        AND end_time > $3
    `, [doctor_id, apptDateStr, apptTimeStr]);

    if (availResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Médico não possui agenda disponível para esta data e horário'
      });
    }

    // Verificar conflito com agendamento existente (mesmo médico, mesmo horário)
    const conflictResult = await pool.query(`
      SELECT id FROM appointments
      WHERE doctor_id = $1
        AND appointment_date = $2
        AND status != 'cancelado'
    `, [doctor_id, appointment_date]);

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Este médico já possui um agendamento neste horário'
      });
    }

    // Buscar ou criar paciente
    let patientId;
    const patientResult = await pool.query('SELECT id FROM patients WHERE cpf=$1', [cleanCpf]);

    if (patientResult.rows.length > 0) {
      patientId = patientResult.rows[0].id;
    } else {
      if (!name || !phone || !birth_date) {
        return res.status(400).json({
          error: 'Paciente não encontrado. Informe nome, telefone e data de nascimento para cadastrá-lo'
        });
      }
      const newPatient = await pool.query(
        'INSERT INTO patients (cpf, name, phone, birth_date) VALUES ($1, $2, $3, $4) RETURNING id',
        [cleanCpf, name, phone, birth_date]
      );
      patientId = newPatient.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, notes, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [patientId, doctor_id, appointment_date, notes || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// PUT /api/appointments/:id/status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['agendado', 'concluido', 'cancelado', 'falta'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  try {
    const result = await pool.query(
      `UPDATE appointments SET status=$1, updated_by=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [status, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// PUT /api/appointments/:id/reschedule
router.put('/:id/reschedule', async (req, res) => {
  const { doctor_id, appointment_date, notes } = req.body;

  if (!doctor_id || !appointment_date) {
    return res.status(400).json({ error: 'Médico e data/hora são obrigatórios' });
  }

  try {
    const apptDate = new Date(appointment_date);
    const apptDateStr = apptDate.toISOString().split('T')[0];
    const apptTimeStr = apptDate.toTimeString().slice(0, 5);

    // Verificar disponibilidade do médico
    const availResult = await pool.query(`
      SELECT id FROM doctor_availabilities
      WHERE doctor_id = $1
        AND work_date = $2
        AND start_time <= $3
        AND end_time > $3
    `, [doctor_id, apptDateStr, apptTimeStr]);

    if (availResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Médico não possui agenda disponível para esta data e horário'
      });
    }

    // Verificar conflito com outros agendamentos (excluindo o atual)
    const conflictResult = await pool.query(`
      SELECT id FROM appointments
      WHERE doctor_id = $1
        AND appointment_date = $2
        AND status != 'cancelado'
        AND id != $3
    `, [doctor_id, appointment_date, req.params.id]);

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Este médico já possui um agendamento neste horário'
      });
    }

    const current = await pool.query('SELECT notes FROM appointments WHERE id=$1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const finalNotes = notes !== undefined ? notes : current.rows[0].notes;

    const result = await pool.query(
      `UPDATE appointments
       SET doctor_id=$1, appointment_date=$2, notes=$3, updated_by=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [doctor_id, appointment_date, finalNotes, req.user.id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reagendar consulta' });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM appointments WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json({ message: 'Agendamento removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
});

module.exports = router;
