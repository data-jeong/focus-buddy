-- Add time tracking columns to todos table
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0, -- Total time spent in seconds
ADD COLUMN IF NOT EXISTS last_session_time INTEGER DEFAULT 0, -- Last session time in seconds
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0, -- Number of focus sessions
ADD COLUMN IF NOT EXISTS last_worked_at TIMESTAMPTZ; -- Last time worked on this task

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_todos_last_worked_at ON todos(last_worked_at DESC);