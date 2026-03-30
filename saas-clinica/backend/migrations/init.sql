-- Criação do banco de dados (execute como superusuário se necessário)
-- CREATE DATABASE clinic_saas;

-- Tabela de pacientes
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(11) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  birth_date DATE NOT NULL,
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de médicos
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de disponibilidades dos médicos
CREATE TABLE IF NOT EXISTS doctor_availabilities (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'agendado' CHECK (status IN ('agendado', 'concluido', 'cancelado')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_avail_doctor ON doctor_availabilities(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_avail_date ON doctor_availabilities(work_date);
