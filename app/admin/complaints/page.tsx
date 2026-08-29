import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
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
        <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-800">
          Supabase service credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local to use this demo admin page.
        </div>
      </AdminShell>
    );
  }

  const supabase = createAdminClient();
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ComplaintRow[]>();

  const complaintIds = complaints?.map((complaint) => complaint.id) ?? [];
  const { data: statusHistory } = complaintIds.length
    ? await supabase
        .from("status_history")
        .select("id, complaint_id, status, note, created_at")
        .in("complaint_id", complaintIds)
        .order("created_at", { ascending: false })
        .returns<Array<{
          id: string;
          complaint_id: string;
          status: string;
          note: string | null;
          created_at: string;
        }>>()
    : { data: [] };

  const historyByComplaint = new Map<string, ComplaintRow["status_history"]>();

  for (const entry of statusHistory ?? []) {
    const entries = historyByComplaint.get(entry.complaint_id) ?? [];
    entries.push(entry);
    historyByComplaint.set(entry.complaint_id, entries);
  }

  const visibleComplaints = complaints ?? [];
  const submittedCount = visibleComplaints.filter((complaint) => complaint.status === "submitted").length;
  const activeCount = visibleComplaints.filter((complaint) =>
    complaint.status === "under_review" || complaint.status === "routed",
  ).length;
  const witnessCount = visibleComplaints.filter((complaint) => complaint.is_witness_report).length;

  return (
    <AdminShell>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-800">
          Unable to load complaints.
        </div>
      ) : null}

      {!error && !complaints?.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          No complaints have been submitted yet.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetric label="Total complaints" value={visibleComplaints.length} />
        <DashboardMetric label="New submissions" value={submittedCount} />
        <DashboardMetric label="In progress" value={activeCount} />
        <DashboardMetric label="Witness reports" value={witnessCount} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Complaint queue</h2>
          <p className="mt-1 text-sm text-slate-600">Review incoming reports and advance their visible tracking status.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Suspect</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Latest note</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleComplaints.map((complaint) => {
                const latestHistory = [...(historyByComplaint.get(complaint.id) ?? [])].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                )[0];

                return (
                  <tr key={complaint.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/track?ref=${encodeURIComponent(complaint.reference_number)}`}
                        className="font-semibold text-[#1d4ed8] hover:text-[#153e75]"
                      >
                        {complaint.reference_number}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(complaint.created_at)}</p>
                    </td>
                    <td className="px-4 py-4">
                      {complaint.is_witness_report ? (
                        <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                          Witness report
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                          Victim report
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{complaint.category.replaceAll("_", " ")}</td>
                    <td className="max-w-[220px] px-4 py-4 text-slate-700">
                      <span className="block truncate">
                        {complaint.suspect_identifier_value
                          ? `${complaint.suspect_identifier_type?.toUpperCase()}: ${complaint.suspect_identifier_value}`
                          : "Not provided"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <span className="block font-medium text-slate-900">
                        {complaint.is_guest ? "Guest" : complaint.complainant_name || "Not provided"}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {complaint.complainant_contact || "Reference only"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-900">
                        {formatStatus(complaint.status)}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-4 py-4 text-slate-600">
                      <span className="line-clamp-2">{latestHistory?.note ?? "No status note yet."}</span>
                    </td>
                    <td className="px-4 py-4">
                      <form action={advanceComplaintStatus} className="grid min-w-[240px] gap-2">
                        {/* Hackathon demo only: this admin action is intentionally open. Production must require authentication and role-based authorization. */}
                        <input type="hidden" name="complaint_id" value={complaint.id} />
                        <select
                          name="status"
                          defaultValue={complaint.status}
                          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                        >
                          {statuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <input
                          name="note"
                          placeholder="Optional update note"
                          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                        />
                        <button
                          type="submit"
                          className="h-10 rounded-md bg-[#1d4ed8] px-4 text-sm font-semibold text-white transition hover:bg-[#153e75]"
                        >
                          Update
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    <main className="min-h-screen bg-[#eef3f8] px-5 py-10 text-slate-950 sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              { label: "CyberSuraksha", href: "/" },
              { label: "Admin" },
              { label: "Complaints" },
            ]}
          />
          <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            Demo admin: open access
          </span>
        </div>
        <p className="mt-5 inline-flex rounded-md border border-[#0f766e]/20 bg-[#ccfbf1] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[#115e59]">
          Internal Demo Admin
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#071a33]">Complaints</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Advance a complaint during the demo, then open its tracker to see the pipeline update.
        </p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

function DashboardMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#071a33]">{value}</p>
    </div>
  );
}

function isComplaintStatus(value: string): value is ComplaintStatus {
  return statuses.some((status) => status.value === value);
}

function formatStatus(status: ComplaintStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
