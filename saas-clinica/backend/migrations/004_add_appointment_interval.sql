-- 004: Add appointment_interval column to units table
-- Controls the time slot spacing (in minutes) for scheduling in each unit
ALTER TABLE units ADD COLUMN IF NOT EXISTS appointment_interval INT NOT NULL DEFAULT 30;
