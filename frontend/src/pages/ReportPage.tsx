import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReport } from "../api/client";

export default function ReportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getReport(jobId)
      .then(setReport)
      .catch((e: Error) => setError(e.message));
  }, [jobId]);

  function exportMarkdown() {
    if (!report) return;
    const md = generateMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplymind-report-${jobId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">Failed to load report: {error}</p>
        <button onClick={() => navigate("/")} className="text-purple-400 hover:text-purple-300">
          Start new analysis
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400">Loading report...</p>
      </div>
    );
  }

  const market = report.market_intelligence as {
    overview: string;
    key_findings: string[];
    sources: string[];
  };
  const docInsights = report.document_insights as {
    overview: string;
    key_quotes: { text?: string; excerpt?: string; doc_id: string }[];
  };
  const risks = report.risks_and_mitigations as {
    risk: string;
    likelihood: string;
    mitigation: string;
  }[];
  const nextSteps = report.next_steps as string[];
  const metadata = report.report_metadata as {
    generated_at: string;
    model: string;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Analysis Report</h2>
          <p className="text-sm text-gray-400 mt-1">
            Generated: {new Date(metadata.generated_at).toLocaleString()} | Model: {metadata.model}
          </p>
        </div>
        <button
          onClick={exportMarkdown}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Export Markdown
        </button>
      </div>

      {/* Executive Summary */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Executive Summary
        </h3>
        <p className="text-gray-300 text-sm leading-relaxed">
          {report.executive_summary as string}
        </p>
      </section>

      {/* Market Intelligence */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Market Intelligence
        </h3>
        <p className="text-gray-300 text-sm mb-3">{market.overview}</p>
        <ul className="space-y-1">
          {market.key_findings.map((f, i) => (
            <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
              <span className="text-gray-500 mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Document Insights */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Document Insights
        </h3>
        <p className="text-gray-300 text-sm mb-3">{docInsights?.overview || "No documents uploaded for this analysis."}</p>
        {(docInsights?.key_quotes || []).map((q, i) => (
          <blockquote
            key={i}
            className="border-l-2 border-purple-500 pl-3 text-sm text-gray-400 italic mb-2"
          >
            "{q.excerpt || q.text}"
            <span className="text-gray-500 text-xs ml-2">— {q.doc_id}</span>
          </blockquote>
        ))}
      </section>

      {/* Recommendation */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Recommendation
        </h3>
        <p className="text-gray-300 text-sm">
          <span className="font-medium text-purple-400">
            {(report.recommended_variant as string).replace("_", " ")}
          </span>{" "}
          — {report.recommendation_rationale as string}
        </p>
      </section>

      {/* Risks */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          Risks & Mitigations
        </h3>
        <div className="space-y-3">
          {risks.map((r, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  r.likelihood === "high"
                    ? "bg-red-900/30 text-red-400"
                    : r.likelihood === "medium"
                      ? "bg-amber-900/30 text-amber-400"
                      : "bg-green-900/30 text-green-400"
                }`}
              >
                {r.likelihood}
              </span>
              <div>
                <span className="text-gray-200">{r.risk}</span>
                <span className="text-gray-500"> — {r.mitigation}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Next Steps */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Next Steps</h3>
        <ol className="space-y-2">
          {nextSteps.map((step, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-3">
              <span className="bg-purple-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <div className="text-center mb-8">
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Start New Analysis
        </button>
      </div>
    </div>
  );
}

function generateMarkdown(report: Record<string, unknown>): string {
  const market = report.market_intelligence as {
    overview: string;
    key_findings: string[];
  };
  const risks = report.risks_and_mitigations as {
    risk: string;
    likelihood: string;
    mitigation: string;
  }[];
  const nextSteps = report.next_steps as string[];

  return `# SupplyMind Analysis Report

## Executive Summary
${report.executive_summary}

## Market Intelligence
${market.overview}

${market.key_findings.map((f) => `- ${f}`).join("\n")}

## Recommendation
**${report.recommended_variant}** — ${report.recommendation_rationale}

## Risks & Mitigations
${risks.map((r) => `- **${r.risk}** (${r.likelihood}) — ${r.mitigation}`).join("\n")}

## Next Steps
${nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}
`;
}
