"use client";

import type { UserRole } from "@/lib/user-role";

/**
 * The testing edition is the registered user's flow only, so the role is fixed: there is no role switcher and the `?userRole=` address
 * parameter is ignored, so a participant cannot reach another role's screens by editing the address. Every caller keeps its
 * signature (and its `<Suspense>`), which is why this is still a hook.
 */
export function useUserRole(): UserRole {
  return "registered-user";
}
