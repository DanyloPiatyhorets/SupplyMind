import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { runAgent } from "../api/client";
import PDFUpload from "../components/PDFUpload";

export default function HomePage() {
  const [goal, setGoal] = useState("");
  const [docIds, setDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRun() {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      const { job_id } = await runAgent(goal, docIds);
      navigate(`/run/${job_id}`);
    } catch {
      console.error("Failed to start agent");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">SupplyMind</h1>
        <p className="text-gray-400 text-lg">
          Agentic Procurement Intelligence
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Procurement Goal
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Find the cheapest EU steel supplier for Q3 delivery"
            rows={4}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Documents (optional)
          </label>
          <PDFUpload
            onUploaded={(docId) => setDocIds((prev) => [...prev, docId])}
          />
        </div>

        <button
          onClick={handleRun}
          disabled={!goal.trim() || loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors cursor-pointer"
        >
          {loading ? "Starting Agent..." : "Run Agent"}
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Try: "Find cheapest EU steel supplier for Q3 delivery" or "Minimize
          supply chain risk for aluminium imports"
        </p>
      </div>
    </div>
  );
}
