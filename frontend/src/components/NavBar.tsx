import { Link, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/optimize", label: "Optimize" },
];

export default function NavBar() {
  const location = useLocation();

  const isRunPage =
    location.pathname.startsWith("/run/") ||
    location.pathname.startsWith("/review/") ||
    location.pathname.startsWith("/report/");

  return (
    <nav className="sticky top-0 z-40 px-4 py-4 sm:px-6">
      <div className="glass-panel panel-outline mx-auto flex max-w-7xl items-center justify-between rounded-[28px] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link to="/" className="no-underline">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-fuchsia-200/70">
                SolGrid Technologies
              </p>
              <p className="text-lg font-semibold text-white">SupplyMind</p>
            </div>
          </Link>

          {!isRunPage && (
            <div className="hidden items-center gap-1 rounded-full border border-white/8 bg-slate-950/35 p-1 md:flex">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.to === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium no-underline transition-colors ${
                      isActive
                        ? "bg-fuchsia-300 text-slate-950"
                        : "text-gray-400 hover:bg-white/6 hover:text-gray-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="rounded-full border border-fuchsia-200/20 bg-fuchsia-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-fuchsia-100">
            Procurement Intelligence Demo
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-200 to-violet-400 text-sm font-bold text-slate-950">
              SG
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-100">SolGrid Technologies</span>
              <span className="ml-2 text-xs text-gray-400">Solar Inverters & Battery Storage</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
