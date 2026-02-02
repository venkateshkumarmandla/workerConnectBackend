
-- Migration to add hours columns to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS gross_hours DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS effective_hours DECIMAL(10,2) DEFAULT 0;

-- Optional: Update existing records to have 0 hours if they are null
UPDATE attendance SET gross_hours = 0 WHERE gross_hours IS NULL;
UPDATE attendance SET effective_hours = 0 WHERE effective_hours IS NULL;
