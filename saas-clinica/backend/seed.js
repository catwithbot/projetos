/**
 * seed.js – Cria a unidade padrão e o usuário administrador
 *
 * Execute APÓS rodar todas as migrations:
 *   node seed.js
 *
 * Credenciais geradas: admin@clinica.com / admin123
 * ⚠ Troque a senha após o primeiro login!
 */

const bcrypt = require('bcryptjs');
const pool   = require('./db');

async function seed() {
  // Garante que a unidade padrão existe (idempotente)
  await pool.query(`
    INSERT INTO units (id, name) VALUES (1, 'Unidade Principal')
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✔ Unidade Principal garantida (id=1)');

  // Cria usuário admin (super admin — unit_id NULL)
  const hash = await bcrypt.hash('admin123', 10);
  const result = await pool.query(`
    INSERT INTO users (name, email, password_hash, role, unit_id)
    VALUES ($1, $2, $3, 'admin', NULL)
    ON CONFLICT (email) DO NOTHING
    RETURNING email
  `, ['Administrador', 'admin@clinica.com', hash]);

  if (result.rows.length > 0) {
    console.log('✔ Usuário admin criado:');
    console.log('  E-mail : admin@clinica.com');
    console.log('  Senha  : admin123');
    console.log('  ⚠ Troque a senha após o primeiro login!');
  } else {
    console.log('ℹ Usuário admin@clinica.com já existe, nada alterado.');
  }

  await pool.end();
}

seed().catch(err => {
  console.error('Erro ao executar seed:', err.message);
  process.exit(1);
});
