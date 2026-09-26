import { ArrowDownToLine, BarChart3, CircleDollarSign, Clock3, FileCheck2, Info } from "lucide-react";
import type { WorkspaceSnapshot } from "../types";

export function BenchmarksPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const { stats, battles } = snapshot;
  const percent = (value: number, denominator = stats.total) => denominator === 0 ? 0 : Math.round((value / denominator) * 100);
  const decided = battles.filter((battle) => battle.verdict);
  const outcomes = [
    { key: "A", label: "Patch A preferred", value: decided.filter((battle) => battle.verdict?.winner === "A").length },
    { key: "B", label: "Patch B preferred", value: decided.filter((battle) => battle.verdict?.winner === "B").length },
    { key: "TIE", label: "No decisive preference", value: decided.filter((battle) => battle.verdict?.winner === "TIE").length },
    { key: "BOTH_FAILED", label: "Both failed", value: decided.filter((battle) => battle.verdict?.winner === "BOTH_FAILED").length },
  ];
  const averageConfidence = decided.length
    ? decided.reduce((sum, battle) => sum + (battle.verdict?.confidence ?? 0), 0) / decided.length
    : null;
  const stages = [
    { label: "Prepared bounty drafts", value: stats.prepared, definition: "bounty-draft.json exists" },
    { label: "Published through Gibwork", value: stats.published, definition: "publication.json exists" },
    { label: "Verdicts recorded", value: stats.reviewed, definition: "verdict.json validates" },
  ];

  const exportSnapshot = () => {
    const blob = new Blob([`${JSON.stringify(snapshot, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bout-workspace-snapshot.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="interior-page evidence-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">EVIDENCE · LOCAL ARTIFACTS ONLY</span>
          <h1>Workspace record</h1>
          <p>Every value carries its source, denominator, and update time. Empty data stays empty.</p>
        </div>
        <button className="secondary-button" type="button" onClick={exportSnapshot}><ArrowDownToLine size={16} /> Export JSON evidence</button>
      </header>

      <div className="evidence-meta"><span><Clock3 size={14} /> Snapshot {formatDateTime(snapshot.generatedAt)}</span><span>Source: <code>.bout/battles</code></span><span>Window: all readable local bundles</span></div>

      <div className="metric-grid">
        <article className="metric-card"><span><BarChart3 size={18} /> Battle bundles</span><strong>{stats.total}</strong><small>denominator for workflow rates</small></article>
        <article className="metric-card"><span><FileCheck2 size={18} /> Valid verdicts</span><strong>{stats.reviewed}</strong><small>{percent(stats.reviewed)}% of {stats.total} bundles</small></article>
        <article className="metric-card"><span><CircleDollarSign size={18} /> Declared pools</span><strong>${formatAmount(stats.totalPool)}</strong><small>draft amounts, not escrow proof</small></article>
      </div>

      <article className="benchmark-panel evidence-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">WORKFLOW FUNNEL</span><h2>Artifact-backed state</h2><p>Counts are mutually non-exclusive stages because a completed bout may also be prepared or published.</p></div>
          <span className="dataset-note">n = {stats.total}</span>
        </div>
        <div className="benchmark-chart" aria-label="Workspace progress chart">
          {stages.map((stage) => (
            <div key={stage.label}><span><b>{stage.label}</b><small>{stage.definition}</small></span><i><b style={{ width: `${percent(stage.value)}%` }} /></i><strong>{stage.value}/{stats.total}</strong></div>
          ))}
        </div>
      </article>

      <div className="evidence-split">
        <article className="benchmark-panel outcome-panel">
          <div className="panel-heading"><div><span className="eyebrow">DECISION DISTRIBUTION</span><h2>Recorded outcomes</h2></div><span className="dataset-note">n = {decided.length}</span></div>
          {decided.length ? <div className="outcome-bars">{outcomes.map((outcome) => <div key={outcome.key}><span>{outcome.label}</span><i><b style={{ width: `${percent(outcome.value, decided.length)}%` }} /></i><strong>{outcome.value}</strong></div>)}</div> : <HonestNoData copy="No validated verdicts exist yet, so there is no outcome distribution to publish." />}
        </article>
        <article className="benchmark-panel confidence-panel">
          <div className="panel-heading"><div><span className="eyebrow">REVIEW CONFIDENCE</span><h2>Mean self-rating</h2></div><span className="dataset-note">1–5 scale</span></div>
          {averageConfidence === null ? <HonestNoData copy="Confidence is undefined until the first structured verdict is saved." /> : <><strong className="confidence-number">{averageConfidence.toFixed(1)}</strong><div className="confidence-track"><i style={{ width: `${(averageConfidence / 5) * 100}%` }} /></div><p>Arithmetic mean across {decided.length} saved verdict{decided.length === 1 ? "" : "s"}. This is reviewer confidence, not accuracy.</p></>}
        </article>
      </div>

      <section className="definition-section evidence-definitions">
        <div className="section-intro"><span className="eyebrow">HOW TO READ</span><h2>What these measures do—and do not—show.</h2></div>
        <div className="definition-table">
          <div><strong>Bundle count</strong><span>Readable local manifests. It does not establish that patches compile or tests pass.</span></div>
          <div><strong>Prepared pool</strong><span>Sum of declared draft amounts. It is not a wallet balance, deposit, or payout receipt.</span></div>
          <div><strong>Valid verdict</strong><span>A verdict matching the current or migrated schema. It is not independent consensus.</span></div>
          <div><strong>Outcome share</strong><span>Observed local decisions only. No ranking is inferred from small or empty samples.</span></div>
        </div>
      </section>

      <div className="table-card benchmark-table">
        <div className="table-head benchmark-grid"><span>ID</span><span>Bout</span><span>Pool</span><span>Status</span><span>Verdict</span></div>
        {battles.map((battle) => (
          <div className="table-row benchmark-grid" key={battle.id}>
            <span className="rank-number">{battle.id.slice(0, 7)}</span>
            <strong>{battle.title}</strong>
            <span>${formatAmount(battle.reward)}</span>
            <span>{battle.status}</span>
            <span className={battle.verdict ? "positive" : ""}>{battle.verdict ? outcomeLabel(battle.verdict.winner) : "—"}</span>
          </div>
        ))}
        {battles.length === 0 && <div className="empty-state"><strong>No measurements yet.</strong><span>Create a real bout to populate this page.</span></div>}
      </div>
    </section>
  );
}

function HonestNoData({ copy }: { copy: string }) {
  return <div className="inline-no-data"><Info size={17} /><span><strong>Insufficient data</strong>{copy}</span></div>;
}

function outcomeLabel(outcome: "A" | "B" | "TIE" | "BOTH_FAILED"): string {
  if (outcome === "TIE") return "Tie";
  if (outcome === "BOTH_FAILED") return "Both failed";
  return `Patch ${outcome}`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
