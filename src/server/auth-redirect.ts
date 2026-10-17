// Only same-application workspace paths may follow sign-in.
export function safeReturnPath(value: string | null | undefined): string {
  const path = value || "";
  return path.startsWith("/app/") && !/[\\\r\n]/.test(path) && !path.includes("//") ? path : "/app/home";
}
