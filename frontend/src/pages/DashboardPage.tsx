import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getContracts, getProducts } from "../api/client";

interface Product {
  id: number;
  name: string;
  unit: string;
}

interface Contract {
  id: number;
  product_id: number;
  company_id: number;
  company_name: string;
  product_name: string;
  direction: string;
  source: string;
  unit_price: number;
  volume: number;
  currency?: string;
  delivery_days: number;
  credibility_score: number;
  deadline: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProducts(), getContracts()])
      .then(([p, c]) => {
        setProducts(p);
        setContracts(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const owned = contracts.filter((c) => c.source === "OWNED");
  const market = contracts.filter((c) => c.source === "MARKET");
  const inbound = owned.filter((c) => c.direction === "IN");
  const outbound = owned.filter((c) => c.direction === "OUT");

  const supplyByProduct = products.map((p) => {
    const productContracts = inbound.filter((c) => c.product_id === p.id);
    const marketOffers = market.filter((c) => c.product_id === p.id);
    const avgOwned =
      productContracts.length > 0
        ? productContracts.reduce((s, c) => s + c.unit_price, 0) / productContracts.length
        : 0;
    const avgMarket =
      marketOffers.length > 0
        ? marketOffers.reduce((s, c) => s + c.unit_price, 0) / marketOffers.length
        : 0;
    const delta = avgOwned && avgMarket ? ((avgOwned - avgMarket) / avgMarket) * 100 : 0;

    return {
      product: p,
      contracts: productContracts,
      avgOwned,
      avgMarket,
      delta,
      totalVolume: productContracts.reduce((s, c) => s + c.volume, 0),
    };
  });

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-300 border-t-transparent" />
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hero-gradient glass-strong rounded-[32px] px-6 py-8 sm:px-8">
          <p className="section-label">System Overview</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">SolGrid Technologies</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
            SupplyMind monitors SolGrid&apos;s sourcing landscape for steel, aluminium, copper, lithium, and silicon. It frames procurement as a decision intelligence problem: benchmark current contracts, search the market, retrieve internal document context, and present options with traceable reasoning.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="status-pill text-sm">Working system</div>
            <div className="status-pill text-sm">AI-assisted procurement demo</div>
            <div className="status-pill text-sm">Internship application showcase</div>
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-6">
          <p className="section-label">Why This Is Distinct</p>
          <div className="mt-4 grid gap-3">
            <InsightCard title="Agent transparency" desc="A visible execution trace proves the system is planning, not just paraphrasing." />
            <InsightCard title="Grounded recommendations" desc="Strategies are tied to contracts, market offers, and uploaded source documents." />
            <InsightCard title="Human-in-the-loop" desc="Automation accelerates the analysis, while the final decision remains controlled by an operator." />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI label="Active Contracts" value={owned.length} />
        <KPI label="Supply Contracts" value={inbound.length} sub="inbound" />
        <KPI label="Sales Contracts" value={outbound.length} sub="outbound" />
        <KPI label="Market Offers" value={market.length} sub="tracked" />
      </div>

      <div>
        <div className="mb-4">
          <p className="section-label">Portfolio Snapshot</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Supply Chain Materials</h2>
          <p className="mt-1 text-sm text-slate-400">A quick view of current exposure versus tracked market pricing.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {supplyByProduct.map(({ product, contracts: cs, avgOwned, avgMarket, delta, totalVolume }) => (
            <div key={product.id} className="glass-panel rounded-[28px] p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                  <p className="text-xs text-gray-500">
                    {cs.length} active supplier{cs.length !== 1 ? "s" : ""} | {totalVolume.toLocaleString()} {product.unit}s
                  </p>
                </div>
                {delta > 5 && (
                  <span className="rounded-full bg-rose-400/12 px-2.5 py-1 text-xs font-medium text-rose-200">
                    {delta.toFixed(1)}% above market
                  </span>
                )}
                {delta > 0 && delta <= 5 && (
                  <span className="rounded-full bg-amber-300/12 px-2.5 py-1 text-xs font-medium text-amber-100">
                    {delta.toFixed(1)}% above market
                  </span>
                )}
                {delta <= 0 && avgMarket > 0 && (
                  <span className="rounded-full bg-emerald-300/12 px-2.5 py-1 text-xs font-medium text-emerald-100">
                    At market rate
                  </span>
                )}
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <MetricTile label="Avg Contract Price" value={`${avgOwned > 0 ? `EUR ${avgOwned.toFixed(0)}` : "—"}/${product.unit}`} />
                <MetricTile label="Avg Market Price" value={`${avgMarket > 0 ? `EUR ${avgMarket.toFixed(0)}` : "—"}/${product.unit}`} />
              </div>

              <div className="space-y-2">
                {cs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-2xl border border-white/6 bg-slate-950/35 px-3 py-2 text-xs"
                  >
                    <span className="text-gray-300">{c.company_name}</span>
                    <div className="flex items-center gap-3 text-gray-400">
                      <span>EUR {c.unit_price.toFixed(0)}/{product.unit}</span>
                      <span>{c.delivery_days}d</span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          c.credibility_score >= 0.9
                            ? "bg-green-400"
                            : c.credibility_score >= 0.8
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-label">Interactive Demo</p>
          <h3 className="mt-3 text-lg font-semibold text-white">Run the full SupplyMind workflow</h3>
          <p className="mt-1 text-sm text-slate-400">
            Move from dashboard context into a real multi-agent run and inspect the system end to end.
          </p>
        </div>
        <button
          onClick={() => navigate("/optimize")}
          className="cta-button cursor-pointer whitespace-nowrap px-6 py-3"
        >
          Open Optimization Studio
        </button>
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <p className="section-label">Source Data</p>
          <h2 className="mt-3 text-xl font-semibold text-white">All Contracts</h2>
        </div>
        <div className="glass-panel overflow-hidden rounded-[28px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-xs uppercase text-slate-500">
                <th className="px-4 py-3 text-left font-medium">Supplier</th>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Volume</th>
                <th className="px-4 py-3 text-right font-medium">Delivery</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {owned.map((c) => (
                <tr key={c.id} className="border-b border-white/6 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-gray-200">{c.company_name}</td>
                  <td className="px-4 py-2.5 text-gray-300">{c.product_name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        c.direction === "IN"
                          ? "bg-violet-900/30 text-violet-300"
                          : "bg-emerald-900/30 text-emerald-400"
                      }`}
                    >
                      {c.direction === "IN" ? "Supply" : "Sale"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-200">EUR {c.unit_price.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{c.volume.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{c.delivery_days}d</td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`${
                        c.credibility_score >= 0.9
                          ? "text-green-400"
                          : c.credibility_score >= 0.8
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {(c.credibility_score * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="metric-card px-4 py-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function InsightCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-400">{desc}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-medium text-white">{value}</p>
    </div>
  );
}
