import { Binary, EyeOff, FileKey2, Fingerprint, Scale, WalletCards } from "lucide-react";
import type { WorkspaceSnapshot } from "../types";

const steps = [
  {
    number: "01",
    icon: Fingerprint,
    title: "Normalize and fingerprint both candidates",
    copy: "Bout reads the two supplied Git patches, rejects identical SHA-256 digests, and records the task and candidate hashes in a public manifest.",
    proof: "src/core/battle.ts · review/manifest.json",
  },
  {
    number: "02",
    icon: EyeOff,
    title: "Assign A and B with cryptographic randomness",
    copy: "The reviewer bundle contains neutral filenames only. The source-to-label mapping is written separately under private state and is never used to build the bounty draft.",
    proof: "randomInt(2) · private/identity-map.json",
  },
  {
    number: "03",
    icon: Scale,
    title: "Judge against one shared contract",
    copy: "Both patches receive the same task, verification command, and review rubric. A verdict can select A, B, a genuine tie, or both failed.",
    proof: "correctness · security · maintainability · evidence",
  },
  {
    number: "04",
    icon: WalletCards,
    title: "Separate preparation from publication",
    copy: "Draft creation is offline and moves no funds. Publishing is a separate CLI action with an exact confirmation phrase because the stage environment uses real mainnet USDC.",
    proof: "bout bounty prepare · bout bounty publish",
  },
];

export function MethodPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <section className="interior-page report-page">
      <header className="report-hero">
        <div>
          <span className="eyebrow">METHOD · IMPLEMENTED, NOT ASPIRATIONAL</span>
          <h1>How a Bout decision is produced.</h1>
          <p>Every claim below maps to a file, an artifact, or a guard in the running repository.</p>
        </div>
        <div className="report-stamp"><Binary size={18} /><span>Schema</span><strong>v1</strong><small>snapshot {formatTime(snapshot.generatedAt)}</small></div>
      </header>

      <div className="method-list">
        {steps.map(({ number, icon: Icon, title, copy, proof }) => (
          <article className="method-row" key={number}>
            <span className="method-number">{number}</span>
            <Icon size={20} strokeWidth={1.6} />
            <div><h2>{title}</h2><p>{copy}</p><code>{proof}</code></div>
          </article>
        ))}
      </div>

      <section className="definition-section">
        <div className="section-intro"><span className="eyebrow">STATE DEFINITIONS</span><h2>The labels mean exactly one thing.</h2></div>
        <div className="definition-table">
          <div><strong>Draft</strong><span>A local anonymous bundle exists; no bounty payload has been prepared.</span></div>
          <div><strong>Prepared</strong><span>A validated bounty-draft.json exists locally. No network request or transfer is implied.</span></div>
          <div><strong>Published</strong><span>A private publication receipt exists after Gibwork returned a task identifier.</span></div>
          <div><strong>Complete</strong><span>A structured verdict.json exists in the reviewer-facing bundle.</span></div>
        </div>
      </section>

      <aside className="method-note"><FileKey2 size={19} /><span><strong>What this UI does not establish.</strong> A prepared pool is a declared draft amount, not proof of escrow. A saved verdict is a reviewer record, not an on-chain payout receipt. Verification remains marked <code>not_run</code> until execution capture is implemented.</span></aside>
    </section>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
