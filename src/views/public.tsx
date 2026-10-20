"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { sampleId } from "@/lib/local-crypto";
import { uiMessage } from "@/lib/i18n";
import { externalFileHref } from "@/lib/file-links";
import { MutationAttempt } from "@/lib/mutation-attempt";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { UiText } from "@/components/ui-text";
import {
  publicProfile,
  buyerOffer,
  buyerPortal,
  inquiryProjection,
} from "@/lib/projections";
import {
  s,
  n,
  b,
  o,
  a,
  money,
  date,
  label,
  type Entity,
  type Input,
} from "@/lib/types";
import {
  PageHead,
  Panel,
  Button,
  LinkButton,
  Badge,
  Empty,
  Field,
  Form,
  Modal,
  Confirm,
  Tabs,
  useDirtyGuard,
} from "@/components/ui";
import {
  downloadPdf,
  downloadBlob,
  persistUpload,
  attachmentBlob,
  parseAmount,
} from "@/lib/downloads";
import "./public.css";
import ConnectedAuth from "./connected-auth";
import { AuthShowcase } from "./auth-showcase";
import ConnectedVoice from "./connected-voice";
import { ConnectedBuyerPayment, PaymentReturn } from "./connected-payments";

const emailOk = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const uid = sampleId;
const minor = (value: string, currency: string) => ({
  amount_minor: Math.round(Number(value) * (currency === "IDR" ? 1 : 100)),
  currency,
  scale: currency === "IDR" ? 0 : 2,
});
const versionLabel = (value: unknown) =>
  s(value).match(/_v(\d+)$/)?.[1] || "current";
const roleNames = [
  "Scout",
  "Promoter",
  "Sales",
  "Account manager",
  "Operations",
  "Finance",
];
const roleAssets = [
  "scout",
  "promoter",
  "sales",
  "account-manager",
  "operations",
  "finance",
];
function ErrorNote({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  return message ? (
    <p ref={ref} tabIndex={-1} className="public-error" role="alert">
      {message}
    </p>
  ) : null;
}
function Notice({ children }: { children: ReactNode }) {
  return <div className="public-notice">{children}</div>;
}
function Brand() {
  return (
    <Link href="/" aria-label="Crewmori home">
      <img
        className="public-logo"
        src="/assets/brand/crewmori-primary-green.svg"
        alt="Crewmori"
        width="200"
        height="55"
      />
    </Link>
  );
}
function Frame({
  children,
  buyer = false,
}: {
  children: ReactNode;
  buyer?: boolean;
}) {
  const { state, command, t, connected } = useStore();
  const prefs = Object.values(state.tables.preferences || {})[0];
  return (
    <div className="public-frame">
      <a className="public-skip" href="#main"><UiText>{"Skip to content"}</UiText>
      </a>
      <header className="public-header">
        <Brand />
        <nav aria-label="Public navigation">
          {!buyer && (
            <>
              {!connected && <Link href="/u/alya">{t("Meet a freelancer")}</Link>}
              <Link href="/auth/sign-in">{t("Sign in")}</Link>
            </>
          )}
          <label className="public-language">
            <span className="sr-only"><UiText>{"Language"}</UiText></span>
            <select
              aria-label="Language"
              value={s(prefs?.locale, "en")}
              onChange={async (e) =>
                (await command("preferences.save", {
                  id: "preferences_alya",
                  values: { locale: e.target.value },
                }))
              }
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </label>
          {buyer && <Badge>{connected ? "Client space" : "Sample client space"}</Badge>}
        </nav>
      </header>
      <main id="main" className="public-main">
        {children}
      </main>
      <footer className="public-footer">
        <span>Your work. Your business. Your team.</span>
        <span>{connected ? "Crewmori" : "Sample experience · No external actions"}</span>
      </footer>
    </div>
  );
}
function Unavailable({
  title = "This link is unavailable",
  description = "This page is unknown, expired, or no longer shared. Ask the freelancer for a current link.",
}: {
  title?: string;
  description?: string;
}) {
  const { refresh, refreshing, refreshError } = useStore();
  const [checked, setChecked] = useState(false);
  return (
    <Frame buyer>
      <div className="public-narrow">
        <Empty title={title} description={description}>
          <Button
            variant="secondary"
            pending={refreshing}
            pendingLabel="Checking…"
            onClick={async () => {
              await refresh();
              setChecked(true);
            }}
          >{"Check latest status"}
          </Button>
          <LinkButton href="/">{"Back to Crewmori"}</LinkButton>
        </Empty>
        <ErrorNote message={refreshError || ""} />
        {checked && !refreshing && !refreshError && <Notice><UiText>{"This link is still unavailable in the saved records. Ask the freelancer for a current invitation."}</UiText></Notice>}
      </div>
    </Frame>
  );
}

function Entry() {
  const { command, t, connected } = useStore();
  const router = useRouter();
  return (
    <Frame>
      <section className="public-hero">
        <div>
          <p className="public-eyebrow">A LITTLE TEAM. A LOT MORE ROOM.</p>
          <h1>{t("Your business, with good company.")}</h1>
          <p className="public-lead">
            Six specialists help you find work, shape offers, plan projects, and
            keep track of money.
          </p>
          <p>
            You do the client work. Your crew handles the business around it,
            with you approving the commitments.
          </p>
          <div className="public-actions">
            <Button
              onClick={async () => {
                if (connected) { router.push("/auth/sign-up"); return; }
                const r = (await command("session.set", { authenticated: true }));
                if (r.ok) router.push("/app/home");
              }}
            >
              {t(connected ? "Create your workspace" : "Explore sample workspace")} <span aria-hidden>→</span>
            </Button>
            <LinkButton href="/auth/sign-up" variant="secondary">
              {t("Get started")}
            </LinkButton>
          </div>
          <p className="public-small">
            {connected ? "Start your business workspace and connect the tools you need." : "A working local sample. No account or connected tools required."}
          </p>
        </div>
        <div className="public-hero-art">
          <span className="public-art-note">
            Your crew is ready when you are.
          </span>
          <img
            src="/assets/characters/scout-hero.svg"
            alt="Scout, your illustrated opportunity specialist"
          />
          <div className="public-crew-bubbles">
            {roleAssets.slice(1).map((role, i) => (
              <img
                key={role}
                src={`/assets/characters/${role}.svg`}
                alt={roleNames[i + 1]}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="public-value-grid" aria-label="How your crew helps">
        <article className="public-benefit">
          <span className="public-step"><UiText>{"Opportunities"}</UiText></span>
          <h2>From inquiry to offer.</h2>
          <p>
            Keep the original request beside your crew’s assessment. Set scope,
            price, and timing before sharing an offer.
          </p>
        </article>
        <article className="public-benefit">
          <span className="public-step"><UiText>{"Work"}</UiText></span>
          <h2>The project stays connected.</h2>
          <p>
            Follow the accepted scope, required inputs, dates, files, and
            payments in one project workspace.
          </p>
        </article>
        <article className="public-benefit">
          <span className="public-step">Approvals</span>
          <h2>You make the commitments.</h2>
          <p>
            Review exact terms and messages before sharing. Your crew prepares
            the business work; professional delivery stays yours.
          </p>
        </article>
      </section>
      {!connected && <section className="public-profile-invite">
        <div>
          <p className="public-eyebrow">FROM YOUR CLIENT’S SIDE</p>
          <h2>A clear beginning for every project.</h2>
          <p>
            Explore Alya’s sample profile, start an inquiry, and see how a brief
            becomes a shared offer.
          </p>
        </div>
        <LinkButton href="/u/alya" variant="ghost">
          View sample freelancer →
        </LinkButton>
      </section>}
    </Frame>
  );
}

function Auth({ mode }: { mode: string }) {
  const { state, rows, record, command, t } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState("");
  const [done, setDone] = useState(false);
  const grant = params.get("grant") || "";
  const recoveryRecord = record("recovery_grants", grant);
  const validGrant =
    !!recoveryRecord &&
    recoveryRecord.state === "prepared" &&
    new Date(s(recoveryRecord.expires_at)).getTime() >
      new Date(state.sample_clock).getTime();
  const setup = record("onboarding_sessions", "onboarding_alya");
  const returnTo = params.get("returnTo") || "";
  const safeReturn =
    /^\/app\/(home|team|opportunities|offers|promotion|projects|clients|calendar|money|connections|settings)(\/|\?|$)/.test(
      returnTo,
    ) &&
    !returnTo.includes("\\") &&
    !returnTo.includes("//")
      ? returnTo
      : "/app/home";
  const enter = async () => {
    const result = (await command("session.set", { authenticated: true }));
    if (result.ok) router.push(safeReturn);
    else setError(result.message);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (mode !== "reset" && !emailOk(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "sign-up" && (!name.trim() || name.length > 120)) {
      setError("Enter your name, up to 120 characters.");
      return;
    }
    if (
      (mode === "sign-in" && !password) ||
      (mode === "sign-up" && password.length < 8) ||
      (mode === "reset" && (password.length < 8 || password !== confirmation))
    ) {
      setError(
        mode === "sign-in"
          ? "Enter a sample password."
          : "Use at least 8 characters and matching confirmation where shown.",
      );
      return;
    }
    setBusy(true);
    if (mode === "recover") {
      const prior = rows("recovery_grants").filter(
        (x) => x.state === "prepared",
      );
      prior.forEach(async (x) =>
        (await command("record.save", {
          table: "recovery_grants",
          id: x.id,
          values: { state: "replaced" },
        })),
      );
      const id = uid("reset");
      const result = (await command("record.save", {
        table: "recovery_grants",
        id,
        values: {
          state: "prepared",
          expires_at: new Date(
            new Date(state.sample_clock).getTime() + 900000,
          ).toISOString(),
        },
      }));
      if (result.ok) setRecovery(id);
      else setError(result.message);
    } else if (mode === "reset") {
      if (!validGrant) {
        setError(
          "This sample reset link is unavailable. Prepare another link.",
        );
      } else {
        const result = (await command("record.save", {
          table: "recovery_grants",
          id: grant,
          values: {
            state: "consumed",
            password_reset_demonstrated_at: state.sample_clock,
          },
        }));
        if (result.ok) setDone(true);
        else setError(result.message);
      }
    } else if (mode === "sign-up") {
      if (
        rows("local_accounts").some(
          (x) => s(x.email).toLowerCase() === email.trim().toLowerCase(),
        )
      ) {
        setError(
          "This local sample account already exists. Sign in to continue.",
        );
      } else {
        const result = (await command("record.save", {
          table: "local_accounts",
          id: `account_${encodeURIComponent(email.trim().toLowerCase())}`,
          values: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            setup_status: "in_progress",
          },
        }));
        if (result.ok) {
          (await command("setup.saveStep", {
            step: "business",
            values: {
              basics: {
                name: name.trim(),
                profession: "",
                timezone: "Asia/Jakarta",
                locale: "en",
              },
              services: [],
            },
          }));
          (await command("session.set", { authenticated: true }));
          router.push("/onboarding");
        } else setError(result.message);
      }
    } else {
      const result = (await command("session.set", { authenticated: true }));
      if (result.ok)
        router.push(
          setup?.state === "in_progress" ? "/onboarding" : safeReturn,
        );
      else setError(result.message);
    }
    setPassword("");
    setConfirmation("");
    setBusy(false);
  };
  const title =
    mode === "sign-up"
      ? "Make room for your next chapter."
      : mode === "recover"
        ? "A fresh start."
        : mode === "reset"
          ? "Reset your sample password."
          : "Welcome back.";
  return (
    <Frame>
      <div className="auth-layout">
        <AuthShowcase />
        <Panel className="auth-panel">
          <p className="public-eyebrow">YOUR CREWMORI WORKSPACE</p>
          <h1>{t(title)}</h1>
          <p className="auth-sample-note">
            This is a local sample. Use a made-up password; it is never stored
            or sent.
          </p>
          {state.session && mode === "sign-in" && (
            <Notice>
              <Link href="/app/home"><UiText>{"Continue to workspace"}</UiText></Link>
              {setup?.state === "in_progress" && (
                <>
                  {" "}
                  · <Link href="/onboarding">Resume setup</Link>
                </>
              )}
            </Notice>
          )}
          {done ? (
            <>
              <Notice>
                Sample reset complete. No real credentials were changed.
              </Notice>
              <LinkButton href="/auth/sign-in">Return to sign in</LinkButton>
            </>
          ) : mode === "reset" && !validGrant ? (
            <>
              <Notice>
                This sample reset link is missing, expired, already used, or
                replaced.
              </Notice>
              <LinkButton href="/auth/recover">
                Prepare a new sample link
              </LinkButton>
            </>
          ) : recovery ? (
            <>
              <Notice>
                No email was sent. A local reset preview is ready for 15
                sample-clock minutes.
              </Notice>
              <LinkButton href={`/auth/reset?grant=${recovery}`}>
                Open sample reset link
              </LinkButton>
              <Button variant="secondary" onClick={() => setRecovery("")}>
                Prepare another sample link
              </Button>
            </>
          ) : (
            <Form onSubmit={submit} noValidate>
              <ErrorNote message={error} />
              {mode === "sign-up" && (
                <Field label="Your name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={120}
                  />
                </Field>
              )}
              {mode !== "reset" && (
                <Field label="Email">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                  />
                </Field>
              )}
              {mode !== "recover" && (
                <>
                  <Field
                    label={
                      mode === "reset"
                        ? "New password (sample only)"
                        : "Password (sample only)"
                    }
                  >
                    <div className="password-row">
                      <input
                        value={password}
                        type={show ? "text" : "password"}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="off"
                        aria-label="Password (sample only)"
                      />
                      <button
                        type="button"
                        aria-pressed={show}
                        onClick={() => setShow(!show)}
                      >
                        {show ? "Hide" : "Show"}
                      </button>
                    </div>
                  </Field>
                  {mode === "reset" && (
                    <Field label="Confirm password">
                      <input
                        type={show ? "text" : "password"}
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        autoComplete="off"
                      />
                    </Field>
                  )}
                </>
              )}
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : mode === "recover"
                    ? "Prepare sample reset"
                    : mode === "reset"
                      ? "Complete sample reset"
                      : mode === "sign-up"
                        ? "Create sample account"
                        : "Sign in to sample"}
              </Button>
            </Form>
          )}
          <div className="auth-links">
            {mode === "sign-in" ? (
              <>
                <Link href="/auth/recover"><UiText>{"Forgot password?"}</UiText></Link>
                <Link href="/auth/sign-up"><UiText>{"Create an account"}</UiText></Link>
              </>
            ) : (
              <Link href="/auth/sign-in">Back to sign in</Link>
            )}
          </div>
          {!["reset", "recover"].includes(mode) && (
            <>
              <div className="auth-divider"><UiText>{"or"}</UiText></div>
              <Button variant="secondary" className="auth-sample" onClick={enter}>{"Use sample workspace"}
              </Button>
            </>
          )}
        </Panel>
      </div>
    </Frame>
  );
}

function Profile({ handle, slug }: { handle: string; slug?: string }) {
  const { state, command } = useStore();
  const router = useRouter();
  const profile = publicProfile(state, handle);
  const [inquire, setInquire] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    asset_url: string | null;
  } | null>(null);
  const [discard, setDiscard] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timing, setTiming] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const inquiryAttempt = useRef(new MutationAttempt<Input>());
  const key = useRef(uid("inquiry"));
  useDirtyGuard((inquire || outcomeUnknown) && !!(name || email || brief || budget || timing));
  if (!profile) return <Unavailable title="Freelancer not found" />;
  const service = slug ? profile.services.find((x) => x.slug === slug) : null;
  if (slug && !service)
    return <Unavailable title="This service is not available" />;
  const dirty = !!(name || email || brief || budget || timing);
  const close = () => {
    if (sendingRef.current) return;
    if (outcomeUnknown) { setInquire(false); return; }
    if (dirty) setDiscard(true); else setInquire(false);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sendingRef.current) return;
    setError("");
    if (!name.trim() || !emailOk(email) || brief.trim().length < 5) {
      setError(
        "Add your name, a valid email, and at least five characters describing the work.",
      );
      return;
    }
    if (budget && parseAmount(budget, currency) === null) {
      setError("Use a nonnegative budget or leave it blank.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
    const exact = inquiryAttempt.current.begin({
      idempotency_key: key.current,
      values: {
        name: name.trim(),
        email: email.trim(),
        request: brief.trim(),
        service_id: service?.id,
        handle,
        budget: budget ? minor(budget, currency) : null,
        desired_timing: timing || null,
        consent: true,
      },
    });
    const r = await command("inquiry.submit", exact);
    inquiryAttempt.current.settle(r);
    setOutcomeUnknown(r.outcomeUnknown === true);
    if (r.ok) {
      router.push(`/inquiry/${r.id}?grant=${r.ids?.grant_id || ""}`);
    } else setError(r.message);
    } catch (cause) {
      setOutcomeUnknown(inquiryAttempt.current.unresolved);
      setError(cause instanceof Error ? cause.message : "Your inquiry could not be sent. Your draft is still here.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  return (
    <Frame>
      <div className="public-profile">
        <p className="public-eyebrow">{profile.location_label}</p>
        <div className="profile-intro">
          <div>
            <h1>{service ? service.title : profile.public_name}</h1>
            <p className="public-lead">
              {service ? service.description : profile.headline}
            </p>
            <p>{service ? `By ${profile.public_name}` : profile.biography}</p>
            <Badge
              tone={
                profile.public_availability === "unavailable"
                  ? "warning"
                  : "success"
              }
            >
              {label(profile.public_availability)}
            </Badge>
          </div>
          <div className="profile-monogram" aria-hidden>
            {profile.public_name.slice(0, 1)}
            <span>Independent by nature.</span>
          </div>
        </div>
        <div className="public-actions">
          <Button
            disabled={profile.public_availability === "unavailable"}
            onClick={() => setInquire(true)}
          >
            Start an inquiry →
          </Button>
          {service && (
            <LinkButton href={`/u/${handle}`} variant="secondary">
              View all services
            </LinkButton>
          )}
        </div>
        <p className="public-small">
          An AI business representative helps organize your brief.{" "}
          {profile.public_name} reviews the work and terms.
        </p>
        {service ? (
          <Panel>
            <h2>What we can make together</h2>
            <ul className="public-deliverables">
              {service.deliverables.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p>{service.pricing_label}</p>
          </Panel>
        ) : (
          <section>
            <h2>Ways to work together</h2>
            <div className="public-services">
              {profile.services.map((x) => (
                <Panel key={x.slug}>
                  <h3>{x.title}</h3>
                  <p>{x.description}</p>
                  <p className="public-small">{x.pricing_label}</p>
                  <LinkButton
                    href={`/u/${handle}/services/${x.slug}`}
                    variant="secondary"
                  >
                    View service →
                  </LinkButton>
                </Panel>
              ))}
            </div>
          </section>
        )}
        <section>
          <h2>A few examples</h2>
          <div className="public-portfolio">
            {profile.portfolio.map((x) => (
              <Panel key={x.title}>
                {x.asset_url && (
                  <img
                    src={
                      x.asset_url.startsWith("/")
                        ? x.asset_url
                        : `/${x.asset_url}`
                    }
                    alt={x.title}
                  />
                )}
                <h3>{x.title}</h3>
                <p>{x.summary}</p>
                {x.asset_url ? (
                  <Button variant="secondary" onClick={() => setPreview(x)}>
                    Open work sample
                  </Button>
                ) : (
                  <p>Preview file unavailable.</p>
                )}
              </Panel>
            ))}
          </div>
        </section>
      </div>
      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)}>
          {preview.asset_url && (
            <img
              className="public-image-preview"
              src={
                preview.asset_url.startsWith("/")
                  ? preview.asset_url
                  : `/${preview.asset_url}`
              }
              alt={preview.title}
            />
          )}
        </Modal>
      )}
      {inquire && (
        <Modal title="Tell us what you have in mind" onClose={close} closeDisabled={sending}>
          <p><UiText>{"Share your request with the freelancer. You can continue the conversation and review proposed terms in your private client space."}</UiText>
          </p>
          <Form onSubmit={submit} noValidate>
            <ErrorNote message={error} />
            {outcomeUnknown && <p className="public-notice" role="status"><UiText>{"The inquiry result is not confirmed. Retry the original inquiry before editing or starting another one. Your request is retained."}</UiText></p>}
            <Field label="Your name">
              <input
                required
                autoComplete="name"
                readOnly={sending || outcomeUnknown}
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                readOnly={sending || outcomeUnknown}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="What do you need?">
              <textarea
                className="resize-none"
                rows={4}
                required
                minLength={5}
                readOnly={sending || outcomeUnknown}
                maxLength={5000}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </Field>
            <div className="public-form-grid">
              <Field label="Budget (optional)">
                <input
                  type="number"
                  min="0"
                  step={currency === "IDR" ? "1" : "0.01"}
                  readOnly={sending || outcomeUnknown}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </Field>
              <Field label="Currency">
                <select
                  value={currency}
                  disabled={sending || outcomeUnknown}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option>USD</option>
                  <option>IDR</option>
                </select>
              </Field>
            </div>
            <Field label="Desired date (optional, Asia/Jakarta)">
              <input
                type="date"
                readOnly={sending || outcomeUnknown}
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
              />
            </Field>
            <div className="public-actions">
              <Button type="submit" pending={sending} pendingLabel="Sending inquiry…">{"Send inquiry"}</Button>
              <Button variant="secondary" disabled={sending} onClick={close}>{outcomeUnknown ? "Close and check later" : "Cancel inquiry"}
              </Button>
            </div>
          </Form>
        </Modal>
      )}
      {discard && (
        <Confirm
          title="Discard inquiry draft?"
          description="Your unsent details will be cleared. No inquiry has been created."
          onClose={() => setDiscard(false)}
          onConfirm={() => {
            setDiscard(false);
            setInquire(false);
            setName("");
            setEmail("");
            setBrief("");
            setBudget("");
            setTiming("");
          }}
        />
      )}
    </Frame>
  );
}

function Onboarding() {
  const { state, record, command } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const setup = record("onboarding_sessions", "onboarding_alya");
  const initial = o(setup?.draft);
  const [draft, setDraft] = useState<Input>(initial);
  const [step, setStep] = useState(
    s(params.get("step"), s(setup?.current_step, "business")) === "finish"
      ? "business"
      : s(params.get("step"), s(setup?.current_step, "business")),
  );
  const [error, setError] = useState("");
  const [tool, setTool] = useState("");
  const [editing, setEditing] = useState(s(o(initial.service_editor).editing));
  const [serviceTitle, setServiceTitle] = useState(
    s(o(initial.service_editor).title),
  );
  const [serviceDescription, setServiceDescription] = useState(
    s(o(initial.service_editor).description),
  );
  const [price, setPrice] = useState(s(o(initial.service_editor).price));
  const [currency, setCurrency] = useState(
    s(o(initial.service_editor).currency, "USD"),
  );
  const [portfolioLink, setPortfolioLink] = useState("");
  const [removed, setRemoved] = useState<Entity | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const basics = o(draft.basics);
  const availability = o(draft.availability);
  const services = a<Entity>(draft.services);
  useDirtyGuard(
    JSON.stringify(draft) !== JSON.stringify(initial) ||
      !!serviceTitle ||
      !!serviceDescription ||
      !!portfolioLink,
  );
  const steps = ["business", "services", "availability", "connections"];
  const stepIndex = Math.max(0, steps.indexOf(step));
  const update = (group: string, key: string, value: unknown) =>
    setDraft((d) => ({ ...d, [group]: { ...o(d[group]), [key]: value } }));
  const save = async (next = step, values = draft) => {
    const r = (await command("setup.saveStep", { step: next, values }));
    if (r.ok) {
      setStep(next);
      setDraft({ ...values, lastStep: next });
      router.replace(`/onboarding?step=${next}`);
    } else setError(r.message);
    return r.ok;
  };
  const addService = async () => {
    if (!serviceTitle.trim() || !serviceDescription.trim()) {
      setError(
        "Add a service name and description, or choose the sample service.",
      );
      return false;
    }
    if (price && parseAmount(price, currency) === null) {
      setError(
        "Starting price must be nonnegative or empty for inquiry pricing.",
      );
      return false;
    }
    const item = {
      id: editing || uid("setup_service"),
      version: 1,
      title: serviceTitle.trim(),
      description: serviceDescription.trim(),
      price: price ? minor(price, currency) : null,
      currency,
      slug: serviceTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    };
    const next = {
      ...draft,
      services: [...services.filter((x) => x.id !== item.id), item],
      service_editor: {},
    };
    setDraft(next);
    (await save("services", next));
    setServiceTitle("");
    setServiceDescription("");
    setPrice("");
    setEditing("");
    setError("");
    return next;
  };
  const proceed = async () => {
    setError("");
    if (step === "business") {
      if (!s(basics.name).trim() || !s(basics.profession).trim()) {
        setError("Add your display name and a short description of your work.");
        return;
      }
      (await save("services"));
    } else if (step === "services") {
      let next = draft;
      if (serviceTitle || serviceDescription) {
        const result = (await addService());
        if (!result) return;
        next = result;
      }
      if (!a(next.services).length) {
        setError("Add one service or use the sample service to continue.");
        return;
      }
      (await save("availability", next));
    } else if (step === "availability") {
      const days = a<number>(availability.days ?? [0, 1, 2, 3, 4]);
      const start = s(availability.start, "09:00"),
        end = s(availability.end, "17:00");
      const deposit = n(availability.deposit_percent, 60);
      if (
        !days.length ||
        end <= start ||
        deposit < 0 ||
        deposit > 100 ||
        !Number.isInteger(deposit)
      ) {
        setError(
          "Choose a working day, an end time after the start, and a whole deposit percentage from 0 to 100.",
        );
        return;
      }
      if (
        availability.public_availability === "available_later" &&
        (!s(availability.available_from) ||
          s(availability.available_from) < state.sample_clock.slice(0, 10))
      ) {
        setError("Choose an availability date on or after the sample date.");
        return;
      }
      (await save("connections"));
    } else {
      if (!(await save("connections"))) return;
      const result = (await command("setup.complete", {}));
      if (result.ok) router.push("/app/home");
      else setError(result.message);
    }
  };
  const addFile = async (file: File) => {
    setUploadBusy(true);
    setError("");
    try {
      const stored = await persistUpload(file);
      const next = {
        ...draft,
        portfolio: [
          ...a(draft.portfolio),
          {
            id: stored.id,
            title: stored.name,
            storage_kind: "indexeddb",
            storage_locator: stored.id,
            media_type: stored.type,
            byte_length: stored.size,
            availability: "available",
            audience: "owner",
            state: "draft",
          },
        ],
      };
      setDraft(next);
      (await save(step, next));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "File could not be saved. Try again.",
      );
    } finally {
      setUploadBusy(false);
    }
  };
  if (!state.session)
    return (
      <Frame>
        <div className="public-narrow">
          <Empty
            title="Start with your sample account"
            description="Sign in or create a local sample account to save your setup."
          >
            <LinkButton href="/auth/sign-up">{"Create sample account"}</LinkButton>
          </Empty>
        </div>
      </Frame>
    );
  const weekly = (() => {
    const start = s(availability.start, "09:00").split(":").map(Number);
    const end = s(availability.end, "17:00").split(":").map(Number);
    return (
      a(availability.days ?? [0, 1, 2, 3, 4]).length *
      Math.max(0, (end[0] * 60 + end[1] - start[0] * 60 - start[1]) / 60)
    );
  })();
  return (
    <Frame>
      <div className="onboarding">
        <p className="public-eyebrow">A PLACE FOR YOUR BUSINESS</p>
        <PageHead
          title="Let’s get to know your work."
          description="A few useful details. Everything else can grow with you."
        />
        <ol className="setup-progress">
          {steps.map((x, i) => (
            <li key={x} aria-current={x === step ? "step" : undefined}>
              <span>{i + 1}</span>
              {["Your business", "Services", "Availability", "Your tools"][i]}
            </li>
          ))}
        </ol>
        <Panel>
          <ErrorNote message={error} />
          {step === "business" && (
            <>
              <h2>First, the essentials.</h2>
              <Field label="Business / display name">
                <input
                  value={s(basics.name)}
                  onChange={(e) => update("basics", "name", e.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="What do you do?">
                <input
                  value={s(basics.profession)}
                  onChange={(e) =>
                    update("basics", "profession", e.target.value)
                  }
                  placeholder="For example, independent consultant"
                />
              </Field>
              <Field label="Business timezone">
                <select
                  value={s(basics.timezone, "Asia/Jakarta")}
                  onChange={(e) => update("basics", "timezone", e.target.value)}
                >
                  {[
                    "Asia/Jakarta",
                    "Asia/Singapore",
                    "Europe/London",
                    "America/New_York",
                    "UTC",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Preferred language">
                <select
                  value={s(basics.locale, "en")}
                  onChange={(e) => update("basics", "locale", e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="id">Bahasa Indonesia</option>
                </select>
              </Field>
            </>
          )}
          {step === "services" && (
            <>
              <h2>What can clients come to you for?</h2>
              {services.map((item) => (
                <div className="setup-service" key={item.id}>
                  <div>
                    <strong>{s(item.title)}</strong>
                    <p>{s(item.description)}</p>
                  </div>
                  <div className="public-actions">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(item.id);
                        setServiceTitle(s(item.title));
                        setServiceDescription(s(item.description));
                        setPrice(
                          item.price
                            ? String(
                                n(o(item.price).amount_minor) /
                                  (s(o(item.price).currency) === "IDR"
                                    ? 1
                                    : 100),
                              )
                            : "",
                        );
                        setCurrency(s(item.currency, "USD"));
                      }}
                    >{"Edit"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        setRemoved(item);
                        const next = {
                          ...draft,
                          services: services.filter((x) => x.id !== item.id),
                        };
                        setDraft(next);
                        (await save(step, next));
                      }}
                    >{"Remove"}
                    </Button>
                  </div>
                </div>
              ))}
              {removed && (
                <Notice>
                  Service removed.{" "}
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const next = {
                        ...draft,
                        services: [...services, removed],
                      };
                      setDraft(next);
                      (await save(step, next));
                      setRemoved(null);
                    }}
                  >{"Undo"}
                  </Button>
                </Notice>
              )}
              <Field label="Service name">
                <input
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                />
              </Field>
              <Field label="What is included?">
                <textarea
                  className="resize-none"
                  rows={3}
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                />
              </Field>
              <div className="public-form-grid">
                <Field label="Starting price (leave blank for custom quote)">
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
                <Field label="Currency">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option>USD</option>
                    <option>IDR</option>
                  </select>
                </Field>
              </div>
              <div className="public-actions">
                <Button variant="secondary" onClick={addService}>
                  {editing ? "Save service" : "Add another service"}
                </Button>
                {!services.length && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const next = {
                        ...draft,
                        services: [
                          {
                            id: uid("setup_service"),
                            version: 1,
                            title: "Discovery and findings summary",
                            description:
                              "A focused session and clear written findings.",
                            slug: "discovery",
                            price: null,
                            currency: "USD",
                          },
                        ],
                      };
                      setDraft(next);
                      (await save(step, next));
                    }}
                  >
                    Use sample service
                  </Button>
                )}
              </div>
              <hr />
              <h3>Portfolio (optional)</h3>
              <p className="public-muted">
                Add evidence you own. It remains private until you publish it
                later.
              </p>
              <Field label="Add portfolio file (PDF, PNG, JPEG, TXT; up to 10 MB)">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  disabled={uploadBusy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) void (await addFile(f));
                  }}
                />
              </Field>
              <Field label="Portfolio link (HTTPS)">
                <input
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  type="url"
                />
              </Field>
              <div className="public-actions">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!/^https:\/\//.test(portfolioLink)) {
                      setError("Use an HTTPS link.");
                      return;
                    }
                    const next = {
                      ...draft,
                      portfolio: [
                        ...a(draft.portfolio),
                        {
                          id: uid("setup_source"),
                          url: portfolioLink,
                          state: "link_unfetched",
                          audience: "owner",
                        },
                      ],
                    };
                    setDraft(next);
                    (await save(step, next));
                    setPortfolioLink("");
                  }}
                >
                  Add portfolio link
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const next = { ...draft, portfolio_status: "skipped" };
                    setDraft(next);
                    (await save(step, next));
                  }}
                >
                  Add portfolio later
                </Button>
              </div>
              {a(draft.portfolio).map((x, i) => (
                <p key={i} className="public-small">
                  {s(o(x).title) || s(o(x).url)} · private draft
                </p>
              ))}
              {draft.portfolio_status === "skipped" && (
                <p className="public-small">
                  Portfolio skipped. You can add it in Settings.
                </p>
              )}
            </>
          )}
          {step === "availability" && (
            <>
              <h2>Room for the work you want.</h2>
              <fieldset className="working-days">
                <legend><UiText>{"Working days"}</UiText></legend>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((x, i) => (
                  <label key={x}>
                    <input
                      type="checkbox"
                      checked={a<number>(
                        availability.days ?? [0, 1, 2, 3, 4],
                      ).includes(i)}
                      onChange={(e) =>
                        update(
                          "availability",
                          "days",
                          e.target.checked
                            ? [
                                ...a<number>(
                                  availability.days ?? [0, 1, 2, 3, 4],
                                ),
                                i,
                              ]
                            : a<number>(
                                availability.days ?? [0, 1, 2, 3, 4],
                              ).filter((v) => v !== i),
                        )
                      }
                    />
                    {x}
                  </label>
                ))}
              </fieldset>
              <div className="public-form-grid">
                <Field label="Start time">
                  <input
                    type="time"
                    value={s(availability.start, "09:00")}
                    onChange={(e) =>
                      update("availability", "start", e.target.value)
                    }
                  />
                </Field>
                <Field label="End time">
                  <input
                    type="time"
                    value={s(availability.end, "17:00")}
                    onChange={(e) =>
                      update("availability", "end", e.target.value)
                    }
                  />
                </Field>
              </div>
              <p>
                {weekly} working hours per week ·{" "}
                {s(basics.timezone, "Asia/Jakarta")}
              </p>
              <Field label="Taking new work">
                <select
                  value={s(
                    availability.public_availability,
                    "open_to_inquiries",
                  )}
                  onChange={(e) =>
                    update(
                      "availability",
                      "public_availability",
                      e.target.value,
                    )
                  }
                >
                  <option value="open_to_inquiries"><UiText>{"Open to inquiries"}</UiText></option>
                  <option value="available_later">Available later</option>
                  <option value="unavailable">Unavailable for new work</option>
                </select>
              </Field>
              {availability.public_availability === "available_later" && (
                <Field label="Available from">
                  <input
                    type="date"
                    min={state.sample_clock.slice(0, 10)}
                    value={s(availability.available_from)}
                    onChange={(e) =>
                      update("availability", "available_from", e.target.value)
                    }
                  />
                </Field>
              )}
              <Field label="Preferred deposit (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={n(availability.deposit_percent, 60)}
                  onChange={(e) =>
                    update(
                      "availability",
                      "deposit_percent",
                      Number(e.target.value),
                    )
                  }
                />
              </Field>
              <p className="public-small">
                This default applies to future offers. Existing agreements stay
                as accepted.
              </p>
            </>
          )}
          {step === "connections" && (
            <>
              <h2>Your tools can come along later.</h2>
              <p>
                Preview how the crew could help through the tools you already
                use. This sample asks for no credentials.
              </p>
              <div className="setup-tools">
                {["Gmail", "Google Calendar", "Google Drive", "Payments"].map(
                  (x) => (
                    <Button
                      key={x}
                      variant="secondary"
                      onClick={() => setTool(x)}
                    >
                      Preview {x}
                    </Button>
                  ),
                )}
              </div>
              <div className="public-actions">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const next = { ...draft, connections_skipped: true };
                    setDraft(next);
                    (await save(step, next));
                  }}
                >
                  Skip connections
                </Button>
              </div>
              {b(draft.connections_skipped) && (
                <Notice>
                  Connections skipped. You can connect your tools later.
                </Notice>
              )}
              <h3>Your setup</h3>
              <p>
                {s(basics.name)} · {s(basics.profession)}
              </p>
              <p>
                {services.length} service{services.length === 1 ? "" : "s"} ·{" "}
                {weekly} working hours per week
              </p>
              <p className="public-small">
                Your profile is saved as a draft. Publishing is a separate
                choice in Settings.
              </p>
            </>
          )}
          <div className="setup-controls">
            <div>
              {stepIndex > 0 && (
                <Button
                  variant="secondary"
                  onClick={async () =>
                    (await save(steps[stepIndex - 1], {
                      ...draft,
                      service_editor: {
                        editing,
                        title: serviceTitle,
                        description: serviceDescription,
                        price,
                        currency,
                      },
                    }))
                  }
                >{"Back"}
                </Button>
              )}
            </div>
            <Button disabled={uploadBusy} onClick={proceed}>
              {step === "connections" ? "Open my workspace" : "Continue →"}
            </Button>
          </div>
        </Panel>
        <div className="public-actions">
          <Button
            variant="secondary"
            onClick={async () => {
              if (
                (await save(step, {
                  ...draft,
                  service_editor: {
                    editing,
                    title: serviceTitle,
                    description: serviceDescription,
                    price,
                    currency,
                  },
                }))
              )
                router.push("/auth/sign-in");
            }}
          >
            Save and leave
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (
                (await save(step, {
                  ...draft,
                  service_editor: {
                    editing,
                    title: serviceTitle,
                    description: serviceDescription,
                    price,
                    currency,
                  },
                }))
              ) {
                (await command("session.set", { authenticated: true }));
                router.push("/app/home");
              }
            }}
          >
            Skip to sample workspace
          </Button>
        </div>
      </div>
      {tool && (
        <Modal
          title={`${tool} sample capabilities`}
          onClose={() => setTool("")}
        >
          <p>
            {tool === "Gmail"
              ? "Review message drafts and simulate a confirmed send."
              : tool === "Google Calendar"
                ? "Review commitments and simulate approved invitations."
                : tool === "Google Drive"
                  ? "Inspect local source files and shared project outputs."
                  : "Create sample payment requests and reconcile local receipt events."}
          </p>
          <Notice>
            No real account is connected and no external action is performed.
          </Notice>
          <Button variant="secondary" onClick={() => setTool("")}>{"Done"}
          </Button>
        </Modal>
      )}
    </Frame>
  );
}

function Voice(props: { transcript: string; onClose: () => void; onText: () => void }) {
  const { connected } = useStore();
  return connected ? <ConnectedVoice onClose={props.onClose} onText={props.onText} /> : <SampleVoice {...props} />;
}
function SampleVoice({
  transcript,
  onClose,
  onText,
}: {
  transcript: string;
  onClose: () => void;
  onText: () => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState("Stopped");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setStatus("Speech is unavailable in this browser.");
      return;
    }
    const refresh = () =>
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter((v) => v.localService === true && /^en/i.test(v.lang)),
      );
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      if (utterance.current) window.speechSynthesis.cancel();
    };
  }, []);
  const stop = () => {
    if (utterance.current && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      utterance.current = null;
    }
    setStatus("Stopped");
  };
  const play = () => {
    const selected = window.speechSynthesis
      .getVoices()
      .find(
        (v) => v.localService === true && v.voiceURI === voices[0]?.voiceURI,
      );
    if (!selected) {
      setStatus("No suitable local voice. Read the complete transcript below.");
      return;
    }
    if (status === "Paused") {
      window.speechSynthesis.resume();
      return;
    }
    const speech = new SpeechSynthesisUtterance(transcript);
    speech.voice = selected;
    speech.onstart = () => setStatus("Playing");
    speech.onpause = () => setStatus("Paused");
    speech.onresume = () => setStatus("Playing");
    speech.onend = () => {
      setStatus("Finished");
      utterance.current = null;
    };
    speech.onerror = () => {
      setStatus("Playback unavailable. You can continue with the transcript.");
      utterance.current = null;
    };
    utterance.current = speech;
    window.speechSynthesis.speak(speech);
  };
  return (
    <Modal
      title="A short voice sample"
      onClose={() => {
        stop();
        onClose();
      }}
    >
      <p>
        This reads the stored sample transcript using an available device voice.
        It does not record you or add conversation messages.
      </p>
      <Badge>{status}</Badge>
      {!voices.length && (
        <Notice>
          No suitable local voice is available. The full transcript is here for
          you.
        </Notice>
      )}
      <blockquote className="voice-transcript">{transcript}</blockquote>
      <div className="public-actions">
        <Button
          disabled={!voices.length || status === "Playing"}
          onClick={play}
        >
          {status === "Paused" ? "Resume sample" : "Play sample"}
        </Button>
        <Button
          variant="secondary"
          disabled={status !== "Playing"}
          onClick={() => window.speechSynthesis.pause()}
        >
          Pause sample
        </Button>
        <Button
          variant="secondary"
          disabled={!utterance.current}
          onClick={stop}
        >
          Stop sample
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            stop();
            onText();
          }}
        >{"Continue by text"}
        </Button>
      </div>
    </Modal>
  );
}

function BuyerMessages({
  engagementId,
  grantId,
  initialDraft = "",
  onDraftChange,
}: {
  engagementId: string;
  grantId: string;
  initialDraft?: string;
  onDraftChange?: (s: string) => void;
}) {
  const { state, command, connected } = useStore();
  const inquiry = inquiryProjection(state, engagementId, grantId);
  const [text, setText] = useState(initialDraft);
  const [error, setError] = useState("");
  const [upload, setUpload] = useState<Entity | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const sendAttempt = useRef(new MutationAttempt<Input>());
  const attached = useRef(new Set<string>());
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftKey = `crewmori.buyer-draft.${grantId}.${engagementId}`;
  const initialDraftRef = useRef(initialDraft);
  useEffect(() => {
    sendAttempt.current.clear();
    attached.current.clear();
    setOutcomeUnknown(false);
    setUpload(null);
    try {
      if (!initialDraftRef.current)
        setText(localStorage.getItem(draftKey) || "");
    } catch {
      setError("Your draft cannot be restored from local storage.");
    }
    setDraftLoaded(true);
  }, [draftKey]);
  useEffect(() => {
    if (draftLoaded) {
      try {
        if (text) localStorage.setItem(draftKey, text);
        else localStorage.removeItem(draftKey);
      } catch {
        setError(
          "Your draft is not saved locally. Keep this page open until it is sent.",
        );
      }
    }
  }, [text, draftKey, draftLoaded]);
  const attempt = useRef(uid("message"));
  useEffect(() => {
    if (initialDraft) setText(initialDraft);
  }, [initialDraft]);
  if (!inquiry) return <Notice><UiText>{"Conversation unavailable for this link."}</UiText></Notice>;
  const data = o(inquiry),
    conversation = o(data.conversation);
  const messages = a<Entity>(data.messages);
  const send = async () => {
    if (sendingRef.current || uploadBusy) return;
    setError("");
    if (!text.trim() && !upload) {
      setError("Write a message or attach a readable file.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
    const attachments: string[] = [];
    if (upload && !attached.current.has(upload.id)) {
      const saved = (await command("file.attach", {
        id: upload.id,
        values: Object.fromEntries(
          Object.entries(upload).filter(
            ([k]) => !["id", "version"].includes(k),
          ),
        ),
        grant_id: grantId,
        engagement_id: engagementId,
      }));
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
      attached.current.add(upload.id);
    }
    if (upload) attachments.push(upload.id);
    const exact = sendAttempt.current.begin({
      id: s(conversation.id),
      expected_version: n(conversation.version),
      content: text.trim() || `Attached ${s(upload?.name)}`,
      attachment_ids: attachments,
      grant_id: grantId,
      engagement_id: engagementId,
      idempotency_key: attempt.current,
    });
    const result = await command("conversation.send", exact);
    sendAttempt.current.settle(result);
    setOutcomeUnknown(result.outcomeUnknown === true);
    if (result.ok) {
      setText("");
      setUpload(null);
      attempt.current = uid("message");
      onDraftChange?.("");
    } else setError(result.message);
    } catch (cause) {
      setOutcomeUnknown(sendAttempt.current.unresolved);
      setError(cause instanceof Error ? cause.message : "Message could not be sent. Your draft and attachment are still here.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  const addFile = async (file: File) => {
    setError("");
    setUploadBusy(true);
    try {
      const stored = await persistUpload(file);
      setUpload({
        id: stored.id,
        version: 1,
        name: stored.name,
        media_type: stored.type,
        byte_length: stored.size,
        storage_kind: connected ? "private" : "indexeddb",
        storage_locator: stored.id,
        availability: "available",
        audience: "buyer",
        engagement_id: engagementId,
        shared_with_buyer: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setUploadBusy(false);
    }
  };
  return (
    <div className="buyer-chat">
      <div className="message-history" aria-live="polite">
        {messages.length ? (
          messages.map((msg) => (
            <article
              className={`chat-message ${msg.sender_kind === "buyer" ? "from-buyer" : ""}`}
              key={msg.id}
            >
              <span className="public-small">
                {msg.sender_kind === "buyer"
                  ? "You"
                  : msg.sender_kind === "owner"
                    ? "Freelancer"
                    : connected ? "Sales · AI representative" : "Sales · sample representative"}{" "}
                · {date(msg.created_at)}
              </span>
              <p>{s(msg.content)}</p>
              {a<Entity>(msg.attachments).map((file) => file.storage_kind === "external_link" && externalFileHref(file.storage_locator) ? <a className="btn secondary" key={file.id} href={externalFileHref(file.storage_locator)} target="_blank" rel="noopener noreferrer"><UiText>{"Open external link"}</UiText>: {s(file.name)}</a> : (
                <Button
                  key={file.id}
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const blob = await readableFile(file);
                      if (!blob)
                        throw new Error(
                          "This attachment is unavailable. Ask the freelancer to share it again.",
                        );
                      downloadBlob(blob, s(file.name, "shared-attachment"));
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Attachment unavailable.",
                      );
                    }
                  }}
                >
                  Open shared attachment: {s(file.name)}
                </Button>
              ))}
            </article>
          ))
        ) : (
          <p><UiText>{"Share a little more about your project to begin."}</UiText></p>
        )}
      </div>
      <Form
        onSubmit={async (e) => {
          e.preventDefault();
          (await send());
        }}
        noValidate
      >
        <Field label="Message the freelancer">
          <textarea
            className="resize-none"
            id="buyer-message"
            rows={3}
            maxLength={5000}
            value={text}
            readOnly={sending || outcomeUnknown}
            onChange={(e) => {
              setText(e.target.value);
              onDraftChange?.(e.target.value);
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                (await send());
              }
            }}
            placeholder="Tell us a little more…"
          />
        </Field>
        <p className="public-small">
          {connected ? uiMessage("buyer.message.draft", s(state.tables.preferences?.preferences_alya?.locale, "en")) : "Enter sends · Shift+Enter adds a line · Saved in this sample conversation"}
        </p>
        <ErrorNote message={error} />
        {outcomeUnknown && <p className="public-notice" role="status"><UiText>{"The send result is not confirmed. Retry the original send to check it before editing or sending another copy. Your original message and reviewed version are retained."}</UiText></p>}
        {upload && (
          <div className="public-notice">
            {s(upload.name)} · {Math.ceil(n(upload.byte_length) / 1024)} KB{" "}
            <Button variant="secondary" disabled={sending || outcomeUnknown} onClick={() => setUpload(null)}>{"Remove attachment"}
            </Button>
          </div>
        )}
        <div className="message-compose-actions">
          <label className="file-button"><UiText>{"Attach a file"}</UiText>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              disabled={uploadBusy || sending || outcomeUnknown}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) void (await addFile(file));
              }}
            />
          </label>
          <Button type="submit" disabled={uploadBusy} pending={sending} pendingLabel={outcomeUnknown ? "Retrying original send…" : "Sending message…"}>
            {outcomeUnknown ? "Retry original send" : error ? "Retry message" : "Send message"}
          </Button>
        </div>
      </Form>
    </div>
  );
}

function Inquiry({ id, grant }: { id: string; grant: string }) {
  const { state, command, connected } = useStore();
  const inquiry = inquiryProjection(state, id, grant);
  const offer = buyerOffer(state, id, grant);
  const [briefOpen, setBriefOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [scope, setScope] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [days, setDays] = useState("");
  const [error, setError] = useState("");
  const [voice, setVoice] = useState(false);
  if (!inquiry) return <Unavailable />;
  const data = o(inquiry),
    requirements = o(data.requirements),
    conversation = o(data.conversation);
  const scopeLines = a<unknown>(requirements.requested_scope).map((x) =>
    typeof x === "string" ? x : s(o(x).label),
  );
  const briefText = scopeLines.join("\n") || s(requirements.requested_scope);
  const transcript =
    "Hello, I’m the sample Sales representative. I can help organize your project brief and identify questions for the freelancer. Please share the work you need, your budget if you know it, and your preferred timing. The freelancer reviews all proposed terms before they are shared with you.";
  const edit = () => {
    setScope(briefText);
    setBudget(
      requirements.requested_budget
        ? String(
            n(o(requirements.requested_budget).amount_minor) /
              (s(o(requirements.requested_budget).currency) === "IDR"
                ? 1
                : 100),
          )
        : "",
    );
    setCurrency(s(o(requirements.requested_budget).currency, "USD"));
    setDays(
      requirements.requested_delivery_business_days
        ? String(requirements.requested_delivery_business_days)
        : "",
    );
    setEditing(true);
    setBriefOpen(true);
  };
  const saveBrief = async () => {
    if (
      !scope.trim() ||
      (budget && parseAmount(budget, currency) === null) ||
      (days && (!Number.isInteger(Number(days)) || Number(days) < 1))
    ) {
      setError(
        "Add a requested scope, a valid optional budget, and whole business days.",
      );
      return;
    }
    const r = (await command("inquiry.updateBrief", {
      id: s(requirements.id),
      expected_version: n(requirements.version),
      grant_id: grant,
      engagement_id: id,
      values: {
        requested_scope: scope.split("\n").filter(Boolean),
        requested_budget: budget ? minor(budget, currency) : null,
        requested_delivery_business_days: days ? Number(days) : null,
      },
    }));
    if (r.ok) {
      setBriefOpen(false);
      setEditing(false);
      setError("");
    } else setError(r.message);
  };
  return (
    <Frame buyer>
      <div className="buyer-narrow">
        <div className="buyer-conversation-head">
          <img src="/assets/characters/sales.svg" alt="Sales representative" />
          <div>
            <p className="public-eyebrow">A GOOD PLACE TO BEGIN</p>
            <h1>Let’s talk about your project.</h1>
            <p>Sales · AI business representative for the freelancer</p>
          </div>
        </div>
        <Notice>
          <UiText>{connected ? "This private conversation helps organize your brief. The freelancer reviews proposed terms and makes the decisions." : "This conversation is a local sample. A representative helps collect your brief; the freelancer makes the decisions."}</UiText>
        </Notice>
        <div className="public-actions">
          <Button
            variant="secondary"
            onClick={() => {
              setBriefOpen(true);
              setEditing(false);
            }}
          >{"Review your brief"}
          </Button>
          <Button variant="secondary" onClick={() => setVoice(true)}><UiText>{connected ? "Talk to the AI representative" : "Play voice sample"}</UiText>
          </Button>
          {offer && (
            <LinkButton href={`/buyer/${id}/offer?grant=${grant}`}>{"View offer →"}
            </LinkButton>
          )}
        </div>
        <Panel>
          <BuyerMessages engagementId={id} grantId={grant} />
        </Panel>
        <div className="public-actions">
          <Button
            variant="secondary"
            disabled={b(conversation.owner_review_requested)}
            onClick={async () => {
              const r = (await command("conversation.requestOwner", {
                id: s(conversation.id),
                grant_id: grant,
                engagement_id: id,
                reason: "Buyer requested freelancer follow-up",
              }));
              if (!r.ok) setError(r.message);
            }}
          >
            {b(conversation.owner_review_requested)
              ? "Freelancer follow-up pending"
              : "Ask the freelancer"}
          </Button>
        </div>
        <ErrorNote message={error} />
      </div>
      {briefOpen && (
        <Modal
          title={editing ? "Correct your brief" : "Your saved brief"}
          onClose={() => {
            setBriefOpen(false);
            setEditing(false);
          }}
          dirty={
            editing &&
            (scope !== briefText ||
              budget !==
                (requirements.requested_budget
                  ? String(
                      n(o(requirements.requested_budget).amount_minor) /
                        (s(o(requirements.requested_budget).currency) === "IDR"
                          ? 1
                          : 100),
                    )
                  : "") ||
              days !==
                (requirements.requested_delivery_business_days
                  ? String(requirements.requested_delivery_business_days)
                  : ""))
          }
        >
          {editing ? (
            <>
              <Field label="Requested scope">
                <textarea
                  className="resize-none"
                  rows={4}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                />
              </Field>
              <div className="public-form-grid">
                <Field label="Budget (optional)">
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </Field>
                <Field label="Currency">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option>USD</option>
                    <option>IDR</option>
                  </select>
                </Field>
              </div>
              <Field label="Requested business days (optional, Asia/Jakarta)">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </Field>
              <ErrorNote message={error} />
              <div className="public-actions">
                <Button onClick={saveBrief}>{"Save brief"}</Button>
                <Button
                  variant="secondary"
                  onClick={(e) =>
                    e.currentTarget.closest("dialog")?.dispatchEvent(
                      new Event("cancel", {
                        bubbles: true,
                        cancelable: true,
                      }),
                    )
                  }
                >{"Cancel brief edits"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3><UiText>{"Requested scope"}</UiText></h3>
              <p className="preserve-lines">{briefText || "To be clarified"}</p>
              <dl className="buyer-facts">
                <div>
                  <dt><UiText>{"Budget"}</UiText></dt>
                  <dd>
                    {requirements.requested_budget
                      ? money(requirements.requested_budget)
                      : "Not yet known"}
                  </dd>
                </div>
                <div>
                  <dt>Preferred timing</dt>
                  <dd>
                    {requirements.requested_delivery_business_days
                      ? `${requirements.requested_delivery_business_days} business days requested`
                      : "To be clarified"}
                  </dd>
                </div>
              </dl>
              <p><UiText>{"Requested timing is not a confirmed deadline."}</UiText></p>
              {a<string>(requirements.unknowns).length > 0 && (
                <Notice>
                  Still to clarify:{" "}
                  {a<string>(requirements.unknowns).map(label).join(", ")}.
                </Notice>
              )}
              <Button variant="secondary" onClick={edit}>{"Correct brief"}
              </Button>
            </>
          )}
        </Modal>
      )}
      {voice && (
        <Voice
          transcript={transcript}
          onClose={() => setVoice(false)}
          onText={() => {
            setVoice(false);
            setTimeout(
              () =>
                document
                  .querySelector<HTMLTextAreaElement>(".buyer-chat textarea")
                  ?.focus(),
              0,
            );
          }}
        />
      )}
    </Frame>
  );
}

function AmendmentSummary({ offer }: { offer: Record<string, unknown> }) {
  const amendment = o(offer.amendment);
  if (!amendment.previous_price) return null;
  const oldPrice = o(amendment.previous_price),
    newPrice = o(offer.price),
    oldTerms = o(amendment.previous_terms),
    newTerms = o(offer.terms);
  const deposit = (
    price: Record<string, unknown>,
    terms: Record<string, unknown>,
  ) => ({
    ...price,
    amount_minor: Math.round(
      (n(price.amount_minor) * n(terms.deposit_basis_points)) / 10000,
    ),
  });
  return (
    <section className="amendment-summary">
      <p className="public-eyebrow">PROPOSED AMENDMENT</p>
      <h3>What this update changes</h3>
      <p>
        Your existing agreement remains in effect until you accept this exact
        update.
      </p>
      <div className="amendment-table-wrap">
        <table className="amendment-table">
          <thead>
            <tr>
              <th scope="col"><UiText>{"Term"}</UiText></th>
              <th scope="col">Agreed</th>
              <th scope="col">This update</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row"><UiText>{"Project total"}</UiText></th>
              <td>{money(oldPrice)}</td>
              <td>{money(newPrice)}</td>
            </tr>
            <tr>
              <th scope="row"><UiText>{"Deposit"}</UiText></th>
              <td>{money(deposit(oldPrice, oldTerms))}</td>
              <td>{money(deposit(newPrice, newTerms))}</td>
            </tr>
            <tr>
              <th scope="row"><UiText>{"Delivery period"}</UiText></th>
              <td>{n(oldTerms.delivery_business_days)} business days</td>
              <td>{n(newTerms.delivery_business_days)} business days</td>
            </tr>
          </tbody>
        </table>
      </div>
      {n(amendment.deposit_delta_minor) > 0 && (
        <Notice>
          Additional deposit after acceptance:{" "}
          <strong>
            {money({
              ...newPrice,
              amount_minor: n(amendment.deposit_delta_minor),
            })}
          </strong>
          . Previously recorded payments stay credited to this project.
        </Notice>
      )}
      {!!(amendment.proposed_start_at || amendment.proposed_due_at) && (
        <p>
          Proposed schedule: {date(amendment.proposed_start_at)} to{" "}
          {date(amendment.proposed_due_at)}. The freelancer confirms the new
          schedule after the additional requirements are complete.
        </p>
      )}
      {s(amendment.requires_review_reason) && (
        <p>{s(amendment.requires_review_reason)}</p>
      )}
    </section>
  );
}
function OfferTerms({ offer }: { offer: Record<string, unknown> }) {
  const terms = o(offer.terms);
  return (
    <>
      <h3><UiText>{"Delivery and next steps"}</UiText></h3>
      <p>
        Delivery is planned over {n(terms.delivery_business_days)} business days
        in {s(terms.timezone, "Asia/Jakarta")}, beginning the next business day
        after the required deposit and all requested inputs are confirmed.
      </p>
      <p>
        Your provisional reservation lasts {n(terms.reservation_hours, 48)}{" "}
        elapsed hours after acceptance. If the prerequisites arrive later, the
        freelancer will review a new schedule with you.
      </p>
      <h3><UiText>{"Inputs to get started"}</UiText></h3>
      <ul>
        {a<string>(terms.required_input_keys).map((x) => (
          <li key={x}>{label(x)}</li>
        ))}
      </ul>
      <p>{s(terms.acceptance_disclosure)}</p>
      {s(offer.buyer_note) && (
        <>
          <h3>A note for you</h3>
          <p>{s(offer.buyer_note)}</p>
        </>
      )}
    </>
  );
}
function Offer({ id, grant }: { id: string; grant: string }) {
  const { state, command } = useStore();
  const params = useSearchParams();
  const projection = buyerOffer(
    state,
    id,
    grant,
    params.get("version") || undefined,
  );
  const latestProjection = buyerOffer(state, id, grant);
  const [terms, setTerms] = useState(false);
  const [accept, setAccept] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [change, setChange] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const acceptKey = useRef(uid("accept"));
  const reviewed = useRef<Record<string, unknown> | null>(null);
  if (!projection)
    return (
      <Unavailable
        title="This offer is not available"
        description="The offer may not be shared yet, or this link is no longer active. Ask the freelancer for a current link."
      />
    );
  const offer = o(projection),
    price = o(offer.price),
    offerTerms = o(offer.terms);
  const deposit = {
    ...price,
    amount_minor: Math.round(
      (n(price.amount_minor) * n(offerTerms.deposit_basis_points)) / 10000,
    ),
  };
  const accepted = offer.state === "accepted";
  const eligibility = o(offer.accept_eligibility);
  const requestChanges = async () => {
    if (!reason.trim()) {
      setError("Describe what you would like changed.");
      return;
    }
    const exact = reviewed.current || offer;
    const r = (await command("offer.requestChanges", {
      id: s(exact.offer_id),
      offer_version_id: s(exact.offer_version_id),
      expected_version: n(exact.offer_record_version),
      grant_id: grant,
      engagement_id: id,
      reason: reason.trim(),
      content: reason.trim(),
    }));
    if (r.ok) {
      setChange(false);
      setReason("");
      setError("");
    } else setError(r.message);
  };
  const acceptOffer = async () => {
    if (!agreed) return;
    const exact = reviewed.current || offer;
    const r = (await command("offer.accept", {
      id: s(exact.offer_id),
      offer_version_id: s(exact.offer_version_id),
      expected_version: n(exact.offer_record_version),
      grant_id: grant,
      engagement_id: id,
      confirmed: true,
      idempotency_key: acceptKey.current,
    }));
    if (r.ok) {
      setAccept(false);
      setAgreed(false);
      setError("");
    } else setError(r.message);
  };
  const pdf = () => {
    try {
      downloadPdf(`Offer-${s(offer.offer_version_id)}.pdf`, s(offer.title), [
        state.mode === "connected" ? "OFFER" : "SAMPLE OFFER",
        `Freelancer: ${s(offer.freelancer_name)}`,
        `Prepared for: ${s(offer.buyer_name)}`,
        `Version: ${versionLabel(offer.offer_version_id)}`,
        `Status: ${label(offer.state)}`,
        `Total: ${money(price)}`,
        `Deposit: ${money(deposit)} (${n(offerTerms.deposit_basis_points) / 100}%)`,
        ...a<Record<string, unknown>>(offer.deliverables).map(
          (x) => `${n(x.quantity, 1)} x ${s(x.label)}`,
        ),
        `Delivery: ${n(offerTerms.delivery_business_days)} business days after confirmed deposit and required inputs. Timezone: ${s(offerTerms.timezone)}.`,
        `${n(offerTerms.reservation_hours, 48)} hour provisional reservation. Late prerequisites require schedule review.`,
        `Required inputs: ${a<string>(offerTerms.required_input_keys).map(label).join(", ")}`,
        s(offerTerms.acceptance_disclosure),
        s(offer.buyer_note),
        `Offer expires: ${date(offer.expires_at)}`,
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The PDF could not be generated. Try again.",
      );
    }
  };
  return (
    <Frame buyer>
      <div className="buyer-document">
        <div className="offer-document-top">
          <Link href={`/inquiry/${id}?grant=${grant}`}>
            ← Back to conversation
          </Link>
          <Badge tone={accepted ? "success" : "info"}>
            {accepted ? "Accepted terms" : label(offer.state)}
          </Badge>
        </div>
        <div className="offer-letterhead">
          <p className="public-eyebrow">
            PREPARED BY {s(offer.freelancer_name).toUpperCase()}
          </p>
          <h1>{s(offer.title)}</h1>
          <p className="public-lead">
            A thoughtful plan for {s(offer.buyer_name)}.
          </p>
          <p className="public-small"><UiText>{"Version"}</UiText> {versionLabel(offer.offer_version_id)} ·{" "}
            {accepted
              ? "Historical accepted agreement"
              : `Valid until ${date(offer.expires_at)}`}
          </p>
        </div>
        <Panel>
          <div className="offer-price-grid">
            <div>
              <span><UiText>{"Project total"}</UiText></span>
              <strong>{money(price)}</strong>
            </div>
            <div>
              <span>Deposit · {n(offerTerms.deposit_basis_points) / 100}%</span>
              <strong>{money(deposit)}</strong>
            </div>
            <div>
              <span><UiText>{"Delivery basis"}</UiText></span>
              <strong>
                {n(offerTerms.delivery_business_days)} business days
              </strong>
            </div>
          </div>
          <AmendmentSummary offer={offer} />
          <hr />
          <h2>What’s included</h2>
          <ul className="public-deliverables">
            {a<Record<string, unknown>>(offer.deliverables).map((x, i) => (
              <li key={i}>
                <span>
                  {n(x.quantity, 1) > 1 ? `${n(x.quantity)} × ` : ""}
                  {s(x.label)}
                </span>
              </li>
            ))}
          </ul>
          <p className="public-muted">
            The start date follows confirmed deposit and required inputs.
            Acceptance alone does not start the delivery clock.
          </p>
          <Button
            variant="secondary"
            onClick={() => setTerms(!terms)}
            aria-expanded={terms}
          >
            {terms ? "Hide" : "Full"} scope and terms
          </Button>
          {terms && (
            <div className="expanded-terms">
              <OfferTerms offer={offer} />
            </div>
          )}
        </Panel>
        <ErrorNote message={error} />
        {accepted ? (
          <Notice>
            Your offer is accepted. Continue to your project for payment
            instructions, inputs, messages, and shared files.
          </Notice>
        ) : (
          !b(eligibility.allowed) && (
            <Notice>
              {s(
                eligibility.reason,
                "This version is not currently available to accept. Please contact the freelancer for updated terms.",
              )}
            </Notice>
          )
        )}
        <div className="public-actions">
          {accepted ? (
            <LinkButton href={`/buyer/${id}?grant=${grant}`}>{"Continue to project →"}
            </LinkButton>
          ) : (
            <Button
              disabled={!b(eligibility.allowed)}
              onClick={() => {
                reviewed.current = structuredClone(offer);
                setAgreed(false);
                setAccept(true);
              }}
            >{"Review acceptance"}
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={!accepted && !b(eligibility.allowed)}
            onClick={() => {
              reviewed.current = structuredClone(offer);
              setChange(true);
            }}
          >
            {accepted ? "Request an amendment" : "Request changes"}
          </Button>
          <Button variant="secondary" onClick={pdf}>{"Download offer PDF"}
          </Button>
          {latestProjection &&
            latestProjection.offer_version_id !== s(offer.offer_version_id) && (
              <LinkButton
                href={`/buyer/${id}/offer?grant=${grant}`}
                variant="secondary"
              >
                View updated offer
              </LinkButton>
            )}
        </div>
      </div>
      {accept && (
        <Modal title="Ready to move forward?" onClose={() => setAccept(false)}>
          <p><UiText>{"You are accepting"}</UiText> <strong>{s(offer.title)}</strong>, version{" "}
            {versionLabel(offer.offer_version_id)}.
          </p>
          <dl className="buyer-facts">
            <div>
              <dt><UiText>{"Total"}</UiText></dt>
              <dd>{money(price)}</dd>
            </div>
            <div>
              <dt><UiText>{"Required deposit"}</UiText></dt>
              <dd>{money(deposit)}</dd>
            </div>
          </dl>
          <AmendmentSummary offer={offer} />
          <OfferTerms offer={offer} />
          <label className="agreement-check">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I agree to these terms, including the delivery prerequisites and
            provisional reservation expiry.
          </label>
          {n(reviewed.current?.offer_record_version) !==
            n(offer.offer_record_version) && (
            <Notice>
              This offer changed while you were reviewing. Close this dialog and
              review the latest terms.
            </Notice>
          )}
          <ErrorNote message={error} />
          <div className="public-actions">
            <Button
              disabled={
                !agreed ||
                n(reviewed.current?.offer_record_version) !==
                  n(offer.offer_record_version)
              }
              onClick={acceptOffer}
            >{"Accept offer"}
            </Button>
            <Button variant="secondary" onClick={() => setAccept(false)}>{"Keep reviewing"}
            </Button>
          </div>
        </Modal>
      )}
      {change && (
        <Modal
          title={accepted ? "Request an amendment" : "Request changes"}
          onClose={() => setChange(false)}
          dirty={!!reason}
        >
          <p>
            {accepted
              ? "Your accepted terms remain in effect while the freelancer reviews your request."
              : "The freelancer will review your request and share an updated offer if appropriate."}
          </p>
          <Field label="Requested changes">
            <textarea
              className="resize-none"
              rows={5}
              value={reason}
              maxLength={5000}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <ErrorNote message={error} />
          <div className="public-actions">
            <Button onClick={requestChanges}>{"Send change request"}</Button>
            <Button
              variant="secondary"
              onClick={(e) =>
                e.currentTarget
                  .closest("dialog")
                  ?.dispatchEvent(
                    new Event("cancel", { bubbles: true, cancelable: true }),
                  )
              }
            >
              Cancel request
            </Button>
          </div>
        </Modal>
      )}
    </Frame>
  );
}

function InputEditor({
  item,
  projectId,
  engagementId,
  grantId,
  onClose,
}: {
  item: Entity;
  projectId: string;
  engagementId: string;
  grantId: string;
  onClose: () => void;
}) {
  const { command, connected } = useStore();
  const [answer, setAnswer] = useState(s(item.answer));
  const [files, setFiles] = useState<Entity[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const initial = s(item.answer);
  const add = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const stored = await persistUpload(file);
      setFiles((x) => [
        ...x,
        {
          id: stored.id,
          version: 1,
          name: stored.name,
          media_type: stored.type,
          byte_length: stored.size,
          storage_kind: connected ? "private" : "indexeddb",
          storage_locator: stored.id,
          availability: "available",
          audience: "buyer",
          project_id: projectId,
          engagement_id: engagementId,
          shared_with_buyer: true,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read file.");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (sendingRef.current || busy) return;
    setError("");
    if (answer.trim().length < 3 && !files.length) {
      setError("Add input details or a readable attachment.");
      return;
    }
    if (/(?:javascript|data|file):/i.test(answer)) {
      setError("Use a safe HTTPS link or plain text.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
    for (const file of files) {
      const saved = (await command("file.attach", {
        id: file.id,
        values: Object.fromEntries(
          Object.entries(file).filter(([k]) => !["id", "version"].includes(k)),
        ),
        grant_id: grantId,
        engagement_id: engagementId,
      }));
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
    }
    const result = (await command("project.provideInput", {
      id: item.id,
      expected_version: item.version,
      answer: answer.trim(),
      attachment_ids: files.length
        ? files.map((x) => x.id)
        : a<string>(item.attachment_ids),
      grant_id: grantId,
      engagement_id: engagementId,
    }));
    if (result.ok) onClose();
    else setError(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inputs could not be saved. Your details and files are still here.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  return (
    <Modal
      title={s(item.label, s(item.title, label(item.key)))}
      onClose={() => { if (!sendingRef.current) onClose(); }}
      dirty={answer !== initial || !!files.length}
    >
      <p>
        {s(
          item.description,
          "Share the information the freelancer needs to begin.",
        )}
      </p>
      {item.state === "provided" && (
        <Notice>
          You are revising a saved input. Accepted scope and committed dates do
          not change automatically.
        </Notice>
      )}
      <Field label="Input details">
        <textarea
          className="resize-none"
          rows={5}
          readOnly={sending}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={5000}
        />
      </Field>
      <Field label="Attach file (PDF, PNG, JPEG, TXT; up to 10 MB)">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          disabled={busy || sending}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) void (await add(file));
          }}
        />
      </Field>
      {files.map((file) => (
        <div key={file.id} className="public-notice">
          {s(file.name)}{" "}
          <Button
            variant="secondary"
            disabled={sending}
            onClick={() => setFiles((x) => x.filter((f) => f.id !== file.id))}
          >{"Remove draft attachment"}
          </Button>
        </div>
      ))}
      <ErrorNote message={error} />
      <div className="public-actions">
        <Button disabled={busy} pending={sending} pendingLabel="Saving inputs…" onClick={submit}>{"Submit inputs"}
        </Button>
        <Button
          variant="secondary"
          disabled={sending}
          onClick={(e) =>
            e.currentTarget
              .closest("dialog")
              ?.dispatchEvent(
                new Event("cancel", { bubbles: true, cancelable: true }),
              )
          }
        >{"Cancel input edits"}
        </Button>
      </div>
    </Modal>
  );
}

async function readableFile(file: Entity) {
  if (file.availability !== "available" || file.storage_kind === "external_link") return null;
  const locator = s(file.storage_locator);
  return attachmentBlob({ ...file, storage_locator: locator.startsWith("assets/") ? `/${locator}` : locator });
}

function BuyerFiles({
  files,
  report,
}: {
  files: Entity[];
  report: (s: string) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { notify } = useStore();
  const [query, setQuery] = useState(params.get("q") || "");
  const [type, setType] = useState(params.get("type") || "all");
  const [preview, setPreview] = useState<{ file: Entity; url: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const updateFilter = (q: string, t: string) => {
    setQuery(q);
    setType(t);
    const p = new URLSearchParams(params);
    if (q) p.set("q", q);
    else p.delete("q");
    if (t !== "all") p.set("type", t);
    else p.delete("type");
    router.replace(`?${p}`, { scroll: false });
  };
  const filtered = files.filter(
    (x) =>
      s(x.name).toLowerCase().includes(query.toLowerCase()) &&
      (type === "all" || s(x.media_type).startsWith(type)),
  );
  const open = async (file: Entity, download = false) => {
    setBusy(file.id);
    setError("");
    try {
      const blob = await readableFile(file);
      if (!blob)
        throw new Error(
          "This file’s bytes are unavailable. Please ask the freelancer to share it again.",
        );
      if (download) {
        downloadBlob(blob, s(file.name, "shared-file"));
        notify("The actual shared file is ready to download.");
      } else setPreview({ file, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "File unavailable.");
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <div className="public-form-grid">
        <Field label="Search shared files">
          <input
            type="search"
            value={query}
            onChange={(e) => updateFilter(e.target.value, type)}
          />
        </Field>
        <Field label="File type">
          <select
            value={type}
            onChange={(e) => updateFilter(query, e.target.value)}
          >
            <option value="all">All files</option>
            <option value="image/">Images</option>
            <option value="application/pdf">PDF</option>
            <option value="text/">Text</option>
          </select>
        </Field>
      </div>
      {(query || type !== "all") && (
        <Button variant="secondary" onClick={() => updateFilter("", "all")}>{"Clear file filters"}
        </Button>
      )}
      <ErrorNote message={error} />
      {!files.length ? (
        <Empty
          title="Shared files will appear here"
          description="The freelancer will share the files relevant to your project."
        />
      ) : !filtered.length ? (
        <Empty
          title="No matching files"
          description="Try another name or clear your filters."
        />
      ) : (
        filtered.map((file) => (
          <div className="buyer-file-row" key={file.id}>
            <div>
              <strong>{s(file.name)}</strong>
              <p className="public-small">
                {file.storage_kind === "external_link" ? <UiText>{"External reference"}</UiText> : <>{s(file.media_type)} · {Math.ceil(n(file.byte_length) / 1024)} KB</>} · {date(file.shared_at ?? file.created_at)}
              </p>
            </div>
            <div className="public-actions">
              {file.storage_kind === "external_link" && externalFileHref(file.storage_locator) ? (
                <a className="btn secondary" href={externalFileHref(file.storage_locator)} target="_blank" rel="noopener noreferrer"><UiText>{"Open external link"}</UiText><span className="sr-only"> ({s(file.name)})</span></a>
              ) : file.availability === "available" && file.storage_kind !== "external_link" ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={busy === file.id}
                    onClick={async () => void (await open(file))}
                  >
                    Preview file
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy === file.id}
                    onClick={async () => void (await open(file, true))}
                  >{"Download file"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() =>
                    report(
                      `Could you share ${s(file.name)} again? The file is unavailable.`,
                    )
                  }
                >
                  Report unavailable file
                </Button>
              )}
              {file.storage_kind !== "external_link" && externalFileHref(file.external_url) && (
                <a
                  href={externalFileHref(file.external_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open shared link
                </a>
              )}
            </div>
          </div>
        ))
      )}
      {preview && (
        <Modal title={s(preview.file.name)} onClose={() => setPreview(null)}>
          {s(preview.file.media_type).startsWith("image/") ? (
            <img
              className="public-image-preview"
              src={preview.url}
              alt={s(preview.file.name)}
            />
          ) : s(preview.file.media_type) === "application/pdf" ? (
            <iframe
              title={s(preview.file.name)}
              src={preview.url}
              className="buyer-file-preview"
            />
          ) : (
            <p>This format is available to download.</p>
          )}
          <Button onClick={async () => void (await open(preview.file, true))}>{"Download file"}
          </Button>
        </Modal>
      )}
    </>
  );
}

function BuyerPayment({
  data,
  engagementId,
  grantId,
  message,
}: {
  data: Record<string, unknown>;
  engagementId: string;
  grantId: string;
  message: (text: string) => void;
}) {
  const { state, command, connected } = useStore();
  const [sample, setSample] = useState(false);
  const [event, setEvent] = useState("exact");
  const [selected, setSelected] = useState<Entity | null>(null);
  const [error, setError] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const [receiptDetail, setReceiptDetail] = useState<Entity | null>(null);
  const requests = a<Entity>(data.requests),
    invoices = a<Entity>(data.invoices),
    receipts = a<Entity>(data.receipts);
  const openRequest = async (request: Entity) => {
    setError("");
    const r = (await command("payment.startRequest", {
      id: request.id,
      expected_version: request.version,
      grant_id: grantId,
      engagement_id: engagementId,
    }));
    if (!r.ok) setError(r.message);
  };
  const apply = async () => {
    if (!selected) return;
    const amount = o(
      selected.expected ??
        selected.amount ??
        selected.gross ??
        selected.expected_amount,
    );
    const amountMinor = n(amount.amount_minor, n(selected.amount_minor));
    const currency = s(amount.currency, s(selected.currency, "USD"));
    const prior = receipts.find((x) => x.payment_request_id === selected.id);
    if (event === "duplicate") {
      if (!prior) {
        setError("Record a receipt before replaying it.");
        return;
      }
      const replay = (await command("payment.replayReceipt", {
        id: selected.id,
        receipt_id: prior.id,
        grant_id: grantId,
        engagement_id: engagementId,
      }));
      if (replay.ok) {
        setSample(false);
        setError("");
      } else setError(replay.message);
      return;
    }
    if (event === "failure") {
      setError(
        "Sample provider failure: no receipt was recorded. Choose another event to retry.",
      );
      return;
    }
    const wrong = event === "wrong_currency";
    const gross = {
      amount_minor:
        event === "partial" ? Math.round(amountMinor / 2) : amountMinor,
      currency: wrong ? (currency === "USD" ? "IDR" : "USD") : currency,
      scale: wrong ? (currency === "USD" ? 0 : 2) : currency === "IDR" ? 0 : 2,
    };
    const fee = {
      ...gross,
      amount_minor: Math.round(n(gross.amount_minor) * 0.02),
    };
    const result = (await command("payment.simulateReceipt", {
      id: selected.id,
      grant_id: grantId,
      engagement_id: engagementId,
      gross,
      fee,
      provider_event_id: `buyer_sample_${selected.id}_${event}_${state.sample_clock}`,
      observed_at: state.sample_clock,
    }));
    if (result.ok) {
      setSample(false);
      setError("");
    } else setError(result.message);
  };
  const downloadInvoice = (invoice: Entity) => {
    const lines = a<Record<string, unknown>>(
      invoice.line_items ?? invoice.lines,
    );
    const total = o(invoice.total ?? invoice.gross);
    downloadPdf(
      `${s(invoice.number, invoice.id)}.pdf`,
      "Sample deposit invoice",
      [
        `Invoice: ${s(invoice.number, invoice.id)}`,
        `Issued to: ${s(o(data.contact).display_name)}`,
        `Status: ${label(invoice.state)}`,
        `Currency: ${s(invoice.currency, s(total.currency))}`,
        ...lines.map(
          (x) =>
            `${s(x.description, s(x.label))} · ${n(x.quantity, 1)} × ${money(x.unit_amount ?? x.unit_price ?? { amount_minor: n(x.unit_amount_minor), currency: s(invoice.currency, "USD") })}`,
        ),
        `Gross total: ${money(total.amount_minor !== undefined ? total : { amount_minor: n(invoice.total_minor), currency: s(invoice.currency, "USD") })}`,
        `Outstanding: ${money({ amount_minor: n(invoice.outstanding_minor, n(invoice.gross_outstanding_minor)), currency: s(invoice.currency, "USD") })}`,
        `Related terms: ${s(invoice.offer_version_id, s(o(data.offer).offer_version_id))}`,
      ],
    );
  };
  if (connected) return <ConnectedBuyerPayment data={data} />;
  return (
    <>
      <h2>Payment, clearly laid out.</h2>
      <p>
        Sample instructions for the amount you agreed. No real money moves here.
      </p>
      <ErrorNote message={error} />
      {!requests.length && (
        <Empty
          title="No payment request yet"
          description="An authorized request will appear here when it is ready."
        />
      )}
      {requests.map((request) => {
        const invoice = invoices.find((x) => x.id === request.invoice_id);
        const amount = request.expected ??
          request.amount ??
          request.gross ??
          request.expected_amount ?? {
            amount_minor: n(request.amount_minor),
            currency: s(request.currency, "USD"),
          };
        const reference = s(
          request.reference,
          s(request.request_reference, request.id),
        );
        return (
          <div key={request.id} className="payment-card">
            <div className="buyer-row">
              <h3>{s(request.label, "Deposit request")}</h3>
              <Badge tone={request.state === "confirmed" ? "success" : "info"}>
                {label(request.state)}
              </Badge>
            </div>
            <strong className="payment-amount">{money(amount)}</strong>
            {invoice && (
              <p>
                Invoice {s(invoice.number, invoice.id)} · {label(invoice.state)}
                {invoice.outstanding_minor !== undefined
                  ? ` · ${money({ amount_minor: n(invoice.outstanding_minor), currency: s(invoice.currency, "USD") })} outstanding`
                  : ""}
              </p>
            )}
            {request.state === "created" ? (
              <Button onClick={async () => (await openRequest(request))}>
                View deposit instructions
              </Button>
            ) : (
              <>
                <Notice>
                  Use this sample reference when discussing the request:{" "}
                  <strong className="break-word">{reference}</strong>. No
                  transfer is required.
                </Notice>
                <div className="public-actions">
                  {invoice && invoice.state !== "draft" && (
                    <Button
                      variant="secondary"
                      onClick={() => downloadInvoice(invoice)}
                    >
                      Download deposit invoice
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(reference);
                        setCopyFallback("Reference copied.");
                      } catch {
                        setCopyFallback(reference);
                      }
                    }}
                  >
                    Copy payment reference
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelected(request);
                      setSample(true);
                    }}
                  >
                    Sample controls
                  </Button>
                </div>
              </>
            )}
            <Button
              variant="secondary"
              onClick={() =>
                message(
                  `I have a payment question about reference ${reference}. `,
                )
              }
            >{"I have a payment question"}
            </Button>
          </div>
        );
      })}
      {copyFallback && (
        <Notice>
          <span className="selectable">{copyFallback}</span>
        </Notice>
      )}
      {receipts.length > 0 && (
        <>
          <h3>Recorded sample receipts</h3>
          {receipts.map((receipt) => (
            <div key={receipt.id} className="buyer-row">
              <div>
                <strong>{money(receipt.gross)}</strong>
                <p>
                  {label(receipt.reconciliation_state ?? receipt.state)} ·{" "}
                  {date(receipt.received_at)}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setReceiptDetail(receipt)}
              >
                Inspect sample receipt
              </Button>
            </div>
          ))}
        </>
      )}
      {sample && selected && (
        <Modal
          title="Apply a sample payment event"
          onClose={() => setSample(false)}
        >
          <p>
            This deliberately changes only the current project’s local sample
            records. Exact receipts can satisfy a deposit; partial and
            wrong-currency receipts retain their remaining issues.
          </p>
          <Field label="Sample payment outcome">
            <select value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="exact">Exact deposit received</option>
              <option value="partial">Partial receipt (half)</option>
              <option value="wrong_currency">Wrong currency</option>
              <option value="duplicate">Replay existing receipt</option>
              <option value="failure">Provider failure (no receipt)</option>
            </select>
          </Field>
          <ErrorNote message={error} />
          <div className="public-actions">
            <Button onClick={apply}>Apply sample event</Button>
            <Button variant="secondary" onClick={() => setSample(false)}>
              Cancel sample event
            </Button>
          </div>
        </Modal>
      )}
      {receiptDetail && (
        <Modal
          title="Your sample receipt"
          onClose={() => setReceiptDetail(null)}
        >
          <dl className="buyer-facts">
            <div>
              <dt>Gross observed</dt>
              <dd>{money(receiptDetail.gross)}</dd>
            </div>
            <div>
              <dt>Reconciliation</dt>
              <dd>
                {label(
                  receiptDetail.reconciliation_state ?? receiptDetail.state,
                )}
              </dd>
            </div>
            <div>
              <dt><UiText>{"Reference"}</UiText></dt>
              <dd>{s(receiptDetail.provider_event_id, receiptDetail.id)}</dd>
            </div>
          </dl>
          <p>
            Only checked allocations reduce the invoice balance. Any mismatch
            remains for review.
          </p>
        </Modal>
      )}
    </>
  );
}

function Portal({ id, grant }: { id: string; grant: string }) {
  const { state, command, refresh, refreshing, refreshError } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const projection = buyerPortal(state, id, grant);
  const [input, setInput] = useState<Entity | null>(null);
  const [draft, setDraft] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [acceptDelivery, setAcceptDelivery] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  if (!projection) return <Unavailable />;
  const data = o(projection),
    project = o(data.project);
  if (!project.id)
    return (
      <Frame buyer>
        <div className="public-narrow">
          <Empty
            title="Your project starts with an agreement."
            description="Review the shared offer when it is ready. Your saved conversation is still here."
          >
            <LinkButton href={`/inquiry/${id}?grant=${grant}`}>{"Return to conversation"}
            </LinkButton>
            {!!data.offer && (
              <LinkButton
                href={`/buyer/${id}/offer?grant=${grant}`}
                variant="secondary"
              >{"View offer"}
              </LinkButton>
            )}
          </Empty>
        </div>
      </Frame>
    );
  const tab = params.get("tab") || "overview";
  const href = (part: string) =>
    `/buyer/${id}?grant=${grant}${part === "overview" ? "" : `&tab=${part}`}`;
  const inputs = a<Entity>(data.inputs),
    milestones = a<Entity>(data.milestones),
    tasks = a<Entity>(data.tasks);
  const ask = (text: string) => {
    setDraft(text);
    router.push(href("messages"));
    setTimeout(
      () =>
        document
          .querySelector<HTMLTextAreaElement>(".buyer-chat textarea")
          ?.focus(),
      0,
    );
  };
  const accept = async () => {
    const result = (await command("project.acceptDelivery", {
      id: s(project.id),
      expected_version: n(project.version),
      grant_id: grant,
      engagement_id: id,
      confirmed: true,
    }));
    if (result.ok) {
      setAcceptDelivery(false);
      setDelivery(false);
    } else setError(result.message);
  };
  const revision = async () => {
    if (!feedback.trim()) {
      setError("Describe the revision you need.");
      return;
    }
    const result = (await command("project.requestRevision", {
      id: s(project.id),
      expected_version: n(project.version),
      grant_id: grant,
      engagement_id: id,
      reason: feedback.trim(),
      content: feedback.trim(),
    }));
    if (result.ok) {
      setDelivery(false);
      setFeedback("");
    } else setError(result.message);
  };
  return (
    <Frame buyer>
      <div className="buyer-portal">
        <p className="public-eyebrow">
          YOUR PROJECT WITH{" "}
          {s(o(data.offer).freelancer_name, "THE FREELANCER").toUpperCase()}
        </p>
        <PageHead
          title={s(project.title, "Your project")}
          description={`Welcome, ${s(o(data.contact).display_name, "there")}. Here is where things stand.`}
          action={
            <LinkButton
              href={`/buyer/${id}/offer?grant=${grant}`}
              variant="secondary"
            >{"Accepted terms"}
            </LinkButton>
          }
        />
        <div className="public-actions">
          <Badge tone={project.state === "active" ? "success" : "info"}>
            {label(project.state)}
          </Badge>
          <Badge>{label(project.professional_delivery_state)}</Badge>
        </div>
        <Tabs
          items={["overview", "payment", "inputs", "messages", "files"].map(
            (x) => ({
              label:
                x === "inputs"
                  ? "Required inputs"
                  : x[0].toUpperCase() + x.slice(1),
              href: href(x),
            }),
          )}
        />
        <Panel>
          {tab === "overview" ? (
            <>
              <h2><UiText>{"A clear next step."}</UiText></h2>
              <div className="portal-status-grid">
                <div>
                  <span><UiText>{"Deposit"}</UiText></span>
                  <strong>
                    {label(project.deposit_state) || "Awaiting confirmation"}
                  </strong>
                  <Link href={href("payment")}>Payment details →</Link>
                </div>
                <div>
                  <span><UiText>{"Required inputs"}</UiText></span>
                  <strong>
                    {inputs.filter((x) => x.state === "provided").length} of{" "}
                    {inputs.length} provided
                  </strong>
                  <Link href={href("inputs")}><UiText>{"Your checklist →"}</UiText></Link>
                </div>
                <div>
                  <span>Delivery date</span>
                  <strong>
                    {project.committed_due_at
                      ? date(project.committed_due_at)
                      : "Not committed yet"}
                  </strong>
                  <small>
                    {project.committed_start_at
                      ? `Starts ${date(project.committed_start_at)}`
                      : "After deposit and required inputs"}
                  </small>
                </div>
              </div>
              {project.state === "needs_rescheduling" && (
                <Notice>
                  Your provisional reservation expired before all prerequisites
                  were complete. The freelancer will review a new schedule with
                  you.
                </Notice>
              )}
              {!!project.amendment_deposit_required && (
                <Notice>
                  An accepted update has an additional deposit requirement.
                  Review the request in Payment before the updated schedule is
                  confirmed.
                </Notice>
              )}
              {!!project.pending_amendment_schedule && (
                <Notice>
                  The updated schedule is awaiting the freelancer’s
                  confirmation. Your saved agreement and payment history are
                  retained.
                </Notice>
              )}
              <h3><UiText>{"Shared milestones"}</UiText></h3>
              {milestones.length ? (
                milestones.map((m) => (
                  <div className="buyer-row" key={m.id}>
                    <div>
                      <strong>{s(m.title)}</strong>
                      <p>{date(m.due_at ?? m.due_date)}</p>
                    </div>
                    <Badge>{label(m.state)}</Badge>
                  </div>
                ))
              ) : (
                <p className="public-muted">
                  The freelancer will share milestones when your schedule is
                  confirmed.
                </p>
              )}
              {tasks.length > 0 && <section className="buyer-shared-tasks" aria-label="Shared project tasks">
                <h3><UiText>{"Shared tasks"}</UiText></h3>
                <p className="public-muted"><UiText>{"Tasks the freelancer has chosen to share with you. Accepted scope and dates remain in your agreement."}</UiText></p>
                {tasks.map((task) => <article className="buyer-row" key={task.id}>
                  <div><strong>{s(task.title)}</strong>{task.due_at ? <p>{date(task.due_at)}</p> : null}{s(task.notes) && <p className="preserve-lines">{s(task.notes)}</p>}</div>
                  <Badge>{label(task.state)}</Badge>
                </article>)}
              </section>}
              {project.professional_delivery_state ===
                "owner_reported_delivered" && (
                <div className="delivery-callout">
                  <h3><UiText>{"Your work is ready to review."}</UiText></h3>
                  <p>
                    The freelancer has reported delivery. Review the shared
                    outputs against your accepted scope.
                  </p>
                  <Button onClick={() => setDelivery(true)}>{"Review delivered work"}
                  </Button>
                </div>
              )}
              {project.professional_delivery_state === "buyer_accepted" && (
                <Notice>
                  You accepted the delivered work. Any outstanding payment
                  remains shown separately.
                </Notice>
              )}
              <div className="public-actions">
                <Button
                  variant="secondary"
                  onClick={() =>
                    ask(`I have a question about ${s(project.title)}. `)
                  }
                >
                  Ask about this project
                </Button>
                <Button
                  variant="secondary"
                  pending={refreshing}
                  pendingLabel="Checking…"
                  onClick={async () => {
                    await refresh();
                    setChecked(true);
                  }}
                >
                  Refresh status
                </Button>
              </div>
              <ErrorNote message={refreshError || ""} />
              {checked && !refreshing && !refreshError && <p className="public-small" role="status"><UiText>{"Showing saved project details."}</UiText></p>}
            </>
          ) : tab === "payment" ? (
            <BuyerPayment
              data={data}
              engagementId={id}
              grantId={grant}
              message={ask}
            />
          ) : tab === "inputs" ? (
            <>
              <h2>The details that help us begin.</h2>
              <p>
                Save each answer as it is ready. Required items and the deposit
                must be complete before work begins.
              </p>
              {inputs.length ? (
                inputs.map((item) => (
                  <div className="buyer-input-row" key={item.id}>
                    <div>
                      <h3>{s(item.label, s(item.title, label(item.key)))}</h3>
                      <p>{s(item.description)}</p>
                      {s(item.answer) && (
                        <p className="input-answer">{s(item.answer)}</p>
                      )}
                      {s(item.review_reason) && (
                        <Notice>{s(item.review_reason)}</Notice>
                      )}
                      <Badge
                        tone={item.state === "provided" ? "success" : "warning"}
                      >
                        {item.state === "provided"
                          ? "Provided"
                          : "Required to begin"}
                      </Badge>
                    </div>
                    <Button variant="secondary" onClick={() => setInput(item)}>
                      {item.state === "provided"
                        ? "Revise submitted input"
                        : "Add input"}
                    </Button>
                  </div>
                ))
              ) : (
                <Empty
                  title="No inputs requested"
                  description="The freelancer will let you know if anything else is needed."
                />
              )}
            </>
          ) : tab === "messages" ? (
            <>
              <h2>A conversation, all in one place.</h2>
              <BuyerMessages
                engagementId={id}
                grantId={grant}
                initialDraft={draft}
                onDraftChange={setDraft}
              />
            </>
          ) : tab === "files" ? (
            <>
              <h2><UiText>{"Files shared with you."}</UiText></h2>
              <BuyerFiles files={a<Entity>(data.files)} report={ask} />
            </>
          ) : (
            <Empty title="This section is unavailable">
              <LinkButton href={href("overview")}>Back to overview</LinkButton>
            </Empty>
          )}
        </Panel>
        <ErrorNote message={error} />
      </div>
      {input && (
        <InputEditor
          item={input}
          projectId={s(project.id)}
          engagementId={id}
          grantId={grant}
          onClose={() => setInput(null)}
        />
      )}
      {delivery && (
        <Modal
          title="Review delivered work"
          onClose={() => setDelivery(false)}
          dirty={!!feedback}
        >
          <p>
            {s(
              project.delivery_message,
              "The freelancer has reported the agreed work delivered. Review the available files before accepting.",
            )}
          </p>
          <LinkButton href={href("files")} variant="secondary">{"View shared files"}
          </LinkButton>
          <OfferTerms offer={o(data.offer)} />
          <div className="public-actions">
            <Button onClick={() => setAcceptDelivery(true)}>{"Accept delivered work"}
            </Button>
          </div>
          <hr />
          <Field label="Revision request">
            <textarea
              className="resize-none"
              rows={4}
              value={feedback}
              maxLength={5000}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe a change against the agreed deliverables…"
            />
          </Field>
          <p className="public-small"><UiText>{"Changes to scope, price, or deadline require a separate agreement."}</UiText>
          </p>
          <ErrorNote message={error} />
          <Button variant="secondary" onClick={revision}>{"Send revision request"}
          </Button>
        </Modal>
      )}
      {acceptDelivery && (
        <Confirm
          title="Accept this delivered work?"
          description="This records your acceptance of the current delivery. It does not make a payment or change your remaining balance."
          confirmLabel="Confirm delivery acceptance"
          onClose={() => setAcceptDelivery(false)}
          onConfirm={accept}
        />
      )}
    </Frame>
  );
}

export default function PublicViews({ path }: { path: string }) {
  const { connected, state } = useStore();
  const params = useSearchParams();
  const clean = path.split("?")[0].replace(/\/$/, "") || "/";
  const segments = clean.split("/").filter(Boolean);
  if (clean === "/payment/return" && connected) return <PaymentReturn />;
  if (clean === "/") return <Entry />;
  if (
    segments[0] === "auth" &&
    ["sign-in", "sign-up", "recover", "reset"].includes(segments[1])
  )
    return connected ? <Frame><ConnectedAuth key={clean} mode={segments[1]} /></Frame> : <Auth key={clean} mode={segments[1]} />;
  if (clean === "/onboarding") return <Onboarding />;
  if (
    segments[0] === "u" &&
    (segments.length === 2 ||
      (segments.length === 4 && segments[2] === "services"))
  )
    return <Profile key={clean} handle={segments[1]} slug={segments[3]} />;
  if (segments[0] === "inquiry" && segments.length === 2)
    return (
      <Inquiry
        key={`${clean}:${params.get("grant") || ""}`}
        id={segments[1]}
        grant={connected ? s(state.remote?.grantId) : params.get("grant") || ""}
      />
    );
  if (
    segments[0] === "buyer" &&
    segments.length === 3 &&
    segments[2] === "offer"
  )
    return (
      <Offer
        key={`${clean}:${params.get("grant") || ""}`}
        id={segments[1]}
        grant={connected ? s(state.remote?.grantId) : params.get("grant") || ""}
      />
    );
  if (segments[0] === "buyer" && segments.length === 2)
    return (
      <Portal
        key={`${clean}:${params.get("grant") || ""}`}
        id={segments[1]}
        grant={connected ? s(state.remote?.grantId) : params.get("grant") || ""}
      />
    );
  return (
    <Unavailable
      title="Page not found"
      description="This address does not match an available Crewmori page."
    />
  );
}
