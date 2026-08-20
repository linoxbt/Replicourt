import { useState } from "react";
import { NavLink } from "react-router-dom";
import { WalletConnectButton } from "../common/WalletConnectButton";
import { NetworkSwitcher } from "../common/NetworkSwitcher";
import { NotificationsBell } from "../common/NotificationsBell";

const navLinkClass = "px-2.5 py-1.5 text-sm transition-colors";

const links = [
  { to: "/registry", label: "Registry" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/claims/new", label: "Post claim" },
];

function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          onClick={onNavigate}
          className={({ isActive }) => `${navLinkClass} ${className ?? ""} ${isActive ? "font-semibold" : ""}`}
          style={({ isActive }) => ({
            color: isActive ? "var(--color-fg-default)" : "var(--color-fg-muted)",
            background: isActive ? "var(--color-canvas-inset)" : "transparent",
          })}
        >
          {l.label}
        </NavLink>
      ))}
    </>
  );
}

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur md:hidden"
      style={{
        borderColor: "var(--color-border-default)",
        background: "color-mix(in srgb, var(--color-canvas) 92%, transparent)",
      }}
    >
      <div className="flex h-14 items-center gap-6 px-4">
        <NavLink to="/" className="flex shrink-0 items-center gap-2">
          <svg width="22" height="24" viewBox="0 0 100 110" aria-hidden>
            <circle cx="50" cy="6" r="4" fill="var(--color-accent-emphasis)" />
            <polygon points="14,32 86,32 50,14" fill="var(--color-accent-fg)" />
            <rect x="22" y="68" width="14" height="22" fill="var(--color-accent-fg)" />
            <rect x="43" y="52" width="14" height="38" fill="var(--color-accent-fg)" />
            <rect x="64" y="38" width="14" height="52" fill="var(--color-accent-fg)" />
            <rect x="14" y="90" width="72" height="5" rx="1" fill="var(--color-accent-fg)" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight">
            Repli<span style={{ color: "var(--color-accent-fg)" }}>Court</span>
          </span>
        </NavLink>

        <div className="ml-auto flex items-center gap-2">
          <NotificationsBell />
          <WalletConnectButton />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center border"
            style={{ borderColor: "var(--color-border-default)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none">
              {mobileOpen ? (
                <path
                  d="M3 3L13 13M13 3L3 13"
                  stroke="var(--color-fg-default)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M2 4H14M2 8H14M2 12H14"
                  stroke="var(--color-fg-default)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
        >
          <div className="flex flex-col gap-1">
            <NavLinks onNavigate={() => setMobileOpen(false)} className="w-full" />
          </div>
          <div className="mt-3">
            <NetworkSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
