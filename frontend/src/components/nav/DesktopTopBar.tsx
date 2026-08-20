import { WalletConnectButton } from "../common/WalletConnectButton";
import { NetworkSwitcher } from "../common/NetworkSwitcher";
import { NotificationsBell } from "../common/NotificationsBell";

// Sidebar carries primary nav on desktop — this slim bar alongside it carries
// network/wallet/notifications, which don't fit naturally into a vertical rail.
export function DesktopTopBar() {
  return (
    <header
      className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-2 border-b px-4 backdrop-blur md:flex"
      style={{
        borderColor: "var(--color-border-default)",
        background: "color-mix(in srgb, var(--color-canvas) 92%, transparent)",
      }}
    >
      <NetworkSwitcher />
      <NotificationsBell />
      <WalletConnectButton />
    </header>
  );
}
