import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AgentRunPage from "./pages/AgentRunPage";
import HITLPage from "./pages/HITLPage";
import ReportPage from "./pages/ReportPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3">
        <Link to="/" className="text-lg font-bold text-purple-400 hover:text-purple-300 no-underline">
          SupplyMind
        </Link>
      </nav>
      <main className="px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/run/:jobId" element={<AgentRunPage />} />
          <Route path="/review/:jobId" element={<HITLPage />} />
          <Route path="/report/:jobId" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  );
}
