const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { unitScope, unitFilter, unitAnd } = require('../middleware/unit');

router.use(authMiddleware, unitScope);

// GET /api/patients
router.get('/', async (req, res) => {
  try {
    const { clause, params } = unitFilter(req.unitId);
    const result = await pool.query(
      `SELECT * FROM patients ${clause} ORDER BY name ASC`,
      params
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
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const idClause = clause
      ? `${clause} AND id = $${nextIdx}`
      : 'WHERE id = $1';
    const allParams = clause ? [...params, req.params.id] : [req.params.id];

    const result = await pool.query(
      `SELECT * FROM patients ${idClause}`,
      allParams
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
    const { clause, params, nextIdx } = unitFilter(req.unitId);
    const cpfClause = clause
      ? `${clause} AND cpf = $${nextIdx}`
      : 'WHERE cpf = $1';
    const allParams = clause ? [...params, cpf] : [cpf];

    const result = await pool.query(
      `SELECT * FROM patients ${cpfClause}`,
      allParams
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

  const unitId = req.unitId;

  try {
    const existing = await pool.query('SELECT id FROM patients WHERE cpf = $1', [cleanCpf]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }

    const result = await pool.query(
      `INSERT INTO patients (cpf, name, email, phone, birth_date, observations, unit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [cleanCpf, name, email || null, phone, birth_date, observations || null, unitId]
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
    // Verifica duplicata de CPF em outra linha (respeitando unidade)
    const existing = await pool.query(
      'SELECT id FROM patients WHERE cpf = $1 AND id != $2',
      [cleanCpf, req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'CPF já pertence a outro paciente' });
    }

    // Garante que o paciente pertence à unidade do usuário logado
    const unitCheck = req.unitId
      ? 'AND unit_id = $8'
      : '';
    const extraParams = req.unitId ? [req.unitId] : [];

    const result = await pool.query(
      `UPDATE patients SET cpf=$1, name=$2, email=$3, phone=$4, birth_date=$5, observations=$6
       WHERE id=$7 ${unitCheck}
       RETURNING *`,
      [cleanCpf, name, email || null, phone, birth_date, observations || null,
       req.params.id, ...extraParams]
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
    const unitCheck = req.unitId ? 'AND unit_id = $2' : '';
    const params = req.unitId
      ? [req.params.id, req.unitId]
      : [req.params.id];

    const result = await pool.query(
      `DELETE FROM patients WHERE id=$1 ${unitCheck} RETURNING id`,
      params
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
