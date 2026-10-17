/** Keep post-auth navigation inside the owner workspace, including its query context. */
export function workspaceReturnPath(value: string | null | undefined): string {
  const path = value || "";
  if (!path.startsWith("/app/") || /[\\\r\n]/.test(path) || path.includes("//")) return "/app/home";
  try {
    const resolved = new URL(path, "https://crewmori.invalid");
    if (!resolved.pathname.startsWith("/app/")) return "/app/home";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch { return "/app/home"; }
}
export function signInPath(error: string, returnTo?: string | null): string {
  const params = new URLSearchParams({ error, returnTo: workspaceReturnPath(returnTo) });
  return `/auth/sign-in?${params}`;
}
