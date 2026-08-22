CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_session_id uuid NOT NULL UNIQUE,
  email text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoke_reason text
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON public.user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen
  ON public.user_sessions(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active
  ON public.user_sessions(user_id, revoked_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_user(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = target_user_id
      AND (
        coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin'
        OR coalesce(u.raw_user_meta_data ->> 'role', '') = 'admin'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read sessions" ON public.user_sessions;
CREATE POLICY "Users and admins can read sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert their own sessions"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and admins can update sessions" ON public.user_sessions;
CREATE POLICY "Users and admins can update sessions"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.upsert_current_session(
  p_user_agent text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_record_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user for session upsert';
  END IF;

  v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No session_id claim found in JWT';
  END IF;

  INSERT INTO public.user_sessions (
    user_id,
    auth_session_id,
    email,
    user_agent,
    last_seen_at
  )
  VALUES (
    v_user_id,
    v_session_id,
    NULLIF(trim(p_email), ''),
    NULLIF(trim(p_user_agent), ''),
    now()
  )
  ON CONFLICT (auth_session_id)
  DO UPDATE
  SET
    email = COALESCE(NULLIF(trim(EXCLUDED.email), ''), public.user_sessions.email),
    user_agent = COALESCE(NULLIF(trim(EXCLUDED.user_agent), ''), public.user_sessions.user_agent),
    last_seen_at = now()
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_current_session(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_user_session(
  p_session_record_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_target_user_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT user_id
  INTO v_target_user_id
  FROM public.user_sessions
  WHERE id = p_session_record_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Session record not found';
  END IF;

  IF v_target_user_id <> v_actor_id AND NOT public.is_admin_user(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorized to revoke this session';
  END IF;

  UPDATE public.user_sessions
  SET
    revoked_at = COALESCE(revoked_at, now()),
    revoked_by = v_actor_id,
    revoke_reason = COALESCE(NULLIF(trim(p_reason), ''), revoke_reason)
  WHERE id = p_session_record_id;

  RETURN p_session_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_session(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_rows integer := 0;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_user_id <> v_actor_id AND NOT public.is_admin_user(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorized to revoke sessions for this user';
  END IF;

  UPDATE public.user_sessions
  SET
    revoked_at = COALESCE(revoked_at, now()),
    revoked_by = v_actor_id,
    revoke_reason = COALESCE(NULLIF(trim(p_reason), ''), revoke_reason)
  WHERE user_id = p_target_user_id
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_all_user_sessions(uuid, text) TO authenticated;
