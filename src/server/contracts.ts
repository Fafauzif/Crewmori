import { z } from "zod";

export const roleSchema = z.enum(["scout", "promoter", "sales", "account_manager", "operations", "finance"]);
export type Role = z.infer<typeof roleSchema>;
export const referenceSchema = z.object({ table: z.string().regex(/^[a-z_]{1,60}$/), id: z.string().min(1).max(160), version: z.number().int().positive() }).strict();
export const taskInputSchema = z.object({
  role: roleSchema,
  instruction: z.string().trim().min(3).max(8000),
  references: z.array(referenceSchema).max(30).default([]),
  idempotencyKey: z.string().uuid(),
}).strict();
export const artifactSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(8000),
  facts: z.array(z.object({ text: z.string().max(2000), sourceId: z.string().max(160) }).strict()).max(30),
  unknowns: z.array(z.string().max(1000)).max(20),
  recommendations: z.array(z.string().max(2000)).max(20),
  requiresOwnerReview: z.literal(true),
}).strict();
export type Artifact = z.infer<typeof artifactSchema>;
export const receiptSchema = z.object({
  eventId: z.string().min(1).max(200),
  requestId: z.string().uuid(),
  currency: z.enum(["USD", "IDR"]),
  grossMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  feeMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  occurredAt: z.iso.datetime({ offset: true }),
}).strict().refine((value) => value.feeMinor === null || value.feeMinor <= value.grossMinor, "Fee exceeds gross receipt.");
export type Receipt = z.infer<typeof receiptSchema>;
export type OwnerActor = { kind: "owner"; userId: string; workspaceId: string };
export type BuyerActor = { kind: "buyer"; workspaceId: string; engagementId: string; grantId: string };
export type Actor = OwnerActor | BuyerActor;
