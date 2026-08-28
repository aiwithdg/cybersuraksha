import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Complaint, ComplaintStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statuses: Array<{ value: ComplaintStatus; label: string }> = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "routed", label: "Routed to Cyber Cell" },
  { value: "investigation_update", label: "Investigation Update" },
];

type ComplaintRow = Complaint & {
  status_history?: Array<{
    id: string;
    status: string;
    note: string | null;
    created_at: string;
  }>;
};

export default async function AdminComplaintsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return (
      <AdminShell>
        <div className="border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-800">
          Supabase service credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local to use this demo admin page.
        </div>
      </AdminShell>
    );
  }

  const supabase = createAdminClient();
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*, status_history(id, status, note, created_at)")
    .order("created_at", { ascending: false })
    .returns<ComplaintRow[]>();

  return (
    <AdminShell>
      {error ? (
        <div className="border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-800">
          Unable to load complaints.
        </div>
      ) : null}

      {!error && !complaints?.length ? (
        <div className="border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          No complaints have been submitted yet.
        </div>
      ) : null}

      <div className="grid gap-4">
        {complaints?.map((complaint) => {
          const latestHistory = [...(complaint.status_history ?? [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0];

          return (
            <article key={complaint.id} className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-950">{complaint.reference_number}</h2>
                    <span className="border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-900">
                      {formatStatus(complaint.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {complaint.incident_description || "No description supplied."}
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-slate-700">Category</dt>
                      <dd className="mt-1 text-slate-600">{complaint.category.replaceAll("_", " ")}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">Suspect</dt>
                      <dd className="mt-1 text-slate-600">
                        {complaint.suspect_identifier_value
                          ? `${complaint.suspect_identifier_type?.toUpperCase()}: ${complaint.suspect_identifier_value}`
                          : "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">Latest note</dt>
                      <dd className="mt-1 text-slate-600">{latestHistory?.note ?? "No status note yet."}</dd>
                    </div>
                  </dl>
                </div>

                <form action={advanceComplaintStatus} className="grid gap-3 border border-slate-200 bg-slate-50 p-4">
                  {/* Prototype-only admin control. Production must require authentication and role-based authorization. */}
                  <input type="hidden" name="complaint_id" value={complaint.id} />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-800">New status</span>
                    <select
                      name="status"
                      defaultValue={complaint.status}
                      className="h-11 w-full border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                    >
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-800">Note</span>
                    <input
                      name="note"
                      placeholder="Optional update note"
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-11 bg-[#1d4ed8] px-4 text-sm font-semibold text-white transition hover:bg-[#153e75]"
                  >
                    Update status
                  </button>
                </form>
              </div>

              <Link
                href={`/track?ref=${encodeURIComponent(complaint.reference_number)}`}
                className="mt-4 inline-flex text-sm font-semibold text-[#1d4ed8] hover:text-[#153e75]"
              >
                View tracker -&gt;
              </Link>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}

async function advanceComplaintStatus(formData: FormData) {
  "use server";

  const complaintId = formData.get("complaint_id");
  const status = formData.get("status");
  const note = formData.get("note");

  if (typeof complaintId !== "string" || typeof status !== "string" || !isComplaintStatus(status)) {
    return;
  }

  const supabase = createAdminClient();
  const statusNote =
    typeof note === "string" && note.trim()
      ? note.trim()
      : defaultStatusNote(status);

  const { error: updateError } = await supabase
    .from("complaints")
    .update({ status })
    .eq("id", complaintId);

  if (!updateError) {
    await supabase.from("status_history").insert({
      complaint_id: complaintId,
      status,
      note: statusNote,
    });
  }

  revalidatePath("/admin/complaints");
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-6 py-10 text-slate-950 sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <Link href="/" className="text-sm font-medium text-slate-600 hover:text-[#1d4ed8]">
          Back to check
        </Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
          Internal Demo Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Complaints</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Advance a complaint during the demo, then open its tracker to see the pipeline update.
        </p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

function isComplaintStatus(value: string): value is ComplaintStatus {
  return statuses.some((status) => status.value === value);
}

function formatStatus(status: ComplaintStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status.replaceAll("_", " ");
}

function defaultStatusNote(status: ComplaintStatus) {
  switch (status) {
    case "under_review":
      return "Report is under initial review.";
    case "routed":
      return "Report routed to the relevant Cyber Cell.";
    case "investigation_update":
      return "Investigation update added.";
    case "submitted":
    default:
      return "Report received.";
  }
}
