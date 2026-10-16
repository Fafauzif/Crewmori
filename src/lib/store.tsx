"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createState, execute } from "./engine";
import { translate } from "./i18n";
import {
  type Entity,
  type StoreState,
  type Result,
  type Input,
  s,
  o,
} from "./types";
const KEY = "crewmori.workspace.v1";
interface StoreContext {
  state: StoreState;
  ready: boolean;
  rows: (table: string) => Entity[];
  record: (table: string, id: string) => Entity | undefined;
  command: (type: string, input?: Input) => Result;
  notify: (message: string) => void;
  t: (english: string) => string;
  storageError: string;
  resetStorage: () => void;
}
const Context = createContext<StoreContext | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => ({
      ...createState(),
      session: false,
    })),
    ref = useRef(state);
  const [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState(""),
    [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 6000);
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoreState;
        if (
          parsed.schema_version !== createState().schema_version ||
          !parsed.tables?.workspaces?.workspace_alya ||
          !parsed.tables?.preferences ||
          typeof parsed.revision !== "number"
        )
          throw Error("incompatible");
        ref.current = parsed;
        setState(parsed);
      }
    } catch {
      setStorageError(
        "The saved workspace could not be read. Export it for recovery or reset the sample. No saved data has been overwritten.",
      );
    }
    setReady(true);
    const storage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          const x = JSON.parse(e.newValue) as StoreState;
          if (
            x.schema_version === ref.current.schema_version &&
            x.tables?.workspaces &&
            x.revision > ref.current.revision
          ) {
            ref.current = x;
            setState(x);
            notify(
              "Workspace updated in another tab. Unsaved edits will be checked before saving.",
            );
          }
        } catch {
          setStorageError(
            "Another tab saved an unreadable workspace. Reload or reset the sample.",
          );
        }
      }
    };
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, [notify]);
  const command = useCallback(
    (type: string, input: Input = {}): Result => {
      if (
        storageError &&
        !["scenario.load", "sample.loadScenario"].includes(type)
      )
        return {
          ok: false,
          code: "PERSISTENCE_FAILED",
          message: "Resolve saved workspace recovery before changing records.",
        };
      try {
        const result = execute(ref.current, type, input);
        if (!result.result.ok) {
          notify(result.result.message);
          return result.result;
        }
        try {
          localStorage.setItem(KEY, JSON.stringify(result.state));
        } catch {
          setStorageError(
            "Your browser could not save this change. Free browser storage and retry; the previous records are intact.",
          );
          return {
            ok: false,
            code: "PERSISTENCE_FAILED",
            message: "Change not saved. Free browser storage and retry.",
          };
        }
        ref.current = result.state;
        setState(result.state);
        return result.result;
      } catch (error) {
        const result = {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "This action could not finish. Your saved records are intact.",
        };
        notify(result.message);
        return result;
      }
    },
    [notify, storageError],
  );
  const resetStorage = () => {
    const x = createState();
    try {
      localStorage.setItem(KEY, JSON.stringify(x));
      ref.current = x;
      setState(x);
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is unavailable. Enable it and try again.",
      );
    }
  };
  const locale = s(o(state.tables.preferences?.preferences_alya).locale, "en");
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.motion = s(
      o(state.tables.preferences?.preferences_alya).motion,
      "system",
    );
    document.documentElement.dataset.focus = s(
      o(state.tables.preferences?.preferences_alya).focus_mode,
      "normal",
    );
  }, [locale, state]);
  return (
    <Context.Provider
      value={{
        state,
        ready,
        rows: (table) => Object.values(state.tables[table] || {}),
        record: (table, id) => state.tables[table]?.[id],
        command,
        notify,
        t: (text) => translate(text, locale),
        storageError,
        resetStorage,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error("StoreProvider missing");
  return value;
}
