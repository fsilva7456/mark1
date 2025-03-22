-- Create a function to set a project as default if it's the first one for a user
CREATE OR REPLACE FUNCTION set_first_project_as_default()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first project for this user
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE user_id = NEW.user_id AND id != NEW.id
  ) THEN
    -- If it is, set it as default
    NEW.is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on projects table for new projects
DROP TRIGGER IF EXISTS set_first_project_default_trigger ON projects;
CREATE TRIGGER set_first_project_default_trigger
BEFORE INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION set_first_project_as_default();

-- Function to ensure at least one default project exists per user
CREATE OR REPLACE FUNCTION ensure_default_project()
RETURNS TRIGGER AS $$
BEGIN
  -- If we're removing the default status from a project
  IF OLD.is_default = TRUE AND NEW.is_default = FALSE THEN
    -- Check if there are any other projects for this user
    IF EXISTS (
      SELECT 1 FROM projects 
      WHERE user_id = NEW.user_id AND id != NEW.id
    ) THEN
      -- If other projects exist, set the newest one as default
      UPDATE projects 
      SET is_default = TRUE 
      WHERE id = (
        SELECT id FROM projects 
        WHERE user_id = NEW.user_id AND id != NEW.id 
        ORDER BY created_at DESC 
        LIMIT 1
      );
    ELSE
      -- If this is the only project, don't allow removing default status
      NEW.is_default = TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure at least one default project
DROP TRIGGER IF EXISTS ensure_default_project_trigger ON projects;
CREATE TRIGGER ensure_default_project_trigger
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION ensure_default_project();

-- Function to handle project deletion
CREATE OR REPLACE FUNCTION handle_project_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- If we're deleting a default project
  IF OLD.is_default = TRUE THEN
    -- Set another project as default if one exists
    UPDATE projects 
    SET is_default = TRUE 
    WHERE id = (
      SELECT id FROM projects 
      WHERE user_id = OLD.user_id AND id != OLD.id 
      ORDER BY created_at DESC 
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project deletion
DROP TRIGGER IF EXISTS handle_project_deletion_trigger ON projects;
CREATE TRIGGER handle_project_deletion_trigger
BEFORE DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION handle_project_deletion(); 