/** Fresh allowlist DTOs. Never spread an owner record into a public or buyer response. */
import { a, b, n, o, s, type Entity, type StoreState } from "./types";
import {
  invoiceTotal,
  invoiceOutstanding,
  halfUp,
  amendmentSchedule,
} from "./engine";
const rows = (st: StoreState, t: string) => Object.values(st.tables[t] || {});
const pick = (row: Entity, keys: string[]): Entity => {
  const dto: Entity = { id: row.id, version: row.version };
  for (const key of keys)
    if (row[key] !== undefined) dto[key] = structuredClone(row[key]);
  return dto;
};
const validGrant = (
  st: StoreState,
  engagementId: string,
  grantId: string,
): Entity | null => {
  const g = st.tables.buyer_grants?.[grantId],
    e = st.tables.engagements?.[engagementId];
  return g &&
    e &&
    g.state === "active" &&
    g.engagement_id === engagementId &&
    e.buyer_grant_id === g.id &&
    e.contact_id === g.contact_id &&
    Date.parse(s(g.expires_at)) > Date.parse(st.sample_clock)
    ? g
    : null;
};
export interface PublicService {
  id: string;
  slug: string;
  title: string;
  description: string;
  deliverables: string[];
  pricing_label: string;
}
export interface PublicProfile {
  handle: string;
  public_name: string;
  headline: string;
  biography: string;
  location_label: string;
  public_contact_email: string;
  public_availability: string;
  services: PublicService[];
  portfolio: { title: string; summary: string; asset_url: string | null }[];
}
function published(st: StoreState, table: string, id: string): Entity | null {
  const snap = st.tables.publication_snapshots?.[`${table}_${id}`];
  return snap ? (o(snap.values) as Entity) : null;
}
function safeAsset(st: StoreState, id: unknown): string | null {
  const file = st.tables.attachments?.[s(id)];
  return file &&
    file.availability === "available" &&
    file.audience === "public" &&
    file.storage_kind === "bundled_asset" &&
    /^assets\/[a-zA-Z0-9_./-]+$/.test(s(file.storage_locator))
    ? "/" + s(file.storage_locator)
    : null;
}
export function publicProfile(
  st: StoreState,
  handle: string,
): PublicProfile | null {
  if (st.remote) return (st.remote.profile as PublicProfile | null)?.handle === handle ? st.remote.profile as PublicProfile : null;
  const profile = rows(st, "profiles").find((x) => {
    const snapshot = published(st, "profiles", x.id);
    const owner = st.tables.owners?.[s(x.owner_id)];
    return snapshot && s(snapshot.handle, s(owner?.handle)) === handle;
  });
  if (!profile) return null;
  const p = published(st, "profiles", profile.id);
  if (!p || p.published !== true) return null;
  const services = rows(st, "services")
    .filter((x) => x.profile_id === profile.id && !x.archived)
    .map((x) => published(st, "services", x.id))
    .filter(
      (x): x is Entity =>
        !!x &&
        x.published === true &&
        a<string>(p.approved_service_ids).includes(x.id),
    );
  const portfolio = rows(st, "portfolio_items")
    .filter((x) => x.profile_id === profile.id && !x.archived)
    .map((x) => published(st, "portfolio_items", x.id))
    .filter(
      (x): x is Entity =>
        !!x &&
        x.published === true &&
        a<string>(p.approved_portfolio_ids).includes(x.id),
    );
  return {
    handle,
    public_name: s(p.public_name),
    headline: s(p.headline),
    biography: s(p.biography),
    location_label: s(p.location_label),
    public_contact_email: s(p.public_contact_email),
    public_availability: s(p.public_availability),
    services: services.map((x) => ({
      id: x.id,
      slug: s(x.slug),
      title: s(x.title),
      description: s(x.description),
      deliverables: a<string>(x.deliverables).filter(
        (x) => typeof x === "string",
      ),
      pricing_label: s(x.pricing_label),
    })),
    portfolio: portfolio.map((x) => ({
      title: s(x.title),
      summary: s(x.summary),
      asset_url: safeAsset(st, x.asset_id),
    })),
  };
}
export interface BuyerAmendment {
  previous_price: { amount_minor: number; currency: string; scale: number };
  previous_terms: Record<string, unknown>;
  previous_title: string;
  price_delta_minor: number;
  deposit_delta_minor: number;
  existing_project_id: string;
  proposed_start_at: string | null;
  proposed_due_at: string | null;
  requires_review_reason: string | null;
}
export interface BuyerOffer {
  amendment: BuyerAmendment | null;
  engagement_id: string;
  offer_id: string;
  offer_version_id: string;
  offer_record_version: number;
  share_id: string;
  freelancer_name: string;
  buyer_name: string;
  title: string;
  deliverables: { key: string; label: string; quantity: number }[];
  price: { amount_minor: number; currency: string; scale: number };
  terms: Record<string, unknown>;
  buyer_note: string;
  expires_at: string | null;
  state: string;
  accept_eligibility: { allowed: boolean; reason: string | null };
}
function terms(v: unknown): Record<string, unknown> {
  const value = o(v),
    safe: Record<string, unknown> = {};
  for (const k of [
    "delivery_business_days",
    "deposit_basis_points",
    "reservation_hours",
    "start_basis",
    "timezone",
    "workdays",
    "holidays",
    "start_local_time",
    "due_local_time",
    "required_input_keys",
    "acceptance_disclosure",
    "proposed_start_at",
  ])
    safe[k] = structuredClone(value[k]);
  return safe;
}
export function buyerOffer(
  st: StoreState,
  engagementId: string,
  grantId: string,
  versionId?: string,
): BuyerOffer | null {
  if (st.remote) return st.remote.engagementId === engagementId ? (versionId ? st.remote.offer : st.remote.latestOffer) as BuyerOffer | null : null;
  const grant = validGrant(st, engagementId, grantId);
  if (!grant) return null;
  const offer = st.tables.offers?.[s(grant.offer_id)];
  if (!offer) return null;
  const acceptance = rows(st, "acceptances").find(
    (x) =>
      x.offer_id === offer.id &&
      x.contact_id === grant.contact_id &&
      (versionId
        ? x.offer_version_id === versionId
        : x.offer_version_id === offer.accepted_version_id),
  );
  const versionKey =
    versionId || s(acceptance?.offer_version_id, s(offer.shared_version_id));
  if (!versionKey) return null;
  const share = rows(st, "share_records").find(
    (x) =>
      x.offer_id === offer.id &&
      x.offer_version_id === versionKey &&
      x.contact_id === grant.contact_id &&
      x.state === "sample_shared",
  );
  if (!share) return null;
  const v = st.tables.offer_versions?.[versionKey];
  if (!v) return null;
  const accepted = acceptance?.offer_version_id === v.id;
  const state = accepted
    ? "accepted"
    : v.id !== offer.current_version_id
      ? "superseded"
      : s(offer.status);
  const expired =
    !accepted &&
    v.expires_at &&
    Date.parse(s(v.expires_at)) <= Date.parse(st.sample_clock);
  const allowed = state === "shared" && !expired;
  const reason = accepted
    ? "This offer has already been accepted."
    : state === "superseded"
      ? "Offer updated — waiting for the new version."
      : expired || state === "expired"
        ? "This offer has expired. Ask for an updated offer."
        : state === "withdrawn"
          ? "This offer has been withdrawn."
          : state === "change_requested"
            ? "Your requested changes are with the owner."
            : !allowed
              ? "This offer is not ready for acceptance."
              : null;
  const money = o(accepted ? acceptance?.price_snapshot : v.price);
  const contact = st.tables.contacts?.[s(grant.contact_id)];
  const profile = rows(st, "profiles")
    .map((x) => published(st, "profiles", x.id))
    .find((x) => !!x);
  let amendment: BuyerAmendment | null = null;
  const prior = rows(st, "acceptances").find(
    (x) =>
      x.offer_id === offer.id &&
      x.offer_version_id === offer.accepted_version_id &&
      x.offer_version_id !== v.id,
  );
  if (prior) {
    const old = o(prior.price_snapshot),
      p = rows(st, "projects").find((x) => x.offer_id === offer.id);
    const start: string | null =
      s(o(v.terms).proposed_start_at, s(p?.committed_start_at)) || null;
    let due: string | null = s(p?.committed_due_at) || null,
      reason: string | null = null;
    try {
      if (start) {
        const dates = amendmentSchedule(start, o(v.terms));
        due = dates.due;
      }
    } catch {
      reason = "The proposed timing needs owner review before acceptance.";
    }
    const oldDeposit = halfUp(
        n(old.amount_minor),
        n(o(prior.terms_snapshot).deposit_basis_points),
        10000,
      ),
      newDeposit = halfUp(
        n(money.amount_minor),
        n(o(v.terms).deposit_basis_points),
        10000,
      );
    if (newDeposit < oldDeposit)
      reason =
        "An existing invoice credit or refund needs owner review before acceptance.";
    amendment = {
      previous_price: {
        amount_minor: n(old.amount_minor),
        currency: s(old.currency),
        scale: n(old.scale),
      },
      previous_terms: terms(prior.terms_snapshot),
      previous_title: s(
        prior.title_snapshot,
        s(st.tables.offer_versions?.[s(prior.offer_version_id)]?.title),
      ),
      price_delta_minor: n(money.amount_minor) - n(old.amount_minor),
      deposit_delta_minor: newDeposit - oldDeposit,
      existing_project_id: p?.id || "",
      proposed_start_at: start,
      proposed_due_at: due,
      requires_review_reason: reason,
    };
  }
  return {
    amendment,
    engagement_id: engagementId,
    offer_id: offer.id,
    offer_version_id: v.id,
    offer_record_version: offer.version,
    share_id: share.id,
    freelancer_name: s(profile?.public_name, "Freelancer"),
    buyer_name: s(contact?.display_name),
    title: s(accepted ? (acceptance?.title_snapshot ?? v.title) : v.title),
    deliverables: a<Record<string, unknown>>(
      accepted
        ? (acceptance?.deliverables_snapshot ?? v.deliverables)
        : v.deliverables,
    ).map((x) => ({
      key: s(x.key),
      label: s(x.label),
      quantity: n(x.quantity),
    })),
    price: {
      amount_minor: n(money.amount_minor),
      currency: s(money.currency),
      scale: n(money.scale),
    },
    terms: terms(accepted ? acceptance?.terms_snapshot : v.terms),
    buyer_note: s(
      accepted
        ? (acceptance?.buyer_note_snapshot ?? v.buyer_note)
        : v.buyer_note,
    ),
    expires_at: typeof v.expires_at === "string" ? v.expires_at : null,
    state: expired ? "expired" : state,
    accept_eligibility: { allowed, reason },
  };
}
function safeFiles(
  st: StoreState,
  ids: string[],
  projectId?: string,
  conversationId?: string,
): Entity[] {
  const project = st.tables.projects?.[projectId || ""];
  const conversation = st.tables.conversations?.[conversationId || ""];
  const engagement = rows(st, "engagements").find((x) =>
    conversationId
      ? x.conversation_id === conversationId
      : x.project_id === projectId,
  );
  const clientId = s(project?.client_id, s(conversation?.client_id));
  return ids
    .map((id) => st.tables.attachments?.[id])
    .filter((x): x is Entity => {
      if (!x || x.shared_with_buyer !== true) return false;
      if (x.project_id && x.project_id !== projectId) return false;
      if (x.conversation_id && x.conversation_id !== conversationId)
        return false;
      if (x.engagement_id && x.engagement_id !== engagement?.id) return false;
      if (x.client_id && x.client_id !== clientId) return false;
      return (
        !!x.project_id ||
        !!x.conversation_id ||
        !!x.engagement_id ||
        !!x.client_id ||
        x.audience === "public"
      );
    })
    .map((x) =>
      pick(x, [
        "name",
        "filename",
        "media_type",
        "mime_type",
        "byte_length",
        "size_bytes",
        "storage_kind",
        "storage_locator",
        "content_ref",
        "availability",
      ]),
    );
}
function messages(st: StoreState, conversationId: string): Entity[] {
  return rows(st, "messages")
    .filter(
      (x) =>
        x.conversation_id === conversationId &&
        x.shared_with_buyer === true &&
        ["sample_sent", "sample_recorded", "recorded"].includes(s(x.delivery_state)),
    )
    .map((x) => {
      const dto = pick(x, [
        "content",
        "sender_kind",
        "delivery_state",
        "created_at",
        "attachment_ids",
      ]);
      dto.attachments = safeFiles(
        st,
        a<string>(x.attachment_ids),
        undefined,
        conversationId,
      );
      return dto;
    });
}
export interface InquiryProjection {
  engagement_id: string;
  grant_id: string;
  contact: { display_name: string; email: string };
  conversation: Entity;
  requirements: Entity;
  messages: Entity[];
}
export function inquiryProjection(
  st: StoreState,
  engagementId: string,
  grantId: string,
): InquiryProjection | null {
  if (st.remote) return st.remote.engagementId === engagementId ? st.remote.inquiry as InquiryProjection | null : null;
  const grant = validGrant(st, engagementId, grantId);
  if (!grant) return null;
  const conv = st.tables.conversations?.[s(grant.conversation_id)],
    contact = st.tables.contacts?.[s(grant.contact_id)];
  if (!conv || !contact) return null;
  const req = st.tables.requirements?.[s(conv.brief_requirements_id)];
  if (!req) return null;
  return {
    engagement_id: engagementId,
    grant_id: grantId,
    contact: { display_name: s(contact.display_name), email: s(contact.email) },
    conversation: pick(conv, ["owner_review_requested", "status"]),
    requirements: {
      ...pick(req, ["budget", "delivery_business_days"]),
      requested_scope: structuredClone(
        req.requested_scope || req.deliverables || [],
      ),
      requested_budget: structuredClone(
        req.requested_budget ?? req.budget ?? null,
      ),
      requested_delivery_business_days:
        req.requested_delivery_business_days ??
        req.delivery_business_days ??
        null,
      unknowns: structuredClone(req.unknowns || req.missing_fields || []),
    },
    messages: messages(st, conv.id),
  };
}
export interface BuyerPortal {
  engagement_id: string;
  contact: { display_name: string; email: string };
  offer: BuyerOffer | null;
  project: Entity | null;
  inputs: Entity[];
  milestones: Entity[];
  files: Entity[];
  messages: Entity[];
  invoices: Entity[];
  requests: Entity[];
  receipts: Entity[];
}
export function buyerPortal(
  st: StoreState,
  engagementId: string,
  grantId: string,
): BuyerPortal | null {
  if (st.remote) return st.remote.engagementId === engagementId ? st.remote.portal as BuyerPortal | null : null;
  const grant = validGrant(st, engagementId, grantId);
  if (!grant) return null;
  const raw = st.tables.projects?.[s(grant.project_id)],
    contact = st.tables.contacts?.[s(grant.contact_id)];
  if (!contact) return null;
  const project = raw
    ? pick(raw, [
        "title",
        "brief",
        "state",
        "professional_delivery_state",
        "committed_start_at",
        "committed_due_at",
        "deposit_state",
        "inputs_state",
        "delivery_message",
        "revision_requested",
        "revision_reason",
        "pending_amendment_schedule",
        "amendment_schedule_state",
        "amendment_deposit_required",
      ])
    : null;
  const invoices = raw
    ? rows(st, "invoices")
        .filter(
          (x) =>
            x.project_id === raw.id &&
            x.state !== "void" &&
            (x.state !== "draft" || !!x.authorized_by_acceptance_id),
        )
        .map((x) => {
          const dto = pick(x, [
            "number",
            "state",
            "currency",
            "kind",
            "due_at",
            "issued_at",
          ]);
          dto.total_minor = invoiceTotal(st, x);
          dto.outstanding_minor = invoiceOutstanding(st, x.id);
          dto.lines = rows(st, "invoice_lines")
            .filter((l) => l.invoice_id === x.id)
            .map((l) =>
              pick(l, [
                "description",
                "quantity",
                "unit_amount",
                "tax_basis_points",
              ]),
            );
          return dto;
        })
    : [];
  const invoiceIds = invoices.map((x) => x.id),
    requests = rows(st, "payment_requests")
      .filter((x) => invoiceIds.includes(s(x.invoice_id)))
      .map((x) =>
        pick(x, ["invoice_id", "expected", "state", "mode", "expires_at"]),
      );
  const requestIds = requests.map((x) => x.id);
  const receipts = rows(st, "receipts")
    .filter((x) => requestIds.includes(s(x.payment_request_id)))
    .map((x) =>
      pick(x, [
        "payment_request_id",
        "gross",
        "observation_state",
        "reconciliation_state",
        "received_at",
      ]),
    );
  return {
    engagement_id: engagementId,
    contact: { display_name: s(contact.display_name), email: s(contact.email) },
    offer: buyerOffer(st, engagementId, grantId),
    project,
    inputs: raw
      ? rows(st, "required_inputs")
          .filter((x) => x.project_id === raw.id)
          .map((x) =>
            pick(x, [
              "key",
              "label",
              "required",
              "state",
              "answer",
              "attachment_ids",
              "provided_at",
              "review_reason",
            ]),
          )
      : [],
    milestones: raw
      ? rows(st, "milestones")
          .filter((x) => x.project_id === raw.id && b(x.shared_with_buyer))
          .map((x) => pick(x, ["title", "state", "due_at"]))
      : [],
    files: safeFiles(
      st,
      [
        ...new Set([
          ...(raw ? a<string>(raw.shared_attachment_ids) : []),
          ...rows(st, "required_inputs")
            .filter((x) => raw && x.project_id === raw.id)
            .flatMap((x) => a<string>(x.attachment_ids)),
          ...rows(st, "messages")
            .filter(
              (x) =>
                x.conversation_id === grant.conversation_id &&
                x.shared_with_buyer === true,
            )
            .flatMap((x) => a<string>(x.attachment_ids)),
        ]),
      ],
      raw?.id,
      s(grant.conversation_id),
    ),
    messages: messages(st, s(grant.conversation_id)),
    invoices,
    requests,
    receipts,
  };
}
export const getPublicProfile = publicProfile;
export const getBuyerOffer = buyerOffer;
export const getBuyerPortal = buyerPortal;
export const getInquiry = inquiryProjection;
