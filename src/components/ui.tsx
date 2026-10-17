"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Search, ArrowRight, Inbox, LoaderCircle } from "lucide-react";
import { useStore } from "@/lib/store";

function translateChildren(
  children: ReactNode,
  t: (value: string) => string,
): ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? t(child) : child,
  );
}
function readableText(children: ReactNode): string {
  return React.Children.toArray(children).map(child => typeof child === "string" || typeof child === "number" ? String(child) : React.isValidElement<{ children?: ReactNode }>(child) ? readableText(child.props.children) : "").join(" ").trim();
}

type FormIssue = { id: string; label: string; message: string };
const FormContext = createContext<{ pending: boolean; lockControls: boolean; issues: FormIssue[]; setActionPending?: (id: string, pending: boolean) => void }>({ pending: false, lockControls: false, issues: [] });

function fieldIssue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, t: (value: string) => string): FormIssue | undefined {
  if (!control.willValidate || control.validity.valid) return;
  const validity = control.validity;
  const message = validity.valueMissing ? (control.type === "checkbox" ? "Select this option to continue." : "Complete this field.")
    : validity.typeMismatch ? (control.type === "email" ? "Enter a valid email address." : "Enter a complete, valid web address.")
    : validity.rangeUnderflow ? "Enter a value at or above the minimum."
    : validity.rangeOverflow ? "Enter a value at or below the maximum."
    : validity.tooShort ? "Add more detail to this field."
    : validity.tooLong ? "Shorten this value."
    : validity.stepMismatch ? "Choose a value in the allowed increments."
    : validity.patternMismatch ? "Use the format shown for this field."
    : "Check this value and try again.";
  if (!control.id) control.id = `field-${crypto.randomUUID()}`;
  return { id: control.id, label: control.labels?.[0]?.textContent?.trim() || control.getAttribute("aria-label") || control.name || t("Field"), message: t(message) };
}

/** One validation and submission contract for every business form. */
export function Form({ children, onSubmit, onInput, className = "", intent = "mutation", ...props }: FormHTMLAttributes<HTMLFormElement> & { intent?: "read" | "mutation" }) {
  const { t } = useStore();
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());
  const setActionPending = useCallback((id: string, active: boolean) => setPendingActions(current => {
    if (current.has(id) === active) return current;
    const next = new Set(current); if (active) next.add(id); else next.delete(id); return next;
  }), []);
  const busy = pending || pendingActions.size > 0 || props["aria-busy"] === true || props["aria-busy"] === "true";
  const lockControls = intent === "mutation";
  const inFlight = useRef(false);
  const submit = async (event: Parameters<NonNullable<FormHTMLAttributes<HTMLFormElement>["onSubmit"]>>[0]) => {
    event.preventDefault();
    if (inFlight.current || busy) return;
    const form = event.currentTarget;
    const next = Array.from(form.elements).filter((el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement).flatMap(control => { const issue = fieldIssue(control, t); return issue ? [issue] : []; });
    setIssues(next); setFailure("");
    if (next.length) { requestAnimationFrame(() => document.getElementById(next[0].id)?.focus()); return; }
    inFlight.current = true;
    try {
      const result = onSubmit?.(event) as unknown;
      if (result && typeof (result as Promise<unknown>).then === "function") { setPending(true); await result; }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : t("This action could not finish. Your entries are still here."));
    } finally {
      inFlight.current = false; setPending(false);
      requestAnimationFrame(() => { if (form.isConnected) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); });
    }
  };
  return <FormContext.Provider value={{ pending: busy, lockControls, issues, setActionPending }}><form {...props} className={`app-form ${className}`} noValidate aria-busy={busy || undefined} data-block-close={(lockControls && busy) || undefined} onSubmit={submit} onInput={event => {
    onInput?.(event);
    const control = event.target;
    if ((control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) && issues.some(issue => issue.id === control.id)) {
      const issue = fieldIssue(control, t); setIssues(current => current.flatMap(existing => existing.id === control.id ? (issue ? [issue] : []) : [existing]));
    }
  }}>
    {(issues.length > 0 || failure) && <div className="form-error-summary" role="alert"><strong>{t(issues.length ? "Check the highlighted fields." : "This action could not finish.")}</strong>{failure && <p>{failure}</p>}{issues.length > 0 && <ul>{issues.map(issue => <li key={issue.id}><a href={`#${issue.id}`} onClick={event => { event.preventDefault(); document.getElementById(issue.id)?.focus(); }}>{issue.label}: {issue.message}</a></li>)}</ul>}</div>}
    <fieldset className="form-controls" disabled={lockControls && busy}>{children}</fieldset>
  </form></FormContext.Provider>;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  pending = false,
  pendingLabel,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; pending?: boolean; pendingLabel?: string }) {
  const { t, notify } = useStore();
  const form = useContext(FormContext);
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const actionId = useId();
  const setActionPending = form.setActionPending;
  useEffect(() => {
    setActionPending?.(actionId, pending || working);
    return () => setActionPending?.(actionId, false);
  }, [actionId, pending, working, setActionPending]);
  const busy = pending || working || (type === "submit" && form.pending);
  const text = readableText(children);
  const verb = text.match(/^(Save|Send|Add|Create|Approve|Share|Publish|Delete|Archive|Search|Retry|Connect|Disconnect|Upload|Import|Check|Confirm|Replace|Cancel|Pause|Resume|Apply|Delegate)/i)?.[1]?.toLowerCase();
  const labels: Record<string, string> = { save: "Saving…", send: "Sending…", add: "Adding…", create: "Creating…", approve: "Approving…", share: "Sharing…", publish: "Publishing…", delete: "Deleting…", archive: "Archiving…", search: "Searching…", retry: "Retrying…", connect: "Connecting…", disconnect: "Disconnecting…", upload: "Uploading…", import: "Importing…", check: "Checking…", confirm: "Confirming…", replace: "Replacing…", cancel: "Cancelling…", pause: "Pausing…", resume: "Resuming…", apply: "Applying…" };
  const busyText = t(pendingLabel || (verb ? (labels[verb] || "Working…") : "Working…"));
  return (
    <button
      type={type}
      className={`btn ${variant} ${className}`}
      {...props}
      disabled={props.disabled || busy || (form.lockControls && form.pending)}
      aria-busy={busy || undefined}
      aria-label={busy ? busyText : props["aria-label"]}
      data-pending={busy || undefined}
      onClick={async event => {
        if (busy || lock.current) { event.preventDefault(); return; }
        lock.current = true;
        try {
          const result = props.onClick?.(event) as unknown;
          if (result && typeof (result as Promise<unknown>).then === "function") { setWorking(true); await result; }
        } catch (error) { notify(error instanceof Error ? error.message : t("This action could not finish. Please try again.")); }
        finally { lock.current = false; setWorking(false); }
      }}
    >
      <span className="button-content"><span className="button-label" aria-hidden={busy || undefined}>{translateChildren(children, t)}</span>
      {(busy || (variant !== "icon" && Boolean(verb || pendingLabel))) && <span className="button-pending-label" aria-hidden="true"><LoaderCircle size={16} className="pending-spinner" />{variant !== "icon" && busyText}</span>}</span>
    </button>
  );
}
export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  href: string;
  children: ReactNode;
  variant?: string;
  className?: string;
  target?: string;
}) {
  const { t } = useStore();
  return (
    <Link href={href} className={`btn ${variant} ${className}`} {...props}>
      {translateChildren(children, t)}
    </Link>
  );
}
export function Panel({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`panel ${className}`} {...props}>
      {children}
    </section>
  );
}
export function PageHead({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  const { t } = useStore();
  return (
    <header className="page-head">
      <div>
        <h1>{t(title)}</h1>
        {description && (
          <p>
            {typeof description === "string" ? t(description) : description}
          </p>
        )}
      </div>
      {action && <div className="actions">{action}</div>}
    </header>
  );
}
export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  const { t } = useStore();
  return (
    <span className={`badge ${tone} ${className}`}>
      {translateChildren(children, t)}
    </span>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useStore();
  return (
    <div className="empty">
      <Inbox size={32} aria-hidden="true" />
      <h2>{t(title)}</h2>
      {description && (
        <p>{typeof description === "string" ? t(description) : description}</p>
      )}
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
export function Field({
  label,
  children,
  error,
  help,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  help?: string;
}) {
  const id = useId();
  const { t } = useStore();
  const form = useContext(FormContext);
  const resolvedError = error || form.issues.find(issue => issue.id === id)?.message;
  useEffect(() => {
    const control = document.getElementById(id);
    if (!(control instanceof HTMLTextAreaElement)) return;
    control.style.height = "auto";
    control.style.height = `${Math.max(112, Math.min(control.scrollHeight, 360))}px`;
    control.style.overflowY = control.scrollHeight > 360 ? "auto" : "hidden";
  }, [id, children]);
  return (
    <div className="field">
      <label htmlFor={id}>{t(label)}</label>
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement<Record<string, unknown>>(child) &&
          typeof child.type === "string" &&
          ["input", "select", "textarea"].includes(child.type)
        )
          return React.cloneElement(child, {
            id,
            disabled: child.props.disabled || (form.lockControls && form.pending),
            "aria-invalid": !!resolvedError,
            "aria-describedby": [help ? `${id}-help` : "", resolvedError ? `${id}-error` : "", child.props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
          });
        return child;
      })}
      {help && <small id={`${id}-help`}>{t(help)}</small>}
      {resolvedError && (
        <small id={`${id}-error`} role="alert" className="field-error">
          {t(resolvedError)}
        </small>
      )}
    </div>
  );
}
export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="search-field">
      <Search size={18} aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        aria-label={t(placeholder)}
        value={value}
        placeholder={t(placeholder)}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label={t("Clear search")}
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
        >
          <X size={17} />
        </button>
      )}
    </div>
  );
}
export function Tabs({
  items,
}: {
  items: Array<{ label: string; href: string }>;
}) {
  const { t } = useStore();
  const pathname = usePathname(),
    query = useSearchParams();
  return (
    <nav className="tabs" aria-label={t("Section navigation")}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            (
              item.href.includes("?")
                ? `${pathname}?${query}` === item.href
                : pathname === item.href
            )
              ? "page"
              : undefined
          }
        >
          {t(item.label)}
        </Link>
      ))}
    </nav>
  );
}
export function Modal({
  title,
  onClose,
  children,
  dirty = false,
  className = "",
  closeDisabled = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  dirty?: boolean;
  className?: string;
  closeDisabled?: boolean;
}) {
  const { t } = useStore();
  const ref = useRef<HTMLDialogElement>(null),
    restore = useRef<HTMLElement | null>(null);
  const [discard, setDiscard] = useState(false);
  const [formPending, setFormPending] = useState(false);
  const id = useId();
  const close = () => { if (!closeDisabled && !ref.current?.querySelector('form[data-block-close="true"]')) { if (dirty) setDiscard(true); else onClose(); } };
  useEffect(() => {
    restore.current = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.showModal();
    const observer = new MutationObserver(() => setFormPending(!!el?.querySelector('form[data-block-close="true"]')));
    if (el) observer.observe(el, { subtree: true, attributes: true, attributeFilter: ["data-block-close"], childList: true });
    const previousOverflow = document.body.style.overflow;
    document.body.dataset.modalCount = String(Number(document.body.dataset.modalCount || 0) + 1);
    if (document.body.dataset.modalCount === "1") document.body.dataset.modalOverflow = previousOverflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      observer.disconnect();
      const count = Math.max(0, Number(document.body.dataset.modalCount || 1) - 1);
      document.body.dataset.modalCount = String(count);
      if (!count) { document.body.style.overflow = document.body.dataset.modalOverflow || ""; delete document.body.dataset.modalOverflow; }
      const target = restore.current;
      requestAnimationFrame(() => { if (target?.isConnected) target.focus(); });
    };
  }, []);
  return (
    <>
      <dialog
        ref={ref}
        aria-labelledby={id}
        className={`dialog ${className}`}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="dialog-head">
          <h2 id={id}>{t(title)}</h2>
          <Button variant="icon" aria-label={t("Close")} onClick={close} disabled={closeDisabled || formPending}>
            <X size={20} />
          </Button>
        </div>
        <div className="dialog-body">{children}</div>
      </dialog>
      {discard && (
        <Confirm
          title="Discard unsaved changes?"
          description="Your last saved version will be kept."
          onConfirm={() => {
            setDiscard(false);
            onClose();
          }}
          onClose={() => setDiscard(false)}
        />
      )}
    </>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel = "Confirm",
  danger = false,
}: {
  title: string;
  description: ReactNode;
  onConfirm: () => void | Promise<unknown>;
  onClose: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const { t } = useStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <Modal title={title} onClose={onClose} closeDisabled={pending}>
      <p>{typeof description === "string" ? t(description) : description}</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="actions dialog-actions">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} pending={pending} onClick={async () => {
          if (lock.current) return;
          lock.current = true; setPending(true); setError("");
          try { await onConfirm(); } catch (error) { setError(error instanceof Error ? error.message : t("This action could not finish. Please try again.")); }
          finally { lock.current = false; setPending(false); }
        }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
type NavigationController = EventTarget & {
  traverseTo: (key: string) => unknown;
};
type LocalNavigateEvent = Event & {
  navigationType: string;
  destination: { key: string; url: string };
};
const DirtyContext = createContext<(id: string, dirty: boolean) => void>(
  () => {},
);
export function DirtyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dirty = useRef(new Set<string>());
  const traversal = useRef<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const register = useCallback((id: string, on: boolean) => {
    if (on) dirty.current.add(id);
    else dirty.current.delete(id);
  }, []);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (
        !dirty.current.size ||
        !a ||
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      const url = new URL(a.href);
      if (url.href === location.href) return;
      e.preventDefault();
      e.stopPropagation();
      setDestination(
        url.origin === location.origin
          ? url.pathname + url.search + url.hash
          : url.href,
      );
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigation = (
      window as Window & { navigation?: NavigationController }
    ).navigation;
    const navigate = (event: Event) => {
      const e = event as LocalNavigateEvent;
      if (
        dirty.current.size &&
        e.navigationType === "traverse" &&
        e.cancelable
      ) {
        e.preventDefault();
        traversal.current = e.destination.key;
        setDestination(e.destination.url);
      }
    };
    navigation?.addEventListener("navigate", navigate);
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", unload);
    return () => {
      navigation?.removeEventListener("navigate", navigate);
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);
  return (
    <DirtyContext.Provider value={register}>
      {children}
      {destination && (
        <Confirm
          title="Leave without saving?"
          description="There are unsaved changes on this page. Stay to finish, or discard them and continue."
          confirmLabel="Discard and continue"
          onClose={() => {
            traversal.current = null;
            setDestination(null);
          }}
          onConfirm={() => {
            const dest = destination,
              key = traversal.current;
            dirty.current.clear();
            traversal.current = null;
            setDestination(null);
            const navigation = (
              window as Window & { navigation?: NavigationController }
            ).navigation;
            if (key && navigation) navigation.traverseTo(key);
            else router.push(dest);
          }}
        />
      )}
    </DirtyContext.Provider>
  );
}
export function useDirtyGuard(dirty: boolean) {
  const register = useContext(DirtyContext),
    id = useId();
  useEffect(() => {
    register(id, dirty);
    return () => register(id, false);
  }, [register, id, dirty]);
}
export function RecordLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="record-link">
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}
export function Feedback({
  result,
}: {
  result: { ok: boolean; message: string } | null;
}) {
  const { t } = useStore();
  return result ? (
    <p
      role={result.ok ? "status" : "alert"}
      className={`feedback ${result.ok ? "success" : "error"}`}
    >
      {t(result.message)}
    </p>
  ) : null;
}
export function useQuery() {
  const router = useRouter(),
    path = usePathname(),
    search = useSearchParams();
  return {
    query: search,
    setQuery: (values: Record<string, string | null>) => {
      const p = new URLSearchParams(search);
      for (const [k, v] of Object.entries(values))
        if (v) p.set(k, v);
        else p.delete(k);
      router.replace(path + (p.size ? "?" + p : ""), { scroll: false });
    },
  };
}
