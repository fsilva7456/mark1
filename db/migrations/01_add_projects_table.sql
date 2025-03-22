-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_default BOOLEAN DEFAULT false
);

-- Add indexes
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

-- Add project_id to strategies table
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects;

-- Add project_id to content_outlines table
ALTER TABLE content_outlines 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects;

-- Add project_id to calendars table
ALTER TABLE calendars 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects;

-- Add project_id to content_plans table
ALTER TABLE content_plans 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects;

-- Add project_id to calendar_posts table
ALTER TABLE calendar_posts 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects;

-- Create trigger function to update is_default flag
CREATE OR REPLACE FUNCTION update_project_default()
RETURNS TRIGGER AS $$
BEGIN
  -- If this project is marked as default, unset any other defaults for this user
  IF NEW.is_default = true THEN
    UPDATE projects 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS update_project_default_trigger ON projects;
CREATE TRIGGER update_project_default_trigger
BEFORE INSERT OR UPDATE OF is_default ON projects
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION update_project_default(); 