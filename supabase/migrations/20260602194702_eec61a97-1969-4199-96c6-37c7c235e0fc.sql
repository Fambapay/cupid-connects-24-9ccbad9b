CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  selfie_path text NOT NULL,
  pose_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  ai_score numeric,
  ai_reason text,
  ai_raw jsonb,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_select_own"
ON public.verification_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_verification_requests_user ON public.verification_requests(user_id, created_at DESC);
