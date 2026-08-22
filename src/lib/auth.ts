import type { User } from "@supabase/supabase-js";

const getConfiguredAdminEmails = () => {
  const raw = import.meta.env.VITE_ADMIN_EMAILS;
  if (!raw) return [];

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

export const isAdminUser = (user: User | null | undefined) => {
  if (!user) return false;

  const configuredEmails = getConfiguredAdminEmails();
  const normalizedEmail = user.email?.trim().toLowerCase();
  if (normalizedEmail && configuredEmails.includes(normalizedEmail)) return true;

  const appRole = user.app_metadata?.role;
  const profileRole = user.user_metadata?.role;

  return appRole === "admin" || profileRole === "admin";
};
