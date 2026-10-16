import { z } from "zod";
import { requireConfiguration } from "../config";
import { providerJson, type Fetch } from "./http";

export async function searchOpportunities(input: { query: string; domains: string[] }, transport?: Fetch) {
  const value = z.object({ query: z.string().trim().min(3).max(500), domains: z.array(z.string().regex(/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i)).min(1).max(10) }).strict().parse(input);
  const { EXA_API_KEY } = requireConfiguration(["EXA_API_KEY"]);
  return providerJson("Exa", "https://api.exa.ai/search", { method: "POST", headers: { "x-api-key": EXA_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ query: value.query, type: "auto", numResults: 5, includeDomains: value.domains, contents: { highlights: true } }) }, z.object({ results: z.array(z.object({ id: z.string(), url: z.url().refine((url) => ["https:", "http:"].includes(new URL(url).protocol)), title: z.string().nullable().optional(), publishedDate: z.string().optional(), highlights: z.array(z.string()).optional() })).max(5) }), { fetch: transport });
}
