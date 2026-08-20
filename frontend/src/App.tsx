import { Route, Routes } from "react-router-dom";
import { TopNav } from "./components/nav/TopNav";
import { Landing } from "./pages/Landing";
import { ClaimRegistry } from "./pages/ClaimRegistry";
import { Dashboard } from "./pages/Dashboard";
import { PostClaim } from "./pages/PostClaim";
import { ClaimDetail } from "./pages/ClaimDetail";
import { ChallengeFlow } from "./pages/ChallengeFlow";
import { Escalation } from "./pages/Escalation";

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      {/* Each page owns its own width/padding — the landing page is full-bleed,
          app pages use a consistent max-w-6xl content column. */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/registry" element={<ClaimRegistry />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/claims/new" element={<PostClaim />} />
          <Route path="/claims/:claimId" element={<ClaimDetail />} />
          <Route path="/claims/:claimId/challenge" element={<ChallengeFlow />} />
          <Route path="/claims/:claimId/escalate" element={<Escalation />} />
        </Routes>
      </main>
      <footer
        className="border-t px-4 py-4 text-center text-xs"
        style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-subtle)" }}
      >
        Powered by GenLayer — Intelligent Contracts
      </footer>
    </div>
  );
}
