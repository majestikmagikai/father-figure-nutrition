DROP POLICY IF EXISTS "Users and admins can delete sessions" ON public.user_sessions;
CREATE POLICY "Users and admins can delete sessions"
  ON public.user_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));