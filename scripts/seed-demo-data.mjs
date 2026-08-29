import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const suspects = [
  { identifier_type: "phone", identifier_value: "+919800001234", risk_level: "flagged", source: "I4C demo seed data" },
  { identifier_type: "phone", identifier_value: "+919100009876", risk_level: "reported", source: "user report demo" },
  { identifier_type: "phone", identifier_value: "+918700005555", risk_level: "unverified", source: "bank alert demo" },
  { identifier_type: "phone", identifier_value: "+916300004321", risk_level: "reported", source: "state cyber cell demo" },
  { identifier_type: "phone", identifier_value: "1600123456", risk_level: "reported", source: "verified-series misuse demo" },
  { identifier_type: "upi", identifier_value: "refunddesk-demo@paytm", risk_level: "flagged", source: "I4C demo seed data" },
  { identifier_type: "upi", identifier_value: "kyc-helpdesk-demo@ybl", risk_level: "reported", source: "user report demo" },
  { identifier_type: "upi", identifier_value: "cashbackclaim-demo@okaxis", risk_level: "reported", source: "bank alert demo" },
  { identifier_type: "upi", identifier_value: "support-ticket-demo@upi", risk_level: "unverified", source: "state cyber cell demo" },
  { identifier_type: "email", identifier_value: "kyc-alert-demo@example.test", risk_level: "flagged", source: "I4C demo seed data" },
  { identifier_type: "email", identifier_value: "lottery-claim-demo@example.test", risk_level: "reported", source: "user report demo" },
  { identifier_type: "email", identifier_value: "bankverify-demo@example.test", risk_level: "reported", source: "bank alert demo" },
  { identifier_type: "email", identifier_value: "courier-fee-demo@example.test", risk_level: "unverified", source: "state cyber cell demo" },
  { identifier_type: "url", identifier_value: "https://secure-kyc-demo.example.test/login", risk_level: "flagged", source: "I4C demo seed data" },
  { identifier_type: "url", identifier_value: "https://upi-refund-demo.example.test/claim", risk_level: "reported", source: "user report demo" },
  { identifier_type: "url", identifier_value: "https://parcel-fee-demo.example.test/pay", risk_level: "unverified", source: "bank alert demo" },
];

const complaints = [
  {
    reference_number: "CS-2026-100101",
    category: "financial_fraud",
    incident_description: "Citizen selected: Someone stole money from me. Approximate timing: Demo case showing a submitted UPI refund scam report.",
    incident_date: "2026-08-20",
    suspect_identifier_type: "upi",
    suspect_identifier_value: "refunddesk-demo@paytm",
    complainant_name: "Asha Demo",
    complainant_contact: "asha.demo@example.test",
    is_guest: false,
    evidence_urls: ["supabase://evidence/demo/upi-refund-screenshot.png"],
    status: "submitted",
  },
  {
    reference_number: "CS-2026-100102",
    category: "identity_theft",
    incident_description: "Citizen selected: Someone is using my identity/accounts. Approximate timing: Demo case for account takeover review.",
    incident_date: "2026-08-18",
    suspect_identifier_type: "email",
    suspect_identifier_value: "kyc-alert-demo@example.test",
    complainant_name: "Rahul Demo",
    complainant_contact: "+919900001111",
    is_guest: false,
    evidence_urls: ["supabase://evidence/demo/account-alert.pdf"],
    status: "under_review",
  },
  {
    reference_number: "CS-2026-100103",
    category: "financial_fraud",
    incident_description: "Citizen selected: Someone stole money from me. Approximate timing: Demo case already routed to the relevant Cyber Cell.",
    incident_date: "2026-08-15",
    suspect_identifier_type: "phone",
    suspect_identifier_value: "+919800001234",
    complainant_name: null,
    complainant_contact: null,
    is_guest: true,
    evidence_urls: [],
    status: "routed",
  },
  {
    reference_number: "CS-2026-100104",
    category: "harassment",
    incident_description: "Citizen selected: Someone is harassing/threatening me online. Approximate timing: Demo case with an investigation update.",
    incident_date: "2026-08-11",
    suspect_identifier_type: "url",
    suspect_identifier_value: "https://parcel-fee-demo.example.test/pay",
    complainant_name: "Meera Demo",
    complainant_contact: "meera.demo@example.test",
    is_guest: false,
    evidence_urls: ["supabase://evidence/demo/messages.zip"],
    status: "investigation_update",
  },
];

const historyByReference = {
  "CS-2026-100101": [
    { status: "submitted", note: "Report received" },
  ],
  "CS-2026-100102": [
    { status: "submitted", note: "Report received" },
    { status: "under_review", note: "Initial review started. Evidence and suspect details are being checked." },
  ],
  "CS-2026-100103": [
    { status: "submitted", note: "Report received" },
    { status: "under_review", note: "Report details verified for routing." },
    { status: "routed", note: "Report routed to the relevant Cyber Cell." },
  ],
  "CS-2026-100104": [
    { status: "submitted", note: "Report received" },
    { status: "under_review", note: "Initial review completed." },
    { status: "routed", note: "Report routed to the relevant Cyber Cell." },
    { status: "investigation_update", note: "Investigation update added for the demo timeline." },
  ],
};

const { error: suspectError } = await supabase
  .from("suspects")
  .upsert(suspects, { onConflict: "identifier_type,identifier_value" });

if (suspectError) {
  throw suspectError;
}

const { data: savedComplaints, error: complaintError } = await supabase
  .from("complaints")
  .upsert(complaints, { onConflict: "reference_number" })
  .select("id, reference_number");

if (complaintError) {
  throw complaintError;
}

const complaintIds = savedComplaints.map((complaint) => complaint.id);

if (complaintIds.length > 0) {
  const { error: deleteHistoryError } = await supabase
    .from("status_history")
    .delete()
    .in("complaint_id", complaintIds);

  if (deleteHistoryError) {
    throw deleteHistoryError;
  }
}

const statusHistory = savedComplaints.flatMap((complaint) =>
  historyByReference[complaint.reference_number].map((entry) => ({
    complaint_id: complaint.id,
    ...entry,
  })),
);

const { error: historyError } = await supabase
  .from("status_history")
  .insert(statusHistory);

if (historyError) {
  throw historyError;
}

console.log(
  JSON.stringify(
    {
      suspects_upserted: suspects.length,
      complaints_upserted: savedComplaints.length,
      status_history_inserted: statusHistory.length,
      demo_references: savedComplaints.map((complaint) => complaint.reference_number),
    },
    null,
    2,
  ),
);

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");

  try {
    const envFile = readFileSync(envPath, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);

      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      process.env[key] ??= rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Vercel and CI can provide env vars directly; local runs use .env.local.
  }
}
