-- Create audit_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs (user_id);

-- Create index on action for filtering by action type
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at);

-- Add comment to the table
COMMENT ON TABLE public.audit_logs IS 'Tracks user actions for audit and analytics purposes';

-- Add comments to columns
COMMENT ON COLUMN public.audit_logs.action IS 'The type of action performed (e.g., view_marketing_dashboard, delete_strategy)';
COMMENT ON COLUMN public.audit_logs.details IS 'JSON blob with additional details about the action';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP address from which the action was performed (optional)';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'Browser/client information (optional)';

-- Set up RLS permissions
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to ensure users can only see their own audit logs
CREATE POLICY audit_logs_user_policy ON public.audit_logs
  USING (user_id = auth.uid());

-- Policy for admins to see all logs (commented out, enable if needed)
-- CREATE POLICY audit_logs_admin_policy ON public.audit_logs
--   USING (auth.role() = 'service_role'); 