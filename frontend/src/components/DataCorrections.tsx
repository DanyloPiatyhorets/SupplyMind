export interface Correction {
  contract_id: number;
  field: string;
  current_value: number;
  market_value: number;
  delta_pct: number;
  severity: string;
  recommendation: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-900/30",
  medium: "text-amber-400 bg-amber-900/30",
  low: "text-green-400 bg-green-900/30",
};

export default function DataCorrections({
  corrections,
}: {
  corrections: Correction[];
}) {
  if (corrections.length === 0) return null;

  return (
    <div className="glass-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="section-label">Data Integrity Layer</p>
          <h3 className="mt-3 text-xl font-semibold text-white">Pricing Corrections</h3>
          <p className="mt-1 text-sm text-slate-400">
            Owned contracts are benchmarked against tracked market offers to expose stale pricing and renegotiation opportunities.
          </p>
        </div>
        <div className="hidden rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3 text-right sm:block">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Flags Raised</p>
          <p className="mt-1 text-2xl font-semibold text-white">{corrections.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-slate-500">
              <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.18em]">Contract</th>
              <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.18em]">Field</th>
              <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-[0.18em]">Current</th>
              <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-[0.18em]">Market</th>
              <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-[0.18em]">Delta</th>
              <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.18em]">Severity</th>
              <th className="py-3 text-left text-xs font-medium uppercase tracking-[0.18em]">Action</th>
            </tr>
          </thead>
          <tbody>
            {corrections.map((c, i) => (
              <tr key={i} className="border-b border-white/6">
                <td className="py-3 pr-4 text-slate-100">#{c.contract_id}</td>
                <td className="py-3 pr-4 text-slate-300">{c.field}</td>
                <td className="py-3 pr-4 text-right text-slate-200">€{c.current_value.toLocaleString()}</td>
                <td className="py-3 pr-4 text-right text-slate-200">€{c.market_value.toLocaleString()}</td>
                <td className="py-3 pr-4 text-right font-medium text-rose-300">
                  {c.delta_pct > 0 ? "+" : ""}
                  {c.delta_pct}%
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-1 text-xs ${SEVERITY_COLORS[c.severity] || ""}`}>
                    {c.severity}
                  </span>
                </td>
                <td className="py-3 capitalize text-slate-300">{c.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
