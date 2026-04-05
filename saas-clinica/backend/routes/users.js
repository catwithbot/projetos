const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const bcrypt  = require('bcryptjs');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Acesso: admin (tudo) e unit_admin (sua unidade)
router.use(authMiddleware, requireRole('admin', 'unit_admin'));

// ── Helpers de permissão ──────────────────────────────────────────────────────

const ROLES_BY_CREATOR = {
  admin:      ['admin', 'unit_admin', 'recepcao', 'medico'],
  unit_admin: ['recepcao', 'medico'],
};

function allowedRoles(creatorRole) {
  return ROLES_BY_CREATOR[creatorRole] || [];
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      // Super admin vê todos com nome da unidade
      result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.active, u.created_at,
                u.unit_id, un.name AS unit_name
         FROM users u
         LEFT JOIN units un ON un.id = u.unit_id
         ORDER BY u.name ASC`
      );
    } else {
      // unit_admin vê apenas usuários da sua unidade
      result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.active, u.created_at,
                u.unit_id, un.name AS unit_name
         FROM users u
         LEFT JOIN units un ON un.id = u.unit_id
         WHERE u.unit_id = $1
         ORDER BY u.name ASC`,
        [req.user.unit_id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  const { name, email, password, role, unit_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }

  // Valida role permitida para quem está criando
  const allowed = allowedRoles(req.user.role);
  const userRole = allowed.includes(role) ? role : null;
  if (!userRole) {
    return res.status(403).json({ error: `Você não pode criar usuários com o perfil "${role}"` });
  }

  // Determina unit_id do novo usuário
  let targetUnitId;
  if (req.user.role === 'admin') {
    // Admin pode escolher qualquer unidade; admin (super) pode ser null
    targetUnitId = userRole === 'admin' ? null : (unit_id || null);
    if (userRole !== 'admin' && !targetUnitId) {
      return res.status(400).json({ error: 'Selecione a unidade do usuário' });
    }
  } else {
    // unit_admin força a própria unidade
    targetUnitId = req.user.unit_id;
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, unit_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, active, created_at, unit_id`,
      [name.trim(), email.toLowerCase().trim(), hash, userRole, targetUnitId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  const { name, email, role, active, password, unit_id } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
  }

  // Busca usuário alvo para verificar permissão
  const target = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (target.rows.length === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  // unit_admin só pode editar usuários da própria unidade
  if (req.user.role === 'unit_admin' && target.rows[0].unit_id !== req.user.unit_id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const allowed = allowedRoles(req.user.role);
  const userRole = allowed.includes(role) ? role : target.rows[0].role;

  let targetUnitId;
  if (req.user.role === 'admin') {
    targetUnitId = userRole === 'admin' ? null : (unit_id ?? target.rows[0].unit_id);
  } else {
    targetUnitId = req.user.unit_id;
  }

  try {
    let result;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      result = await pool.query(
        `UPDATE users SET name=$1, email=$2, role=$3, active=$4, password_hash=$5, unit_id=$6
         WHERE id=$7
         RETURNING id, name, email, role, active, created_at, unit_id`,
        [name.trim(), email.toLowerCase().trim(), userRole,
         active !== undefined ? active : true, hash, targetUnitId, req.params.id]
      );
    } else {
      result = await pool.query(
        `UPDATE users SET name=$1, email=$2, role=$3, active=$4, unit_id=$5
         WHERE id=$6
         RETURNING id, name, email, role, active, created_at, unit_id`,
        [name.trim(), email.toLowerCase().trim(), userRole,
         active !== undefined ? active : true, targetUnitId, req.params.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
  }

  try {
    // unit_admin só pode deletar da própria unidade
    let result;
    if (req.user.role === 'unit_admin') {
      result = await pool.query(
        'DELETE FROM users WHERE id=$1 AND unit_id=$2 RETURNING id',
        [req.params.id, req.user.unit_id]
      );
    } else {
      result = await pool.query(
        'DELETE FROM users WHERE id=$1 RETURNING id',
        [req.params.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

module.exports = router;
