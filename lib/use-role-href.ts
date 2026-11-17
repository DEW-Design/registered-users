"use client";

/**
 * In the full prototype this appends the viewed role to every internal link, because the URL was the only place the role lived. The
 * testing edition has one fixed role (`lib/use-user-role.ts`), so a link is its own path. Kept as a hook so every caller is unchanged.
 */
export function useRoleHref() {
  return (path: string) => path;
}
