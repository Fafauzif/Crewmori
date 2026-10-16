import { Suspense } from "react";
import Application from "@/components/application";
import { runtimeConfig } from "@/server/config";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <Suspense fallback={<p>Opening your studio…</p>}>
      <Application connected={runtimeConfig().enabled} />
    </Suspense>
  );
}
