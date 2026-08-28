"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { ComplaintCategory, IdentifierType } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type SubmittedReport = {
  reference_number: string;
  contact_method: string | null;
};

const totalSteps = 6;

const incidentOptions: Array<{
  label: string;
  description: string;
  category: ComplaintCategory;
}> = [
  {
    label: "Someone stole money from me",
    description: "Payments, UPI, cards, fake refunds, investment fraud, or bank transfers.",
    category: "financial_fraud",
  },
  {
    label: "Someone is using my identity/accounts",
    description: "Impersonation, account takeover, fake profiles, or stolen credentials.",
    category: "identity_theft",
  },
  {
    label: "Someone is harassing/threatening me online",
    description: "Threats, blackmail, abuse, stalking, or harmful messages.",
    category: "harassment",
  },
  {
    label: "Something else",
    description: "Use this if the incident does not fit the other options.",
    category: "other",
  },
];

const identifierTypes: Array<{ label: string; value: IdentifierType }> = [
  { label: "Phone", value: "phone" },
  { label: "UPI", value: "upi" },
  { label: "Email", value: "email" },
  { label: "URL", value: "url" },
];

const typeHints: Record<IdentifierType, string> = {
  phone: "10-digit Indian mobile number or +91 format",
  upi: "UPI ID such as name@bank",
  email: "Email address",
  url: "Full URL such as https://example.com",
};

function detectIdentifierType(value: string): IdentifierType {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return "url";
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "email";
  }

  if (/^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-_]{2,64}$/i.test(trimmed)) {
    return "upi";
  }

  return "phone";
}

function normalizeIdentifier(value: string, type: IdentifierType) {
  const trimmed = value.trim();

  if (type === "phone") {
    return trimmed.replace(/[\s-]/g, "");
  }

  return trimmed.toLowerCase();
}

function formatCategory(category: ComplaintCategory | "") {
  if (!category) {
    return "Not answered";
  }

  const option = incidentOptions.find((item) => item.category === category);
  return option?.label ?? category.replace("_", " ");
}

export function ReportFlow() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [incidentDate, setIncidentDate] = useState("");
  const [dateNotSure, setDateNotSure] = useState(false);
  const [approximateDate, setApproximateDate] = useState("");
  const [suspectType, setSuspectType] = useState<IdentifierType>("phone");
  const [suspectValue, setSuspectValue] = useState("");
  const [hasManualSuspectType, setHasManualSuspectType] = useState(false);
  const [wasPrefilled, setWasPrefilled] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [complainantName, setComplainantName] = useState("");
  const [complainantContact, setComplainantContact] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<SubmittedReport | null>(null);

  const selectedIncident = useMemo(
    () => incidentOptions.find((option) => option.category === category),
    [category],
  );

  const normalizedSuspectValue = useMemo(
    () => normalizeIdentifier(suspectValue, suspectType),
    [suspectType, suspectValue],
  );

  useEffect(() => {
    const queryType = searchParams.get("identifier_type") as IdentifierType | null;
    const queryValue = searchParams.get("identifier_value");

    let prefill: { identifier_type?: IdentifierType; identifier_value?: string } | null = null;

    if (queryType && queryValue) {
      prefill = {
        identifier_type: queryType,
        identifier_value: queryValue,
      };
    } else {
      try {
        const stored = sessionStorage.getItem("cybersuraksha.prefill");
        prefill = stored ? JSON.parse(stored) : null;
      } catch {
        prefill = null;
      }
    }

    if (
      prefill?.identifier_type &&
      identifierTypes.some((type) => type.value === prefill?.identifier_type) &&
      prefill.identifier_value
    ) {
      setSuspectType(prefill.identifier_type);
      setSuspectValue(prefill.identifier_value);
      setWasPrefilled(true);
      setHasManualSuspectType(true);
    }
  }, [searchParams]);

  function updateSuspectValue(value: string) {
    setSuspectValue(value);
    setErrorMessage("");

    if (!hasManualSuspectType) {
      setSuspectType(detectIdentifierType(value));
    }
  }

  function updateEvidenceFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setEvidenceFiles(files);
    setErrorMessage("");
  }

  function goToStep(nextStep: Step) {
    setStep(nextStep);
    setErrorMessage("");
  }

  function nextStep() {
    const validation = validateStep(step);

    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setStep((current) => Math.min(totalSteps, current + 1) as Step);
    setErrorMessage("");
  }

  function previousStep() {
    setStep((current) => Math.max(1, current - 1) as Step);
    setErrorMessage("");
  }

  function validateStep(currentStep: Step) {
    if (currentStep === 1 && !category) {
      return "Choose the closest description of what happened.";
    }

    if (currentStep === 2 && !dateNotSure && !incidentDate) {
      return "Choose a date, or mark that you are not sure.";
    }

    if (currentStep === 3 && suspectValue.trim() && !isValidIdentifier(suspectType, normalizedSuspectValue)) {
      return `Enter a valid ${typeHints[suspectType].toLowerCase()}.`;
    }

    if (currentStep === 5 && !isGuest && (!complainantName.trim() || !complainantContact.trim())) {
      return "Enter your name and contact, or continue as guest.";
    }

    return "";
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateStep(6);

    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append(
        "payload",
        JSON.stringify({
          category,
          incident_date: dateNotSure || !incidentDate ? null : incidentDate,
          approximate_date: dateNotSure ? approximateDate.trim() || "Not sure" : null,
          suspect_identifier_type: suspectValue.trim() ? suspectType : null,
          suspect_identifier_value: suspectValue.trim() ? normalizedSuspectValue : null,
          complainant_name: isGuest ? null : complainantName.trim(),
          complainant_contact: isGuest ? null : complainantContact.trim(),
          is_guest: isGuest,
          incident_label: selectedIncident?.label ?? null,
        }),
      );

      evidenceFiles.forEach((file) => {
        formData.append("evidence", file);
      });

      const response = await fetch("/api/report", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as SubmittedReport | { error?: string };

      if (!response.ok || !("reference_number" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Unable to submit the report.",
        );
      }

      sessionStorage.removeItem("cybersuraksha.prefill");
      setSubmittedReport(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit the report. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedReport) {
    return <ConfirmationScreen report={submittedReport} />;
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10 sm:px-8 lg:px-10">
        <div className="mb-8">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-[#1d4ed8]">
            Back to check
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
            CyberSuraksha Report
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            Tell us what happened, one step at a time.
          </h1>
        </div>

        <div className="max-w-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-700">
                Step {step} of {totalSteps}
              </p>
              <p className="text-sm text-slate-500">{Math.round((step / totalSteps) * 100)}% complete</p>
            </div>
            <div className="mt-3 h-2 bg-slate-100">
              <div
                className="h-full bg-[#1d4ed8] transition-all"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={submitReport}>
            {step === 1 ? (
              <StepOne category={category} setCategory={setCategory} />
            ) : null}
            {step === 2 ? (
              <StepTwo
                approximateDate={approximateDate}
                dateNotSure={dateNotSure}
                incidentDate={incidentDate}
                setApproximateDate={setApproximateDate}
                setDateNotSure={setDateNotSure}
                setIncidentDate={setIncidentDate}
              />
            ) : null}
            {step === 3 ? (
              <StepThree
                normalizedSuspectValue={normalizedSuspectValue}
                setHasManualSuspectType={setHasManualSuspectType}
                setSuspectType={setSuspectType}
                suspectType={suspectType}
                suspectValue={suspectValue}
                updateSuspectValue={updateSuspectValue}
                wasPrefilled={wasPrefilled}
              />
            ) : null}
            {step === 4 ? (
              <StepFour evidenceFiles={evidenceFiles} updateEvidenceFiles={updateEvidenceFiles} />
            ) : null}
            {step === 5 ? (
              <StepFive
                complainantContact={complainantContact}
                complainantName={complainantName}
                isGuest={isGuest}
                setComplainantContact={setComplainantContact}
                setComplainantName={setComplainantName}
                setIsGuest={setIsGuest}
              />
            ) : null}
            {step === 6 ? (
              <StepSix
                approximateDate={approximateDate}
                category={category}
                complainantContact={complainantContact}
                complainantName={complainantName}
                dateNotSure={dateNotSure}
                evidenceFiles={evidenceFiles}
                goToStep={goToStep}
                incidentDate={incidentDate}
                isGuest={isGuest}
                suspectType={suspectType}
                suspectValue={suspectValue}
              />
            ) : null}

            {errorMessage ? (
              <p className="mt-6 text-sm font-medium text-red-700" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={previousStep}
                disabled={step === 1 || isSubmitting}
                className="h-11 border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                Back
              </button>

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="h-11 bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#153e75]"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#153e75] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? "Submitting..." : "Submit report"}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function StepOne({
  category,
  setCategory,
}: {
  category: ComplaintCategory | "";
  setCategory: (category: ComplaintCategory) => void;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-950">What happened?</h2>
      <div className="mt-6 grid gap-3">
        {incidentOptions.map((option) => {
          const selected = category === option.category;

          return (
            <button
              key={option.category}
              type="button"
              onClick={() => setCategory(option.category)}
              className={`border p-4 text-left transition ${
                selected
                  ? "border-[#1d4ed8] bg-[#eff6ff]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="block text-base font-semibold text-slate-950">{option.label}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">{option.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StepTwo({
  approximateDate,
  dateNotSure,
  incidentDate,
  setApproximateDate,
  setDateNotSure,
  setIncidentDate,
}: {
  approximateDate: string;
  dateNotSure: boolean;
  incidentDate: string;
  setApproximateDate: (value: string) => void;
  setDateNotSure: (value: boolean) => void;
  setIncidentDate: (value: string) => void;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-950">When did this happen?</h2>
      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">Incident date</span>
          <input
            type="date"
            value={incidentDate}
            onChange={(event) => {
              setIncidentDate(event.target.value);
              setDateNotSure(false);
            }}
            disabled={dateNotSure}
            className="h-12 w-full border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 disabled:bg-slate-100"
          />
        </label>
        <label className="flex items-start gap-3 border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={dateNotSure}
            onChange={(event) => {
              setDateNotSure(event.target.checked);
              if (event.target.checked) {
                setIncidentDate("");
              }
            }}
            className="mt-1 h-4 w-4 accent-[#1d4ed8]"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">I am not sure</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              You can still submit the report with an estimated timing note.
            </span>
          </span>
        </label>
        {dateNotSure ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Approximate timing</span>
            <input
              value={approximateDate}
              onChange={(event) => setApproximateDate(event.target.value)}
              placeholder="e.g. last week, yesterday evening, early August"
              className="h-12 w-full border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            />
          </label>
        ) : null}
      </div>
    </section>
  );
}

function StepThree({
  normalizedSuspectValue,
  setHasManualSuspectType,
  setSuspectType,
  suspectType,
  suspectValue,
  updateSuspectValue,
  wasPrefilled,
}: {
  normalizedSuspectValue: string;
  setHasManualSuspectType: (value: boolean) => void;
  setSuspectType: (type: IdentifierType) => void;
  suspectType: IdentifierType;
  suspectValue: string;
  updateSuspectValue: (value: string) => void;
  wasPrefilled: boolean;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-950">Who&apos;s involved?</h2>
      {wasPrefilled ? (
        <p className="mt-4 border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
          Pre-filled from your recent check.
        </p>
      ) : null}
      <div className="mt-6">
        <label htmlFor="suspect-identifier" className="mb-2 block text-sm font-medium text-slate-800">
          Suspect phone, UPI ID, email, or URL
        </label>
        <input
          id="suspect-identifier"
          value={suspectValue}
          onChange={(event) => updateSuspectValue(event.target.value)}
          placeholder="e.g. refunddesk-demo@paytm"
          className="h-12 w-full border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          autoComplete="off"
        />
        <p className="mt-2 text-sm text-slate-500">{typeHints[suspectType]}</p>
        {suspectValue.trim() ? (
          <p className="mt-2 text-xs text-slate-500">Will be saved as: {normalizedSuspectValue}</p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Suspect identifier type">
        {identifierTypes.map((type) => {
          const selected = suspectType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setSuspectType(type.value);
                setHasManualSuspectType(true);
              }}
              className={`h-10 min-w-20 border px-4 text-sm font-medium transition ${
                selected
                  ? "border-[#1d4ed8] bg-[#eff6ff] text-[#153e75]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StepFour({
  evidenceFiles,
  updateEvidenceFiles,
}: {
  evidenceFiles: File[];
  updateEvidenceFiles: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-950">What evidence do you have?</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Add screenshots, PDFs, or documents. You can continue without files and add evidence later.
      </p>
      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-[#1d4ed8]">
        <span className="text-sm font-semibold text-slate-900">Choose evidence files</span>
        <span className="mt-1 text-sm text-slate-500">PNG, JPG, PDF, or documents for this prototype</span>
        <input type="file" multiple onChange={updateEvidenceFiles} className="sr-only" />
      </label>
      {evidenceFiles.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {evidenceFiles.map((file) => (
            <li key={`${file.name}-${file.lastModified}`} className="border border-slate-200 px-3 py-2">
              {file.name} ({Math.ceil(file.size / 1024)} KB)
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function StepFive({
  complainantContact,
  complainantName,
  isGuest,
  setComplainantContact,
  setComplainantName,
  setIsGuest,
}: {
  complainantContact: string;
  complainantName: string;
  isGuest: boolean;
  setComplainantContact: (value: string) => void;
  setComplainantName: (value: string) => void;
  setIsGuest: (value: boolean) => void;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-950">Your details</h2>
      <div className="mt-6 grid gap-4">
        <label className="flex items-start gap-3 border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={isGuest}
            onChange={(event) => setIsGuest(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#1d4ed8]"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Continue as guest</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              Guest reports can only be tracked with the reference number. You will not get live account access.
            </span>
          </span>
        </label>
        {!isGuest ? (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">Full name</span>
              <input
                value={complainantName}
                onChange={(event) => setComplainantName(event.target.value)}
                className="h-12 w-full border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">Email or phone</span>
              <input
                value={complainantContact}
                onChange={(event) => setComplainantContact(event.target.value)}
                className="h-12 w-full border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              />
            </label>
          </>
        ) : null}
      </div>
    </section>
  );
}

function StepSix({
  approximateDate,
  category,
  complainantContact,
  complainantName,
  dateNotSure,
  evidenceFiles,
  goToStep,
  incidentDate,
  isGuest,
  suspectType,
  suspectValue,
}: {
  approximateDate: string;
  category: ComplaintCategory | "";
  complainantContact: string;
  complainantName: string;
  dateNotSure: boolean;
  evidenceFiles: File[];
  goToStep: (step: Step) => void;
  incidentDate: string;
  isGuest: boolean;
  suspectType: IdentifierType;
  suspectValue: string;
}) {
  const rows = [
    {
      label: "What happened",
      value: formatCategory(category),
      step: 1 as Step,
    },
    {
      label: "When",
      value: dateNotSure ? approximateDate || "Not sure" : incidentDate,
      step: 2 as Step,
    },
    {
      label: "Suspect identifier",
      value: suspectValue ? `${suspectType.toUpperCase()}: ${suspectValue}` : "Not provided",
      step: 3 as Step,
    },
    {
      label: "Evidence",
      value: evidenceFiles.length ? `${evidenceFiles.length} file(s) selected` : "No files selected",
      step: 4 as Step,
    },
    {
      label: "Your details",
      value: isGuest ? "Guest report" : `${complainantName} (${complainantContact})`,
      step: 5 as Step,
    },
  ];

  return (
    <section>
      <h2 className="text-2xl font-semibold text-slate-950">Review your report</h2>
      <div className="mt-6 divide-y divide-slate-200 border border-slate-200">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-3 p-4 sm:grid-cols-[150px_1fr_auto] sm:items-center">
            <p className="text-sm font-semibold text-slate-700">{row.label}</p>
            <p className="text-sm leading-6 text-slate-900">{row.value || "Not answered"}</p>
            <button
              type="button"
              onClick={() => goToStep(row.step)}
              className="text-left text-sm font-semibold text-[#1d4ed8] hover:text-[#153e75] sm:text-right"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-600">
        Submit only when the summary looks correct. You will receive a reference number immediately.
      </p>
    </section>
  );
}

function ConfirmationScreen({ report }: { report: SubmittedReport }) {
  const trackHref = `/track?ref=${encodeURIComponent(report.reference_number)}`;

  async function copyReference() {
    await navigator.clipboard.writeText(report.reference_number);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-10 sm:px-8 lg:px-10">
        <div className="border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">Report received</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Your reference number</h1>
          <div className="mt-5 flex flex-col gap-3 border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all text-3xl font-semibold tracking-wide text-slate-950">
              {report.reference_number}
            </p>
            <button
              type="button"
              onClick={copyReference}
              className="h-11 border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Copy
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-950">Your report has been received. Here&apos;s what happens next:</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>
                <strong className="text-slate-950">1. Review (within 48 hours)</strong> - we check your report is complete.
              </li>
              <li>
                <strong className="text-slate-950">2. Routed to the relevant Cyber Cell (within 5 working days)</strong>.
              </li>
              <li>
                <strong className="text-slate-950">3. You&apos;ll receive an update by {report.contact_method ?? "your saved contact method"} within 28 days</strong>,
                even if we haven&apos;t reached a resolution yet.
              </li>
            </ol>
          </div>

          <Link
            href={trackHref}
            className="mt-8 inline-flex bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#153e75]"
          >
            Track this report -&gt;
          </Link>
        </div>
      </section>
    </main>
  );
}

function isValidIdentifier(type: IdentifierType, value: string) {
  const validators: Record<IdentifierType, RegExp> = {
    phone: /^(?:\+91|0)?[6-9]\d{9}$/,
    upi: /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-_]{2,64}$/i,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i,
  };

  return validators[type].test(value);
}
