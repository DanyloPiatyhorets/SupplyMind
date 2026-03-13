import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { runAgent, getProducts } from "../api/client";
import PDFUpload from "../components/PDFUpload";

interface Product {
  id: number;
  name: string;
  unit: string;
}

const EXAMPLE_GOALS: { label: string; goal: string }[] = [
  {
    label: "Cheapest Steel",
    goal: "Find the cheapest EU steel supplier for Q3 delivery with at least 500 metric tons capacity",
  },
  {
    label: "Copper Cost Savings",
    goal: "Analyze our copper cathode contracts for cost optimization — compare current suppliers against market rates",
  },
  {
    label: "Lithium Risk",
    goal: "Assess supply chain risk for lithium carbonate imports and recommend mitigation strategies",
  },
  {
    label: "Fastest Delivery",
    goal: "Find the fastest delivery option for an emergency silicon wafer order of 300 lots",
  },
];

export default function HomePage() {
  const [goal, setGoal] = useState("");
  const [docIds, setDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

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
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="hero-gradient glass-strong rounded-[32px] px-6 py-8 sm:px-8">
          <p className="section-label">Procurement Intelligence Studio</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Turn a plain-language sourcing goal into a boardroom-ready decision memo.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            SupplyMind combines agent planning, live market research, document RAG, and contract auditing in one guided workflow. It is both a working optimization system and a concise demonstration of how AI can support enterprise procurement with human oversight.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="status-pill text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300" />
              Multi-agent pipeline
            </div>
            <div className="status-pill text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              Human approval gate
            </div>
            <div className="status-pill text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              Audit-ready reasoning trace
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-6">
          <p className="section-label">Why It Matters</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
            <InfoTile
              title="Enterprise-ready reasoning"
              desc="The system shows the planning process instead of hiding it behind a single answer box."
            />
            <InfoTile
              title="Cross-evidence synthesis"
              desc="Live market signals, internal contracts, and uploaded reports are merged into one recommendation."
            />
            <InfoTile
              title="Demo-friendly, grounded UX"
              desc="Every step is visible, explainable, and ready for a reviewer to validate."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[32px] p-6 sm:p-7">
          <p className="section-label">Launch Analysis</p>
          <h2 className="mt-4 text-2xl font-semibold text-white">Describe the procurement objective</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Start with a sourcing goal, attach any briefing PDFs, and the system will generate three decision variants for SolGrid Technologies.
          </p>

          {products.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                Active materials tracked in the system
              </p>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border border-white/8 bg-slate-950/35 px-3 py-1.5 text-sm text-slate-200"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Procurement Goal
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what you want to optimize: cost, delivery, resilience, or a specific material."
                rows={5}
                className="min-h-[150px] w-full resize-none rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-4 text-white placeholder:text-slate-500 focus:border-fuchsia-200/30 focus:outline-none"
              />
            </div>

            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-500">Example prompts</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_GOALS.map((eg) => (
                  <button
                    key={eg.label}
                    onClick={() => setGoal(eg.goal)}
                    className="ghost-button cursor-pointer px-3 py-2 text-xs"
                  >
                    {eg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-slate-950/30 p-4">
              <label className="block text-sm font-medium text-slate-300">
                Optional document context
                <span className="ml-1 font-normal text-slate-500">supplier brochures, market reports, RFQs</span>
              </label>
              <div className="mt-3">
                <PDFUpload onUploaded={(docId) => setDocIds((prev) => [...prev, docId])} />
              </div>
              {docIds.length > 0 && (
                <p className="mt-3 text-xs text-emerald-200">
                  {docIds.length} document{docIds.length > 1 ? "s" : ""} attached to this run
                </p>
              )}
            </div>

            <button
              onClick={handleRun}
              disabled={!goal.trim() || loading}
              className="cta-button w-full cursor-pointer px-6 py-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Starting agent pipeline..." : "Run SupplyMind Analysis"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[32px] p-6">
            <p className="section-label">Guided Flow</p>
            <div className="mt-5 grid gap-4">
              <Step
                num={1}
                title="Goal Decomposition"
                desc="The orchestrator turns the request into targeted research questions."
              />
              <Step
                num={2}
                title="Parallel Evidence Gathering"
                desc="Market search, document retrieval, and contract analysis run at the same time."
              />
              <Step
                num={3}
                title="Human Review & Approval"
                desc="The system proposes options, but a person makes the final call."
              />
            </div>
          </div>

          <div className="glass-panel rounded-[32px] p-6">
            <p className="section-label">What This Demonstrates</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                A tangible multi-agent architecture instead of a single chat output.
              </li>
              <li className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                A practical AI use case with measurable business value: savings, speed, and risk reduction.
              </li>
              <li className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                A polished interface that explains the system while users interact with it.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-slate-950/30 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-300/12 text-sm font-bold text-fuchsia-100">
          {num}
        </div>
        <div>
          <h4 className="mb-1 text-sm font-medium text-gray-200">{title}</h4>
          <p className="text-sm leading-6 text-slate-400">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-slate-400">{desc}</p>
    </div>
  );
}
