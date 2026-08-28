"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="bg-[#f6f8fb] px-6 py-16 text-slate-950">
      <section className="mx-auto max-w-3xl border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold">This page could not finish loading.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Try again, or return to the Check page and continue from there.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs font-medium text-slate-500">Error reference: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#153e75]"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
