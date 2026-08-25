import type { User } from "@supabase/supabase-js";

export const isAdminUser = (user: User | null | undefined) => {
  if (!user) return false;

  const appRole = user.app_metadata?.role;
  const profileRole = user.user_metadata?.role;

  return appRole === "admin" || profileRole === "admin";
};
