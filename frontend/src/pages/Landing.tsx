import { Link } from "react-router-dom";

const steps = [
  {
    n: "01",
    title: "Post a claim",
    body: "Stake GEN on a specific, checkable empirical claim — an effect size, a study design, a source citation.",
  },
  {
    n: "02",
    title: "Anyone can challenge it",
    body: "A challenger stakes GEN against the claim with counter-evidence: a failed replication, a contradicting study, a methodology flaw.",
  },
  {
    n: "03",
    title: "Validators re-derive, live",
    body: "GenLayer validators fetch the evidence and independently re-derive the confidence delta — not just agree that an answer sounds plausible.",
  },
  {
    n: "04",
    title: "Confidence updates, on the record",
    body: "The claim's state is a running score with a full timestamped evidence trail — not a single overwritten verdict.",
  },
];

export function Landing() {
  return (
    <div>
      <section
        className="border-b px-4 py-16 sm:py-24"
        style={{ borderColor: "var(--color-border-default)" }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mx-auto mb-6 inline-flex items-center gap-1.5 border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-muted)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-accent-fg)" }} />
            Built on GenLayer — Intelligent Contracts
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            The scientific record is a PDF that
            <br />
            <span style={{ color: "var(--color-accent-fg)" }}>never updates.</span> This one does.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base" style={{ color: "var(--color-fg-muted)" }}>
            RepliCourt is a staked, continuously-updating registry of empirical claims. Confidence moves
            live as evidence arrives, backed by real GenLayer validator consensus — not a one-time verdict,
            and not just academic reputation on the line.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/registry"
              className="px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: "var(--color-accent-emphasis)" }}
            >
              Explore the registry
            </Link>
            <Link
              to="/claims/new"
              className="border px-5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-default)" }}
            >
              Post a claim
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-fg-muted)" }}>
          How it works
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="border p-5" style={{ borderColor: "var(--color-border-default)" }}>
              <span className="font-mono text-xs" style={{ color: "var(--color-accent-fg)" }}>
                {s.n}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-fg-muted)" }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="border-y px-4 py-16"
        style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas-inset)" }}
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-fg-muted)" }}>
            Two ways evidence gets weighed
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="border p-6" style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}>
              <span
                className="inline-flex border-l-2 px-2.5 py-1 text-xs font-medium"
                style={{ color: "var(--color-accent-fg)", background: "var(--color-accent-subtle)", borderLeftColor: "var(--color-accent-fg)" }}
              >
                Comparative
              </span>
              <h3 className="mt-3 text-base font-semibold">Numeric effect sizes</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
                Every validator independently re-derives the same confidence delta from the same
                counter-evidence and must converge within a margin — not just agree a plausible number
                was given.
              </p>
            </div>
            <div className="border p-6" style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}>
              <span
                className="inline-flex border-l-2 px-2.5 py-1 text-xs font-medium"
                style={{ color: "var(--color-fg-muted)", background: "var(--color-canvas-inset)", borderLeftColor: "var(--color-fg-muted)" }}
              >
                Non-comparative
              </span>
              <h3 className="mt-3 text-base font-semibold">Methodology critiques</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
                Grading whether a critique is well-founded is a judgment call against stated criteria —
                validators judge the reasoning against the source text, not re-derive a number.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Money behind the correction, not just reputation.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm" style={{ color: "var(--color-fg-muted)" }}>
          A resolved challenge slashes the losing side's stake and rewards the winner — the incentive to
          chase down a bad claim, or defend a good one, is real.
        </p>
        <div className="mt-6">
          <Link
            to="/registry"
            className="px-5 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--color-accent-emphasis)" }}
          >
            See it live
          </Link>
        </div>
      </section>
    </div>
  );
}
