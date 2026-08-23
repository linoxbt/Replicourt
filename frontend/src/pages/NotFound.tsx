import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
        There's nothing at this address.
      </p>
      <Link
        to="/registry"
        className="mt-5 px-4 py-2 text-sm font-medium text-white"
        style={{ background: "var(--color-accent-emphasis)" }}
      >
        Back to registry
      </Link>
    </div>
  );
}
