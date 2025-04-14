-- First, check if table exists and create it if not
CREATE TABLE IF NOT EXISTS public.website_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content TEXT,
  services JSONB,
  last_analyzed TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Make sure RLS is enabled
ALTER TABLE public.website_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own website data" ON public.website_data;
DROP POLICY IF EXISTS "Users can insert their own website data" ON public.website_data;
DROP POLICY IF EXISTS "Users can update their own website data" ON public.website_data;

-- Create policies
CREATE POLICY "Users can view their own website data"
  ON public.website_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own website data"
  ON public.website_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own website data"
  ON public.website_data
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add policy for deletion
CREATE POLICY "Users can delete their own website data"
  ON public.website_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add policy for using with upsert operations
CREATE POLICY "Users can upsert their own website data"
  ON public.website_data 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Make sure the user has access to the table
GRANT ALL ON public.website_data TO authenticated;
GRANT ALL ON public.website_data TO service_role; 