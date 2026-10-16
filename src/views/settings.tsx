"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { sampleId } from "@/lib/local-crypto";
import { s, n, b, o, a, date, label, type Entity } from "@/lib/types";
import {
  Field,
  PageHead,
  Panel,
  Button,
  LinkButton,
  Badge,
  Empty,
  Modal,
  Confirm,
  useDirtyGuard,
} from "@/components/ui";
import {
  persistUpload,
  attachmentBlob,
  downloadBlob,
  downloadText,
  validateUpload,
} from "@/lib/downloads";
import "./settings.css";

const ROLES = [
  "scout",
  "promoter",
  "sales",
  "account_manager",
  "operations",
  "finance",
];
const ROLE_NAMES: Record<string, string> = {
  scout: "Scout",
  promoter: "Promoter",
  sales: "Sales",
  account_manager: "Account Manager",
  operations: "Operations",
  finance: "Finance",
};
const NAV = [
  ["Profile", "profile"],
  ["Rules", "rules"],
  ["Preferences", "preferences"],
  ["Knowledge", "knowledge"],
];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validDate = (value: string) => {
  const parsed = new Date(value);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};
const safeURL = (url: string) => {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
};
const changed = (x: unknown, y: unknown) =>
  JSON.stringify(x) !== JSON.stringify(y);
const uid = sampleId;
function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div className="settings-error" role="alert">
      {message}
    </div>
  ) : null;
}
function SettingsTabs({ path }: { path: string }) {
  const { t } = useStore();
  return (
    <nav className="settings-tabs" aria-label={t("Settings sections")}>
      {NAV.map(([name, id]) => (
        <Link
          key={id}
          href={`/app/settings/${id}`}
          aria-current={path.endsWith(id) ? "page" : undefined}
        >
          {t(name)}
        </Link>
      ))}
    </nav>
  );
}
function ActionBar({
  dirty,
  onCancel,
  children,
}: {
  dirty: boolean;
  onCancel: () => void;
  children: ReactNode;
}) {
  const { t } = useStore();
  return (
    <div className="settings-actions">
      {children}
      <Button
        variant="secondary"
        type="button"
        onClick={onCancel}
        disabled={!dirty}
      >
        {t("Discard changes")}
      </Button>
      {dirty && <span className="settings-dirty">{t("Unsaved changes")}</span>}
    </div>
  );
}

export default function Settings({ path }: { path: string }) {
  const { t } = useStore();
  if (path.startsWith("/app/connections")) return <Connections />;
  return (
    <div className="settings-content">
      <PageHead
        title={t("Make it your own.")}
        description={t("Your business, your boundaries, your way of working.")}
      />
      <SettingsTabs path={path} />
      {path.endsWith("/rules") ? (
        <Rules />
      ) : path.endsWith("/preferences") ? (
        <Preferences />
      ) : path.endsWith("/knowledge") ? (
        <Knowledge />
      ) : (
        <Profile />
      )}
    </div>
  );
}

type ProfileDraft = {
  public_name: string;
  handle: string;
  headline: string;
  biography: string;
  location_label: string;
  public_contact_email: string;
  approved_portfolio_ids: string[];
};
function profileDraft(x: Entity): ProfileDraft {
  return {
    public_name: s(x.public_name),
    handle: s(x.handle, "alya"),
    headline: s(x.headline),
    biography: s(x.biography),
    location_label: s(x.location_label),
    public_contact_email: s(x.public_contact_email),
    approved_portfolio_ids: a<string>(x.approved_portfolio_ids),
  };
}
function Profile() {
  const { record, rows, command, notify, t } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const saved = record("profiles", "profile_alya")!;
  const [draft, setDraft] = useState(() => profileDraft(saved));
  const [base, setBase] = useState(saved.version);
  const [error, setError] = useState("");
  const [service, setService] = useState<Entity | null | undefined>(() =>
    params.get("service")
      ? record("services", s(params.get("service")))
      : undefined,
  );
  const [review, setReview] = useState<{
    profile: Entity;
    services: Entity[];
  } | null>(null);
  const [preview, setPreview] = useState(false);
  const [archive, setArchive] = useState<Entity | null>(null);
  const [undoService, setUndoService] = useState<string | null>(null);
  const tab = params.get("tab") || "profile";
  const dirty = changed(draft, profileDraft(saved));
  useDirtyGuard(dirty);
  const services = rows("services").filter((x) => !b(x.archived));
  const portfolio = rows("portfolio_items").filter(
    (x) => x.audience === "public" && !b(x.archived),
  );
  const update = (key: keyof ProfileDraft, value: string | string[]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    if (
      !draft.public_name.trim() ||
      !SLUG.test(draft.handle) ||
      !draft.headline.trim()
    ) {
      setError(
        t(
          "Enter a name, a headline, and a handle using lowercase letters, numbers, or hyphens.",
        ),
      );
      return;
    }
    if (
      draft.public_contact_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.public_contact_email)
    ) {
      setError(t("Enter a valid contact email."));
      return;
    }
    const r = (await command("record.save", {
      table: "profiles",
      id: saved.id,
      expected_version: base,
      values: draft,
    }));
    if (r.ok) {
      setBase(base + 1);
      notify(t("Profile draft saved. Review changes before publishing."));
    } else setError(r.message);
  };
  const reviewPublish = () => {
    setError("");
    if (dirty) {
      setError(t("Save your draft before reviewing public changes."));
      return;
    }
    if (
      !saved.public_name ||
      !saved.headline ||
      !SLUG.test(s(saved.handle, "alya"))
    ) {
      setError(t("Complete the profile before publishing."));
      return;
    }
    setReview({
      profile: structuredClone(saved),
      services: structuredClone(services),
    });
  };
  const publish = async () => {
    if (!review) return;
    const r = (await command("profile.publish", {
      id: saved.id,
      expected_version: review.profile.version,
      service_versions: Object.fromEntries(
        review.services.map((x) => [x.id, x.version]),
      ),
      destination: `/u/${s(review.profile.handle, "alya")}`,
      reviewed: true,
    }));
    if (r.ok) {
      setReview(null);
      setBase(saved.version + 1);
      notify(t("Sample profile published."));
    } else {
      setError(r.message);
      setReview(null);
    }
  };
  return (
    <>
      <div className="settings-tabs" aria-label={t("Profile sections")}>
        {[
          ["Profile", "profile"],
          ["Services", "services"],
          ["Availability & defaults", "availability"],
        ].map(([name, key]) => (
          <Link
            key={key}
            href={`/app/settings/profile?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
          >
            {t(name)}
          </Link>
        ))}
      </div>
      <ErrorMessage message={error} />
      {undoService && (
        <div className="settings-success" role="status">
          {t("Service archived.")}{" "}
          <Button
            variant="secondary"
            onClick={async () => {
              const x = record("services", undoService);
              const r = (await command("record.archive", {
                table: "services",
                id: undoService,
                expected_version: x?.version,
                archived: false,
              }));
              if (r.ok) {
                setUndoService(null);
                notify(t("Service restored."));
              } else setError(r.message);
            }}
          >
            {t("Undo")}
          </Button>
        </div>
      )}
      {tab === "availability" ? (
        <Availability onSaved={(version) => setBase(version)} />
      ) : tab === "services" ? (
        <Panel>
          <div className="settings-row">
            <div>
              <h2>{t("What you offer")}</h2>
              <p>
                {t(
                  "Clear services help your team start the right conversations.",
                )}
              </p>
            </div>
            <Button onClick={() => setService(null)}>{t("Add service")}</Button>
          </div>
          {services.length ? (
            <div className="settings-list">
              {services.map((x) => (
                <div className="settings-row" key={x.id}>
                  <div>
                    <strong>{s(x.title)}</strong>
                    <p>{s(x.description)}</p>
                    <span className="settings-meta">
                      {s(x.pricing_label)} · v{x.version}
                    </span>
                  </div>
                  <div className="settings-row-actions">
                    <Button variant="secondary" onClick={() => setService(x)}>
                      {t("Edit service")}
                    </Button>
                    <Button variant="secondary" onClick={() => setArchive(x)}>
                      {t("Archive")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title={t("Your next service starts here")}
              description={t("Add a service in your own words.")}
            />
          )}
          <div className="settings-actions">
            <Button onClick={reviewPublish}>
              {t("Review public changes")}
            </Button>
            <LinkButton
              variant="secondary"
              href={`/u/${s(saved.handle, "alya")}`}
            >
              {t("Open public profile")}
            </LinkButton>
          </div>
        </Panel>
      ) : (
        <div className="settings-grid">
          <Panel>
            <form noValidate className="settings-form" onSubmit={save}>
              <div>
                <h2>{t("Your business profile")}</h2>
                <p>{t("Introduce the person behind the work.")}</p>
              </div>
              <Field label={t("Business or professional name")}>
                <input
                  value={draft.public_name}
                  maxLength={100}
                  onChange={(e) => update("public_name", e.target.value)}
                  required
                />
              </Field>
              <Field label={t("Public handle")}>
                <input
                  value={draft.handle}
                  maxLength={60}
                  onChange={(e) => update("handle", e.target.value)}
                  required
                />
                <span className="settings-meta">/u/{draft.handle}</span>
              </Field>
              <Field label={t("Professional headline")}>
                <input
                  value={draft.headline}
                  maxLength={160}
                  onChange={(e) => update("headline", e.target.value)}
                  required
                />
              </Field>
              <Field label={t("About your work")}>
                <textarea
                  className="resize-none"
                  value={draft.biography}
                  maxLength={4000}
                  onChange={(e) => update("biography", e.target.value)}
                />
              </Field>
              <div className="settings-fields">
                <Field label={t("Location")}>
                  <input
                    value={draft.location_label}
                    maxLength={100}
                    onChange={(e) => update("location_label", e.target.value)}
                  />
                </Field>
                <Field label={t("Public contact email")}>
                  <input
                    type="email"
                    value={draft.public_contact_email}
                    onChange={(e) =>
                      update("public_contact_email", e.target.value)
                    }
                  />
                </Field>
              </div>
              <div>
                <h3>{t("Approved portfolio")}</h3>
                <p>{t("Only approved public examples are available here.")}</p>
                <div className="settings-portfolio">
                  {portfolio.map((x) => (
                    <label className="settings-check" key={x.id}>
                      <input
                        type="checkbox"
                        checked={draft.approved_portfolio_ids.includes(x.id)}
                        onChange={(e) =>
                          update(
                            "approved_portfolio_ids",
                            e.target.checked
                              ? [...draft.approved_portfolio_ids, x.id]
                              : draft.approved_portfolio_ids.filter(
                                  (id) => id !== x.id,
                                ),
                          )
                        }
                      />
                      {s(x.title)}
                    </label>
                  ))}
                </div>
              </div>
              <ActionBar
                dirty={dirty}
                onCancel={() => {
                  setDraft(profileDraft(saved));
                  setBase(saved.version);
                  setError("");
                }}
              >
                <Button type="submit" disabled={!dirty}>
                  {t("Save profile draft")}
                </Button>
              </ActionBar>
            </form>
          </Panel>
          <aside className="settings-aside">
            <Panel>
              <h2>{t("Your public page")}</h2>
              <p className="settings-help">
                {t(
                  "Saved drafts stay private until you review and publish the exact changes.",
                )}
              </p>
              <div className="settings-actions">
                <Button onClick={reviewPublish}>
                  {t("Review public changes")}
                </Button>
                <Button variant="secondary" onClick={() => setPreview(true)}>
                  {t("Preview public page")}
                </Button>
                <LinkButton
                  variant="secondary"
                  href={`/u/${s(saved.handle, "alya")}`}
                >
                  {t("Open public profile")}
                </LinkButton>
              </div>
            </Panel>
          </aside>
        </div>
      )}
      {service !== undefined && (
        <ServiceEditor
          service={service}
          onClose={() => setService(undefined)}
        />
      )}
      {archive && (
        <Confirm
          title={t("Archive this service?")}
          description={`${s(archive.title)}. ${t("It will be removed from future public publication. Accepted offers keep their saved scope.")}`}
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            const r = (await command("record.archive", {
              table: "services",
              id: archive.id,
              expected_version: archive.version,
            }));
            if (r.ok) {
              notify(t("Service archived."));
              setUndoService(archive.id);
              setArchive(null);
            } else setError(r.message);
          }}
        />
      )}
      {preview && (
        <Modal
          title={t("Draft preview — visible only to you")}
          onClose={() => setPreview(false)}
        >
          <PublicPreview profile={{ ...saved, ...draft }} services={services} />
          <p className="settings-help">
            {t("This preview does not publish your changes.")}
          </p>
        </Modal>
      )}
      {review && (
        <Modal
          title={t("Review your public changes")}
          onClose={() => setReview(null)}
        >
          <p className="settings-help">
            {t(
              "The following saved content will appear on your sample public page.",
            )}
          </p>
          <PublicationDiff
            profile={review.profile}
            services={review.services}
          />
          <PublicPreview profile={review.profile} services={review.services} />
          <p className="settings-note">
            {t(
              "Publishing approves this exact profile and service version. Private notes, business rules, and account details stay private.",
            )}
          </p>
          <div className="settings-modal-actions">
            <Button variant="secondary" onClick={() => setReview(null)}>
              {t("Keep editing")}
            </Button>
            <Button onClick={publish}>{t("Publish sample profile")}</Button>
          </div>
        </Modal>
      )}
      {params.get("service") &&
        !services.some((x) => x.id === params.get("service")) && (
          <Modal
            title={t("Service not found")}
            onClose={() => router.push("/app/settings/profile?tab=services")}
          >
            <p>
              {t(
                "This service may have been archived. Choose an available service from the list.",
              )}
            </p>
          </Modal>
        )}
    </>
  );
}
function PublicationDiff({
  profile,
  services,
}: {
  profile: Entity;
  services: Entity[];
}) {
  const { record, t } = useStore();
  const before = o(
    record("publication_snapshots", `profiles_${profile.id}`)?.values,
  );
  const fields = [
    ["public_name", "Business or professional name"],
    ["handle", "Public handle"],
    ["headline", "Professional headline"],
    ["biography", "About your work"],
    ["location_label", "Location"],
    ["public_contact_email", "Public contact email"],
    ["public_availability", "Public availability"],
  ];
  const edits = fields.filter(
    ([key]) =>
      s(before[key], key === "handle" ? "alya" : "") !==
      s(profile[key], key === "handle" ? "alya" : ""),
  );
  const serviceChanges = services.filter((x) => {
    const old = o(record("publication_snapshots", `services_${x.id}`)?.values);
    return (
      ["title", "slug", "description", "pricing_label"].some(
        (key) => s(old[key]) !== s(x[key]),
      ) || changed(old.deliverables, x.deliverables)
    );
  });
  return (
    <details className="settings-review" open>
      <summary>{t("Changes since last publication")}</summary>
      {edits.length || serviceChanges.length ? (
        <>
          <dl>
            {edits.map(([key, caption]) => (
              <div key={key}>
                <dt>{t(caption)}</dt>
                <dd>
                  <del>{s(before[key], t("Not set"))}</del>
                  <br />
                  <strong>{s(profile[key], t("Not set"))}</strong>
                </dd>
              </div>
            ))}
          </dl>
          {serviceChanges.map((x) => (
            <p key={x.id}>
              {t("Service updated")}: {s(x.title)} · v{x.version}
            </p>
          ))}
        </>
      ) : (
        <p>
          {t(
            "Profile text is unchanged. Review the approved portfolio and full service list below.",
          )}
        </p>
      )}
    </details>
  );
}
function PublicPreview({
  profile,
  services,
}: {
  profile: Entity;
  services: Entity[];
}) {
  const { t, rows } = useStore();
  const portfolio = rows("portfolio_items").filter(
    (x) =>
      a<string>(profile.approved_portfolio_ids).includes(x.id) &&
      x.audience === "public" &&
      !b(x.archived),
  );
  return (
    <div className="settings-review">
      <span className="settings-meta">
        /u/{s(profile.handle, "alya")} · v{profile.version}
      </span>
      <h2>{s(profile.public_name)}</h2>
      <h3>{s(profile.headline)}</h3>
      <p>{s(profile.biography)}</p>
      <p className="settings-meta">
        {s(profile.location_label)} · {s(profile.public_contact_email)}
      </p>
      <h3>{t("Approved portfolio")}</h3>
      {portfolio.map((x) => (
        <div className="settings-rule" key={x.id}>
          <strong>{s(x.title)}</strong>
          <p>{s(x.summary)}</p>
          <span className="settings-meta">v{x.version}</span>
        </div>
      ))}
      <h3>{t("Services")}</h3>
      {services.map((x) => (
        <div className="settings-rule" key={x.id}>
          <strong>{s(x.title)}</strong>
          <p>{s(x.description)}</p>
          <ul>
            {a<string>(x.deliverables).map((z, i) => (
              <li key={i}>{z}</li>
            ))}
          </ul>
          <p>{s(x.pricing_label)}</p>
          <span className="settings-meta">
            /u/{s(profile.handle, "alya")}/services/{s(x.slug)} · v{x.version}
          </span>
        </div>
      ))}
    </div>
  );
}

type ServiceDraft = {
  title: string;
  slug: string;
  description: string;
  deliverables: string;
  pricing_label: string;
  category: string;
  amount: string;
  currency: string;
};
function ServiceEditor({
  service,
  onClose,
}: {
  service: Entity | null;
  onClose: () => void;
}) {
  const { rows, command, t, notify } = useStore();
  const initial: ServiceDraft = {
    title: s(service?.title),
    slug: s(service?.slug),
    description: s(service?.description),
    deliverables: a<string>(service?.deliverables).join("\n"),
    pricing_label: s(service?.pricing_label, "Custom quote after a brief"),
    category: s(service?.category),
    amount: service?.price ? String(n(o(service.price).amount_minor)) : "",
    currency: s(o(service?.price).currency, "USD"),
  };
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const dirty = changed(initial, draft);
  const update = (key: keyof ServiceDraft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (
      !draft.title.trim() ||
      !draft.description.trim() ||
      !SLUG.test(draft.slug)
    ) {
      setError(t("Add a title, a description, and a valid service slug."));
      return;
    }
    if (
      rows("services").some(
        (x) => x.id !== service?.id && x.slug === draft.slug && !b(x.archived),
      )
    ) {
      setError(t("Another service already uses this slug."));
      return;
    }
    if (
      draft.amount &&
      (!/^\d+$/.test(draft.amount) ||
        Number(draft.amount) < 1 ||
        !Number.isSafeInteger(Number(draft.amount)))
    ) {
      setError(t("Use a positive whole-number amount in minor units."));
      return;
    }
    const r = (await command("record.save", {
      table: "services",
      id: service?.id,
      expected_version: service?.version,
      values: {
        profile_id: "profile_alya",
        title: draft.title.trim(),
        slug: draft.slug,
        description: draft.description.trim(),
        deliverables: draft.deliverables.split("\n").filter((x) => x.trim()),
        pricing_label: draft.pricing_label,
        category: draft.category,
        price: draft.amount
          ? {
              amount_minor: Number(draft.amount),
              currency: draft.currency,
              scale: draft.currency === "IDR" ? 0 : 2,
            }
          : null,
        published: service?.published || false,
        audience: "owner",
      },
    }));
    if (r.ok) {
      notify(t("Service draft saved. Review changes before publishing."));
      onClose();
    } else setError(r.message);
  };
  return (
    <Modal
      title={t(service ? "Edit service" : "Add service")}
      onClose={onClose}
      dirty={dirty}
    >
      <form noValidate onSubmit={save} className="settings-form">
        <ErrorMessage message={error} />
        <Field label={t("Service title")}>
          <input
            required
            maxLength={140}
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </Field>
        <Field label={t("Service slug")}>
          <input
            required
            value={draft.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="research-and-strategy"
          />
        </Field>
        <Field label={t("Description")}>
          <textarea
            className="resize-none"
            required
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <Field label={t("Deliverables — one per line")}>
          <textarea
            className="resize-none"
            value={draft.deliverables}
            onChange={(e) => update("deliverables", e.target.value)}
          />
        </Field>
        <Field label={t("Pricing label")}>
          <input
            value={draft.pricing_label}
            onChange={(e) => update("pricing_label", e.target.value)}
          />
        </Field>
        <details>
          <summary>{t("Optional fixed pricing")}</summary>
          <div className="settings-fields">
            <Field label={t("Amount in minor units")}>
              <input
                inputMode="numeric"
                value={draft.amount}
                onChange={(e) => update("amount", e.target.value)}
              />
            </Field>
            <Field label={t("Currency")}>
              <select
                value={draft.currency}
                onChange={(e) => update("currency", e.target.value)}
              >
                <option>USD</option>
                <option>IDR</option>
              </select>
            </Field>
          </div>
          <p>
            {t("For USD, 100 minor units equals 1.00. IDR uses whole rupiah.")}
          </p>
        </details>
        <div className="settings-modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!dirty}>
            {t("Save service draft")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Availability({ onSaved }: { onSaved: (version: number) => void }) {
  const { record, command, notify, t } = useStore();
  const profile = record("profiles", "profile_alya")!;
  const policy = record("policies", "policy_business")!;
  const initial = {
    availability: s(profile.public_availability, "open_to_inquiries"),
    available_effort_minutes: n(policy.available_effort_minutes, 720),
    start: s(policy.start_local_time, "09:00"),
    end: s(policy.due_local_time, "17:00"),
    weekdays: a<number>(policy.business_weekdays),
    deposit: n(policy.deposit_basis_points, 6000) / 100,
    reservation: n(policy.reservation_hours, 48),
    holidays: a<string>(policy.holiday_dates).join("\n"),
  };
  const [d, setD] = useState(initial);
  const [error, setError] = useState("");
  const [pver, setPver] = useState(policy.version);
  const [ver, setVer] = useState(profile.version);
  const dirty = changed(initial, d);
  useDirtyGuard(dirty);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.end) ||
      d.start >= d.end ||
      !d.weekdays.length ||
      !Number.isInteger(d.available_effort_minutes) ||
      d.available_effort_minutes < 0 ||
      d.available_effort_minutes > 10080 ||
      d.deposit < 0 ||
      d.deposit > 100 ||
      d.reservation < 1 ||
      d.reservation > 720
    ) {
      setError(
        t(
          "Check your working hours, capacity, deposit, and reservation window.",
        ),
      );
      return;
    }
    const holidays = d.holidays
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (
      new Set(holidays).size !== holidays.length ||
      holidays.some((x) => !validDate(x))
    ) {
      setError(
        t("Enter unique valid holiday dates, one YYYY-MM-DD date per line."),
      );
      return;
    }
    const r = (await command("settings.availability", {
      profile_id: profile.id,
      profile_version: ver,
      policy_id: policy.id,
      policy_version: pver,
      profile_values: { public_availability: d.availability },
      policy_values: {
        available_effort_minutes: d.available_effort_minutes,
        start_local_time: d.start,
        due_local_time: d.end,
        business_weekdays: d.weekdays,
        deposit_basis_points: Math.round(d.deposit * 100),
        reservation_hours: d.reservation,
        holiday_dates: holidays,
      },
    }));
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setPver(pver + 1);
    setVer(ver + 1);
    onSaved(ver + 1);
    setError("");
    notify(t("Availability and future business defaults saved."));
  };
  return (
    <Panel>
      <form noValidate className="settings-form" onSubmit={save}>
        <h2>{t("Make room for the right work")}</h2>
        <p>
          {t(
            "Your public availability and actual working capacity are separate.",
          )}
        </p>
        <ErrorMessage message={error} />
        <div className="settings-availability">
          {[
            [
              "open_to_inquiries",
              "Open to inquiries",
              "Welcome new conversations.",
            ],
            [
              "limited",
              "Limited availability",
              "Discuss timing before committing.",
            ],
            ["unavailable", "Unavailable", "Pause new inquiries."],
          ].map(([value, title, description]) => (
            <label className="settings-option" key={value}>
              <input
                type="radio"
                name="availability"
                checked={d.availability === value}
                onChange={() => setD({ ...d, availability: value })}
              />
              {t(title)}
              <span>{t(description)}</span>
            </label>
          ))}
        </div>
        <p className="settings-help">
          {t(
            "Review and publish your profile to update the public availability label.",
          )}
        </p>
        <h3>{t("Working capacity")}</h3>
        <Field label={t("Available effort this week (minutes)")}>
          <input
            type="number"
            min="0"
            max="10080"
            value={d.available_effort_minutes}
            onChange={(e) =>
              setD({ ...d, available_effort_minutes: Number(e.target.value) })
            }
          />
        </Field>
        <div>
          <h3>{t("Working days")}</h3>
          <div className="settings-day-grid">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((name, i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  checked={d.weekdays.includes(i)}
                  onChange={(e) =>
                    setD({
                      ...d,
                      weekdays: e.target.checked
                        ? [...d.weekdays, i].sort()
                        : d.weekdays.filter((x) => x !== i),
                    })
                  }
                />
                {t(name)}
              </label>
            ))}
          </div>
        </div>
        <div className="settings-fields">
          <Field label={t("Start time")}>
            <input
              type="time"
              value={d.start}
              onChange={(e) => setD({ ...d, start: e.target.value })}
            />
          </Field>
          <Field label={t("Finish time")}>
            <input
              type="time"
              value={d.end}
              onChange={(e) => setD({ ...d, end: e.target.value })}
            />
          </Field>
        </div>
        <p>{t("Business schedule timezone")}: Asia/Jakarta</p>
        <Field label={t("Unavailable dates — one YYYY-MM-DD per line")}>
          <textarea
            className="resize-none"
            value={d.holidays}
            onChange={(e) => setD({ ...d, holidays: e.target.value })}
          />
        </Field>
        <h3>{t("Commercial defaults")}</h3>
        <div className="settings-fields">
          <Field label={t("Deposit (%)")}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={d.deposit}
              onChange={(e) => setD({ ...d, deposit: Number(e.target.value) })}
            />
          </Field>
          <Field label={t("Provisional reservation (hours)")}>
            <input
              type="number"
              min="1"
              max="720"
              value={d.reservation}
              onChange={(e) =>
                setD({ ...d, reservation: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <p className="settings-note">
          {t(
            "New defaults apply to future drafts. Accepted offers keep their agreed price, scope, and timing.",
          )}
        </p>
        <ActionBar
          dirty={dirty}
          onCancel={() => {
            setD(initial);
            setPver(policy.version);
            setVer(profile.version);
          }}
        >
          <Button type="submit" disabled={!dirty}>
            {t("Save availability & defaults")}
          </Button>
        </ActionBar>
      </form>
    </Panel>
  );
}

type RoleDraft = {
  allow_internal: boolean;
  stricter_review: boolean;
  allowed_connection_ids: string[];
  max_concurrent: number;
};
function Rules() {
  const { rows, t } = useStore();
  const [role, setRole] = useState("scout");
  const [roleDirty, setRoleDirty] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  return (
    <Panel>
      <div className="settings-form">
        <div>
          <h2>{t("A capable team. Clear boundaries.")}</h2>
          <p>
            {t(
              "Let your crew prepare the work. Keep the decisions that matter.",
            )}
          </p>
        </div>
        <Field label={t("Teammate")}>
          <select
            value={role}
            onChange={(e) =>
              roleDirty
                ? setPendingRole(e.target.value)
                : setRole(e.target.value)
            }
          >
            {ROLES.map((x) => (
              <option value={x} key={x}>
                {t(ROLE_NAMES[x])}
              </option>
            ))}
          </select>
        </Field>
        <RuleForm key={role} role={role} onDirty={setRoleDirty} />
        {pendingRole && (
          <Confirm
            title={t("Discard unsaved rule changes?")}
            description={t("Your last saved version will be kept.")}
            onClose={() => setPendingRole(null)}
            onConfirm={() => {
              setRole(pendingRole);
              setPendingRole(null);
              setRoleDirty(false);
            }}
          />
        )}
        <details>
          <summary>{t("See examples")}</summary>
          <div className="settings-rule">
            <h3>{t("Your team can prepare")}</h3>
            <p>
              {t(
                "Assess a saved request, calculate a draft quote, summarize approved sources, and suggest a follow-up.",
              )}
            </p>
            <h3>{t("Your review is always needed")}</h3>
            <p>
              {t(
                "Send a message, share an offer, publish a page, invite a client, or make a commitment. Each approval is tied to exact content, version, and destination.",
              )}
            </p>
            <h3>{t("Only people can decide")}</h3>
            <p>
              {t(
                "The buyer accepts their offer. You deliver the professional work. This sample does not move real money.",
              )}
            </p>
          </div>
        </details>
        <p className="settings-note">
          {t(
            "Changing rules affects the next task step. Completed work and accepted agreements stay intact.",
          )}{" "}
          {
            rows("agent_runs").filter((x) =>
              ["running", "queued", "waiting_approval"].includes(s(x.status)),
            ).length
          }{" "}
          {t("active task records will recheck these rules.")}
        </p>
        <LinkButton
          variant="secondary"
          href="/app/settings/profile?tab=availability"
        >
          {t("Working hours & commercial defaults")}
        </LinkButton>
      </div>
    </Panel>
  );
}
function RuleForm({
  role,
  onDirty,
}: {
  role: string;
  onDirty: (dirty: boolean) => void;
}) {
  const { record, rows, command, notify, t } = useStore();
  const policy = record("capability_preferences", `policy_${role}`);
  const initial: RoleDraft = {
    allow_internal: policy?.allow_internal !== false,
    stricter_review: b(policy?.stricter_review),
    allowed_connection_ids: policy
      ? a<string>(policy.allowed_connection_ids)
      : rows("connections")
          .filter((x) => x.state === "connected")
          .map((x) => x.id),
    max_concurrent: n(policy?.max_concurrent, 3),
  };
  const [d, setD] = useState(initial);
  const [version, setVersion] = useState(policy?.version);
  const [error, setError] = useState("");
  const [restore, setRestore] = useState(false);
  const dirty = changed(d, initial);
  useDirtyGuard(dirty);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const validTools = rows("connections")
      .filter(
        (x) => x.state === "connected" && a(x.approved_capabilities).length,
      )
      .map((x) => x.id);
    if (
      !Number.isInteger(d.max_concurrent) ||
      d.max_concurrent < 1 ||
      d.max_concurrent > 10
    ) {
      setError(t("Choose a concurrent task limit from 1 to 10."));
      return;
    }
    if (d.allowed_connection_ids.some((id) => !validTools.includes(id))) {
      setError(
        t("Reconnect the selected tools or remove them from the allowed list."),
      );
      return;
    }
    const r = (await command("record.save", {
      table: "capability_preferences",
      id: `policy_${role}`,
      expected_version: version,
      values: { role, ...d, mandatory_external_approval: true },
    }));
    if (r.ok) {
      setVersion((version || 0) + 1);
      setError("");
      notify(
        t("Team rules saved. Future task steps will check the new rules."),
      );
    } else setError(r.message);
  };
  const defaults = () => {
    setD({
      allow_internal: true,
      stricter_review: false,
      allowed_connection_ids: rows("connections")
        .filter((x) => x.state === "connected")
        .map((x) => x.id),
      max_concurrent: 3,
    });
    setRestore(false);
  };
  return (
    <form noValidate className="settings-form" onSubmit={save}>
      <ErrorMessage message={error} />
      <label className="settings-check">
        <input
          type="checkbox"
          checked={d.allow_internal}
          onChange={(e) => setD({ ...d, allow_internal: e.target.checked })}
        />
        {t("Allow internal assessments and drafts")}
      </label>
      <label className="settings-check">
        <input
          type="checkbox"
          checked={d.stricter_review}
          onChange={(e) => setD({ ...d, stricter_review: e.target.checked })}
        />
        {t("Ask me before starting internal work")}
      </label>
      <div className="settings-note">
        <strong>{t("External actions always need your review")}</strong>
        <br />
        {t(
          "Sending, sharing, publishing, invitations, and client commitments cannot run without exact approval.",
        )}
      </div>
      <div>
        <h3>{t("Allowed sources and tools")}</h3>
        {rows("connections").map((x) => (
          <label key={x.id} className="settings-check">
            <input
              type="checkbox"
              checked={d.allowed_connection_ids.includes(x.id)}
              disabled={x.state !== "connected"}
              onChange={(e) =>
                setD({
                  ...d,
                  allowed_connection_ids: e.target.checked
                    ? [...d.allowed_connection_ids, x.id]
                    : d.allowed_connection_ids.filter((id) => id !== x.id),
                })
              }
            />
            {s(x.label)}{" "}
            {x.state !== "connected" && (
              <span className="settings-meta">{t("Needs reconnect")}</span>
            )}
          </label>
        ))}
        <p>
          {t(
            "Access is limited to the capabilities already approved in Connections.",
          )}
        </p>
      </div>
      <Field label={t("Concurrent task limit")}>
        <input
          type="number"
          min="1"
          max="10"
          value={d.max_concurrent}
          onChange={(e) =>
            setD({ ...d, max_concurrent: Number(e.target.value) })
          }
        />
      </Field>
      <ActionBar
        dirty={dirty}
        onCancel={() => {
          setD(initial);
          setVersion(policy?.version);
          setError("");
        }}
      >
        <Button type="submit" disabled={!dirty}>
          {t("Save team rules")}
        </Button>
      </ActionBar>
      <Button
        variant="secondary"
        type="button"
        onClick={() => (dirty ? setRestore(true) : defaults())}
      >
        {t("Restore recommended rules")}
      </Button>
      {restore && (
        <Confirm
          title={t("Replace unsaved rule changes?")}
          description={t(
            "Recommended rules will be loaded into this draft. Save to apply them.",
          )}
          onConfirm={defaults}
          onClose={() => setRestore(false)}
        />
      )}
    </form>
  );
}

type PreferenceDraft = {
  locale: string;
  timezone: string;
  motion: string;
  focus_mode: string;
  recap_enabled: boolean;
  notification_in_app: boolean;
  notification_email: boolean;
};
function preferenceDraft(x: Entity): PreferenceDraft {
  return {
    locale: s(x.locale, "en"),
    timezone: s(x.timezone, "Asia/Jakarta"),
    motion: s(x.motion, "system"),
    focus_mode: s(x.focus_mode, "normal"),
    recap_enabled: x.recap_enabled !== false,
    notification_in_app: x.notification_in_app !== false,
    notification_email: b(x.notification_email),
  };
}
function Preferences() {
  const { record, command, notify, t } = useStore();
  const saved = record("preferences", "preferences_alya")!;
  const [d, setD] = useState(() => preferenceDraft(saved));
  const [base, setBase] = useState(saved.version);
  const [error, setError] = useState("");
  const [restore, setRestore] = useState(false);
  const dirty = changed(d, preferenceDraft(saved));
  useDirtyGuard(dirty);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      new Intl.DateTimeFormat("en", { timeZone: d.timezone }).format();
    } catch {
      setError(t("Choose a valid display timezone."));
      return;
    }
    const r = (await command("record.save", {
      table: "preferences",
      id: saved.id,
      expected_version: base,
      values: d,
    }));
    if (r.ok) {
      setBase(base + 1);
      setError("");
      notify(d.locale === "id" ? "Preferensi disimpan." : "Preferences saved.");
    } else setError(r.message);
  };
  const defaults = () => {
    setD({
      ...d,
      motion: "system",
      focus_mode: "normal",
      recap_enabled: true,
      notification_in_app: true,
      notification_email: false,
    });
    setRestore(false);
  };
  return (
    <Panel>
      <form noValidate className="settings-form" onSubmit={save}>
        <div>
          <h2>{t("A workspace that feels like you")}</h2>
          <p>
            {t("Choose how Crewmori speaks, moves, and keeps you informed.")}
          </p>
        </div>
        <ErrorMessage message={error} />
        <div className="settings-fields">
          <Field label={t("Language")}>
            <select
              value={d.locale}
              onChange={(e) => setD({ ...d, locale: e.target.value })}
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </Field>
          <Field label={t("Display timezone")}>
            <select
              value={d.timezone}
              onChange={(e) => setD({ ...d, timezone: e.target.value })}
            >
              {[
                "Asia/Jakarta",
                "Asia/Makassar",
                "Asia/Jayapura",
                "Asia/Singapore",
                "Europe/London",
                "America/New_York",
                "America/Los_Angeles",
                "UTC",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="settings-note">
          {d.locale === "id"
            ? "Pratinjau: Selamat datang kembali. Tim Anda siap membantu."
            : "Preview: Welcome back. Your team is here to help."}
        </div>
        <p>
          {t(
            "Display timezone changes date formatting. Your business schedule and saved commitments keep their original times.",
          )}
        </p>
        <Field label={t("Motion")}>
          <select
            value={d.motion}
            onChange={(e) => setD({ ...d, motion: e.target.value })}
          >
            <option value="system">{t("Follow system preference")}</option>
            <option value="reduced">{t("Reduce motion")}</option>
            <option value="enabled">{t("Enable gentle motion")}</option>
          </select>
        </Field>
        <p>
          {t(
            "System reduced-motion settings always take priority. Every action remains available without animation.",
          )}
        </p>
        <Field label={t("Focus mode")}>
          <select
            value={d.focus_mode}
            onChange={(e) => setD({ ...d, focus_mode: e.target.value })}
          >
            <option value="normal">{t("Standard workspace")}</option>
            <option value="focus">{t("Quiet the workspace")}</option>
          </select>
        </Field>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={d.recap_enabled}
            onChange={(e) => setD({ ...d, recap_enabled: e.target.checked })}
          />
          {t("Show written catch-up recaps")}
        </label>
        <h3>{t("Notifications")}</h3>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={d.notification_in_app}
            onChange={(e) =>
              setD({ ...d, notification_in_app: e.target.checked })
            }
          />
          {t("Optional in-app notifications")}
        </label>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={d.notification_email}
            onChange={(e) =>
              setD({ ...d, notification_email: e.target.checked })
            }
          />
          {t("Email notifications — sample preference only")}
        </label>
        <p>
          {t(
            "Required decisions remain on Home and their records. This sample does not send real email.",
          )}
        </p>
        <ActionBar
          dirty={dirty}
          onCancel={() => {
            setD(preferenceDraft(saved));
            setBase(saved.version);
            setError("");
          }}
        >
          <Button type="submit" disabled={!dirty}>
            {t("Save preferences")}
          </Button>
        </ActionBar>
        <Button
          variant="secondary"
          onClick={() => (dirty ? setRestore(true) : defaults())}
        >
          {t("Restore display defaults")}
        </Button>
      </form>
      {restore && (
        <Confirm
          title={t("Restore display defaults?")}
          description={t(
            "Your language and timezone stay selected. This changes the draft only.",
          )}
          onConfirm={defaults}
          onClose={() => setRestore(false)}
        />
      )}
    </Panel>
  );
}

const CAP_LABELS: Record<string, [string, string]> = {
  read_sample_messages: [
    "Read sample messages",
    "Read retained sample email, with source evidence.",
  ],
  draft_message: [
    "Prepare message drafts",
    "Create internal drafts for your review.",
  ],
  simulate_send: [
    "Simulate an approved send",
    "An exact message approval is still required.",
  ],
  read_sample_events: [
    "Read sample calendar events",
    "Inspect saved schedules and commitments.",
  ],
  draft_event: [
    "Prepare calendar drafts",
    "Suggest a meeting without sending an invitation.",
  ],
  simulate_invite: [
    "Simulate an approved invitation",
    "An exact invitation approval is still required.",
  ],
  read_sample_files: [
    "Read sample files",
    "Use saved files that have a permitted audience.",
  ],
  attach_sample_reference: [
    "Attach a sample reference",
    "Link an approved retained source.",
  ],
};
function ToolIcon({ id }: { id: string }) {
  return (
    <div className="settings-tool-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        {id === "gmail" ? (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 6 9 7 9-7" />
          </>
        ) : id === "calendar" ? (
          <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2" />
          </>
        ) : (
          <>
            <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z" />
            <path d="M3 10h18" />
          </>
        )}
      </svg>
    </div>
  );
}
function Connections() {
  const { rows, t } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") || "";
  const category = params.get("category") || "all";
  const selected = params.get("connection");
  const connections = rows("connections");
  const connection = connections.find((x) => x.id === selected);
  const setQuery = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace("/app/connections" + (p.size ? "?" + p : ""), {
      scroll: false,
    });
  };
  const filtered = connections.filter(
    (x) =>
      `${s(x.label)} ${a<string>(x.capabilities).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "all" ||
        (category === "email"
          ? x.id === "gmail"
          : category === "calendar"
            ? x.id === "calendar"
            : category === "files"
              ? x.id === "drive"
              : false)),
  );
  return (
    <div className="settings-content">
      <PageHead
        title={t("Your tools, working together.")}
        description={t("Give your crew the right access, with you in control.")}
      />
      <div className="settings-filter">
        <input
          type="search"
          aria-label={t("Find a tool")}
          placeholder={t("Find a tool")}
          value={query}
          onChange={(e) => setQuery("q", e.target.value)}
        />
        <select
          aria-label={t("Tool category")}
          value={category}
          onChange={(e) => setQuery("category", e.target.value)}
        >
          <option value="all">{t("All tools")}</option>
          <option value="email">{t("Email")}</option>
          <option value="calendar">{t("Calendar")}</option>
          <option value="files">{t("Files")}</option>
          <option value="payments">{t("Payments")}</option>
        </select>
        {(query || category !== "all") && (
          <Button
            variant="secondary"
            onClick={() => router.replace("/app/connections")}
          >
            {t("Clear filters")}
          </Button>
        )}
      </div>
      {filtered.length ? (
        <div className="settings-tool-grid">
          {filtered.map((x) => (
            <article className="settings-tool" key={x.id}>
              <div className="settings-status-line">
                <ToolIcon id={x.id} />
                <Badge tone={x.state === "connected" ? "success" : "warning"}>
                  {t(
                    x.state === "connected"
                      ? "Sample connected"
                      : x.state === "reconnect_required"
                        ? "Needs reconnect"
                        : "Not connected",
                  )}
                </Badge>
              </div>
              <h2>{s(x.label)}</h2>
              <p>
                {t(
                  x.id === "gmail"
                    ? "Read sample requests and prepare thoughtful replies."
                    : x.id === "calendar"
                      ? "Keep your commitments and proposed dates in view."
                      : "Bring approved source material into the work.",
                )}
              </p>
              <LinkButton
                variant="secondary"
                href={
                  "/app/connections?" +
                  new URLSearchParams({
                    ...Object.fromEntries(params.entries()),
                    connection: x.id,
                  })
                }
              >
                {t(
                  x.state === "connected"
                    ? "Manage connection"
                    : x.state === "reconnect_required"
                      ? "Reconnect sample tool"
                      : "Try sample connection",
                )}
              </LinkButton>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty
            title={t("No tools match these filters")}
            description={
              category === "payments"
                ? t(
                    "Payment records use a local sandbox. No payment provider or bank is connected.",
                  )
                : t("Try another tool name or clear your filters.")
            }
          >
            <Button
              variant="secondary"
              onClick={() => router.replace("/app/connections")}
            >
              {t("Clear filters")}
            </Button>
          </Empty>
        </Panel>
      )}
      <p className="settings-help" style={{ marginTop: 24 }}>
        {t(
          "All connections use retained sample data. No credentials, live account access, or automatic external actions.",
        )}
      </p>
      {selected &&
        (connection ? (
          <ConnectionDetails
            key={connection.id}
            connection={connection}
            onClose={() => setQuery("connection", "")}
          />
        ) : (
          <Modal
            title={t("Connection not found")}
            onClose={() => setQuery("connection", "")}
          >
            <p>
              {t("Choose Gmail, Calendar, or Drive from the tool directory.")}
            </p>
          </Modal>
        ))}
    </div>
  );
}
function ConnectionDetails({
  connection,
  onClose,
}: {
  connection: Entity;
  onClose: () => void;
}) {
  const { rows, command, notify, t } = useStore();
  const [caps, setCaps] = useState(() =>
    a<string>(connection.approved_capabilities),
  );
  const [roles, setRoles] = useState(() =>
    connection.allowed_roles ? a<string>(connection.allowed_roles) : ROLES,
  );
  const [base, setBase] = useState(connection.version);
  const [review, setReview] = useState<
    "permissions" | "connect" | "reconnect" | null
  >(null);
  const [disconnect, setDisconnect] = useState(false);
  const [error, setError] = useState("");
  const [event, setEvent] = useState<Entity | null>(null);
  const dirty =
    changed(caps, a<string>(connection.approved_capabilities)) ||
    changed(
      roles,
      connection.allowed_roles ? a<string>(connection.allowed_roles) : ROLES,
    );
  const catalogue = a<string>(connection.capabilities);
  const events = rows("events")
    .filter(
      (x) =>
        a<Record<string, unknown>>(x.record_refs).some(
          (ref) => ref.table === "connections" && ref.id === connection.id,
        ) ||
        s(x.summary).toLowerCase().includes(s(connection.label).toLowerCase()),
    )
    .slice(-8)
    .reverse();
  const change = async (action: string) => {
    const r = (await command("connection.change", {
      id: connection.id,
      action,
      approved_capabilities: caps,
      allowed_roles: roles,
      expected_version: base,
    }));
    if (r.ok) {
      setBase(base + 1);
      setReview(null);
      setDisconnect(false);
      setError("");
      if (action === "disconnect") setCaps([]);
      notify(
        t(
          action === "disconnect"
            ? "Sample tool disconnected. Drafts and history are retained."
            : action === "refresh"
              ? "Sample status refreshed."
              : "Sample connection updated. Return to your task to continue.",
        ),
      );
    } else setError(r.message);
  };
  const interrupted = rows("agent_runs").find(
    (x) =>
      s(x.required_connection_id) === connection.id ||
      s(x.connection_id) === connection.id ||
      (s(x.interrupted_command_id) === s(connection.interrupted_command_id) &&
        !!connection.interrupted_command_id),
  );
  return (
    <Modal title={s(connection.label)} onClose={onClose} dirty={dirty}>
      <div className="settings-form">
        <ErrorMessage message={error} />
        <div className="settings-status-line">
          <ToolIcon id={connection.id} />
          <div>
            <strong>{s(connection.account_label)}</strong>
            <p>
              {t("Sample data only")} · {t(label(connection.state))}
            </p>
          </div>
        </div>
        <h3>{t("Allowed capabilities")}</h3>
        <div>
          {catalogue.map((cap) => (
            <label className="settings-permission" key={cap}>
              <input
                type="checkbox"
                checked={caps.includes(cap)}
                onChange={(e) =>
                  setCaps(
                    e.target.checked
                      ? [...caps, cap]
                      : caps.filter((x) => x !== cap),
                  )
                }
              />
              <div>
                {t(CAP_LABELS[cap]?.[0] || label(cap))}
                <span>
                  {t(
                    CAP_LABELS[cap]?.[1] ||
                      "Available in this sample connection.",
                  )}
                </span>
              </div>
            </label>
          ))}
        </div>
        <details>
          <summary>{t("Allowed teammates")}</summary>
          {ROLES.map((role) => (
            <label key={role} className="settings-check">
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={(e) =>
                  setRoles(
                    e.target.checked
                      ? [...roles, role]
                      : roles.filter((x) => x !== role),
                  )
                }
              />
              {t(ROLE_NAMES[role])}
            </label>
          ))}
        </details>
        <div className="settings-note">
          {t(
            "Tool permissions never approve a specific message, offer, or invitation. Those actions still need your exact review.",
          )}
        </div>
        {connection.state === "connected" ? (
          <Button disabled={!dirty} onClick={() => setReview("permissions")}>
            {t("Save tool permissions")}
          </Button>
        ) : (
          <Button
            onClick={() => {
              if (!caps.length) setCaps(catalogue);
              setReview(
                connection.state === "reconnect_required"
                  ? "reconnect"
                  : "connect",
              );
            }}
          >
            {t(
              connection.state === "reconnect_required"
                ? "Reconnect sample tool"
                : "Try sample connection",
            )}
          </Button>
        )}
        <div className="settings-actions">
          <Button variant="secondary" onClick={async () => (await change("refresh"))}>
            {t("Refresh sample status")}
          </Button>
          {connection.state !== "disconnected" &&
            connection.state !== "not_connected" && (
              <Button variant="danger" onClick={() => setDisconnect(true)}>
                {t("Disconnect sample tool")}
              </Button>
            )}
        </div>
        {!!connection.last_checked_at && (
          <p>
            {t("Last checked")}: {date(connection.last_checked_at)}
          </p>
        )}
        {interrupted && (
          <LinkButton
            variant="secondary"
            href={`/app/team?task=${interrupted.id}`}
          >
            {t("Return to interrupted task")}
          </LinkButton>
        )}
        <h3>{t("Recent usage evidence")}</h3>
        {events.length ? (
          events.map((x) => (
            <div className="settings-row" key={x.id}>
              <div>
                <p>{s(x.summary)}</p>
                <span className="settings-meta">{date(x.occurred_at)}</span>
              </div>
              <Button variant="secondary" onClick={() => setEvent(x)}>
                {t("Inspect event")}
              </Button>
            </div>
          ))
        ) : (
          <p>{t("No usage events are recorded for this tool yet.")}</p>
        )}
      </div>
      {review && (
        <Modal
          title={t("Review sample access")}
          onClose={() => setReview(null)}
        >
          <p>
            <strong>{s(connection.label)}</strong> ·{" "}
            {s(connection.account_label)} · v{base}
          </p>
          <ul>
            {caps.map((x) => (
              <li key={x}>{t(CAP_LABELS[x]?.[0] || label(x))}</li>
            ))}
          </ul>
          <p>
            {t("Allowed teammates")}:{" "}
            {roles.map((x) => t(ROLE_NAMES[x])).join(", ") || t("None")}
          </p>
          <p className="settings-note">
            {t(
              "This restores only the access shown here. Interrupted work stays unexecuted until you explicitly continue it.",
            )}
          </p>
          <div className="settings-modal-actions">
            <Button variant="secondary" onClick={() => setReview(null)}>
              {t("Cancel")}
            </Button>
            <Button onClick={async () => (await change(review))}>
              {t(
                review === "permissions"
                  ? "Confirm permissions"
                  : "Restore sample connection",
              )}
            </Button>
          </div>
        </Modal>
      )}
      {disconnect && (
        <Confirm
          title={t("Disconnect this sample tool?")}
          description={`${s(connection.label)} · ${s(connection.account_label)}. ${t("Future dependent tasks may need a reconnect. Saved messages, files, and completed history will remain.")}`}
          onClose={() => setDisconnect(false)}
          onConfirm={async () => (await change("disconnect"))}
          confirmLabel={t("Disconnect")}
          danger
        />
      )}
      {event && (
        <Modal title={t("Usage evidence")} onClose={() => setEvent(null)}>
          <p>{s(event.summary)}</p>
          <p>
            {date(event.occurred_at)} · {label(event.kind)}
          </p>
          <ul>
            {a<Record<string, unknown>>(event.record_refs).map((x, i) => (
              <li key={i}>
                {s(x.table)} / {s(x.id)} · v{n(x.version)}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </Modal>
  );
}

function Knowledge() {
  const { rows, record, command, notify, state, t } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [manual, setManual] = useState(false);
  const selected = params.get("source");
  const setSelected = (id: string | null) => setQuery("source", id || "");
  const [archive, setArchive] = useState<Entity | null>(null);
  const [undo, setUndo] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState<Entity | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = input.current;
    const cancel = () => {
      setReplacing(null);
      if (el) el.multiple = true;
    };
    el?.addEventListener("cancel", cancel);
    return () => el?.removeEventListener("cancel", cancel);
  }, []);
  const query = params.get("q") || "";
  const audience = params.get("audience") || "all";
  const status = params.get("status") || "active";
  const source = selected ? record("sources", selected) : undefined;
  const sources = rows("sources").filter(
    (x) =>
      `${s(x.label)} ${s(x.kind)} ${s(x.content)}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (audience === "all" || x.audience === audience) &&
      (status === "all" ||
        (status === "active"
          ? !b(x.archived) && x.status !== "archived"
          : status === "archived"
            ? b(x.archived) || x.status === "archived"
            : s(x.status, "ready") === status)),
  );
  const setQuery = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace("/app/settings/knowledge" + (p.size ? "?" + p : ""), {
      scroll: false,
    });
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    if (files.length > 5 || (replacing && files.length !== 1)) {
      setError(
        t(
          "Select at most five files, or exactly one file when replacing a source.",
        ),
      );
      return;
    }
    setBusy(true);
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const validation = await validateUpload(file);
        if (validation) {
          errors.push(validation);
          continue;
        }
        const stored = await persistUpload(file);
        const text = file.type === "text/plain" ? await file.text() : "";
        const id = replacing?.id || uid("source");
        const attachment = {
          id: uid("attachment"),
          name: file.name,
          media_type: file.type,
          storage_kind: "browser_blob",
          storage_locator: stored.id,
          content_ref: stored.id,
          blob_id: stored.id,
          byte_length: file.size,
          size_bytes: file.size,
          mime_type: file.type,
          availability: "available",
          source_id: id,
          sha256: stored.sha256,
          audience: "owner",
          shared_with_buyer: false,
        };
        const oldHistory = replacing
          ? a<Record<string, unknown>>(replacing.history)
          : [];
        const r = (await command("knowledge.save", {
          id,
          expected_version: replacing?.version,
          source: {
            kind: "uploaded_file",
            label: file.name,
            content: text.slice(0, 30000),
            content_truncated: text.length > 30000,
            observed_at: state.sample_clock,
            factual_status: "owner_provided",
            audience: "owner",
            status: "ready",
            extraction_status: text
              ? "text_retained"
              : "original_file_retained",
            attachment_ids: [attachment.id],
            history: replacing
              ? [...oldHistory, { ...replacing, history: undefined }]
              : [],
            archived: false,
          },
          attachment,
        }));
        if (!r.ok) errors.push(`${file.name}: ${r.message}`);
        else {
          notify(
            t(
              replacing
                ? "Source replaced. Earlier evidence is retained."
                : "Source saved privately.",
            ),
          );
          if (replacing) setSelected(id);
        }
      } catch (e) {
        errors.push(
          `${file.name}: ${e instanceof Error ? e.message : "Could not save this file."}`,
        );
      }
    }
    setError(errors.join("\n"));
    setReplacing(null);
    setBusy(false);
    if (input.current) {
      input.current.value = "";
      input.current.multiple = true;
    }
  };
  const beginReplace = (x: Entity) => {
    setReplacing(x);
    if (input.current) {
      input.current.multiple = false;
      input.current.click();
    }
  };
  return (
    <>
      <div className="settings-row" style={{ paddingTop: 0, border: 0 }}>
        <div>
          <h2>{t("Give your team useful context.")}</h2>
          <p>
            {t(
              "Your sources, business facts, and reusable knowledge. Private by default.",
            )}
          </p>
        </div>
        <Button onClick={() => setManual(true)}>{t("Add text or link")}</Button>
      </div>
      <ErrorMessage message={error} />
      {undo && (
        <div className="settings-success" role="status">
          {t("Source archived. Historical evidence was retained.")}{" "}
          <Button
            variant="secondary"
            onClick={async () => {
              const x = record("sources", undo.id);
              const r = (await command("record.save", {
                table: "sources",
                id: undo.id,
                expected_version: x?.version,
                values: { archived: false, status: undo.status },
              }));
              if (r.ok) {
                setUndo(null);
                notify(t("Source restored."));
              } else setError(r.message);
            }}
          >
            {t("Undo")}
          </Button>
        </div>
      )}
      <div className="settings-upload">
        <h3>
          {t(
            busy ? "Saving source files…" : "Bring a source into the workspace",
          )}
        </h3>
        <p className="settings-help">
          {t(
            "PDF, PNG, JPEG, or TXT · up to 10 MiB each · five files per selection",
          )}
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
          disabled={busy}
          aria-label={t("Upload source")}
          onChange={async (e) => void (await upload(e.target.files))}
        />
        <p className="settings-meta" style={{ marginTop: 12 }}>
          {t(
            "Original files are retained locally. PDF and image text is not automatically extracted.",
          )}
        </p>
      </div>
      <div className="settings-filter">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery("q", e.target.value)}
          placeholder={t("Search knowledge")}
          aria-label={t("Search knowledge")}
        />
        <select
          aria-label={t("Audience")}
          value={audience}
          onChange={(e) => setQuery("audience", e.target.value)}
        >
          <option value="all">{t("All audiences")}</option>
          <option value="owner">{t("Private")}</option>
          <option value="public">{t("Public approved")}</option>
          <option value="buyer">{t("Buyer approved")}</option>
        </select>
        <select
          aria-label={t("Status")}
          value={status}
          onChange={(e) => setQuery("status", e.target.value)}
        >
          <option value="active">{t("Active")}</option>
          <option value="all">{t("All statuses")}</option>
          <option value="ready">{t("Ready")}</option>
          <option value="failed">{t("Failed")}</option>
          <option value="archived">{t("Archived")}</option>
        </select>
        {(query || audience !== "all" || status !== "active") && (
          <Button
            variant="secondary"
            onClick={() => router.replace("/app/settings/knowledge")}
          >
            {t("Clear filters")}
          </Button>
        )}
      </div>
      <Panel>
        {sources.length ? (
          <div className="settings-list">
            {sources.map((x) => (
              <div className="settings-row" key={x.id}>
                <div>
                  <strong>{s(x.label)}</strong>
                  <p>
                    {t(label(x.kind))} · {date(x.observed_at || x.created_at)} ·
                    v{x.version}
                  </p>
                  <Badge tone={x.status === "failed" ? "error" : "neutral"}>
                    {t(
                      b(x.archived)
                        ? "Archived"
                        : x.status === "reference_not_extracted"
                          ? "Link reference"
                          : s(x.status, "Ready"),
                    )}
                  </Badge>{" "}
                  <Badge>
                    {t(
                      x.audience === "owner"
                        ? "Private"
                        : x.audience === "public"
                          ? "Public approved"
                          : "Buyer approved",
                    )}
                  </Badge>
                </div>
                <div className="settings-row-actions">
                  <Button variant="secondary" onClick={() => setSelected(x.id)}>
                    {t("Inspect source")}
                  </Button>
                  {!b(x.archived) && (
                    <Button variant="secondary" onClick={() => setArchive(x)}>
                      {t("Archive")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title={t(
              query || audience !== "all" || status !== "active"
                ? "No matching sources"
                : "A little context goes a long way",
            )}
            description={t(
              "Upload a file or add useful business facts for your team.",
            )}
          />
        )}
      </Panel>
      {manual && <ManualSource onClose={() => setManual(false)} />}{" "}
      {selected &&
        (source ? (
          <SourceDetails
            key={`${source.id}:${source.version}`}
            source={source}
            onClose={() => setSelected(null)}
            onReplace={() => beginReplace(source)}
          />
        ) : (
          <Modal
            title={t("Source not found")}
            onClose={() => setSelected(null)}
          >
            <p>
              {t("This source is unavailable. Choose another saved source.")}
            </p>
          </Modal>
        ))}
      {archive && (
        <Confirm
          title={t("Archive this source?")}
          description={`${s(archive.label)} · v${archive.version}. ${t("It will leave the active source picker. Existing artifact references and earlier versions remain available.")}`}
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            const r = (await command("record.archive", {
              table: "sources",
              id: archive.id,
              expected_version: archive.version,
            }));
            if (r.ok) {
              setUndo({ id: archive.id, status: s(archive.status, "ready") });
              setArchive(null);
            } else setError(r.message);
          }}
          confirmLabel={t("Archive source")}
        />
      )}
    </>
  );
}
function ManualSource({ onClose }: { onClose: () => void }) {
  const { command, state, t, notify } = useStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !title.trim() ||
      (!content.trim() && !url.trim()) ||
      (url && !safeURL(url))
    ) {
      setError(
        t("Enter a title and useful text or a valid http/https reference URL."),
      );
      return;
    }
    const r = (await command("knowledge.save", {
      source: {
        kind: content.trim() ? "manual_entry" : "url_reference",
        label: title.trim(),
        content: content.trim(),
        url: url.trim(),
        locator: url.trim() || null,
        audience: "owner",
        status: content.trim() ? "ready" : "reference_not_extracted",
        extraction_status: content.trim()
          ? "manual_text"
          : "reference_not_extracted",
        observed_at: state.sample_clock,
        factual_status: "owner_provided",
        attachment_ids: [],
      },
    }));
    if (r.ok) {
      notify(t("Source saved privately."));
      onClose();
    } else setError(r.message);
  };
  return (
    <Modal
      title={t("Add text or link")}
      onClose={onClose}
      dirty={!!(title || content || url)}
    >
      <form noValidate className="settings-form" onSubmit={save}>
        <ErrorMessage message={error} />
        <Field label={t("Title")}>
          <input
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label={t("Useful context")}>
          <textarea
            className="resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t(
              "Business facts, preferred language, a reusable brief…",
            )}
            maxLength={30000}
          />
        </Field>
        <Field label={t("Reference URL (optional)")}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <p className="settings-note">
          {t(
            "Links are saved as references. Their contents are not fetched. This source starts private.",
          )}
        </p>
        <div className="settings-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit">{t("Save source")}</Button>
        </div>
      </form>
    </Modal>
  );
}
function SourceDetails({
  source,
  onClose,
  onReplace,
}: {
  source: Entity;
  onClose: () => void;
  onReplace: () => void;
}) {
  const { record, rows, command, notify, t } = useStore();
  const [audience, setAudience] = useState(s(source.audience, "owner"));
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [binary, setBinary] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const attachments = a<string>(source.attachment_ids)
    .map((id) => record("attachments", id))
    .filter((x): x is Entity => !!x);
  const attachment = attachments[0];
  useEffect(() => {
    let active = true;
    let objectURL = "";
    if (!attachment) {
      Promise.resolve().then(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }
    const load = async () => {
      try {
        const blob = await attachmentBlob(attachment);
        if (active) {
          setBinary(blob);
          if (blob && blob.type.startsWith("image/")) {
            objectURL = URL.createObjectURL(blob);
            setPreview(objectURL);
          }
          setLoading(false);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "File unavailable.");
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [attachment]);
  const download = async () => {
    setError("");
    if (binary) {
      downloadBlob(binary, s(attachment?.name, s(source.label) + ".bin"));
      notify(t("Source download created."));
    } else if (
      s(source.content) ||
      s(source.url) ||
      s(source.locator).startsWith("https://")
    ) {
      downloadText(
        s(source.label) + ".txt",
        [s(source.label), s(source.content), s(source.url) || s(source.locator)]
          .filter(Boolean)
          .join("\n\n"),
      );
      notify(t("Source download created."));
    } else
      setError(
        t(
          "Original file bytes are unavailable. Replace the source to restore access.",
        ),
      );
  };
  const visibility = async () => {
    if (
      audience !== "owner" &&
      (source.connection_id || source.kind === "sample_message")
    ) {
      setError(
        t(
          "Client messages stay private. Create a separate reviewed summary before sharing any client information.",
        ),
      );
      return;
    }
    const r = (await command("record.save", {
      table: "sources",
      id: source.id,
      expected_version: source.version,
      values: {
        audience,
        visibility_approved_version: source.version,
        visibility_reviewed: true,
      },
    }));
    if (r.ok) {
      setReview(false);
      notify(t("Source visibility updated."));
    } else setError(r.message);
  };
  const references = rows("artifacts").filter((x) =>
    JSON.stringify(x.source_refs || x.source_ids || "").includes(source.id),
  );
  return (
    <Modal
      title={s(source.label)}
      onClose={onClose}
      dirty={audience !== source.audience}
    >
      <div className="settings-form">
        <ErrorMessage message={error} />
        <div className="settings-status-line">
          <Badge>
            {t(
              s(source.audience) === "owner"
                ? "Private"
                : "Approved visibility",
            )}
          </Badge>
          <span className="settings-meta">
            v{source.version} · {date(source.observed_at || source.created_at)}
          </span>
        </div>
        {s(source.content) && (
          <div className="settings-source-preview">
            {s(source.content)}
            {b(source.content_truncated) && (
              <p className="settings-meta">
                {t(
                  "Preview limited to 30,000 characters. Download the original for the complete source.",
                )}
              </p>
            )}
          </div>
        )}
        {s(source.url) && (
          <p>
            <a href={s(source.url)} target="_blank" rel="noreferrer">
              {s(source.url)}
            </a>
            <br />
            <span className="settings-meta">
              {t("Reference only — external contents not fetched.")}
            </span>
          </p>
        )}
        {loading ? (
          <p role="status">{t("Reading saved file…")}</p>
        ) : (
          attachment &&
          (!binary ? (
            <p className="settings-error">
              {t(
                "Original file bytes are unavailable. Replace the source to restore access.",
              )}
            </p>
          ) : (
            <div>
              {preview && (
                <img
                  src={preview}
                  alt={s(source.label)}
                  className="settings-inline-preview"
                />
              )}
              <p className="settings-help">
                {s(attachment.name)} ·{" "}
                {(n(attachment.byte_length) / 1024).toFixed(1)} KiB ·{" "}
                {s(attachment.media_type)}
              </p>
              {binary.type === "application/pdf" && (
                <p>
                  {t(
                    "Original PDF is retained. Download it to inspect the file. Text has not been extracted.",
                  )}
                </p>
              )}
            </div>
          ))
        )}
        <div className="settings-actions">
          <Button
            variant="secondary"
            onClick={async () => void (await download())}
            disabled={
              loading || (!binary && !s(source.content) && !s(source.url))
            }
          >
            {t("Download source")}
          </Button>
          <Button variant="secondary" onClick={onReplace}>
            {t("Replace file")}
          </Button>
          {source.status === "failed" && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (!binary && !s(source.content)) {
                  setError(
                    t(
                      "Retained input is unavailable. Replace the source to try again.",
                    ),
                  );
                  return;
                }
                const r = (await command("record.save", {
                  table: "sources",
                  id: source.id,
                  expected_version: source.version,
                  values: {
                    status: "ready",
                    extraction_status: s(source.content)
                      ? "text_retained"
                      : "original_file_retained",
                    processing_attempts: n(source.processing_attempts) + 1,
                  },
                }));
                if (r.ok)
                  notify(
                    t(
                      "Retained source is ready. No external extraction was performed.",
                    ),
                  );
                else setError(r.message);
              }}
            >
              {t("Retry processing")}
            </Button>
          )}
        </div>
        <Field label={t("Source visibility")}>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            <option value="owner">{t("Private — only my team")}</option>
            <option value="public">{t("Approved for public use")}</option>
            <option value="buyer">{t("Approved for buyer use")}</option>
          </select>
        </Field>
        <Button
          onClick={() => setReview(true)}
          disabled={audience === source.audience}
        >
          {t("Review visibility change")}
        </Button>
        <details>
          <summary>{t("Versions and references")}</summary>
          <p>
            {references.length} {t("saved artifacts reference this source.")}
          </p>
          <p>
            {a(source.history).length} {t("earlier source versions retained.")}
          </p>
          {a<Record<string, unknown>>(source.history).map((x, i) => (
            <div key={i} className="settings-rule">
              <strong>
                {s(x.label)} · v{n(x.version)}
              </strong>
              <p>
                {s(x.content).slice(0, 500) ||
                  t("Original attachment reference retained.")}
              </p>
              <Button
                variant="secondary"
                onClick={async () => {
                  const old = record(
                    "attachments",
                    a<string>(x.attachment_ids)[0],
                  );
                  const blob = old ? await attachmentBlob(old) : null;
                  if (blob) downloadBlob(blob, s(old?.name, "source"));
                  else if (s(x.content))
                    downloadText(s(x.label) + ".txt", s(x.content));
                  else
                    setError(
                      t("This historical file is unavailable on this browser."),
                    );
                }}
              >
                {t("Download earlier version")}
              </Button>
            </div>
          ))}
        </details>
      </div>
      {review && (
        <Modal
          title={t("Review source visibility")}
          onClose={() => setReview(false)}
        >
          <p>
            <strong>{s(source.label)}</strong> · v{source.version}
          </p>
          <p>
            {t("New audience")}:{" "}
            {t(
              audience === "public"
                ? "Public"
                : audience === "buyer"
                  ? "Buyer"
                  : "Private",
            )}
          </p>
          <div className="settings-source-preview">
            {s(source.content) || s(source.url) || s(attachment?.name)}
          </div>
          <p className="settings-note">
            {t(
              "Approve only content you have the right to share. This permission applies to this exact source version; publishing a page remains a separate review.",
            )}
          </p>
          <div className="settings-modal-actions">
            <Button variant="secondary" onClick={() => setReview(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={visibility}>{t("Save visibility")}</Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
