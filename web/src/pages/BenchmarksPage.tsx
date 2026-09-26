import { ArrowDownToLine, ArrowUpRight, BarChart3, ShieldCheck, UsersRound } from "lucide-react";
import { benchmarkRows } from "../data/mock";

export function BenchmarksPage() {
  return (
    <section className="interior-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">PUBLISHED EVIDENCE</span>
          <h1>Benchmarks</h1>
          <p>How blind comparison changes code-review confidence across real engineering work.</p>
        </div>
        <button className="secondary-button" type="button"><ArrowDownToLine size={16} /> Export snapshot</button>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <span><BarChart3 size={18} /> Bouts measured</span>
          <strong>701</strong>
          <small>+92 this month</small>
        </article>
        <article className="metric-card">
          <span><UsersRound size={18} /> Independent reviews</span>
          <strong>2,486</strong>
          <small>3.5 per bout</small>
        </article>
        <article className="metric-card">
          <span><ShieldCheck size={18} /> Reviewer agreement</span>
          <strong>87.4%</strong>
          <small>+5.8% vs single review</small>
        </article>
      </div>

      <article className="benchmark-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">REVIEW SIGNAL</span>
            <h2>Where blind review helps most</h2>
          </div>
          <span className="dataset-note">Snapshot · Sep 2026</span>
        </div>
        <div className="benchmark-chart" aria-label="Review confidence chart">
          {[92, 89, 88, 84, 83].map((value, index) => (
            <div key={benchmarkRows[index].label}>
              <span>{benchmarkRows[index].label}</span>
              <i><b style={{ width: `${value}%` }} /></i>
              <strong>{value}%</strong>
            </div>
          ))}
        </div>
      </article>

      <div className="table-card benchmark-table">
        <div className="table-head benchmark-grid">
          <span>Rank</span><span>Task category</span><span>Bouts</span><span>Agreement</span><span>Lift</span>
        </div>
        {benchmarkRows.map((row) => (
          <div className="table-row benchmark-grid" key={row.rank}>
            <span className="rank-number">0{row.rank}</span>
            <strong>{row.label}</strong>
            <span>{row.bouts}</span>
            <span>{row.agreement}</span>
            <span className="positive">{row.lift} <ArrowUpRight size={14} /></span>
          </div>
        ))}
      </div>
    </section>
  );
}
