import { ArrowDownToLine, BarChart3, CircleDollarSign, FileCheck2 } from "lucide-react";
import type { WorkspaceSnapshot } from "../types";

export function BenchmarksPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const { stats } = snapshot;
  const percent = (value: number) => stats.total === 0 ? 0 : Math.round((value / stats.total) * 100);
  const stages = [
    { label: "Prepared bounty drafts", value: stats.prepared, percent: percent(stats.prepared) },
    { label: "Published through Gibwork", value: stats.published, percent: percent(stats.published) },
    { label: "Verdicts recorded", value: stats.reviewed, percent: percent(stats.reviewed) },
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
    <section className="interior-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">MEASURED FROM LOCAL ARTIFACTS</span>
          <h1>Benchmarks</h1>
          <p>Counts and conversion rates are calculated from the battle bundles currently on disk.</p>
        </div>
        <button className="secondary-button" type="button" onClick={exportSnapshot}><ArrowDownToLine size={16} /> Export real snapshot</button>
      </header>

      <div className="metric-grid">
        <article className="metric-card"><span><BarChart3 size={18} /> Battle bundles</span><strong>{stats.total}</strong><small>read from .bout/battles</small></article>
        <article className="metric-card"><span><FileCheck2 size={18} /> Saved verdicts</span><strong>{stats.reviewed}</strong><small>{percent(stats.reviewed)}% of all battles</small></article>
        <article className="metric-card"><span><CircleDollarSign size={18} /> Prepared pool</span><strong>${formatAmount(stats.totalPool)}</strong><small>USDC declared in local drafts</small></article>
      </div>

      <article className="benchmark-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">WORKFLOW CONVERSION</span><h2>Actual workspace progress</h2></div>
          <span className="dataset-note">LIVE LOCAL STATE</span>
        </div>
        <div className="benchmark-chart" aria-label="Workspace progress chart">
          {stages.map((stage) => (
            <div key={stage.label}><span>{stage.label}</span><i><b style={{ width: `${stage.percent}%` }} /></i><strong>{stage.value}/{stats.total}</strong></div>
          ))}
        </div>
      </article>

      <div className="table-card benchmark-table">
        <div className="table-head benchmark-grid"><span>ID</span><span>Bout</span><span>Pool</span><span>Status</span><span>Verdict</span></div>
        {snapshot.battles.map((battle) => (
          <div className="table-row benchmark-grid" key={battle.id}>
            <span className="rank-number">{battle.id.slice(0, 7)}</span>
            <strong>{battle.title}</strong>
            <span>${formatAmount(battle.reward)}</span>
            <span>{battle.status}</span>
            <span className={battle.verdict ? "positive" : ""}>{battle.verdict ? `Patch ${battle.verdict.winner}` : "—"}</span>
          </div>
        ))}
        {snapshot.battles.length === 0 && <div className="empty-state"><strong>No measurements yet.</strong><span>Create a real bout to populate this page.</span></div>}
      </div>
    </section>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}
