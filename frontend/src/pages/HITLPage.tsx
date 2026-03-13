import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FlavourCards from "../components/FlavourCards";
import type { Flavour } from "../components/FlavourCards";
import DataCorrections from "../components/DataCorrections";
import type { Correction } from "../components/DataCorrections";
import { getReport, approve } from "../api/client";

export default function HITLPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getReport(jobId)
      .then(setReport)
      .catch((e: Error) => setError(e.message));
  }, [jobId]);

  async function handleApprove() {
    if (!jobId || !selected) return;
    setApproving(true);
    try {
      await approve(jobId, selected);
      navigate(`/report/${jobId}`);
    } catch {
      console.error("Approval failed");
      setApproving(false);
    }
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-red-400">Failed to load report: {error}</p>
        <button onClick={() => navigate("/optimize")} className="text-fuchsia-300 hover:text-fuchsia-200">
          Start new analysis
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-300 border-t-transparent" />
        <p className="text-slate-400">Loading report...</p>
      </div>
    );
  }

  const flavours = report.optimization_variants as Record<string, Flavour>;
  const corrections = report.data_corrections as Correction[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="hero-gradient glass-strong rounded-[32px] px-6 py-8 sm:px-8">
        <p className="section-label">Human Review</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Choose the strategy, keep the control</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
          SupplyMind proposes options across cost, risk, and delivery speed. The recommendation is visible, but this step makes the governance model explicit: a person reviews evidence before anything is approved.
        </p>
      </section>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Optimization Variants</h3>
        <FlavourCards flavours={flavours} selected={selected} onSelect={setSelected} />
      </div>

      <DataCorrections corrections={corrections} />

      <div className="glass-panel rounded-[28px] p-5">
        <p className="section-label">Executive Framing</p>
        <h3 className="mb-2 mt-3 text-lg font-semibold text-white">Executive Summary</h3>
        <p className="text-sm leading-relaxed text-slate-300">{report.executive_summary as string}</p>
      </div>

      <div className="text-center">
        <button
          onClick={handleApprove}
          disabled={!selected || approving}
          className="cta-button cursor-pointer px-8 py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {approving
            ? "Approving..."
            : selected
              ? `Approve "${flavours[selected]?.label}" Strategy`
              : "Select a strategy to approve"}
        </button>
      </div>
    </div>
  );
}
