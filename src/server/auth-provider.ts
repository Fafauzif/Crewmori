type ProviderConfiguration = { SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string };

// This is a UX preflight, not authentication. Unknown settings leave OAuth to decide.
export function createGoogleProviderCheck(
  configuration: () => ProviderConfiguration,
  request: typeof fetch = fetch,
  now: () => number = Date.now,
) {
  let cached: { url: string; key: string; enabled: boolean; at: number } | undefined;
  return async function googleEnabled() {
    const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key } = configuration();
    if (cached && cached.url === url && cached.key === key && now() - cached.at < 60_000) return cached.enabled;
    try {
      const response = await request(new URL("/auth/v1/settings", url), {
        headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return true;
      const settings = await response.json() as { external?: { google?: unknown } } | null;
      const enabled = settings?.external?.google;
      if (typeof enabled !== "boolean") return true;
      cached = { url, key, enabled, at: now() };
      return enabled;
    } catch {
      // A transient settings failure must not turn into a cached disabled-provider result.
      return true;
    }
  };
}
