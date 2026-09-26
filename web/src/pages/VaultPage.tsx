import {
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  KeyRound,
  Link2,
  LockKeyhole,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

export function VaultPage() {
  const [copied, setCopied] = useState(false);

  return (
    <section className="interior-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">PRIVATE BY DEFAULT</span>
          <h1>Vault</h1>
          <p>Connections and review context are encrypted locally for your Bout workspace.</p>
        </div>
        <div className="verified-badge"><ShieldCheck size={18} /> Workspace protected</div>
      </header>

      <div className="vault-grid">
        <article className="settings-card vault-feature">
          <div className="card-icon"><Code2 size={20} /></div>
          <div>
            <span className="eyebrow">SOURCE CONNECTION</span>
            <h2>Repository access</h2>
            <p>Read pull requests, isolate candidate patches, and publish the winning result.</p>
          </div>
          <div className="connection-row">
            <span className="connection-logo">BR</span>
            <span><strong>Bout repository connector</strong><small>4 repositories · read/write pull requests</small></span>
            <span className="status-pill complete"><Check size={13} /> Connected</span>
          </div>
          <button className="secondary-button" type="button"><Link2 size={16} /> Manage connection</button>
        </article>

        <article className="settings-card">
          <div className="card-icon"><KeyRound size={20} /></div>
          <span className="eyebrow">CLI ACCESS</span>
          <h2>Workspace token</h2>
          <p>Use this token to create and inspect bouts from your terminal.</p>
          <div className="token-field">
            <code>bout_live_••••••••••••w83q</code>
            <button
              className="icon-button"
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText("bout_live_demo_token_w83q");
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="sr-only">Copy token</span>
            </button>
          </div>
          <button className="text-button" type="button">Rotate token <ArrowUpRight size={14} /></button>
        </article>

        <article className="settings-card">
          <div className="card-icon"><LockKeyhole size={20} /></div>
          <span className="eyebrow">REVIEW CONTEXT</span>
          <h2>Saved criteria</h2>
          <p>Reusable private rubrics help reviewers focus on the standards that matter to your team.</p>
          <div className="criteria-list">
            <span><b>Production safety</b><small>6 checks</small></span>
            <span><b>API compatibility</b><small>4 checks</small></span>
            <span><b>Maintainability</b><small>5 checks</small></span>
          </div>
          <button className="secondary-button" type="button"><Plus size={16} /> Add criteria set</button>
        </article>
      </div>

      <div className="privacy-note">
        <LockKeyhole size={17} />
        <span><strong>Secrets never enter a public bounty.</strong> Bout shares only the minimum review bundle selected for each task.</span>
      </div>
    </section>
  );
}
