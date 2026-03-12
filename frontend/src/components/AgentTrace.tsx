import { useEffect, useRef } from "react";

export interface TraceEvent {
  event: string;
  agent: string;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "bg-purple-600",
  web_search: "bg-blue-600",
  document_rag: "bg-green-600",
  contract_analysis: "bg-amber-600",
  synthesis: "bg-rose-600",
};

const EVENT_ICONS: Record<string, string> = {
  PLAN: "📋",
  SEARCHING: "🔍",
  RAG_QUERY: "📄",
  ANALYZING: "⚙️",
  CORRECTING: "🔧",
  SYNTHESIZING: "✍️",
  COMPLETE: "✅",
};

export default function AgentTrace({ events }: { events: TraceEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
      {events.length === 0 && (
        <p className="text-gray-500 text-sm">Waiting for agent events...</p>
      )}
      {events.map((evt, i) => (
        <div
          key={i}
          className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-start gap-3"
        >
          <span className="text-lg">{EVENT_ICONS[evt.event] || "🔹"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${AGENT_COLORS[evt.agent] || "bg-gray-600"}`}
              >
                {evt.agent}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-gray-200">{evt.message}</p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
