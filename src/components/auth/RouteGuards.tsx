import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/auth";

type GuardState = {
  isLoading: boolean;
  user: User | null;
};

const useAuthGuardState = (): GuardState => {
  const [state, setState] = useState<GuardState>({ isLoading: true, user: null });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState({ isLoading: false, user: null });
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setState({ isLoading: false, user: data.session?.user ?? null });
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setState({ isLoading: false, user: session?.user ?? null });
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
};

const GuardLoading = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-navy/70">
    Checking secure session...
  </div>
);

export const RequireAuth = () => {
  const { isLoading, user } = useAuthGuardState();

  if (isLoading) return <GuardLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export const RequireAdmin = () => {
  const { isLoading, user } = useAuthGuardState();

  if (isLoading) return <GuardLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdminUser(user)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};
