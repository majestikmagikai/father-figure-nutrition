import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/auth";
import { toast } from "sonner";

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const normalizeInput = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

const hasSuspiciousContent = (value: string) =>
  /<\s*script|javascript:|on\w+\s*=|--|\/\*|\*\/|;\s*(select|insert|update|delete|drop|union)\b/i.test(value);

type AttemptState = {
  count: number;
  firstAttemptAt: number;
};

const loginSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? normalizeInput(value).toLowerCase() : value),
    z
      .string()
      .email("Enter a valid email address.")
      .max(254, "Email is too long.")
      .refine((value) => !/[\s<>"'`]/.test(value), "Email contains invalid characters.")
      .refine((value) => !hasSuspiciousContent(value), "Email contains unsafe content."),
  ),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password is too long.")
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), "Password contains invalid control characters."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const getAttemptState = (): AttemptState => {
  const raw = localStorage.getItem("login-attempt-state");
  if (!raw) return { count: 0, firstAttemptAt: Date.now() };

  try {
    const parsed = JSON.parse(raw) as AttemptState;
    if (!parsed.firstAttemptAt || Date.now() - parsed.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      return { count: 0, firstAttemptAt: Date.now() };
    }

    return parsed;
  } catch {
    return { count: 0, firstAttemptAt: Date.now() };
  }
};

const setAttemptState = (state: AttemptState) => {
  localStorage.setItem("login-attempt-state", JSON.stringify(state));
};

const resetAttemptState = () => {
  localStorage.removeItem("login-attempt-state");
};

const Login = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const lockoutRemainingMs = useMemo(() => {
    const state = getAttemptState();
    if (state.count < MAX_ATTEMPTS) return 0;

    const elapsed = Date.now() - state.firstAttemptAt;
    const remaining = ATTEMPT_WINDOW_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  }, [isSubmitting]);

  const onSubmit = async (values: LoginFormValues) => {
    const attempts = getAttemptState();
    if (attempts.count >= MAX_ATTEMPTS) {
      const remainingMinutes = Math.ceil(lockoutRemainingMs / 60000);
      toast.error(`Too many attempts. Please wait ${remainingMinutes} minute(s) and try again.`);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast.error("Login is unavailable right now. Please contact support.");
      return;
    }

    const nextAttempts: AttemptState = {
      count: attempts.count + 1,
      firstAttemptAt: attempts.count === 0 ? Date.now() : attempts.firstAttemptAt,
    };
    setAttemptState(nextAttempts);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error("Invalid login credentials. Please try again.");
      return;
    }

    resetAttemptState();
    toast.success("Signed in successfully.");
    const target = isAdminUser(data.user) ? "/admin" : "/dashboard";
    const returnTo = sessionStorage.getItem('returnTo');
    sessionStorage.removeItem('returnTo');
    window.location.assign(returnTo || target);
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Google login is unavailable right now. Please contact support.");
      return;
    }

    setIsGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error("Google login could not be started. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors mb-8 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <Card className="border-navy/15 shadow-card bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-4 w-fit">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure Login
              </div>
              <CardTitle className="font-display uppercase text-3xl text-navy">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your account to continue checkout and manage your profile.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isSubmitting || isGoogleLoading}
                  onClick={handleGoogleLogin}
                  className="w-full border-navy/20 bg-white hover:bg-navy/5 text-navy font-display uppercase tracking-wider"
                >
                  {isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-navy/15" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-navy/40">
                    <span className="bg-white px-3">or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" {...register("email")} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>

                <p className="text-sm text-right">
                  <Link to="/forgot-password" className="font-semibold text-orange hover:opacity-80">
                    Forgot password?
                  </Link>
                </p>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || isGoogleLoading || lockoutRemainingMs > 0}
                  className="w-full bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                >
                  {isSubmitting
                    ? "Signing in..."
                    : lockoutRemainingMs > 0
                      ? `Try again in ${Math.ceil(lockoutRemainingMs / 60000)}m`
                      : "Sign In"}
                </Button>

                <p className="text-sm text-center text-navy/70">
                  Need an account?{" "}
                  <Link to="/signup" className="font-semibold text-orange hover:opacity-80">
                    Create one
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Login;
