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

const tickerItems = [
  "REGISTRY · LIVE",
  "VALIDATORS · GENLAYER CONSENSUS · ONLINE",
  "EVIDENCE · FETCHED FROM THE OPEN WEB",
  "STAKES · SLASHED ON RESOLUTION",
  "COMPARATIVE EP · NUMERIC RE-DERIVATION",
  "NON-COMPARATIVE EP · SOURCE-GRADED CRITIQUE",
  "APPEALS · REAL PROTOCOL ESCALATION",
];

function Ticker() {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div
      className="overflow-hidden border-y"
      style={{ borderColor: "#1f2937", background: "#05070a" }}
      aria-hidden="true"
    >
      <div className="ticker-track flex w-max items-center gap-8 py-3">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap font-mono text-xs tracking-wide" style={{ color: "#8b98a8" }}>
            <span className="h-1.5 w-1.5" style={{ background: "#2dd4bf" }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div>
      {/* Dark, asymmetric hero — deliberately not viewport-centered. */}
      <section className="relative overflow-hidden" style={{ background: "#05070a" }}>
        <div
          className="pointer-events-none absolute -left-32 top-0 h-[560px] w-[560px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #0f6a6a, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-1/3 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #2dd4bf, transparent 70%)" }}
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-16 sm:py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
            <img src="/hero-court.svg" alt="" aria-hidden className="w-full max-w-[380px] opacity-90" />
          </div>

          <div className="order-1 lg:order-2">
            <div className="mb-5 flex items-center gap-1.5 font-mono text-xs font-medium tracking-wide" style={{ color: "#2dd4bf" }}>
              A LIVE DOCKET FOR EMPIRICAL CLAIMS
              <span aria-hidden>›</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              The scientific record
              <br />
              is a PDF that <span style={{ color: "#2dd4bf" }}>never updates.</span>
              <br />
              This one does.
            </h1>
            <p className="mt-5 max-w-lg text-base" style={{ color: "#94a3b3" }}>
              RepliCourt is a staked, continuously-updating registry of empirical claims. Confidence
              moves live as evidence arrives, backed by real GenLayer validator consensus — not a
              one-time verdict, and not just academic reputation on the line.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/registry" className="px-5 py-2.5 text-sm font-medium" style={{ background: "#2dd4bf", color: "#05070a" }}>
                Explore the registry
              </Link>
              <Link
                to="/claims/new"
                className="border px-5 py-2.5 text-sm font-medium text-white"
                style={{ borderColor: "#2c3540" }}
              >
                Post a claim
              </Link>
            </div>
          </div>
        </div>

        <Ticker />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-fg-muted)" }}>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-fg-muted)" }}>
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

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-lg text-2xl font-semibold tracking-tight">
            Money behind the correction, not just reputation.
          </h2>
          <p className="mt-3 max-w-lg text-sm" style={{ color: "var(--color-fg-muted)" }}>
            A resolved challenge slashes the losing side's stake and rewards the winner — the incentive
            to chase down a bad claim, or defend a good one, is real.
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
        </div>
      </section>
    </div>
  );
}
