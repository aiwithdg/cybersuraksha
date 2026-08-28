import { Suspense } from "react";
import { TrackClient } from "./track-client";

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackLoading />}>
      <TrackClient />
    </Suspense>
  );
}

function TrackLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-slate-950">
      <p className="text-sm font-medium text-slate-600">Loading tracker...</p>
    </main>
  );
}
