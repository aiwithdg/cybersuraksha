import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Complaint, StatusHistory } from "@/lib/types";

type TrackResponse = {
  complaint: Complaint;
  status_history: StatusHistory[];
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceNumber = searchParams.get("ref")?.trim().toUpperCase();

    if (!referenceNumber) {
      return NextResponse.json({ error: "Reference number is required." }, { status: 400 });
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

    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .select("*")
      .eq("reference_number", referenceNumber)
      .maybeSingle<Complaint>();

    if (complaintError) {
      return NextResponse.json({ error: "Unable to look up that report." }, { status: 500 });
    }

    if (!complaint) {
      return NextResponse.json(
        { error: "No report was found for that reference number." },
        { status: 404 },
      );
    }

    const { data: statusHistory, error: historyError } = await supabase
      .from("status_history")
      .select("*")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: true })
      .returns<StatusHistory[]>();

    if (historyError) {
      return NextResponse.json({ error: "Unable to load status history." }, { status: 500 });
    }

    return NextResponse.json<TrackResponse>({
      complaint,
      status_history: statusHistory ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Unable to track that report." }, { status: 500 });
  }
}
