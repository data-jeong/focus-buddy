-- Add recurrence column to schedules table
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly'));

-- Update existing rows to have 'none' as default
UPDATE schedules 
SET recurrence = 'none' 
WHERE recurrence IS NULL;