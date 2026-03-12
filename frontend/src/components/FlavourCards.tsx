export interface Flavour {
  label: string;
  description: string;
  selected_contracts: number[];
  total_cost: number;
  delivery_days: number;
  risk_score: number;
  savings_vs_current: number;
}

interface Props {
  flavours: Record<string, Flavour>;
  selected: string | null;
  onSelect: (key: string) => void;
}

const FLAVOUR_ACCENTS: Record<string, string> = {
  cheapest: "border-green-500",
  lowest_risk: "border-blue-500",
  fastest: "border-amber-500",
};

const FLAVOUR_ICONS: Record<string, string> = {
  cheapest: "💰",
  lowest_risk: "🛡️",
  fastest: "⚡",
};

export default function FlavourCards({ flavours, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(flavours).map(([key, f]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`text-left bg-gray-800 border-2 rounded-xl p-5 transition-all cursor-pointer hover:bg-gray-750 ${
            selected === key
              ? `${FLAVOUR_ACCENTS[key] || "border-white"} ring-2 ring-offset-2 ring-offset-gray-900 ${FLAVOUR_ACCENTS[key]?.replace("border-", "ring-") || "ring-white"}`
              : "border-gray-700"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{FLAVOUR_ICONS[key] || "📦"}</span>
            <h3 className="text-lg font-semibold text-white">{f.label}</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">{f.description}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Cost</span>
              <span className="text-white font-medium">
                €{f.total_cost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Delivery</span>
              <span className="text-white font-medium">
                {f.delivery_days} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Score</span>
              <span className="text-white font-medium">
                {(f.risk_score * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Savings</span>
              <span className="text-green-400 font-medium">
                €{f.savings_vs_current.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {f.selected_contracts.length} contract(s) selected
          </div>
        </button>
      ))}
    </div>
  );
}
