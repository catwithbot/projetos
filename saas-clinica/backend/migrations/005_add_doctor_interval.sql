-- 005: Add appointment_interval to doctors table
-- Each doctor can have their own slot duration (in minutes), overriding the unit default
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS appointment_interval INT NOT NULL DEFAULT 30;
