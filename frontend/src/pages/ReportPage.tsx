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
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="hero-gradient glass-strong rounded-[32px] px-6 py-8 sm:px-8">
        <div>
          <p className="section-label">Outcome</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Executive analysis report</h1>
          <p className="mt-2 text-sm text-slate-400">
            Generated: {new Date(metadata.generated_at).toLocaleString()} | Model: {metadata.model}
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Recommended" value={(report.recommended_variant as string).replace("_", " ")} />
          <StatCard label="Risk items" value={String(risks.length)} />
          <StatCard label="Next steps" value={String(nextSteps.length)} />
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={exportMarkdown} className="ghost-button cursor-pointer px-4 py-2 text-sm">
          Export Markdown
        </button>
      </div>

      <section className="glass-panel rounded-[28px] p-5">
        <h3 className="mb-2 text-lg font-semibold text-white">Executive Summary</h3>
        <p className="text-sm leading-relaxed text-slate-300">{report.executive_summary as string}</p>
      </section>

      <section className="glass-panel rounded-[28px] p-5">
        <h3 className="mb-2 text-lg font-semibold text-white">Market Intelligence</h3>
        <p className="mb-3 text-sm text-slate-300">{market.overview}</p>
        <ul className="space-y-1">
          {market.key_findings.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="mt-0.5 text-fuchsia-200">•</span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-[28px] p-5">
        <h3 className="mb-2 text-lg font-semibold text-white">Document Insights</h3>
        <p className="mb-3 text-sm text-slate-300">{docInsights?.overview || "No documents uploaded for this analysis."}</p>
        {(docInsights?.key_quotes || []).map((q, i) => (
          <blockquote
            key={i}
            className="mb-2 rounded-r-2xl border-l-2 border-fuchsia-300 bg-white/[0.03] py-2 pl-3 text-sm italic text-slate-400"
          >
            "{q.excerpt || q.text}"
            <span className="ml-2 text-xs text-slate-500">— {q.doc_id}</span>
          </blockquote>
        ))}
      </section>

      <section className="glass-panel rounded-[28px] p-5">
        <h3 className="mb-2 text-lg font-semibold text-white">Recommendation</h3>
        <p className="text-sm text-slate-300">
          <span className="font-medium text-fuchsia-300">
            {(report.recommended_variant as string).replace("_", " ")}
          </span>{" "}
          — {report.recommendation_rationale as string}
        </p>
      </section>

      <section className="glass-panel rounded-[28px] p-5">
        <h3 className="mb-3 text-lg font-semibold text-white">Risks & Mitigations</h3>
        <div className="space-y-3">
          {risks.map((r, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
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
                <span className="text-slate-200">{r.risk}</span>
                <span className="text-slate-500"> — {r.mitigation}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-5">
        <h3 className="mb-3 text-lg font-semibold text-white">Next Steps</h3>
        <ol className="space-y-2">
          {nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-fuchsia-300 text-xs text-slate-950">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <div className="mb-8 text-center">
        <button onClick={() => navigate("/optimize")} className="ghost-button cursor-pointer px-6 py-2 text-sm">
          Start New Analysis
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
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
