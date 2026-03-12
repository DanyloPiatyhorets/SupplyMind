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

  useEffect(() => {
    if (!jobId) return;
    getReport(jobId).then(setReport);
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

  if (!report) {
    return (
      <div className="text-center py-20 text-gray-400">Loading report...</div>
    );
  }

  const flavours = report.optimization_variants as Record<string, Flavour>;
  const corrections = report.data_corrections as Correction[];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Human-in-the-Loop Review
        </h2>
        <p className="text-gray-400 mt-1">
          Select a procurement strategy and approve to proceed.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          Optimization Variants
        </h3>
        <FlavourCards
          flavours={flavours}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className="mb-8">
        <DataCorrections corrections={corrections} />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
        <h3 className="text-lg font-semibold text-white mb-2">
          Executive Summary
        </h3>
        <p className="text-gray-300 text-sm leading-relaxed">
          {report.executive_summary as string}
        </p>
      </div>

      <div className="text-center">
        <button
          onClick={handleApprove}
          disabled={!selected || approving}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors cursor-pointer"
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
