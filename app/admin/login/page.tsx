import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#eef3f8] px-5 py-12 text-slate-950 sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10">
        <p className="inline-flex rounded-md border border-[#0f766e]/20 bg-[#ccfbf1] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[#115e59]">
          Admin
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-[#071a33]">Admin is open for the demo</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This prototype keeps the admin page accessible during the hackathon presentation.
        </p>
        <Link
          href="/admin/complaints"
          className="mt-6 inline-flex rounded-md bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#153e75]"
        >
          Open admin dashboard
        </Link>
      </section>
    </main>
  );
}
