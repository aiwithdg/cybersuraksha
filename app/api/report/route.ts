import { randomInt, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ComplaintCategory, IdentifierType } from "@/lib/types";

export const runtime = "nodejs";

type ReportPayload = {
  category?: ComplaintCategory;
  incident_date?: string | null;
  approximate_date?: string | null;
  suspect_identifier_type?: IdentifierType | null;
  suspect_identifier_value?: string | null;
  complainant_name?: string | null;
  complainant_contact?: string | null;
  is_guest?: boolean;
  is_witness_report?: boolean;
  incident_label?: string | null;
};

const categories = new Set<ComplaintCategory>([
  "financial_fraud",
  "identity_theft",
  "harassment",
  "other",
]);

const identifierTypes = new Set<IdentifierType>(["phone", "upi", "email", "url"]);

const identifierValidators: Record<IdentifierType, RegExp> = {
  phone: /^(?:(?:\+91|0)?[6-9]\d{9}|1600\d{6}|1601\d{6}|140\d{7})$/,
  upi: /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-_]{2,64}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i,
};

export async function POST(request: Request) {
  try {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
    }

    const payload = parsePayload(formData.get("payload"));

    if (!payload) {
      return NextResponse.json({ error: "Report payload is required." }, { status: 400 });
    }

    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase service credentials are not configured." },
        { status: 500 },
      );
    }

    const supabase = createAdminClient();
    const referenceNumber = generateReferenceNumber();
    const evidenceUrls = await uploadEvidenceFiles({
      files: formData.getAll("evidence"),
      referenceNumber,
      supabase,
    });

    if ("error" in evidenceUrls) {
      return NextResponse.json({ error: evidenceUrls.error }, { status: 500 });
    }

    const incidentDescription = buildIncidentDescription(payload);

    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .insert({
        reference_number: referenceNumber,
        category: payload.category,
        incident_description: incidentDescription,
        incident_date: payload.incident_date || null,
        suspect_identifier_type: payload.suspect_identifier_type || null,
        suspect_identifier_value: payload.suspect_identifier_value || null,
        complainant_name: payload.is_guest ? null : payload.complainant_name || null,
        complainant_contact: payload.is_guest ? null : payload.complainant_contact || null,
        is_guest: Boolean(payload.is_guest),
        is_witness_report: Boolean(payload.is_witness_report),
        evidence_urls: evidenceUrls.urls,
        status: "submitted",
      })
      .select("id, reference_number, complainant_contact")
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json({ error: "Unable to save the report." }, { status: 500 });
    }

    const { error: statusError } = await supabase.from("status_history").insert({
      complaint_id: complaint.id,
      status: "submitted",
      note: "Report received",
    });

    if (statusError) {
      return NextResponse.json({ error: "Report saved, but status history could not be created." }, { status: 500 });
    }

    return NextResponse.json({
      reference_number: complaint.reference_number,
      contact_method: payload.is_guest ? "reference number only" : complaint.complainant_contact,
    });
  } catch {
    return NextResponse.json({ error: "Unable to submit the report." }, { status: 500 });
  }
}

function parsePayload(value: FormDataEntryValue | null): ReportPayload | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as ReportPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function validatePayload(payload: ReportPayload) {
  if (!payload.category || !categories.has(payload.category)) {
    return "A valid report category is required.";
  }

  if (
    payload.suspect_identifier_type &&
    !identifierTypes.has(payload.suspect_identifier_type)
  ) {
    return "A valid suspect identifier type is required.";
  }

  if (
    payload.suspect_identifier_type &&
    payload.suspect_identifier_value &&
    !identifierValidators[payload.suspect_identifier_type].test(payload.suspect_identifier_value)
  ) {
    return "A valid suspect identifier value is required.";
  }

  if (!payload.is_guest && (!payload.complainant_name || !payload.complainant_contact)) {
    return "Name and contact are required unless continuing as guest.";
  }

  return "";
}

async function uploadEvidenceFiles({
  files,
  referenceNumber,
  supabase,
}: {
  files: FormDataEntryValue[];
  referenceNumber: string;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<{ urls: string[] } | { error: string }> {
  const urls: string[] = [];

  for (const entry of files) {
    if (!(entry instanceof File) || entry.size === 0) {
      continue;
    }

    const safeName = entry.name.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
    const path = `${referenceNumber}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("evidence").upload(path, entry, {
      contentType: entry.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return { error: "Unable to upload one or more evidence files." };
    }

    urls.push(`supabase://evidence/${path}`);
  }

  return { urls };
}

function buildIncidentDescription(payload: ReportPayload) {
  const parts = [
    payload.incident_label ? `Citizen selected: ${payload.incident_label}.` : null,
    payload.approximate_date ? `Approximate timing: ${payload.approximate_date}.` : null,
  ];

  return parts.filter(Boolean).join(" ") || "Submitted through the CyberSuraksha guided report flow.";
}

function generateReferenceNumber() {
  const year = new Date().getFullYear();
  const suffix = randomInt(0, 1_000_000).toString().padStart(6, "0");

  return `CS-${year}-${suffix}`;
}
