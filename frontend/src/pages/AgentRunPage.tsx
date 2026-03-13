import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AgentTrace from "../components/AgentTrace";
import type { TraceEvent } from "../components/AgentTrace";
import { traceStream } from "../api/client";

const STAGES = [
  { key: "PLAN", label: "Planning" },
  { key: "SEARCHING", label: "Market Search" },
  { key: "RAG_QUERY", label: "Document RAG" },
  { key: "ANALYZING", label: "Contract Analysis" },
  { key: "SYNTHESIZING", label: "Report Synthesis" },
  { key: "COMPLETE", label: "Complete" },
];

export default function AgentRunPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const es = traceStream(jobId);

    es.onmessage = (msg) => {
      const event: TraceEvent = JSON.parse(msg.data);
      setEvents((prev) => [...prev, event]);

      if (event.event === "COMPLETE") {
        setDone(true);
        es.close();
      }
    };

    es.onerror = () => {
      setDone(true);
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  const completedEvents = new Set(events.map((event) => event.event));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="hero-gradient glass-strong rounded-[32px] px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-label">Multi-Agent Orchestration</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Live procurement run for SolGrid Technologies
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              This run demonstrates how SupplyMind breaks a goal into research tasks, gathers live and internal evidence, then turns that into an executive-ready recommendation with human review.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">Job ID · {jobId}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard label="Pipeline State" value={done ? "Ready for review" : "Actively reasoning"} />
            <StatusCard label="Signals Captured" value={String(events.length)} />
            <StatusCard label="Human Control" value="Approval required" />
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="section-label">Pipeline Status</p>
            <h2 className="mt-3 text-xl font-semibold text-white">Agent choreography</h2>
          </div>
          <div className="status-pill text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-fuchsia-300" : "animate-pulse bg-violet-300"}`} />
            {done ? "Execution complete" : "Running"}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-6">
          {STAGES.map((stage) => {
            const active = completedEvents.has(stage.key);
            return (
              <div
                key={stage.key}
                className={`rounded-2xl border px-4 py-4 text-sm ${
                  active
                    ? "border-fuchsia-200/24 bg-fuchsia-300/10 text-fuchsia-50"
                    : "border-white/8 bg-slate-950/28 text-slate-500"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.18em]">{stage.key.replace("_", " ")}</p>
                <p className="mt-2 font-medium">{stage.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <AgentTrace events={events} />

      {done && (
        <div className="text-center">
          <button
            onClick={() => navigate(`/review/${jobId}`)}
            className="cta-button cursor-pointer px-6 py-3"
          >
            Review Optimization Variants
          </button>
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
