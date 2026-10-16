import { json } from "@/server/http";
export const runtime = "nodejs";
function unavailable() { return json({ error: { code: "NOT_FOUND", message: "Unknown API endpoint." } }, 404); }
export const GET = unavailable;
export const POST = unavailable;
export const PUT = unavailable;
export const PATCH = unavailable;
export const DELETE = unavailable;
