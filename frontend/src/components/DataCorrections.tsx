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
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">
        🔧 Data Corrections
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 pr-4">Contract</th>
              <th className="text-left py-2 pr-4">Field</th>
              <th className="text-right py-2 pr-4">Current</th>
              <th className="text-right py-2 pr-4">Market</th>
              <th className="text-right py-2 pr-4">Delta</th>
              <th className="text-left py-2 pr-4">Severity</th>
              <th className="text-left py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {corrections.map((c, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                <td className="py-2 pr-4 text-gray-200">#{c.contract_id}</td>
                <td className="py-2 pr-4 text-gray-300">{c.field}</td>
                <td className="py-2 pr-4 text-right text-gray-200">
                  €{c.current_value.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right text-gray-200">
                  €{c.market_value.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right text-red-400 font-medium">
                  +{c.delta_pct}%
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[c.severity] || ""}`}
                  >
                    {c.severity}
                  </span>
                </td>
                <td className="py-2 text-gray-300 capitalize">
                  {c.recommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
