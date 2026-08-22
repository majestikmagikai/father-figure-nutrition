import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock, ClipboardList, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isAdminUser } from "@/lib/auth";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type OrderRecord = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRecord = Database["public"]["Tables"]["order_items"]["Row"];
type RoutineRecord = Database["public"]["Tables"]["customer_routines"]["Row"];

const ROUTINE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const normalizeRoutineSchedule = (schedule: unknown): { time: string; days: string[] } => {
  const fallback = { time: "08:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] };
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) return fallback;

  const record = schedule as { time?: unknown; days?: unknown };
  const time = typeof record.time === "string" && /^\d{2}:\d{2}$/.test(record.time) ? record.time : fallback.time;
  const days = Array.isArray(record.days)
    ? record.days.filter((day): day is string => typeof day === "string" && ROUTINE_DAYS.includes(day))
    : fallback.days;

  return {
    time,
    days: days.length > 0 ? days : fallback.days,
  };
};

const Dashboard = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [orderItemsByOrderId, setOrderItemsByOrderId] = useState<Record<string, OrderItemRecord[]>>({});
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [isSavingRoutineId, setIsSavingRoutineId] = useState<string | null>(null);
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineNotes, setNewRoutineNotes] = useState("");
  const [newRoutineTime, setNewRoutineTime] = useState("08:00");
  const [newRoutineDays, setNewRoutineDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    const syncUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
    };

    syncUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user?.email) {
      setOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    let isMounted = true;

    const loadOrders = async () => {
      setIsLoadingOrders(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .ilike("customer_email", user.email?.trim() ?? "")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        toast.error("Could not load your orders.");
        setOrders([]);
        setOrderItemsByOrderId({});
      } else {
        const nextOrders = data ?? [];
        setOrders(nextOrders);

        if (nextOrders.length === 0) {
          setOrderItemsByOrderId({});
        } else {
          const orderIds = nextOrders.map((order) => order.id);
          const { data: itemsData } = await supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderIds)
            .order("created_at", { ascending: true });

          const grouped = (itemsData ?? []).reduce<Record<string, OrderItemRecord[]>>((acc, item) => {
            acc[item.order_id] ||= [];
            acc[item.order_id].push(item);
            return acc;
          }, {});

          setOrderItemsByOrderId(grouped);
        }
      }

      setIsLoadingOrders(false);
    };

    void loadOrders();

    const interval = window.setInterval(() => {
      void loadOrders();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [user?.email]);

  useEffect(() => {
    if (!supabase || !user?.id) {
      setRoutines([]);
      setIsLoadingRoutines(false);
      return;
    }

    let isMounted = true;

    const loadRoutines = async () => {
      setIsLoadingRoutines(true);
      const { data, error } = await supabase
        .from("customer_routines")
        .select("*")
        .eq("customer_id", user.id)
        .order("updated_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        toast.error("Could not load your routines.");
        setRoutines([]);
      } else {
        setRoutines(data ?? []);
      }

      setIsLoadingRoutines(false);
    };

    void loadRoutines();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const toggleNewRoutineDay = (day: string) => {
    setNewRoutineDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const toggleRoutineDay = (routineId: string, day: string) => {
    setRoutines((prev) =>
      prev.map((routine) => {
        if (routine.id !== routineId) return routine;
        const schedule = normalizeRoutineSchedule(routine.schedule);
        const days = schedule.days.includes(day)
          ? schedule.days.filter((d) => d !== day)
          : [...schedule.days, day];
        return {
          ...routine,
          schedule: {
            ...schedule,
            days,
          },
        };
      }),
    );
  };

  const handleCreateRoutine = async () => {
    if (!supabase || !user?.id) return;

    const name = newRoutineName.trim();
    const notes = newRoutineNotes.trim();
    if (name.length < 2) {
      toast.error("Routine name must be at least 2 characters.");
      return;
    }
    if (newRoutineDays.length === 0) {
      toast.error("Select at least one day.");
      return;
    }

    setIsCreatingRoutine(true);
    const { data, error } = await supabase
      .from("customer_routines")
      .insert({
        customer_id: user.id,
        name,
        notes: notes || null,
        is_active: true,
        schedule: {
          time: newRoutineTime,
          days: newRoutineDays,
        },
      })
      .select("*")
      .single();

    setIsCreatingRoutine(false);

    if (error) {
      toast.error("Could not create routine.");
      return;
    }

    setRoutines((prev) => [data, ...prev]);
    setNewRoutineName("");
    setNewRoutineNotes("");
    setNewRoutineTime("08:00");
    setNewRoutineDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    toast.success("Routine created.");
  };

  const handleSaveRoutine = async (routine: RoutineRecord) => {
    if (!supabase || !user?.id) return;

    const name = routine.name.trim();
    const notes = (routine.notes ?? "").trim();
    const schedule = normalizeRoutineSchedule(routine.schedule);

    if (name.length < 2) {
      toast.error("Routine name must be at least 2 characters.");
      return;
    }
    if (schedule.days.length === 0) {
      toast.error("Select at least one day.");
      return;
    }

    setIsSavingRoutineId(routine.id);
    const { error } = await supabase
      .from("customer_routines")
      .update({
        name,
        notes: notes || null,
        is_active: routine.is_active,
        schedule,
      })
      .eq("id", routine.id)
      .eq("customer_id", user.id);

    setIsSavingRoutineId(null);

    if (error) {
      toast.error("Could not save routine.");
      return;
    }

    toast.success("Routine saved.");
  };

  const handleDeleteRoutine = async (routine: RoutineRecord) => {
    if (!supabase || !user?.id) return;

    const accepted = window.confirm(`Delete routine \"${routine.name}\"?`);
    if (!accepted) return;

    setIsSavingRoutineId(routine.id);
    const { error } = await supabase
      .from("customer_routines")
      .delete()
      .eq("id", routine.id)
      .eq("customer_id", user.id);

    setIsSavingRoutineId(null);

    if (error) {
      toast.error("Could not delete routine.");
      return;
    }

    setRoutines((prev) => prev.filter((r) => r.id !== routine.id));
    toast.success("Routine deleted.");
  };

  const displayName = useMemo(() => {
    const first = user?.user_metadata?.first_name as string | undefined;
    const last = user?.user_metadata?.last_name as string | undefined;
    const full = [first, last].filter(Boolean).join(" ").trim();
    return full || user?.email || "Customer";
  }, [user]);

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
    <div className="min-h-screen flex flex-col">       
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            {user && (
              <div className="flex items-center gap-2 flex-wrap">
                {isAdminUser(user) && (
                  <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5">
                    <Link to="/admin">Admin Dashboard</Link>
                  </Button>
                )}
                <Button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  variant="outline"
                  className="border-navy/20 text-navy hover:bg-navy/5"
                >
                  <LogOut className="h-4 w-4 mr-2" /> {isSigningOut ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            )}
          </div>

          <Card className="border-navy/15 shadow-card bg-white/95 mb-6">
            <CardHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-3 w-fit">
                <ShieldCheck className="h-3.5 w-3.5" /> Customer Dashboard
              </div>
              <CardTitle className="font-display uppercase text-3xl text-navy">Welcome, {displayName}</CardTitle>
              <CardDescription>
                Manage your account and stay on top of your nutrition routine in one place.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-3 gap-5">
            <Card className="border-navy/15 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-navy">
                  <UserRound className="h-5 w-5 text-orange" /> Account
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-navy/70 space-y-2">
                <p><span className="font-semibold text-navy">Email:</span> {user?.email}</p>
                <p><span className="font-semibold text-navy">Status:</span> Verified Customer</p>
              </CardContent>
            </Card>

            <Card className="border-navy/15 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-navy">
                  <ClipboardList className="h-5 w-5 text-orange" /> Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-navy/70 space-y-3">
                {isLoadingOrders ? (
                  <p>Loading your orders...</p>
                ) : orders.length === 0 ? (
                  <p>No orders yet.</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="rounded-md border border-navy/10 p-3 space-y-1">
                      <p className="font-semibold text-navy">
                        {order.currency_code} {Number(order.total_amount).toFixed(2)}
                      </p>
                      <p className="text-sm">Placed: {new Date(order.created_at).toLocaleString()}</p>
                      <p className="text-sm">Status: {order.status}</p>
                      <div className="pt-1">
                        <p className="text-xs uppercase tracking-wide text-navy/60">Products</p>
                        {orderItemsByOrderId[order.id]?.length ? (
                          <div className="space-y-1 mt-1">
                            {orderItemsByOrderId[order.id].map((item) => (
                              <div key={item.id} className="text-sm text-navy/70">
                                <span className="font-medium text-navy">{item.product_title}</span>
                                <span> x{item.quantity}</span>
                                <span> ({item.currency_code} {Number(item.line_total).toFixed(2)})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm">Product details pending.</p>
                        )}
                      </div>
                      {order.tracking_number ? (
                        <>
                          <p className="text-sm">Tracking: {order.tracking_number}</p>
                          {order.tracking_carrier && <p className="text-sm">Carrier: {order.tracking_carrier}</p>}
                          {order.tracking_url && (
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-orange underline"
                            >
                              Track Shipment
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-sm">Tracking not available yet.</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-navy/15 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-navy">
                  <CalendarClock className="h-5 w-5 text-orange" /> Routine
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-navy/70 space-y-3">
                <div className="rounded-md border border-navy/10 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-navy/60">Add Routine</p>
                  <Input
                    placeholder="Routine name (e.g. Morning Stack)"
                    value={newRoutineName}
                    onChange={(e) => setNewRoutineName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs uppercase tracking-wide text-navy/60">Time</label>
                    <Input
                      type="time"
                      value={newRoutineTime}
                      onChange={(e) => setNewRoutineTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-navy/60">Days</p>
                    <div className="flex flex-wrap gap-2">
                      {ROUTINE_DAYS.map((day) => (
                        <label key={day} className="inline-flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={newRoutineDays.includes(day)}
                            onChange={() => toggleNewRoutineDay(day)}
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Notes (optional)"
                    value={newRoutineNotes}
                    onChange={(e) => setNewRoutineNotes(e.target.value)}
                    className="min-h-20"
                  />
                  <Button onClick={() => void handleCreateRoutine()} disabled={isCreatingRoutine} className="w-full">
                    {isCreatingRoutine ? "Adding..." : "Add Routine"}
                  </Button>
                </div>

                {isLoadingRoutines ? (
                  <p>Loading routines...</p>
                ) : routines.length === 0 ? (
                  <p>No routines yet. Add your first routine above.</p>
                ) : (
                  routines.map((routine) => {
                    const schedule = normalizeRoutineSchedule(routine.schedule);
                    const isSaving = isSavingRoutineId === routine.id;

                    return (
                      <div key={routine.id} className="rounded-md border border-navy/10 p-3 space-y-2">
                        <Input
                          value={routine.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setRoutines((prev) => prev.map((r) => (r.id === routine.id ? { ...r, name } : r)));
                          }}
                        />
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <label className="text-xs uppercase tracking-wide text-navy/60">Time</label>
                          <Input
                            type="time"
                            value={schedule.time}
                            onChange={(e) => {
                              const time = e.target.value;
                              setRoutines((prev) =>
                                prev.map((r) =>
                                  r.id === routine.id
                                    ? {
                                        ...r,
                                        schedule: {
                                          ...schedule,
                                          time,
                                        },
                                      }
                                    : r,
                                ),
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-navy/60">Days</p>
                          <div className="flex flex-wrap gap-2">
                            {ROUTINE_DAYS.map((day) => (
                              <label key={`${routine.id}-${day}`} className="inline-flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={schedule.days.includes(day)}
                                  onChange={() => toggleRoutineDay(routine.id, day)}
                                />
                                {day}
                              </label>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          value={routine.notes ?? ""}
                          onChange={(e) => {
                            const notes = e.target.value;
                            setRoutines((prev) => prev.map((r) => (r.id === routine.id ? { ...r, notes } : r)));
                          }}
                          className="min-h-20"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-navy/70">
                          <input
                            type="checkbox"
                            checked={routine.is_active}
                            onChange={(e) => {
                              const is_active = e.target.checked;
                              setRoutines((prev) => prev.map((r) => (r.id === routine.id ? { ...r, is_active } : r)));
                            }}
                          />
                          Active
                        </label>
                        <div className="flex gap-2">
                          <Button onClick={() => void handleSaveRoutine(routine)} disabled={isSaving} className="flex-1">
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => void handleDeleteRoutine(routine)}
                            disabled={isSaving}
                            className="flex-1"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Dashboard;
