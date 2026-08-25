import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RECOVERY_COOLDOWN_MS = 60 * 1000;

const normalizeInput = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

const hasSuspiciousContent = (value: string) =>
  /<\s*script|javascript:|on\w+\s*=|--|\/\*|\*\/|;\s*(select|insert|update|delete|drop|union)\b/i.test(value);

const forgotPasswordSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? normalizeInput(value).toLowerCase() : value),
    z
      .string()
      .email("Enter a valid email address.")
      .max(254, "Email is too long.")
      .refine((value) => !/[\s<>\"'`]/.test(value), "Email contains invalid characters.")
      .refine((value) => !hasSuspiciousContent(value), "Email contains unsafe content."),
  ),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const saved = Number(localStorage.getItem("ff-forgot-password-cooldown-until") ?? "0");
    if (Number.isFinite(saved) && saved > Date.now()) {
      setCooldownUntil(saved);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    if (cooldownUntil > Date.now()) {
      const seconds = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
      toast.error(`Please wait ${seconds}s before requesting another recovery email.`);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast.error("Password reset is unavailable right now. Please contact support.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password?type=recovery`,
    });

    if (error) {
      const detail = error.message?.trim() || "Unknown error";
      toast.error(`Could not start password recovery: ${detail}`);

      if (/rate limit/i.test(detail)) {
        const nextCooldown = Date.now() + RECOVERY_COOLDOWN_MS;
        setCooldownUntil(nextCooldown);
        localStorage.setItem("ff-forgot-password-cooldown-until", String(nextCooldown));
      }
      return;
    }

    const nextCooldown = Date.now() + RECOVERY_COOLDOWN_MS;
    setCooldownUntil(nextCooldown);
    localStorage.setItem("ff-forgot-password-cooldown-until", String(nextCooldown));

    setIsSubmitted(true);
    toast.success("Recovery email sent. Check your inbox.");
  };

  const cooldownRemainingSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

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
                <ShieldCheck className="h-3.5 w-3.5" /> Email Recovery
              </div>
              <CardTitle className="font-display uppercase text-3xl text-navy">Reset Your Password</CardTitle>
              <CardDescription>
                Enter your account email and we will send a secure recovery link.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isSubmitted ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                  <p className="font-semibold flex items-center gap-2">
                    <MailCheck className="h-5 w-5" /> Recovery email sent
                  </p>
                  <p className="mt-2 text-sm">
                    Check your inbox and follow the link to choose a new password.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" {...register("email")} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || cooldownRemainingSeconds > 0}
                    className="w-full bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                  >
                    {isSubmitting
                      ? "Sending..."
                      : cooldownRemainingSeconds > 0
                        ? `Retry in ${cooldownRemainingSeconds}s`
                        : "Send Recovery Email"}
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

export default ForgotPassword;
