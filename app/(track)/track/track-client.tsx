"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Complaint, ComplaintStatus, StatusHistory } from "@/lib/types";

type TrackResponse = {
  complaint: Complaint;
  status_history: StatusHistory[];
};

const pipeline: Array<{
  status: ComplaintStatus;
  label: string;
  description: string;
}> = [
  {
    status: "submitted",
    label: "Submitted",
    description: "Your report has been received.",
  },
  {
    status: "under_review",
    label: "Under Review",
    description: "We are checking the report is complete.",
  },
  {
    status: "routed",
    label: "Routed to Cyber Cell",
    description: "The report has been sent to the relevant team.",
  },
  {
    status: "investigation_update",
    label: "Investigation Update",
    description: "An update has been added to your case.",
  },
];

export function TrackClient() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") ?? "";
  const [referenceNumber, setReferenceNumber] = useState(initialRef);
  const [result, setResult] = useState<TrackResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoSubmittedRef, setAutoSubmittedRef] = useState("");

  useEffect(() => {
    if (initialRef && initialRef !== autoSubmittedRef) {
      setReferenceNumber(initialRef);
      setAutoSubmittedRef(initialRef);
      void lookupReference(initialRef);
    }
  }, [autoSubmittedRef, initialRef]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupReference(referenceNumber);
  }

  async function lookupReference(ref: string) {
    const trimmedRef = ref.trim();

    if (!trimmedRef) {
      setResult(null);
      setErrorMessage("Enter a reference number to track your report.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/track?ref=${encodeURIComponent(trimmedRef)}`);
      const data = (await response.json()) as TrackResponse | { error?: string };

      if (!response.ok || !("complaint" in data)) {
        const message =
          "error" in data && data.error
            ? data.error
            : "We could not find a report with that reference number.";
        throw new Error(message);
      }

      setResult(data);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not complete the lookup. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-6xl flex-col px-5 py-10 sm:px-8 lg:px-10">
        <div className="pt-8">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-[#1d4ed8]">
            Back to check
          </Link>
          <p className="mt-5 inline-flex rounded-md border border-[#0f766e]/20 bg-[#ccfbf1] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[#115e59]">
            CyberSuraksha Track
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-[#071a33] sm:text-4xl">
            Track your report through each status update.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Enter the reference number you received after submitting your report.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10 sm:p-6">
          <label htmlFor="reference-number" className="mb-2 block text-sm font-medium text-slate-800">
            Reference number
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              id="reference-number"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value.toUpperCase())}
              placeholder="CS-2026-000123"
              className="h-12 w-full rounded-md border border-slate-300 px-4 text-base uppercase outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 rounded-md bg-[#1d4ed8] px-6 text-sm font-semibold text-white transition hover:bg-[#153e75] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "Tracking..." : "Track"}
            </button>
          </div>
          {errorMessage ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>

        {result ? <TrackResult result={result} /> : null}
      </section>
    </main>
  );
}

function TrackResult({ result }: { result: TrackResponse }) {
  const currentIndex = pipeline.findIndex((step) => step.status === result.complaint.status);
  const newestFirst = [...result.status_history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const withinReviewWindow = useMemo(() => {
    if (result.complaint.status !== "submitted") {
      return false;
    }

    const createdAt = new Date(result.complaint.created_at).getTime();
    const elapsedHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    return elapsedHours >= 0 && elapsedHours < 48;
  }, [result.complaint.created_at, result.complaint.status]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
              {result.complaint.reference_number}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Current status</h2>
          </div>
          {withinReviewWindow ? (
            <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
              You&apos;re within our 48-hour review window.
            </p>
          ) : null}
        </div>

        <ol className="mt-8 grid gap-5 md:grid-cols-4">
          {pipeline.map((item, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;

            return (
              <li key={item.status} className="relative">
                <div className="flex items-start gap-3 md:flex-col">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      isCompleted
                        ? "border-[#0f766e] bg-[#0f766e] text-white"
                        : isActive
                          ? "border-[#1d4ed8] bg-[#eff6ff] text-[#153e75]"
                          : "border-slate-300 bg-white text-slate-400"
                    }`}
                    aria-label={`${item.label} ${isCompleted ? "completed" : isActive ? "current" : "pending"}`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${isActive ? "text-slate-950" : "text-slate-700"}`}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-950">Status history</h2>
        <div className="mt-5 space-y-4">
          {newestFirst.map((entry) => (
            <article key={entry.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">{formatStatus(entry.status)}</p>
              {entry.note ? <p className="mt-1 text-sm leading-6 text-slate-600">{entry.note}</p> : null}
              <time className="mt-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                {formatDateTime(entry.created_at)}
              </time>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatStatus(status: string) {
  const match = pipeline.find((item) => item.status === status);
  return match?.label ?? status.replaceAll("_", " ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
