import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/auth";
import { toast } from "sonner";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Finalizing sign-in...");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setStatus("Authentication is unavailable right now.");
      return;
    }

    let isMounted = true;
    let timedOut = false;

    const finishSignIn = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlHash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(urlHash);
      const code = searchParams.get("code");
      const authError = hashParams.get("error_description") ?? hashParams.get("error");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (authError) {
        toast.error("Google sign-in could not be completed.");
        if (isMounted) {
          setStatus("Google sign-in failed. Please try again.");
        }
        navigate("/login", { replace: true });
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!isMounted) return;

        if (exchangeError) {
          toast.error("Could not complete secure sign-in exchange.");
          setStatus("Sign-in exchange failed. Redirecting to login...");
          navigate("/login", { replace: true });
          return;
        }
      }

      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!isMounted) return;

        if (setSessionError) {
          toast.error("Could not establish session. Please try again.");
          setStatus("Session could not be established. Redirecting to login...");
          navigate("/login", { replace: true });
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        toast.error("Could not complete sign-in. Please try again.");
        setStatus("Sign-in failed. Redirecting to login...");
        navigate("/login", { replace: true });
        return;
      }

      const sessionUser = data.session?.user;
      if (sessionUser) {
        window.history.replaceState(null, "", "/auth/callback");
        const target = isAdminUser(sessionUser) ? "/admin" : "/dashboard";
        navigate(target, { replace: true });
        return;
      }

      // If session persistence is still catching up, listen and poll for a few seconds.
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted || timedOut || !session?.user) return;
        window.history.replaceState(null, "", "/auth/callback");
        const target = isAdminUser(session.user) ? "/admin" : "/dashboard";
        navigate(target, { replace: true });
      });

      for (let attempt = 0; attempt < 16; attempt += 1) {
        if (!isMounted) {
          listener.subscription.unsubscribe();
          return;
        }

        const { data: polledData } = await supabase.auth.getSession();
        const user = polledData.session?.user;
        if (user) {
          listener.subscription.unsubscribe();
          window.history.replaceState(null, "", "/auth/callback");
          const target = isAdminUser(user) ? "/admin" : "/dashboard";
          navigate(target, { replace: true });
          return;
        }

        await wait(500);
      }

      timedOut = true;
      listener.subscription.unsubscribe();
      if (!isMounted) return;
      setStatus("Session not found. Please sign in again.");
      navigate("/login", { replace: true });
    };

    void finishSignIn();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-xl mx-auto">
          <Card className="border-navy/15 shadow-card bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display uppercase text-2xl text-navy">Signing You In</CardTitle>
              <CardDescription>{status}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-navy/70">
                If this page does not continue, go to <Link to="/login" className="text-orange underline">login</Link>.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default AuthCallback;