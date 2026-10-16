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
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Search, ArrowRight, Inbox } from "lucide-react";
import { useStore } from "@/lib/store";

function translateChildren(
  children: ReactNode,
  t: (value: string) => string,
): ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? t(child) : child,
  );
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  const { t } = useStore();
  return (
    <button
      type={type}
      className={`btn ${variant} ${className}`}
      {...props}
      onClick={props.onClick}
    >
      {translateChildren(children, t)}
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
            "aria-invalid": !!error,
            "aria-describedby": error
              ? `${id}-error`
              : help
                ? `${id}-help`
                : undefined,
          });
        return child;
      })}
      {help && <small id={`${id}-help`}>{t(help)}</small>}
      {error && (
        <small id={`${id}-error`} role="alert" className="field-error">
          {t(error)}
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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  dirty?: boolean;
  className?: string;
}) {
  const { t } = useStore();
  const ref = useRef<HTMLDialogElement>(null),
    restore = useRef<HTMLElement | null>(null);
  const [discard, setDiscard] = useState(false);
  const id = useId();
  const close = () => (dirty ? setDiscard(true) : onClose());
  useEffect(() => {
    restore.current = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.showModal();
    return () => {
      el?.close();
      restore.current?.focus();
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
          <Button variant="icon" aria-label={t("Close")} onClick={close}>
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
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const { t } = useStore();
  return (
    <Modal title={title} onClose={onClose}>
      <p>{typeof description === "string" ? t(description) : description}</p>
      <div className="actions dialog-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
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
