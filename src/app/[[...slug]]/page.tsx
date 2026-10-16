import { Suspense } from "react";
import Application from "@/components/application";
export default function Page() {
  return (
    <Suspense fallback={<p>Opening your studio…</p>}>
      <Application />
    </Suspense>
  );
}
