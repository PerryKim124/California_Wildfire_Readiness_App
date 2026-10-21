import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

// The person using the app, derived from the Supabase session. Components read
// it with useCurrentUser() instead of hardcoding a name.
export type CurrentUser = {
  signedIn: boolean;
  name: string; // full display name, e.g. "Perry Kim"
  firstName: string; // for greetings, e.g. "Perry"
  initials: string; // for avatars, e.g. "PK"
  email: string | null;
};

export const GUEST_NAME = "Guest";
export const FALLBACK_NAME = "User";

export function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function fromName(name: string, signedIn: boolean, email: string | null): CurrentUser {
  return { signedIn, name, firstName: name.split(/\s+/)[0], initials: initialsFor(name), email };
}

export const GUEST_USER = fromName(GUEST_NAME, false, null);

export function userFromSession(session: Session | null): CurrentUser {
  if (!session) return GUEST_USER;
  const meta = session.user.user_metadata ?? {};
  // full_name is set at sign-up and in Settings; name is what OAuth providers use.
  const raw = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  return fromName(raw?.trim().replace(/\s+/g, " ") ?? FALLBACK_NAME, true, session.user.email ?? null);
}

export const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

export const CurrentUserContext = createContext<CurrentUser>(GUEST_USER);

export const useCurrentUser = () => useContext(CurrentUserContext);
