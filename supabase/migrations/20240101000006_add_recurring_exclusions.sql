-- Add columns for managing recurring event exclusions
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS excluded_dates JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS recurrence_end TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_recurrence ON schedules(recurrence) WHERE recurrence IS NOT NULL AND recurrence != 'none';