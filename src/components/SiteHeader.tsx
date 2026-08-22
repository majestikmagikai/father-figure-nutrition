import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, Menu, ChevronDown } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/auth";
import { upsertOwnCustomerProfile } from "@/lib/adminData";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import logo from "@/assets/father-figure-logo-official-640.webp";
import favicon from "@/assets/favicon.webp";

const smoothScrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const start = window.scrollY;
  const target = el.getBoundingClientRect().top + start - 80;
  const distance = target - start;
  const duration = 2000;
  let startTime: number | null = null;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, start + distance * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

export const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        try {
          await upsertOwnCustomerProfile(nextUser);
        } catch {
          // Keep header behavior resilient even if profile sync fails.
        }
      }
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void upsertOwnCustomerProfile(nextUser).catch(() => {
          // Keep header behavior resilient even if profile sync fails.
        });
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const nav = [
    { href: "/", label: "Home" },
    { href: "/#shop", label: "Shop" },    
    { href: "/#bundle", label: "Bundle" },    
    { href: "/#apparel", label: "Apparel" },
    { href: "/#mission", label: "Mission" },
    { href: "/#partner", label: "Partners" },
    { href: "/#faq", label: "FAQ" },
  ];

  const accountRouteItems = user
    ? [
        ...(isAdminUser(user) ? [{ href: "/admin", label: "Admin" }] : []),
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [
        { href: "/login", label: "Login" },
        { href: "/signup", label: "Sign Up" },
      ];

  const handleSignOut = async () => {
    if (!supabase) return;

    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Could not sign out right now. Please try again.");
      setIsSigningOut(false);
      return;
    }

    toast.success("Signed out successfully.");
    window.location.assign("/login");
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all border-b-2 ${
        scrolled ? "bg-background/90 backdrop-blur-lg border-accent" : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-0 flex items-center justify-between gap-8 mb-4 mt-2">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Father Figure Men's Supplements" className="h-16 md:h-20 object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-10 text-sm font-medium">
          {nav.map((n) => {
            const hash = n.href.includes("#") ? n.href.split("#")[1] : null;
            return hash ? (
              <a
                key={n.href}
                href={n.href}
                onClick={(e) => { e.preventDefault(); smoothScrollTo(hash); }}
                className="relative text-navy hover:text-orange transition-colors uppercase tracking-wider text-[1.05rem] font-display group"
              >
                {n.label}
                <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-orange group-hover:w-full transition-all duration-300 ease-out rounded-full" />
              </a>
            ) : (
              <Link
                key={n.href}
                to={n.href}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="relative text-navy hover:text-orange transition-colors uppercase tracking-wider text-[1.05rem] font-display group"
              >
                {n.label}
                <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-orange group-hover:w-full transition-all duration-300 ease-out rounded-full" />
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative text-navy hover:text-orange transition-colors uppercase tracking-wider text-[1.05rem] font-display group inline-flex items-center gap-1"
              >
                Account
                <ChevronDown className="h-4 w-4" />
                <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-orange group-hover:w-full transition-all duration-300 ease-out rounded-full" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {accountRouteItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                  <Link
                    to={item.href}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="uppercase tracking-wide font-display cursor-pointer"
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {user && (
                <DropdownMenuItem
                  className="cursor-pointer uppercase tracking-wide font-display text-destructive"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                >
                  {isSigningOut ? "Signing Out..." : "Logout"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <CartButton />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={favicon} alt="Father Figure" className="h-7 w-7 object-contain" />
                  <span className="font-display uppercase tracking-wider">Father Figure</span>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-4">
                {nav.map((n) => {
                  const hash = n.href.includes("#") ? n.href.split("#")[1] : null;
                  return hash ? (
                    <a
                      key={n.href}
                      href={n.href}
                      onClick={(e) => { e.preventDefault(); setOpen(false); smoothScrollTo(hash); }}
                      className="text-xl font-display uppercase tracking-wide hover:text-primary"
                    >
                      {n.label}
                    </a>
                  ) : (
                    <Link
                      key={n.href}
                      to={n.href}
                      onClick={() => { setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="text-xl font-display uppercase tracking-wide hover:text-primary"
                    >
                      {n.label}
                    </Link>
                  );
                })}

                <Collapsible>
                  <CollapsibleTrigger className="text-xl font-display uppercase tracking-wide hover:text-primary inline-flex items-center justify-between w-full cursor-pointer">
                    Account
                    <ChevronDown className="h-5 w-5" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 pl-4 flex flex-col gap-3 border-l border-navy/15">
                    {accountRouteItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => { setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="text-base font-display uppercase tracking-wide text-navy/80 hover:text-primary cursor-pointer"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {user && (
                      <button
                        type="button"
                        disabled={isSigningOut}
                        onClick={() => { setOpen(false); void handleSignOut(); }}
                        className="text-base text-left font-display uppercase tracking-wide text-destructive hover:opacity-80 cursor-pointer disabled:opacity-50"
                      >
                        {isSigningOut ? "Signing Out..." : "Logout"}
                      </button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

const CartButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { items, updateQuantity, removeItem } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0,
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-border">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-gold text-primary font-bold border-2 border-background">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Your Cart</SheetTitle>
          <SheetDescription>
            {totalItems === 0
              ? "Your cart is empty"
              : `${totalItems} item${totalItems !== 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex gap-4 p-2 rounded-md bg-card">
                      <div className="w-16 h-16 bg-secondary/20 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={item.image.url}
                          alt={item.image.altText}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.title}</h4>
                        <p className="font-semibold text-primary">
                          {item.currencyCode} {parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 space-y-4 pt-4 border-t bg-background">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
                <Button
                  asChild
                  className="w-full bg-gradient-primary hover:opacity-95 shadow-cta"
                  size="lg"
                >
                  <Link to="/checkout" onClick={() => setIsOpen(false)}>Checkout</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
