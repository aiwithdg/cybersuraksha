export type IdentifierType = "phone" | "upi" | "email" | "url";

export type RiskLevel = "flagged" | "reported" | "unverified";

export type ComplaintCategory =
  | "financial_fraud"
  | "identity_theft"
  | "harassment"
  | "other";

export type ComplaintStatus =
  | "submitted"
  | "under_review"
  | "routed"
  | "investigation_update";

export interface Suspect {
  id: string;
  identifier_type: IdentifierType;
  identifier_value: string;
  risk_level: RiskLevel;
  source: string | null;
  created_at: string;
}

export interface Complaint {
  id: string;
  reference_number: string;
  category: ComplaintCategory;
  incident_description: string | null;
  incident_date: string | null;
  suspect_identifier_type: IdentifierType | null;
  suspect_identifier_value: string | null;
  complainant_name: string | null;
  complainant_contact: string | null;
  is_guest: boolean;
  is_witness_report: boolean;
  evidence_urls: string[];
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  status: string;
  note: string | null;
  created_at: string;
}

export type PhoneTrustSignalKind =
  | "bfsi_government_service"
  | "non_bfsi_service"
  | "registered_promotional";

export interface PhoneTrustSignal {
  kind: PhoneTrustSignalKind;
  label: string;
  message: string;
  caution: string;
}

export interface CheckResult {
  status: "flagged" | "not_found" | "invalid";
  identifier_type: IdentifierType;
  identifier_value: string;
  matched_suspect?: Suspect;
  complaint_count?: number;
  phone_trust_signal?: PhoneTrustSignal;
}
