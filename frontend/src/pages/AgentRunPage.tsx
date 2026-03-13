import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AgentTrace from "../components/AgentTrace";
import type { TraceEvent } from "../components/AgentTrace";
import { traceStream } from "../api/client";

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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Agent Run</h2>
          <p className="text-sm text-gray-400 mt-1">Job: {jobId}</p>
        </div>
        {!done && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-green-400">Running</span>
          </div>
        )}
      </div>

      <AgentTrace events={events} />

      {done && (
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(`/review/${jobId}`)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Review Results
          </button>
        </div>
      )}
    </div>
  );
}
