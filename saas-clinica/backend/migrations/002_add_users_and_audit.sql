-- ============================================================
-- Migration 002: Sistema de usuários, auditoria e status falta
-- Execute após 001 (init.sql)
-- ============================================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'recepcao' CHECK (role IN ('admin', 'recepcao', 'medico')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Colunas de auditoria em agendamentos
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Atualiza constraint de status para incluir 'falta'
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('agendado', 'concluido', 'cancelado', 'falta'));

-- Índice de performance para usuários
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- Após executar esta migration, rode o seed para criar o admin:
--   cd backend && node seed.js
-- ============================================================
