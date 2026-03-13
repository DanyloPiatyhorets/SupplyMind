import { useEffect, useRef } from "react";

export interface TraceEvent {
  event: string;
  agent: string;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "from-fuchsia-200 to-violet-400",
  web_search: "from-violet-200 to-purple-500",
  document_rag: "from-purple-200 to-fuchsia-500",
  contract_analysis: "from-amber-200 to-orange-400",
  synthesis: "from-pink-200 to-fuchsia-500",
};

const EVENT_ICONS: Record<string, string> = {
  PLAN: "Plan",
  SEARCHING: "Search",
  RAG_QUERY: "RAG",
  ANALYZING: "Model",
  CORRECTING: "Audit",
  SYNTHESIZING: "Report",
  COMPLETE: "Done",
};

export default function AgentTrace({ events }: { events: TraceEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="glass-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="section-label">Live Agent Pipeline</p>
          <h3 className="mt-3 text-xl font-semibold text-white">Execution Timeline</h3>
          <p className="mt-1 text-sm text-slate-400">
            Each event appears as the system decomposes the goal, gathers evidence, and assembles a recommendation.
          </p>
        </div>
        <div className="hidden rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3 text-right text-sm text-slate-300 sm:block">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Events</p>
          <p className="mt-1 text-2xl font-semibold text-white">{events.length}</p>
        </div>
      </div>

      <div className="max-h-[560px] space-y-4 overflow-y-auto pr-2">
        {events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/28 px-4 py-8 text-center text-sm text-slate-400">
            Waiting for agent events...
          </div>
        )}

        {events.map((evt, i) => (
          <div
            key={i}
            className="animate-float-in relative flex gap-4 rounded-[24px] border border-white/8 bg-slate-950/40 p-4"
          >
            <div className="flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 ${AGENT_COLORS[evt.agent] || "from-slate-200 to-slate-400"}`}
              >
                {EVENT_ICONS[evt.event] || "Step"}
              </div>
              {i !== events.length - 1 && (
                <div className="mt-2 h-full min-h-8 w-px bg-gradient-to-b from-fuchsia-200/30 to-transparent" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-200">
                  {evt.agent}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-fuchsia-200/70">{evt.event.replace("_", " ")}</span>
              </div>
              <p className="text-sm leading-6 text-slate-200">{evt.message}</p>

              {evt.data && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(evt.data).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2 text-xs">
                      <p className="uppercase tracking-[0.18em] text-slate-500">{key.replace("_", " ")}</p>
                      <p className="mt-1 text-slate-200">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
