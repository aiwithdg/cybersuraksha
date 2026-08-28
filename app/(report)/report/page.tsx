import { Suspense } from "react";
import { ReportFlow } from "./report-flow";

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportLoading />}>
      <ReportFlow />
    </Suspense>
  );
}

function ReportLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-slate-900">
      <p className="text-sm font-medium text-slate-600">Loading report flow...</p>
    </main>
  );
}
