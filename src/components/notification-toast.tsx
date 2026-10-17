"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Native dialogs live above z-index. Put feedback in the current top-layer surface. */
export function NotificationToast({ message, dismissLabel, onDismiss }: { message: string; dismissLabel: string; onDismiss: () => void }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => {
      const dialogs = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
      setTarget(dialogs[dialogs.length - 1] || document.body);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, []);
  if (!target?.isConnected) return null;
  return createPortal(<div className="toast" role="status" aria-live="polite" aria-atomic="true"><span>{message}</span><button type="button" aria-label={dismissLabel} onClick={onDismiss}>×</button></div>, target);
}
