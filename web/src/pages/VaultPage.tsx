import { Check, Database, HardDrive, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import type { WorkspaceSnapshot } from "../types";

export function VaultPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const connected = snapshot.liveStatus === "connected";

  return (
    <section className="interior-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">LOCAL STATE</span>
          <h1>Vault</h1>
          <p>This page reports the real workspace and server-side connection state. It never renders wallet material.</p>
        </div>
        <div className="verified-badge"><ShieldCheck size={18} /> Browser-safe view</div>
      </header>

      <div className="vault-grid">
        <article className="settings-card vault-feature">
          <div className="card-icon"><HardDrive size={20} /></div>
          <div>
            <span className="eyebrow">BOUT WORKSPACE</span>
            <h2>Local battle storage</h2>
            <p>Every visible record is loaded from manifests and artifacts under this workspace.</p>
          </div>
          <div className="actual-path"><code>{snapshot.workspacePath}</code></div>
          <div className="connection-row">
            <span className="connection-logo">FS</span>
            <span><strong>.bout/battles</strong><small>{snapshot.stats.total} battle bundles found</small></span>
            <span className="status-pill complete"><Check size={13} /> Reading</span>
          </div>
        </article>

        <article className="settings-card">
          <div className="card-icon"><KeyRound size={20} /></div>
          <span className="eyebrow">SERVER-SIDE ACCESS</span>
          <h2>Gibwork connection</h2>
          <p>{snapshot.liveMessage}</p>
          <div className={`connection-state ${snapshot.liveStatus}`}>
            <i className={`status-dot ${connected ? "complete" : "draft"}`} />
            <strong>{connected ? "Configured" : snapshot.liveStatus === "error" ? "Connection error" : "Not configured"}</strong>
          </div>
        </article>

        <article className="settings-card">
          <div className="card-icon"><Database size={20} /></div>
          <span className="eyebrow">REAL RECORD COUNTS</span>
          <h2>Workspace index</h2>
          <div className="criteria-list">
            <span><b>Prepared drafts</b><small>{snapshot.stats.prepared}</small></span>
            <span><b>Published bounties</b><small>{snapshot.stats.published}</small></span>
            <span><b>Saved verdicts</b><small>{snapshot.stats.reviewed}</small></span>
          </div>
        </article>
      </div>

      <div className="privacy-note">
        <LockKeyhole size={17} />
        <span><strong>Wallet secrets remain server-side.</strong> The API returns connection status only; it never serializes the configured key.</span>
      </div>
    </section>
  );
}
