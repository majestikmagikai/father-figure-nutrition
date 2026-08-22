import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const normalizeInput = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

const sanitizePlainText = (value: string) => normalizeInput(value).replace(/[<>]/g, "");

const hasSuspiciousContent = (value: string) =>
  /<\s*script|javascript:|on\w+\s*=|--|\/\*|\*\/|;\s*(select|insert|update|delete|drop|union)\b/i.test(value);

type AttemptState = {
  count: number;
  firstAttemptAt: number;
};

const signUpSchema = z
  .object({
    firstName: z.preprocess(
      (value) => (typeof value === "string" ? sanitizePlainText(value) : value),
      z
        .string()
        .min(2, "First name must be at least 2 characters.")
        .max(50, "First name is too long.")
        .regex(/^[\p{L}][\p{L}\s'-]*$/u, "First name contains invalid characters.")
        .refine((value) => !hasSuspiciousContent(value), "First name contains unsafe content."),
    ),
    lastName: z.preprocess(
      (value) => (typeof value === "string" ? sanitizePlainText(value) : value),
      z
        .string()
        .min(2, "Last name must be at least 2 characters.")
        .max(50, "Last name is too long.")
        .regex(/^[\p{L}][\p{L}\s'-]*$/u, "Last name contains invalid characters.")
        .refine((value) => !hasSuspiciousContent(value), "Last name contains unsafe content."),
    ),
    email: z.preprocess(
      (value) => (typeof value === "string" ? normalizeInput(value).toLowerCase() : value),
      z
        .string()
        .email("Enter a valid email address.")
        .max(254, "Email is too long.")
        .refine((value) => !/[\s<>"'`]/.test(value), "Email contains invalid characters."),
    ),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[0-9]/, "Password must include a number.")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character.")
      .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), "Password contains invalid control characters."),
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine((value) => value, {
      message: "You must accept the terms to create an account.",
    }),
    website: z.preprocess(
      (value) => (typeof value === "string" ? normalizeInput(value) : value),
      z.string().max(0),
    ).optional(),
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

type SignUpFormValues = z.infer<typeof signUpSchema>;

const getAttemptState = (): AttemptState => {
  const raw = localStorage.getItem("signup-attempt-state");
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
  localStorage.setItem("signup-attempt-state", JSON.stringify(state));
};

const resetAttemptState = () => {
  localStorage.removeItem("signup-attempt-state");
};

const passwordRules = [
  "12+ characters",
  "At least one uppercase letter",
  "At least one lowercase letter",
  "At least one number",
  "At least one special character",
];

const SignUp = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      website: "",
    },
    mode: "onBlur",
  });

  const termsAccepted = watch("termsAccepted");

  const lockoutRemainingMs = useMemo(() => {
    const state = getAttemptState();
    if (state.count < MAX_ATTEMPTS) return 0;

    const elapsed = Date.now() - state.firstAttemptAt;
    const remaining = ATTEMPT_WINDOW_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  }, [isSubmitting]);

  const onSubmit = async (values: SignUpFormValues) => {
    if (values.website) {
      // Honeypot: bots will usually fill hidden fields.
      setIsSubmitted(true);
      return;
    }

    const attempts = getAttemptState();
    if (attempts.count >= MAX_ATTEMPTS) {
      const remainingMinutes = Math.ceil(lockoutRemainingMs / 60000);
      toast.error(`Too many attempts. Please wait ${remainingMinutes} minute(s) and try again.`);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast.error("Account creation is unavailable right now. Please contact support.");
      return;
    }

    const nextAttempts: AttemptState = {
      count: attempts.count + 1,
      firstAttemptAt: attempts.count === 0 ? Date.now() : attempts.firstAttemptAt,
    };
    setAttemptState(nextAttempts);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
      },
    });

    if (error) {
      toast.error("We could not create your account. Please verify your details and try again.");
      return;
    }

    resetAttemptState();
    setIsSubmitted(true);
    toast.success("Account created. Check your email to verify your address.");
  };

  const handleGoogleSignUp = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Google sign up is unavailable right now. Please contact support.");
      return;
    }

    setIsGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error("Google sign up could not be started. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors mb-8 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <Card className="border-navy/15 shadow-card bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-4 w-fit">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure Registration
              </div>
              <CardTitle className="font-display uppercase text-3xl text-navy">Create Your Account</CardTitle>
              <CardDescription>
                Build your customer account with secure credentials and verify your email before checkout.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isSubmitted ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                  <p className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Registration started
                  </p>
                  <p className="mt-2 text-sm">
                    Check your email for the verification link to finish setting up your account.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={isSubmitting || isGoogleLoading}
                    onClick={handleGoogleSignUp}
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

                  <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register("website")} />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
                      {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
                      {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" {...register("email")} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                    <ul className="text-xs text-navy/60 grid sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
                      {passwordRules.map((rule) => (
                        <li key={rule}>- {rule}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                  </div>

                  <div className="flex items-start gap-3 rounded-md border border-navy/15 p-3">
                    <Checkbox
                      id="termsAccepted"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setValue("termsAccepted", checked === true, { shouldValidate: true })}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="termsAccepted" className="cursor-pointer leading-5">
                        I agree to the terms and privacy policy.
                      </Label>
                      {errors.termsAccepted && <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || isGoogleLoading || lockoutRemainingMs > 0}
                    className="w-full bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                  >
                    {isSubmitting
                      ? "Creating account..."
                      : lockoutRemainingMs > 0
                        ? `Try again in ${Math.ceil(lockoutRemainingMs / 60000)}m`
                        : "Create Account"}
                  </Button>

                  <p className="text-sm text-center text-navy/70">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-orange hover:opacity-80">
                      Sign in
                    </Link>
                  </p>
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

export default SignUp;
