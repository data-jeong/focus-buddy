-- Create focus_sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  duration INTEGER NOT NULL, -- Duration in minutes
  mode TEXT NOT NULL, -- pomodoro, deep, custom
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for user_id
CREATE INDEX idx_focus_sessions_user_id ON focus_sessions(user_id);

-- Create index for created_at for date-based queries
CREATE INDEX idx_focus_sessions_created_at ON focus_sessions(created_at);

-- Enable RLS
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own focus sessions" 
  ON focus_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus sessions" 
  ON focus_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions" 
  ON focus_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus sessions" 
  ON focus_sessions FOR DELETE 
  USING (auth.uid() = user_id);