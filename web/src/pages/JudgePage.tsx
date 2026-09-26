import { CalendarDays, Clock3, Copy, Search, ServerOff, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { WorkspaceSnapshot } from "../types";

export function JudgePage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => snapshot.liveBounties.filter((bout) => `${bout.title} ${bout.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())),
    [query, snapshot.liveBounties],
  );
  const openRewards = snapshot.liveBounties.reduce((sum, item) => sum + item.reward, 0);

  return (
    <section className="interior-page judge-page">
      <header className="page-header judge-header">
        <div>
          <span className="eyebrow">LIVE GIBWORK DATA</span>
          <h1>Judge queue</h1>
          <p>Only live code-review bounties returned by the configured Gibwork account appear here.</p>
        </div>
        <div className="header-stat"><strong>${formatAmount(openRewards)}</strong><span>live reward pool</span></div>
      </header>

      <div className={`source-status ${snapshot.liveStatus}`}>
        <i className={`status-dot ${snapshot.liveStatus === "connected" ? "complete" : "draft"}`} />
        <span><strong>{snapshot.liveStatus === "connected" ? "Live connection active" : "Live connection unavailable"}</strong>{snapshot.liveMessage}</span>
      </div>

      <div className="toolbar judge-toolbar">
        <label className="search-control">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search live bounties…" />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="honest-empty">
          <span><ServerOff size={24} /></span>
          <h2>{snapshot.liveStatus === "connected" ? "No live code-review bounties found." : "Connect the local API to Gibwork."}</h2>
          <p>{snapshot.liveStatus === "connected" ? "The live query returned no tasks tagged Code Review." : "Set SOLANA_PRIVATE_KEY only on the local API process, then restart the workspace. The key is never sent to the browser."}</p>
          <code>SOLANA_PRIVATE_KEY=… npm run dev:web</code>
        </div>
      ) : (
        <div className="judge-list">
          {filtered.map((bout) => (
            <article className="judge-card live-card" key={bout.id}>
              <div className="judge-card-main">
                <span className="eyebrow">LIVE BOUNTY</span>
                <h2>{bout.title}</h2>
                <small className="record-id">{bout.id}</small>
              </div>
              <div className="judge-card-meta">
                <div className="tag-list">{bout.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="micro-stats">
                  <span><Trophy size={15} /> {formatAmount(bout.reward)} {bout.symbol}</span>
                  <span><Clock3 size={15} /> {bout.submissions} submissions</span>
                  <span><CalendarDays size={15} /> {bout.deadline ? formatDate(bout.deadline) : "No deadline"}</span>
                </div>
              </div>
              <div className="judge-card-action">
                <span><i className="status-dot open" /> OPEN</span>
                <button className="secondary-button" type="button" onClick={() => void navigator.clipboard?.writeText(bout.id)}><Copy size={15} /> Copy task ID</button>
                <small>Minimum payout: {formatAmount(bout.minSubmissionAmount)} {bout.symbol}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
