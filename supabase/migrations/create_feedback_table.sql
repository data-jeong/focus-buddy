-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own feedback" 
  ON feedback FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
  ON feedback FOR SELECT 
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX feedback_user_id_idx ON feedback(user_id);
CREATE INDEX feedback_created_at_idx ON feedback(created_at DESC);