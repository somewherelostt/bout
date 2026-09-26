import { AlertTriangle, Check, FileWarning, HardDrive, KeyRound, Network, ShieldCheck } from "lucide-react";
import type { WorkspaceSnapshot } from "../types";

export function SecurityPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const controls = [
    ["Candidate equality guard", "Identical candidate hashes are rejected before a battle directory is committed."],
    ["Atomic local writes", "Battle files are assembled in a temporary directory and renamed into place only after every artifact write succeeds."],
    ["Transactional metadata", "Structured battle, bounty, publication, submission-sync, verdict, and report metadata is committed through SQLite transactions."],
    ["Split visibility", "Reviewer material and creator-only identity state live in separate directories."],
    ["Server-side wallet boundary", "The browser receives connection status, never the configured private key."],
    ["Explicit money gate", "Publishing requires a dedicated CLI command and an exact real-funds confirmation phrase."],
  ];

  return (
    <section className="interior-page report-page">
      <header className="report-hero">
        <div>
          <span className="eyebrow">SECURITY POSTURE</span>
          <h1>Controls we have. Limits we can name.</h1>
          <p>This is an implementation inventory for the local workspace—not a generic promise of safety.</p>
        </div>
        <div className={`security-state ${snapshot.liveStatus}`}><ShieldCheck size={20} /><span>Gibwork connection</span><strong>{snapshot.liveStatus}</strong></div>
      </header>

      <div className="security-grid">
        <article className="security-feature">
          <HardDrive size={22} />
          <span className="eyebrow">LOCAL TRUST BOUNDARY</span>
          <h2>State remains under your workspace.</h2>
          <p>Bout uses a local SQLite index plus readable artifacts. There is no hosted database and no seeded browser cache.</p>
          <strong>{snapshot.storage.scope} · {snapshot.storage.persistence}</strong>
        </article>
        <article className="security-feature">
          <KeyRound size={22} />
          <span className="eyebrow">CREDENTIAL BOUNDARY</span>
          <h2>Secrets do not cross into the browser.</h2>
          <p>Wallet credentials are consumed only by the local server process. CLI publishing reads an explicit keypair file and never persists its contents.</p>
        </article>
      </div>

      <section className="control-register">
        <div className="section-intro"><span className="eyebrow">CONTROL REGISTER</span><h2>Properties enforced by code.</h2></div>
        {controls.map(([title, copy]) => <div key={title}><Check size={16} /><strong>{title}</strong><span>{copy}</span></div>)}
      </section>

      <section className="known-limits">
        <div><AlertTriangle size={20} /><span><strong>Known limitations</strong><small>These are current product boundaries, not hidden roadmap claims.</small></span></div>
        <ul>
          <li><FileWarning size={15} /> Reviewer-facing files are publishable; Bout does not redact secrets from supplied patches.</li>
          <li><Network size={15} /> Live Gibwork discovery requires a configured key and network access.</li>
          <li><AlertTriangle size={15} /> Stage publishing uses real mainnet USDC.</li>
          <li><FileWarning size={15} /> Patch execution and sandbox isolation are not implemented yet.</li>
        </ul>
      </section>
    </section>
  );
}
