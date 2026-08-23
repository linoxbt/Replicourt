import { Link, Route, Routes, useLocation } from "react-router-dom";
import { TopNav } from "./components/nav/TopNav";
import { Sidebar } from "./components/nav/Sidebar";
import { DesktopTopBar } from "./components/nav/DesktopTopBar";
import { WalletConnectButton } from "./components/common/WalletConnectButton";
import { Landing } from "./pages/Landing";
import { ClaimRegistry } from "./pages/ClaimRegistry";
import { Dashboard } from "./pages/Dashboard";
import { PostClaim } from "./pages/PostClaim";
import { ClaimDetail } from "./pages/ClaimDetail";
import { ChallengeFlow } from "./pages/ChallengeFlow";
import { Escalation } from "./pages/Escalation";
import { Leaderboard } from "./pages/Leaderboard";
import { NotFound } from "./pages/NotFound";

// The landing page is a full-bleed marketing page, not a dashboard screen —
// it gets a slim dark top bar instead of the app's sidebar chrome.
function LandingTopBar() {
  return (
    <header
      className="sticky top-0 z-30 hidden h-14 items-center gap-8 border-b px-4 backdrop-blur md:flex"
      style={{ borderColor: "#1f2937", background: "rgba(5,7,10,0.85)" }}
    >
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <svg width="22" height="24" viewBox="0 0 100 110" aria-hidden>
          <circle cx="50" cy="6" r="4" fill="#2dd4bf" />
          <polygon points="14,32 86,32 50,14" fill="#2dd4bf" />
          <rect x="22" y="68" width="14" height="22" fill="#2dd4bf" />
          <rect x="43" y="52" width="14" height="38" fill="#2dd4bf" />
          <rect x="64" y="38" width="14" height="52" fill="#2dd4bf" />
          <rect x="14" y="90" width="72" height="5" rx="1" fill="#2dd4bf" />
        </svg>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Repli<span style={{ color: "#2dd4bf" }}>Court</span>
        </span>
      </Link>
      <nav className="flex items-center gap-5 text-sm" style={{ color: "#94a3b3" }}>
        <Link to="/registry" className="hover:text-white">
          Registry
        </Link>
        <Link to="/leaderboard" className="hover:text-white">
          Leaderboard
        </Link>
      </nav>
      <div className="ml-auto">
        <WalletConnectButton />
      </div>
    </header>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <div className="flex min-h-full">
      {/* Desktop: collapsible sidebar carries primary nav, a slim top bar carries
          network/wallet — except on the landing page, which is a full-bleed
          marketing page and gets its own minimal dark top bar instead. Mobile:
          a single top bar with a hamburger drawer, on every route. */}
      {!isLanding && <Sidebar />}
      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <TopNav />
        {isLanding ? <LandingTopBar /> : <DesktopTopBar />}
        {/* Each page owns its own width/padding — the landing page is full-bleed,
            app pages use a consistent max-w-6xl content column. min-w-0 keeps
            this flex item shrinkable — without it, wide content (like the
            landing page's scrolling ticker) forces the whole layout wider than
            the viewport instead of being clipped by its own overflow-hidden. */}
        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/registry" element={<ClaimRegistry />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/claims/new" element={<PostClaim />} />
            <Route path="/claims/:claimId" element={<ClaimDetail />} />
            <Route path="/claims/:claimId/challenge" element={<ChallengeFlow />} />
            <Route path="/claims/:claimId/escalate" element={<Escalation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer
          className="border-t px-4 py-4 text-center text-xs"
          style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-subtle)" }}
        >
          Powered by GenLayer — Intelligent Contracts
        </footer>
      </div>
    </div>
  );
}
