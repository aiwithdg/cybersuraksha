import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-[#eef3f8] px-5 py-16 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
          Page not found
        </p>
        <h1 className="mt-3 text-2xl font-semibold">We could not find that page.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use the main navigation to check, report, or track a cybercrime report.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#153e75]"
        >
          Go to Check
        </Link>
      </section>
    </main>
  );
}
