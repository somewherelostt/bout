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
            <h2>Your local workspace</h2>
            <p>Bout keeps structured review state and readable artifacts together on this device.</p>
          </div>
          <div className="connection-row">
            <span className="connection-logo">DB</span>
            <span><strong>{snapshot.storage.scope}</strong><small>{snapshot.stats.total} indexed battle bundles</small></span>
            <span className={`status-pill ${snapshot.storage.persistence === "Local only" ? "complete" : "draft"}`}><Check size={13} /> {snapshot.storage.persistence}</span>
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
            <span><b>Synced review sets</b><small>{snapshot.stats.synced}</small></span>
            <span><b>Final reports</b><small>{snapshot.stats.reported}</small></span>
          </div>
          <p>Backed by {snapshot.storage.engine}; implementation paths stay hidden from the browser.</p>
        </article>
      </div>

      <div className="privacy-note">
        <LockKeyhole size={17} />
        <span><strong>Wallet secrets remain server-side.</strong> The API returns connection status only; it never serializes the configured key.</span>
      </div>
    </section>
  );
}
