import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/auth";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Finalizing sign-in...");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setStatus("Authentication is unavailable right now.");
      return;
    }

    let isMounted = true;

    const finishSignIn = async () => {
      const urlHash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(urlHash);
      const authError = hashParams.get("error_description") ?? hashParams.get("error");

      if (authError) {
        toast.error("Google sign-in could not be completed.");
        if (isMounted) {
          setStatus("Google sign-in failed. Please try again.");
        }
        navigate("/login", { replace: true });
        return;
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
        const target = isAdminUser(sessionUser) ? "/admin" : "/dashboard";
        navigate(target, { replace: true });
        return;
      }

      // If session persistence is still catching up, listen once for auth change.
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted || !session?.user) return;
        const target = isAdminUser(session.user) ? "/admin" : "/dashboard";
        navigate(target, { replace: true });
      });

      window.setTimeout(() => {
        listener.subscription.unsubscribe();
        if (!isMounted) return;
        setStatus("Session not found. Please sign in again.");
        navigate("/login", { replace: true });
      }, 2500);
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