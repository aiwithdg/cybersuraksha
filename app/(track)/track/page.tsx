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
    <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] px-5 text-slate-950 sm:px-8">
      <p className="text-sm font-medium text-slate-600">Loading tracker...</p>
    </main>
  );
}
