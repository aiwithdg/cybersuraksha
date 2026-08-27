import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { CheckResult, IdentifierType, Suspect } from "@/lib/types";

const identifierTypes = new Set<IdentifierType>(["phone", "upi", "email", "url"]);

const validators: Record<IdentifierType, RegExp> = {
  phone: /^(?:\+91|0)?[6-9]\d{9}$/,
  upi: /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-_]{2,64}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i,
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const identifierType = getIdentifierType(payload);
  const identifierValue = getIdentifierValue(payload, identifierType);

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
    return NextResponse.json({ error: "Unable to query suspect data." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json<CheckResult>({
      status: "not_found",
      identifier_type: identifierType,
      identifier_value: identifierValue,
    });
  }

  return NextResponse.json<CheckResult>({
    status: "flagged",
    identifier_type: identifierType,
    identifier_value: identifierValue,
    matched_suspect: data,
  });
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
    return trimmed.replace(/[\s-]/g, "");
  }

  return trimmed.toLowerCase();
}
