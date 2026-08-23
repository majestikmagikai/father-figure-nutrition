import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react"; 
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import SignUp from "./pages/SignUp.tsx";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import Checkout from "./pages/Checkout.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import { RequireAdmin, RequireAuth } from "@/components/auth/RouteGuards";
import { startSessionRevocationMonitor } from "@/lib/sessionManager";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
};

const OAuthHashBridge = () => {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hasOAuthHash = hash.includes("access_token=") || hash.includes("refresh_token=");
    if (!hasOAuthHash) return;

    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const isRecoveryFlow = hashParams.get("type") === "recovery";
    const targetPath = isRecoveryFlow ? "/reset-password" : "/auth/callback";

    if (pathname === targetPath) return;

    navigate({ pathname: targetPath, hash }, { replace: true });
  }, [hash, navigate, pathname]);

  return null;
};

const OAuthCodeBridge = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const code = searchParams.get("code");
    if (!code) return;

    const isRecoveryFlow = searchParams.get("type") === "recovery" || hash.includes("type=recovery");
    const targetPath = isRecoveryFlow ? "/reset-password" : "/auth/callback";

    if (pathname === targetPath) return;

    navigate({ pathname: targetPath, search, hash }, { replace: true });
  }, [hash, navigate, pathname, search]);

  return null;
};

const StripeReturnBridge = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const isStripeReturn =
      params.has("payment_intent") ||
      params.has("payment_intent_client_secret") ||
      params.has("redirect_status");

    if (!isStripeReturn || pathname === "/checkout/success") return;

    navigate({ pathname: "/checkout/success", search, hash }, { replace: true });
  }, [hash, navigate, pathname, search]);

  return null;
};

const AppRoutes = () => {
  useEffect(() => {
    const cleanup = startSessionRevocationMonitor();
    return cleanup;
  }, []);

  return (
    <>
      <ScrollToTop />
      <OAuthHashBridge />
      <OAuthCodeBridge />
      <StripeReturnBridge />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/product/:handle" element={<ProductDetail />} /> 
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/signup" element={<SignUp />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/:section" element={<AdminDashboard />} />
          <Route path="/admin/:section/:productHandle" element={<AdminDashboard />} />
        </Route>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<PaymentSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-center" />
      <BrowserRouter basename="/">
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
