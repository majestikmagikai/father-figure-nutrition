import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[0-9]/, "Password must include a number.")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character.")
      .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), "Password contains invalid control characters."),
    confirmPassword: z.string(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsReady(false);
      return;
    }

    let isMounted = true;

    const checkRecoverySession = async () => {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams((location.hash || "").replace(/^#/, ""));
      const code = searchParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!isMounted) return;

        if (error) {
          toast.error("Recovery link is invalid or expired. Request a new reset email.");
          navigate("/forgot-password", { replace: true });
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!isMounted) return;

        if (error) {
          toast.error("Recovery link is invalid or expired. Request a new reset email.");
          navigate("/forgot-password", { replace: true });
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session) {
        toast.error("Recovery link is invalid or expired. Request a new reset email.");
        navigate("/forgot-password", { replace: true });
        return;
      }

      setIsReady(true);
    };

    checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [location.hash, location.search, navigate]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!supabase) return;

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error("Could not reset password. Please request a new recovery link.");
      return;
    }

    setIsComplete(true);
    toast.success("Password updated successfully.");

    window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-xl mx-auto">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors mb-8 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          <Card className="border-navy/15 shadow-card bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-4 w-fit">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure Password Reset
              </div>
              <CardTitle className="font-display uppercase text-3xl text-navy">Choose a New Password</CardTitle>
              <CardDescription>
                Set a strong new password for your account.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isComplete ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                  <p className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Password updated
                  </p>
                  <p className="mt-2 text-sm">Redirecting to login...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={!isReady || isSubmitting}
                    className="w-full bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                  >
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ResetPassword;
