"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { CheckResult, IdentifierType } from "@/lib/types";

const identifierTypes: Array<{ label: string; value: IdentifierType }> = [
  { label: "Phone", value: "phone" },
  { label: "UPI", value: "upi" },
  { label: "Email", value: "email" },
  { label: "URL", value: "url" },
];

const typeHints: Record<IdentifierType, string> = {
  phone: "Enter an Indian phone number",
  upi: "Enter a UPI ID such as name@bank",
  email: "Enter an email address",
  url: "Enter a full URL such as https://example.com",
};

const processSteps = [
  {
    label: "Check",
    title: "Verify the identifier",
    text: "Search a number, UPI ID, email, or URL before sending money or sharing details.",
  },
  {
    label: "Report",
    title: "Create a guided report",
    text: "Answer one question at a time and attach any screenshots or documents you have.",
  },
  {
    label: "Track",
    title: "Follow the status",
    text: "Use your reference number to see review, routing, and investigation updates.",
  },
];

const actionCards = [
  {
    title: "Raise a complaint",
    text: "Start the guided report flow if money was lost, accounts were misused, or you witnessed harm.",
    href: "/report",
    cta: "Report now",
    tone: "urgent",
  },
  {
    title: "Track a complaint",
    text: "Already submitted? Check the latest status with your CyberSuraksha reference number.",
    href: "/track",
    cta: "Track status",
    tone: "standard",
  },
  {
    title: "Cyber fraud helpline",
    text: "For immediate reporting of cyber financial fraud in India, call the national helpline.",
    href: "tel:1930",
    cta: "Call 1930",
    tone: "helpline",
  },
];

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

  if (/^(?:(?:\+91[\s-]?|0)?[6-9]\d{9}|1600\d{6}|1601\d{6}|140\d{7})$/.test(trimmed.replace(/\s+/g, ""))) {
    return "phone";
  }

  return "phone";
}

function normalizeForCheck(value: string, type: IdentifierType) {
  const trimmed = value.trim();

  if (type === "phone") {
    return trimmed.replace(/[\s-]/g, "");
  }

  return trimmed.toLowerCase();
}

export default function Home() {
  const [identifierValue, setIdentifierValue] = useState("");
  const [identifierType, setIdentifierType] = useState<IdentifierType>("phone");
  const [hasManualType, setHasManualType] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedValue = useMemo(
    () => normalizeForCheck(identifierValue, identifierType),
    [identifierValue, identifierType],
  );

  const reportHref =
    result?.status === "flagged"
      ? `/report?identifier_type=${encodeURIComponent(
          result.identifier_type,
        )}&identifier_value=${encodeURIComponent(result.identifier_value)}`
      : "/report";

  function handleValueChange(value: string) {
    setIdentifierValue(value);
    setResult(null);
    setErrorMessage("");

    if (!hasManualType) {
      setIdentifierType(detectIdentifierType(value));
    }
  }

  function handleTypeSelect(type: IdentifierType) {
    setIdentifierType(type);
    setHasManualType(true);
    setResult(null);
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsChecking(true);
    setErrorMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier_type: identifierType,
          identifier_value: normalizedValue,
        }),
      });

      const data = (await response.json()) as CheckResult | { error?: string };

      if (!response.ok || !("status" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Unable to complete the check.",
        );
      }

      setResult(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete the check. Please try again.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <section className="bg-[#071a33] text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:px-10 lg:py-14">
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit rounded-md border border-[#14b8a6]/30 bg-[#0f2b4d] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[#99f6e4]">
              Citizen safety check
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Check first. Report fast. Track every update.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">
              CyberSuraksha helps citizens verify suspicious identifiers, raise a cybercrime report, and follow a clear status pipeline.
            </p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              {processSteps.map((step, index) => (
                <div key={step.label} className="rounded-md border border-white/10 bg-white/[0.08] p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14b8a6] text-sm font-black text-[#071a33]">
                    {index + 1}
                  </span>
                  <p className="mt-3 font-semibold">{step.label}</p>
                  <p className="mt-1 leading-5 text-blue-100">{step.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/30 sm:p-6">
            <div className="mb-5 border-b border-slate-200 pb-4">
              <h2 className="text-xl font-semibold text-[#071a33]">Run a quick check</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Auto-detect is on. You can still choose the type manually.
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <label
                    htmlFor="identifier"
                    className="mb-2 block text-sm font-medium text-slate-800"
                  >
                    Phone number, UPI ID, email, or URL
                  </label>
                  <input
                    id="identifier"
                    value={identifierValue}
                    onChange={(event) => handleValueChange(event.target.value)}
                    placeholder="e.g. refunddesk-demo@paytm"
                    className="h-12 w-full rounded-md border border-slate-300 px-4 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                    autoComplete="off"
                  />
                  <p className="mt-2 text-sm text-slate-500">{typeHints[identifierType]}</p>
                </div>

                <button
                  type="submit"
                  disabled={isChecking || !identifierValue.trim()}
                  className="h-12 rounded-md bg-[#1d4ed8] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#153e75] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isChecking ? "Checking..." : "Check now"}
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2" aria-label="Identifier type">
                {identifierTypes.map((type) => {
                  const isSelected = identifierType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeSelect(type.value)}
                      className={`h-10 min-w-20 rounded-md border px-4 text-sm font-medium transition ${
                        isSelected
                          ? "border-[#1d4ed8] bg-[#eff6ff] text-[#153e75]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </form>

            <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">Already lost money or feel at risk?</p>
              <Link
                href="/report"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800 sm:w-auto"
              >
                Report a complaint now -&gt;
              </Link>
            </div>

            <div className="mt-5" aria-live="polite">
              {errorMessage ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              {result?.status === "invalid" ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  Please enter a valid {identifierTypeLabel(result.identifier_type)}.
                </p>
              ) : null}

              {result?.status === "flagged" ? (
                <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">
                    Match found
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    This identifier appears in reported suspect data.
                  </h2>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-red-800">Risk level</dt>
                      <dd className="mt-1 capitalize">
                        {result.matched_suspect?.risk_level.replace("_", " ")}
                      </dd>
                    </div>
                    {result.matched_suspect?.source ? (
                      <div>
                        <dt className="font-medium text-red-800">Source</dt>
                        <dd className="mt-1">{result.matched_suspect.source}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <Link
                    href={reportHref}
                    onClick={() => {
                      sessionStorage.setItem(
                        "cybersuraksha.prefill",
                        JSON.stringify({
                          identifier_type: result.identifier_type,
                          identifier_value: result.identifier_value,
                        }),
                      );
                    }}
                    className="mt-5 inline-flex rounded-md bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800"
                  >
                    This looks suspicious - Report this now -&gt;
                  </Link>
                </section>
              ) : null}

              {result?.status === "not_found" ? (
                <div className="grid gap-4">
                  {result.phone_trust_signal ? (
                    <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                        Trusted-series signal
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        {result.phone_trust_signal.label}
                      </h2>
                      <p className="mt-2 text-sm leading-6">
                        {result.phone_trust_signal.message}
                      </p>
                      <p className="mt-3 text-sm font-medium leading-6">
                        {result.phone_trust_signal.caution}
                      </p>
                    </section>
                  ) : null}
                  <section className="rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      No match found
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Not found in our database.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Not found in our database - this does not guarantee it&apos;s
                      safe. Stay cautious.
                    </p>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {actionCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                card.tone === "urgent"
                  ? "border-red-200 bg-red-50"
                  : card.tone === "helpline"
                    ? "border-teal-200 bg-teal-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              <p
                className={`text-sm font-semibold uppercase tracking-[0.14em] ${
                  card.tone === "urgent"
                    ? "text-red-700"
                    : card.tone === "helpline"
                      ? "text-teal-800"
                      : "text-[#1d4ed8]"
                }`}
              >
                {card.cta}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#071a33]">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]">
                What to do next
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#071a33]">A simple path during a stressful moment</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {processSteps.map((step, index) => (
                <div key={step.title} className="relative rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="font-semibold text-slate-950">{step.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Official India cybercrime guidance lists 1930 as the national helpline for immediate cyber financial fraud reporting.
          </p>
        </div>
      </section>
    </main>
  );
}

function identifierTypeLabel(type: IdentifierType) {
  const labels: Record<IdentifierType, string> = {
    phone: "phone number",
    upi: "UPI ID",
    email: "email address",
    url: "URL",
  };

  return labels[type];
}
