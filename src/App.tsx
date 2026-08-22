import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
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
import Dashboard from "./pages/Dashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import Checkout from "./pages/Checkout.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import { RequireAdmin, RequireAuth } from "@/components/auth/RouteGuards";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
};

const AppRoutes = () => (
  <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/product/:handle" element={<ProductDetail />} /> 
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
