const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Apenas super admin gerencia unidades
router.use(authMiddleware, requireRole('admin'));

// GET /api/units
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, COUNT(usr.id) AS user_count
       FROM units u
       LEFT JOIN users usr ON usr.unit_id = u.id
       GROUP BY u.id
       ORDER BY u.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar unidades' });
  }
});

// GET /api/units/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM units WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar unidade' });
  }
});

// POST /api/units
router.post('/', async (req, res) => {
  const { name, address, phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da unidade é obrigatório' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO units (name, address, phone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), address?.trim() || null, phone?.trim() || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar unidade' });
  }
});

// PUT /api/units/:id
router.put('/:id', async (req, res) => {
  const { name, address, phone, active, appointment_interval } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da unidade é obrigatório' });
  }

  const validIntervals = [10, 15, 20, 30, 45, 60];
  const interval = appointment_interval !== undefined
    ? parseInt(appointment_interval, 10)
    : 30;

  if (!validIntervals.includes(interval)) {
    return res.status(400).json({ error: 'Intervalo de agendamento inválido. Use: 10, 15, 20, 30, 45 ou 60 minutos' });
  }

  try {
    const result = await pool.query(
      `UPDATE units SET name=$1, address=$2, phone=$3, active=$4, appointment_interval=$5
       WHERE id=$6
       RETURNING *`,
      [
        name.trim(),
        address?.trim() || null,
        phone?.trim() || null,
        active !== undefined ? active : true,
        interval,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar unidade' });
  }
});

// DELETE /api/units/:id — desativa em vez de deletar fisicamente
router.delete('/:id', async (req, res) => {
  try {
    // Verifica se há usuários ativos vinculados
    const users = await pool.query(
      'SELECT COUNT(*) FROM users WHERE unit_id = $1 AND active = true',
      [req.params.id]
    );
    if (parseInt(users.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Não é possível desativar uma unidade com usuários ativos. Desative os usuários primeiro.',
      });
    }

    const result = await pool.query(
      'UPDATE units SET active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }
    res.json({ message: 'Unidade desativada com sucesso', unit: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao desativar unidade' });
  }
});

module.exports = router;
