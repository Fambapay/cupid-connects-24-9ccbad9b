-- 1) Admin whitelist by email
CREATE TABLE public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_emails TO authenticated;
GRANT ALL ON public.admin_emails TO service_role;

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to check if THEIR OWN email is admin (used by client gate)
CREATE POLICY admin_emails_select_self
  ON public.admin_emails
  FOR SELECT
  TO authenticated
  USING (email = (SELECT auth.jwt() ->> 'email'));

-- 2) Seed owner
INSERT INTO public.admin_emails(email) VALUES ('arnaldomeque33@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 3) Helper: is_admin(uid)
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.admin_emails ae
    JOIN auth.users u ON lower(u.email) = lower(ae.email)
    WHERE u.id = _uid
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 4) Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_id uuid,
  target_kind text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id);
CREATE INDEX audit_logs_target_idx ON public.audit_logs (target_id);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs from the client (optional fallback to server fn)
CREATE POLICY audit_logs_select_admin
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
