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
      <section className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:px-10">
        <div>
          <p className="mb-4 inline-flex rounded-md border border-[#0f766e]/20 bg-[#ccfbf1] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[#115e59]">
            Citizen safety check
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[#071a33] sm:text-5xl">
            Check before you trust a number, UPI ID, email, or link.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            CyberSuraksha compares suspicious identifiers with demo suspect
            reports and gives clear guidance without making risky promises.
          </p>
          <div className="mt-7 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            {["Check", "Report", "Track"].map((item, index) => (
              <div key={item} className="rounded-md border border-slate-200 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]">
                  0{index + 1}
                </p>
                <p className="mt-2 font-semibold text-slate-950">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 sm:p-6"
        >
          <div className="mb-5 border-b border-slate-200 pb-4">
            <h2 className="text-xl font-semibold text-[#071a33]">Run a quick check</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Auto-detect is on. You can still choose the type manually.
            </p>
          </div>
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

          <Link
            href="/report"
            className="mt-6 inline-flex text-sm font-semibold text-slate-600 hover:text-[#1d4ed8]"
          >
            Already a victim? Report now -&gt;
          </Link>
        </form>

        <div className="lg:col-start-2" aria-live="polite">
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
