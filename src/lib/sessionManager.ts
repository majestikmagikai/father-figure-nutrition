import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type UserSessionRecord = {
  id: string;
  user_id: string;
  auth_session_id: string;
  email: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
};

const REVOCATION_CHECK_INTERVAL_MS = 15000;
const HEARTBEAT_INTERVAL_MS = 60000;

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(window.atob(padded));
    if (payload && typeof payload === "object") {
      return payload as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

export const getSessionIdFromAccessToken = (accessToken: string | null | undefined): string | null => {
  if (!accessToken) return null;

  const payload = decodeJwtPayload(accessToken);
  const claim = payload?.session_id;
  return typeof claim === "string" && claim.length > 0 ? claim : null;
};

export const upsertCurrentSessionRecord = async (session: Session | null) => {
  if (!supabase || !session?.access_token) return;
  const client = supabase as any;

  const sessionId = getSessionIdFromAccessToken(session.access_token);
  if (!sessionId) return;

  await client.rpc("upsert_current_session", {
    p_user_agent: navigator.userAgent,
    p_email: session.user.email ?? null,
  });
};

export const revokeUserSessionRecord = async (sessionRecordId: string, reason?: string | null) => {
  if (!supabase) return;
  const client = supabase as any;

  const { error } = await client.rpc("revoke_user_session", {
    p_session_record_id: sessionRecordId,
    p_reason: reason ?? null,
  });

  if (error) throw error;
};

export const revokeAllSessionsForUser = async (userId: string, reason?: string | null) => {
  if (!supabase) return 0;
  const client = supabase as any;

  const { data, error } = await client.rpc("revoke_all_user_sessions", {
    p_target_user_id: userId,
    p_reason: reason ?? null,
  });

  if (error) throw error;

  return typeof data === "number" ? data : 0;
};

export const startSessionRevocationMonitor = () => {
  if (!supabase) {
    return () => {
      // no-op cleanup when Supabase is unavailable
    };
  }

  let currentAuthSessionId: string | null = null;
  let revocationCheckTimer: number | null = null;
  let heartbeatTimer: number | null = null;
  let hasForcedSignOut = false;

  const forceSignOut = async () => {
    if (hasForcedSignOut) return;
    hasForcedSignOut = true;

    await supabase.auth.signOut();
    toast.error("Your session was revoked. Please sign in again.");
    window.location.assign("/login");
  };

  const syncActiveSession = async (session: Session | null) => {
    if (!session?.access_token) {
      currentAuthSessionId = null;
      return;
    }

    currentAuthSessionId = getSessionIdFromAccessToken(session.access_token);
    await upsertCurrentSessionRecord(session);
  };

  const checkRevocation = async () => {
    if (!currentAuthSessionId || hasForcedSignOut) return;
    const client = supabase as any;

    const { data, error } = await client
      .from("user_sessions")
      .select("id, revoked_at")
      .eq("auth_session_id", currentAuthSessionId)
      .maybeSingle();

    if (error || !data) return;

    if (data.revoked_at) {
      await forceSignOut();
    }
  };

  void supabase.auth.getSession().then(({ data }) => {
    void syncActiveSession(data.session ?? null);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    void syncActiveSession(session);
  });

  revocationCheckTimer = window.setInterval(() => {
    void checkRevocation();
  }, REVOCATION_CHECK_INTERVAL_MS);

  heartbeatTimer = window.setInterval(() => {
    void supabase.auth.getSession().then(({ data }) => {
      void upsertCurrentSessionRecord(data.session ?? null);
    });
  }, HEARTBEAT_INTERVAL_MS);

  return () => {
    if (revocationCheckTimer !== null) {
      window.clearInterval(revocationCheckTimer);
    }
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
    }
    listener.subscription.unsubscribe();
  };
};
