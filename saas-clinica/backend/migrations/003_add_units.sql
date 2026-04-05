-- ============================================================
-- Migration 003: Sistema de unidades (multi-tenant)
-- Execute após 002_add_users_and_audit.sql
--   psql -U clinic_user -d clinic_saas -f migrations/003_add_units.sql
-- ============================================================

-- Tabela de unidades
CREATE TABLE IF NOT EXISTS units (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  address    VARCHAR(255),
  phone      VARCHAR(20),
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unidade padrão para migrar dados existentes
INSERT INTO units (name) VALUES ('Unidade Principal')
  ON CONFLICT DO NOTHING;

-- Adiciona unit_id nas tabelas de negócio
ALTER TABLE users        ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE patients     ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE doctors      ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;

-- Migra dados existentes para a unidade padrão
-- admin (super) fica com unit_id = NULL (acesso irrestrito)
UPDATE users        SET unit_id = 1 WHERE role != 'admin' AND unit_id IS NULL;
UPDATE patients     SET unit_id = 1 WHERE unit_id IS NULL;
UPDATE doctors      SET unit_id = 1 WHERE unit_id IS NULL;
UPDATE appointments SET unit_id = 1 WHERE unit_id IS NULL;

-- Adiciona nova role unit_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'unit_admin', 'recepcao', 'medico'));

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_units_active      ON units(active);
CREATE INDEX IF NOT EXISTS idx_users_unit        ON users(unit_id);
CREATE INDEX IF NOT EXISTS idx_patients_unit     ON patients(unit_id);
CREATE INDEX IF NOT EXISTS idx_doctors_unit      ON doctors(unit_id);
CREATE INDEX IF NOT EXISTS idx_appointments_unit ON appointments(unit_id);
