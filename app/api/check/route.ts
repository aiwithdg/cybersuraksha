import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CheckResult, IdentifierType, PhoneTrustSignal, Suspect } from "@/lib/types";

const identifierTypes = new Set<IdentifierType>(["phone", "upi", "email", "url"]);

const validators: Record<IdentifierType, RegExp> = {
  phone: /^\+?[0-9]{7,15}$/,
  upi: /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-_]{2,64}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i,
};

export async function POST(request: Request) {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const identifierType = getIdentifierType(payload);
    const identifierValue = getIdentifierValue(payload, identifierType);
    const phoneTrustSignal = getPhoneTrustSignal(identifierType, identifierValue);

    if (!identifierType || !identifierValue) {
      return NextResponse.json(
        { error: "identifier_type and identifier_value are required." },
        { status: 400 },
      );
    }

    if (!validators[identifierType].test(identifierValue)) {
      return NextResponse.json<CheckResult>({
        status: "invalid",
        identifier_type: identifierType,
        identifier_value: identifierValue,
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are not configured." },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("suspects")
      .select("id, identifier_type, identifier_value, risk_level, source, created_at")
      .eq("identifier_type", identifierType)
      .eq("identifier_value", identifierValue)
      .maybeSingle<Suspect>();

    if (error) {
      console.error("Check lookup failed", {
        message: error.message,
        code: error.code,
      });

      return NextResponse.json({ error: "Unable to query suspect data." }, { status: 500 });
    }

    const complaintCount = data
      ? await getComplaintCount(identifierType, identifierValue)
      : 0;

    if (!data) {
      return NextResponse.json<CheckResult>({
        status: "not_found",
        identifier_type: identifierType,
        identifier_value: identifierValue,
        complaint_count: complaintCount,
        phone_trust_signal: phoneTrustSignal,
      });
    }

    return NextResponse.json<CheckResult>({
      status: "flagged",
      identifier_type: identifierType,
      identifier_value: identifierValue,
      matched_suspect: data,
      complaint_count: complaintCount,
      phone_trust_signal: phoneTrustSignal,
    });
  } catch {
    return NextResponse.json({ error: "Unable to complete the check." }, { status: 500 });
  }
}

function getIdentifierType(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("identifier_type" in payload)) {
    return null;
  }

  const value = payload.identifier_type;

  if (typeof value !== "string" || !identifierTypes.has(value as IdentifierType)) {
    return null;
  }

  return value as IdentifierType;
}

function getIdentifierValue(payload: unknown, type: IdentifierType | null) {
  if (!payload || typeof payload !== "object" || !("identifier_value" in payload) || !type) {
    return null;
  }

  const value = payload.identifier_value;

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (type === "phone") {
    return trimmed.replace(/[\s().-]/g, "");
  }

  return trimmed.toLowerCase();
}

async function getComplaintCount(type: IdentifierType, value: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return 0;
  }

  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("complaints")
    .select("id", { count: "exact", head: true })
    .eq("suspect_identifier_type", type)
    .eq("suspect_identifier_value", value);

  if (error) {
    console.error("Complaint count lookup failed", {
      message: error.message,
      code: error.code,
    });

    return 0;
  }

  return count ?? 0;
}

function getPhoneTrustSignal(
  type: IdentifierType | null,
  value: string | null,
): PhoneTrustSignal | undefined {
  if (type !== "phone" || !value) {
    return undefined;
  }

  if (/^1600\d{6}$/.test(value)) {
    return {
      kind: "bfsi_government_service",
      label: "1600 trusted service series",
      message:
        "Numbers starting with 1600 are designated for service and transaction calls from regulated BFSI entities and government-to-citizen communication.",
      caution:
        "Treat this as a positive signal, not a guarantee. Never share OTPs, PINs, passwords, or full card details on a call.",
    };
  }

  if (/^1601\d{6}$/.test(value)) {
    return {
      kind: "non_bfsi_service",
      label: "1601 verified service series",
      message:
        "Numbers starting with 1601 are being used for verified service and transaction calls in sectors such as utilities, courier, and logistics.",
      caution:
        "Confirm the context of the call. A legitimate service call should not ask for sensitive banking credentials.",
    };
  }

  if (/^140\d{7}$/.test(value)) {
    return {
      kind: "registered_promotional",
      label: "140 promotional series",
      message:
        "Numbers starting with 140 are designated for promotional calls from registered entities.",
      caution:
        "Promotional registration does not make an offer safe. Be cautious with payment links, investment claims, and urgent requests.",
    };
  }

  return undefined;
}
