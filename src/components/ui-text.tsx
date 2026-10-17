"use client";

import { useStore } from "@/lib/store";

/** Application chrome only. Authored names, briefs, amounts and contract terms stay unchanged. */
export function UiText({ children }: { children: string }) {
  const { t } = useStore();
  return <>{t(children)}</>;
}
