import { Check, FileCheck2, Medal, Send, ShieldCheck, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkspaceSnapshot } from "../types";

export function AwardsPage({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const { stats } = snapshot;
  const milestones: Array<{ icon: ReactNode; name: string; description: string; value: number; target: number }> = [
    { icon: <ShieldCheck />, name: "First pairing", description: "Create one anonymized two-patch bundle.", value: stats.total, target: 1 },
    { icon: <FileCheck2 />, name: "Clear verdict", description: "Record an evidence-backed patch decision.", value: stats.reviewed, target: 1 },
    { icon: <Medal />, name: "Repeat judge", description: "Record five completed verdicts.", value: stats.reviewed, target: 5 },
    { icon: <Send />, name: "Into the ring", description: "Publish a prepared review bounty through Gibwork.", value: stats.published, target: 1 },
    { icon: <Trophy />, name: "Ten-round card", description: "Build a workspace with ten real bouts.", value: stats.total, target: 10 },
  ];
  const earned = milestones.filter((item) => item.value >= item.target).length;

  return (
    <section className="interior-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">DERIVED FROM SAVED WORK</span>
          <h1>Awards</h1>
          <p>Milestones unlock only when matching artifacts exist in the current Bout workspace.</p>
        </div>
        <div className="level-badge"><span>REAL</span><strong>{earned}/{milestones.length}</strong><small>milestones earned</small></div>
      </header>

      <article className="reputation-banner">
        <div><span className="eyebrow">CURRENT WORKSPACE</span><h2>{stats.reviewed} recorded verdict{stats.reviewed === 1 ? "" : "s"}</h2><p>{stats.total} battle bundles, {stats.prepared} prepared drafts, and {stats.published} published bounties were found on disk.</p></div>
        <div className="rank-ring"><span>EARNED</span><strong>{earned}</strong><small>of {milestones.length}</small></div>
      </article>

      <div className="award-grid">
        {milestones.map((award) => {
          const progress = Math.min(100, Math.round((award.value / award.target) * 100));
          const isEarned = award.value >= award.target;
          return (
            <article className={`award-card ${isEarned ? "earned" : ""}`} key={award.name}>
              <span className="award-icon">{award.icon}</span>
              <div className="award-copy"><span className="eyebrow">{isEarned ? "EARNED" : `${award.value} / ${award.target}`}</span><h2>{award.name}</h2><p>{award.description}</p></div>
              <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
              {isEarned && <span className="earned-check"><Check size={14} /> Verified</span>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
