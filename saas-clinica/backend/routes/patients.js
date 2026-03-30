const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/patients
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM patients ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar pacientes' });
  }
});

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM patients WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// GET /api/patients/cpf/:cpf
router.get('/cpf/:cpf', async (req, res) => {
  try {
    const cpf = req.params.cpf.replace(/\D/g, '');
    const result = await pool.query(
      'SELECT * FROM patients WHERE cpf = $1',
      [cpf]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar paciente por CPF' });
  }
});

// POST /api/patients
router.post('/', async (req, res) => {
  const { cpf, name, email, phone, birth_date, observations } = req.body;

  if (!cpf || !name || !phone || !birth_date) {
    return res.status(400).json({ error: 'CPF, nome, telefone e data de nascimento são obrigatórios' });
  }

  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido' });
  }

  try {
    const existing = await pool.query('SELECT id FROM patients WHERE cpf = $1', [cleanCpf]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }

    const result = await pool.query(
      `INSERT INTO patients (cpf, name, email, phone, birth_date, observations)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [cleanCpf, name, email || null, phone, birth_date, observations || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar paciente' });
  }
});

// PUT /api/patients/:id
router.put('/:id', async (req, res) => {
  const { cpf, name, email, phone, birth_date, observations } = req.body;

  if (!cpf || !name || !phone || !birth_date) {
    return res.status(400).json({ error: 'CPF, nome, telefone e data de nascimento são obrigatórios' });
  }

  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM patients WHERE cpf = $1 AND id != $2',
      [cleanCpf, req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'CPF já pertence a outro paciente' });
    }

    const result = await pool.query(
      `UPDATE patients SET cpf=$1, name=$2, email=$3, phone=$4, birth_date=$5, observations=$6
       WHERE id=$7 RETURNING *`,
      [cleanCpf, name, email || null, phone, birth_date, observations || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM patients WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    res.json({ message: 'Paciente removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover paciente' });
  }
});

module.exports = router;
