import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock, ClipboardList, LogOut, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isAdminUser } from "@/lib/auth";
import {
  getSessionIdFromAccessToken,
  revokeAllSessionsForUser,
  revokeUserSessionRecord,
  type UserSessionRecord,
} from "@/lib/sessionManager";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type OrderRecord = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRecord = Database["public"]["Tables"]["order_items"]["Row"];
type RoutineRecord = Database["public"]["Tables"]["customer_routines"]["Row"];

type RevokeAccessTarget =
  | { kind: "session"; sessionRecord: UserSessionRecord }
  | { kind: "other_sessions"; otherActiveCount: number };

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
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderSort, setOrderSort] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc" | "status">("newest");
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [isSavingRoutineId, setIsSavingRoutineId] = useState<string | null>(null);
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineNotes, setNewRoutineNotes] = useState("");
  const [newRoutineTime, setNewRoutineTime] = useState("08:00");
  const [newRoutineDays, setNewRoutineDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isRevokingSessionId, setIsRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAllSessions, setIsRevokingAllSessions] = useState(false);
  const [currentAuthSessionId, setCurrentAuthSessionId] = useState<string | null>(null);
  const [isDeletingSessionId, setIsDeletingSessionId] = useState<string | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<UserSessionRecord | null>(null);
  const [revokeAccessTarget, setRevokeAccessTarget] = useState<RevokeAccessTarget | null>(null);

  useEffect(() => {
    if (!supabase) return;


    let isMounted = true;

    const syncUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      setCurrentAuthSessionId(getSessionIdFromAccessToken(data.session?.access_token));
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

  useEffect(() => {
    if (!supabase || !user?.id) {
      setSessions([]);
      setIsLoadingSessions(false);
      return;
    }

    let isMounted = true;

    const loadSessions = async () => {
      setIsLoadingSessions(true);
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("last_seen_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setSessions([]);
        toast.error("Could not load active sessions.");
      } else {
        setSessions(data ?? []);
      }

      setIsLoadingSessions(false);
    };

    void loadSessions();

    const interval = window.setInterval(() => {
      void loadSessions();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const handleRevokeSession = async (sessionRecord: UserSessionRecord) => {
    if (!user?.id) return;

    setIsRevokingSessionId(sessionRecord.id);
    try {
      await revokeUserSessionRecord(sessionRecord.id, "Revoked by account owner");
      toast.success("Session revoked.");
      setSessions((prev) =>
        prev.map((entry) =>
          entry.id === sessionRecord.id
            ? { ...entry, revoked_at: new Date().toISOString(), revoked_by: user.id }
            : entry,
        ),
      );
    } catch {
      toast.error("Could not revoke session.");
    } finally {
      setIsRevokingSessionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!user?.id) return;

    setIsRevokingAllSessions(true);
    try {
      const revokedCount = await revokeAllSessionsForUser(user.id, "Revoked by account owner");
      toast.success(`Revoked ${revokedCount} session${revokedCount === 1 ? "" : "s"}.`);
      setSessions((prev) =>
        prev.map((entry) => {
          if (entry.auth_session_id === currentAuthSessionId || entry.revoked_at) return entry;
          return {
            ...entry,
            revoked_at: new Date().toISOString(),
            revoked_by: user.id,
          };
        }),
      );
    } catch {
      toast.error("Could not revoke other sessions.");
    } finally {
      setIsRevokingAllSessions(false);
    }
  };

  const openRevokeSessionModal = (sessionRecord: UserSessionRecord) => {
    setRevokeAccessTarget({ kind: "session", sessionRecord });
  };

  const openRevokeOtherSessionsModal = () => {
    const otherActiveCount = sessions.filter(
      (sessionRecord) => !sessionRecord.revoked_at && sessionRecord.auth_session_id !== currentAuthSessionId,
    ).length;
    setRevokeAccessTarget({ kind: "other_sessions", otherActiveCount });
  };

  const confirmRevokeAccess = async () => {
    if (!revokeAccessTarget) return;

    const target = revokeAccessTarget;
    setRevokeAccessTarget(null);

    if (target.kind === "session") {
      await handleRevokeSession(target.sessionRecord);
      return;
    }

    await handleRevokeOtherSessions();
  };

  const openDeleteSessionModal = (sessionRecord: UserSessionRecord) => {
    setDeleteSessionTarget(sessionRecord);
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionTarget || !user?.id) return;

    const target = deleteSessionTarget;
    setDeleteSessionTarget(null);
    setIsDeletingSessionId(target.id);

    try {
      const { error } = await supabase
        .from("user_sessions")
        .delete()
        .eq("id", target.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Session record deleted.");
      setSessions((prev) => prev.filter((s) => s.id !== target.id));
    } catch {
      toast.error("Could not delete session record.");
    } finally {
      setIsDeletingSessionId(null);
    }
  };

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

  const getOrderCardAccentClass = (status: string) => {
    if (status === "fulfilled") return "border-l-emerald-500";
    if (status === "processing") return "border-l-sky-500";
    if (status === "cancelled") return "border-l-rose-500";
    return "border-l-amber-500";
  };

  const getOrderStatusPillClass = (status: string) => {
    if (status === "fulfilled") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "processing") return "bg-sky-100 text-sky-800 border-sky-200";
    if (status === "cancelled") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  const getSessionCardAccentClass = (isCurrent: boolean, isRevoked: boolean) => {
    if (isRevoked) return "border-l-rose-500";
    if (isCurrent) return "border-l-sky-500";
    return "border-l-emerald-500";
  };

  const getSessionStatusPillClass = (isCurrent: boolean, isRevoked: boolean) => {
    if (isRevoked) return "bg-rose-100 text-rose-800 border-rose-200";
    if (isCurrent) return "bg-sky-100 text-sky-800 border-sky-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  const ordersPerPage = 3;
  const sortedOrders = useMemo(() => {
    const nextOrders = [...orders];

    if (orderSort === "oldest") {
      nextOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return nextOrders;
    }

    if (orderSort === "amount_desc") {
      nextOrders.sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
      return nextOrders;
    }

    if (orderSort === "amount_asc") {
      nextOrders.sort((a, b) => Number(a.total_amount) - Number(b.total_amount));
      return nextOrders;
    }

    if (orderSort === "status") {
      nextOrders.sort((a, b) => {
        const statusCompare = a.status.localeCompare(b.status);
        if (statusCompare !== 0) return statusCompare;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return nextOrders;
    }

    nextOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return nextOrders;
  }, [orders, orderSort]);

  const totalOrderPages = Math.max(1, Math.ceil(sortedOrders.length / ordersPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPerPage;
    return sortedOrders.slice(start, start + ordersPerPage);
  }, [sortedOrders, ordersPage]);

  const sessionsPerPage = 4;
  const totalSessionPages = Math.max(1, Math.ceil(sessions.length / sessionsPerPage));
  const paginatedSessions = useMemo(() => {
    const start = (sessionsPage - 1) * sessionsPerPage;
    return sessions.slice(start, start + sessionsPerPage);
  }, [sessions, sessionsPage]);

  useEffect(() => {
    setOrdersPage(1);
    setSessionsPage(1);
  }, [user?.id]);

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
      <main className="admin-shell flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-3 py-5 sm:px-6 sm:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            {user && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                {isAdminUser(user) && (
                  <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 w-full sm:w-auto">
                    <Link to="/admin">Admin Dashboard</Link>
                  </Button>
                )}
                <Button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  variant="outline"
                  className="border-navy/20 text-navy hover:bg-navy/5 w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" /> {isSigningOut ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            )}
          </div>

          <Card className="border-navy/15 shadow-card bg-white/95 mb-6">
            <CardHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-sm uppercase tracking-widest font-semibold mb-3 w-fit">
                <ShieldCheck className="h-3.5 w-3.5" /> Customer Dashboard
              </div>
              <CardTitle className="font-display uppercase text-xl text-navy">Welcome, {displayName}</CardTitle>
              <CardDescription>
                Manage your account and stay on top of your nutrition routine in one place.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-navy/15 bg-white/95 mb-5">
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

          <div className="grid md:grid-cols-2 gap-5">
            <Card className="border-navy/15 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-navy">
                  <ClipboardList className="h-5 w-5 text-orange" /> Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-navy/70 space-y-3">
                <div className="flex items-center justify-end">
                  <label className="flex items-center gap-2 text-sm text-navy/70">
                    <span className="uppercase tracking-wide text-navy/60">Sort by</span>
                    <select
                      value={orderSort}
                      onChange={(e) => {
                        const nextSort = e.target.value as "newest" | "oldest" | "amount_desc" | "amount_asc" | "status";
                        setOrderSort(nextSort);
                        setOrdersPage(1);
                      }}
                      className="h-10 rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="amount_desc">Amount high to low</option>
                      <option value="amount_asc">Amount low to high</option>
                      <option value="status">Status (A-Z)</option>
                    </select>
                  </label>
                </div>
                {isLoadingOrders ? (
                  <p>Loading your orders...</p>
                ) : orders.length === 0 ? (
                  <p>No orders yet.</p>
                ) : (
                  <div className="space-y-3">
                    {paginatedOrders.map((order, index) => (
                    <div
                      key={order.id}
                      className={`rounded-lg border border-l-4 border-navy/15 p-3 space-y-2 shadow-sm ${
                        index % 2 === 0 ? "bg-white/90" : "bg-sky/10"
                      } ${getOrderCardAccentClass(order.status)}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-semibold text-navy">
                          {order.currency_code} {Number(order.total_amount).toFixed(2)}
                        </p>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${getOrderStatusPillClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm">Placed: {new Date(order.created_at).toLocaleString()}</p>
                      {order.shipping_address && (
                        <div className="text-sm text-navy/80 pt-2">
                          <p className="font-semibold text-navy">Shipping To:</p>
                          <p className="whitespace-pre-wrap">{order.shipping_address}</p>
                        </div>
                      )}
                      {(order.external_id || order.stripe_payment_intent_id) && (
                        <p className="text-sm font-mono text-navy/60 pt-2">
                          Order ID: {order.external_id || order.stripe_payment_intent_id}
                        </p>
                      )}
                      <div className="pt-2 border-t border-navy/10">
                        <p className="text-sm uppercase tracking-wide text-navy/60">Products</p>
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
                        <div className="pt-2 border-t border-navy/10 space-y-1">
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
                        </div>
                      ) : (
                        <p className="text-sm pt-2 border-t border-navy/10">Tracking not available yet.</p>
                      )}
                    </div>
                    ))}

                    {totalOrderPages > 1 && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <p className="text-sm text-navy/60">
                          Page {ordersPage} of {totalOrderPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={ordersPage === 1}
                            onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={ordersPage >= totalOrderPages}
                            onClick={() => setOrdersPage((prev) => Math.min(totalOrderPages, prev + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
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
                  <p className="text-sm uppercase tracking-wide text-navy/60">Add Routine</p>
                  <Input
                    placeholder="Routine name (e.g. Morning Stack)"
                    value={newRoutineName}
                    onChange={(e) => setNewRoutineName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm uppercase tracking-wide text-navy/60">Time</label>
                    <Input
                      type="time"
                      value={newRoutineTime}
                      onChange={(e) => setNewRoutineTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-wide text-navy/60">Days</p>
                    <div className="flex flex-wrap gap-2">
                      {ROUTINE_DAYS.map((day) => (
                        <label key={day} className="inline-flex items-center gap-1 text-sm">
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
                          <label className="text-sm uppercase tracking-wide text-navy/60">Time</label>
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
                          <p className="text-sm uppercase tracking-wide text-navy/60">Days</p>
                          <div className="flex flex-wrap gap-2">
                            {ROUTINE_DAYS.map((day) => (
                              <label key={`${routine.id}-${day}`} className="inline-flex items-center gap-1 text-sm">
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
                        <label className="inline-flex items-center gap-2 text-sm text-navy/70">
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

          <Card className="border-navy/15 bg-white/95 mt-5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-navy">
                <ShieldCheck className="h-5 w-5 text-orange" /> Session Security
              </CardTitle>
              <CardDescription>
                Review where your account is signed in and revoke old or unrecognized sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-navy/70">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p>Current session is marked below.</p>
                <Button
                  variant="outline"
                  className="border-navy/20 text-navy hover:bg-navy/5"
                  onClick={openRevokeOtherSessionsModal}
                  disabled={isRevokingAllSessions || sessions.length === 0}
                >
                  {isRevokingAllSessions ? "Revoking..." : "Revoke Other Sessions"}
                </Button>
              </div>

              {isLoadingSessions ? (
                <p>Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p>No session records yet.</p>
              ) : (
                <div className="space-y-2">
                  {paginatedSessions.map((sessionRecord, index) => {
                    const isCurrent = sessionRecord.auth_session_id === currentAuthSessionId;
                    const isRevoked = Boolean(sessionRecord.revoked_at);

                    return (
                      <div
                        key={sessionRecord.id}
                        className={`rounded-lg border border-l-4 border-navy/15 p-3 shadow-sm ${
                          index % 2 === 0 ? "bg-white/90" : "bg-sky/10"
                        } ${getSessionCardAccentClass(isCurrent, isRevoked)}`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-navy">
                                {isCurrent ? "Current Device" : "Signed-in Device"}
                              </p>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${getSessionStatusPillClass(isCurrent, isRevoked)}`}>
                                {isRevoked ? "Revoked" : isCurrent ? "Current" : "Active"}
                              </span>
                            </div>
                            <p className="text-sm break-words">{sessionRecord.user_agent ?? "Unknown device"}</p>
                            <p className="text-sm">
                              Last active: {new Date(sessionRecord.last_seen_at).toLocaleString()}
                            </p>
                            {isRevoked && (
                              <p className="text-sm text-rose-700">
                                Revoked: {new Date(sessionRecord.revoked_at as string).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant={isRevoked ? "outline" : "destructive"}
                              onClick={() => openRevokeSessionModal(sessionRecord)}
                              disabled={isRevokingSessionId === sessionRecord.id || isRevoked}
                            >
                              {isRevoked ? "Revoked" : isRevokingSessionId === sessionRecord.id ? "Revoking..." : "Revoke"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => openDeleteSessionModal(sessionRecord)}
                              disabled={isDeletingSessionId === sessionRecord.id || (isCurrent && !isRevoked)}
                              className="border-navy/20 text-navy hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {totalSessionPages > 1 && (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <p className="text-sm text-navy/60">
                        Page {sessionsPage} of {totalSessionPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="border-navy/20 text-navy hover:bg-navy/5"
                          disabled={sessionsPage === 1}
                          onClick={() => setSessionsPage((prev) => Math.max(1, prev - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          className="border-navy/20 text-navy hover:bg-navy/5"
                          disabled={sessionsPage >= totalSessionPages}
                          onClick={() => setSessionsPage((prev) => Math.min(totalSessionPages, prev + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />

      <AlertDialog open={Boolean(revokeAccessTarget)} onOpenChange={(open) => { if (!open) setRevokeAccessTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeAccessTarget?.kind === "session"
                ? revokeAccessTarget.sessionRecord.auth_session_id === currentAuthSessionId
                  ? "This will revoke your current session and sign you out automatically."
                  : "This will revoke this device session."
                : revokeAccessTarget?.kind === "other_sessions"
                  ? `This will revoke ${revokeAccessTarget.otherActiveCount} other active session${revokeAccessTarget.otherActiveCount === 1 ? "" : "s"} on this account.`
                  : "Confirm access revocation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                (revokeAccessTarget?.kind === "session" && isRevokingSessionId === revokeAccessTarget.sessionRecord.id) ||
                (revokeAccessTarget?.kind === "other_sessions" && isRevokingAllSessions)
              }
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmRevokeAccess()}
              disabled={
                !revokeAccessTarget ||
                (revokeAccessTarget.kind === "session" && isRevokingSessionId === revokeAccessTarget.sessionRecord.id) ||
                (revokeAccessTarget.kind === "other_sessions" && isRevokingAllSessions)
              }
            >
              {revokeAccessTarget?.kind === "session" && isRevokingSessionId === revokeAccessTarget.sessionRecord.id
                ? "Revoking..."
                : revokeAccessTarget?.kind === "other_sessions" && isRevokingAllSessions
                  ? "Revoking..."
                  : "Revoke Access"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteSessionTarget)} onOpenChange={(open) => { if (!open) setDeleteSessionTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this session record from your history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSessionId !== null}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteSession()}
              disabled={!deleteSessionTarget || isDeletingSessionId !== null}
            >
              {isDeletingSessionId === deleteSessionTarget?.id ? "Deleting..." : "Delete Session"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
