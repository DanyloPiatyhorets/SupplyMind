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
  cheapest: "from-violet-300/28 to-fuchsia-500/8 border-violet-300/40",
  lowest_risk: "from-purple-300/28 to-indigo-400/8 border-purple-300/40",
  fastest: "from-amber-300/30 to-orange-400/8 border-amber-300/40",
};

const FLAVOUR_ICONS: Record<string, string> = {
  cheapest: "Cost",
  lowest_risk: "Risk",
  fastest: "Speed",
};

export default function FlavourCards({ flavours, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Object.entries(flavours).map(([key, f]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`cursor-pointer rounded-[28px] border bg-gradient-to-br p-5 text-left transition-all ${
            FLAVOUR_ACCENTS[key] || "from-white/5 to-transparent border-white/10"
          } ${
            selected === key
              ? "shadow-[0_0_0_1px_rgba(186,230,253,0.5),0_22px_50px_rgba(8,145,178,0.18)] -translate-y-1"
              : "border-white/10 bg-slate-950/45 hover:-translate-y-1 hover:border-fuchsia-200/20"
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                {FLAVOUR_ICONS[key] || "Variant"}
              </span>
              <h3 className="mt-3 text-xl font-semibold text-white">{f.label}</h3>
            </div>
            {selected === key && (
              <span className="rounded-full bg-fuchsia-300 px-2.5 py-1 text-xs font-semibold text-slate-950">
                Selected
              </span>
            )}
          </div>

          <p className="mb-5 text-sm leading-6 text-slate-400">{f.description}</p>

          <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Total Cost" value={`€${f.total_cost.toLocaleString()}`} />
            <Metric label="Delivery" value={`${f.delivery_days} days`} />
            <Metric label="Risk Score" value={`${(f.risk_score * 100).toFixed(0)}%`} />
            <Metric label="Savings" value={`€${f.savings_vs_current.toLocaleString()}`} valueClassName="text-emerald-300" />
          </div>

          <div className="rounded-2xl border border-dashed border-white/8 px-3 py-3 text-xs text-slate-400">
            Uses <span className="font-semibold text-slate-200">{f.selected_contracts.length}</span> contract{f.selected_contracts.length !== 1 ? "s" : ""} to fulfill the strategy.
          </div>
        </button>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <span className={`mt-2 block text-lg font-semibold text-white ${valueClassName || ""}`}>
        {value}
      </span>
    </div>
  );
}
