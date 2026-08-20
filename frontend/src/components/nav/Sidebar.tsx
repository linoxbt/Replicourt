import { useState } from "react";
import { NavLink } from "react-router-dom";

const COLLAPSE_KEY = "replicourt.sidebar.collapsed";

const links = [
  {
    to: "/registry",
    label: "Registry",
    icon: (
      <path
        d="M2.5 3.5h11M2.5 8h11M2.5 12.5h7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ),
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    icon: (
      <path
        d="M4 13.5V9M8 13.5V4M12 13.5v-6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ),
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <>
        <circle cx="8" cy="5.2" r="2.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.7 13.5c0-2.7 2.4-4.4 5.3-4.4s5.3 1.7 5.3 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: "/claims/new",
    label: "Post claim",
    icon: <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-150 md:flex"
      style={{ width: collapsed ? "4.25rem" : "14rem", borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4" style={{ borderColor: "var(--color-border-default)" }}>
        <NavLink to="/" className="flex shrink-0 items-center gap-2 overflow-hidden">
          <svg width="22" height="24" viewBox="0 0 100 110" aria-hidden className="shrink-0">
            <circle cx="50" cy="6" r="4" fill="var(--color-accent-emphasis)" />
            <polygon points="14,32 86,32 50,14" fill="var(--color-accent-fg)" />
            <rect x="22" y="68" width="14" height="22" fill="var(--color-accent-fg)" />
            <rect x="43" y="52" width="14" height="38" fill="var(--color-accent-fg)" />
            <rect x="64" y="38" width="14" height="52" fill="var(--color-accent-fg)" />
            <rect x="14" y="90" width="72" height="5" rx="1" fill="var(--color-accent-fg)" />
          </svg>
          {!collapsed && (
            <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight">
              Repli<span style={{ color: "var(--color-accent-fg)" }}>Court</span>
            </span>
          )}
        </NavLink>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            title={collapsed ? l.label : undefined}
            className="flex items-center gap-3 px-2.5 py-2 text-sm transition-colors"
            style={({ isActive }) => ({
              color: isActive ? "var(--color-fg-default)" : "var(--color-fg-muted)",
              background: isActive ? "var(--color-canvas-inset)" : "transparent",
              fontWeight: isActive ? 600 : 400,
            })}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
              {l.icon}
            </svg>
            {!collapsed && <span className="truncate">{l.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center gap-2 border-t px-4 py-3 text-xs"
        style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-muted)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          style={{ transform: collapsed ? "rotate(180deg)" : "none" }}
        >
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
