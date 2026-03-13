import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import AgentRunPage from "./pages/AgentRunPage";
import HITLPage from "./pages/HITLPage";
import ReportPage from "./pages/ReportPage";

export default function App() {
  return (
    <div className="demo-shell min-h-screen text-gray-100">
      <NavBar />
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/optimize" element={<HomePage />} />
          <Route path="/run/:jobId" element={<AgentRunPage />} />
          <Route path="/review/:jobId" element={<HITLPage />} />
          <Route path="/report/:jobId" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  );
}
