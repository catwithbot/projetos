/**
 * seed.js – Cria o usuário administrador padrão
 *
 * Execute APÓS rodar a migration 002:
 *   node seed.js
 *
 * Credenciais geradas: admin@clinica.com / admin123
 */

const bcrypt = require('bcryptjs');
const pool   = require('./db');

async function seed() {
  const hash = await bcrypt.hash('admin123', 10);

  const result = await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, 'admin')
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
  console.error('Erro ao criar usuário:', err.message);
  process.exit(1);
});
