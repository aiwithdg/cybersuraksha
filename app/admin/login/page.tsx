import { redirect } from "next/navigation";
import { adminAuthConfigured, credentialsMatch, isAdminAuthenticated, setAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  if (isAdminAuthenticated()) {
    redirect("/admin/complaints");
  }

  const isConfigured = adminAuthConfigured();

  return (
    <main className="min-h-screen bg-[#eef3f8] px-5 py-12 text-slate-950 sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10">
        <p className="inline-flex rounded-md border border-[#0f766e]/20 bg-[#ccfbf1] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[#115e59]">
          Admin
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-[#071a33]">Sign in to CyberSuraksha admin</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Demo access for managing complaint status during the hackathon presentation.
        </p>

        {!isConfigured ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            Admin login is not configured. Add ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET to the environment.
          </div>
        ) : null}

        <form action={login} className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Admin ID</span>
            <input
              name="username"
              autoComplete="username"
              className="h-12 w-full rounded-md border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-12 w-full rounded-md border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            />
          </label>
          {searchParams?.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              Invalid admin ID or password.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!isConfigured}
            className="h-12 rounded-md bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#153e75] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}

async function login(formData: FormData) {
  "use server";

  const username = formData.get("username");
  const password = formData.get("password");

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !credentialsMatch(username, password)
  ) {
    redirect("/admin/login?error=1");
  }

  setAdminSession(username);
  redirect("/admin/complaints");
}
