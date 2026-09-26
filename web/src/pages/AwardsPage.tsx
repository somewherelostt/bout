import { Check, Flame, LockKeyhole, Medal, Star, Trophy, Zap } from "lucide-react";

const awards = [
  { icon: <Medal />, name: "Clear verdict", description: "Write your first accepted blind review.", progress: 100, earned: true },
  { icon: <Flame />, name: "Five-round streak", description: "Complete five reviews without a missed deadline.", progress: 100, earned: true },
  { icon: <Star />, name: "Sharp eye", description: "Match the final consensus on ten bouts.", progress: 80, earned: false },
  { icon: <Zap />, name: "Fast judge", description: "Return three useful reviews in under 15 minutes.", progress: 67, earned: false },
  { icon: <Trophy />, name: "Corner coach", description: "Help a winning patch reach production.", progress: 40, earned: false },
  { icon: <LockKeyhole />, name: "Title bout", description: "Reach the top five percent of active reviewers.", progress: 12, earned: false },
];

export function AwardsPage() {
  return (
    <section className="interior-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">REPUTATION THAT TRAVELS</span>
          <h1>Awards</h1>
          <p>Build a public record of precise, useful, and dependable code judgment.</p>
        </div>
        <div className="level-badge"><span>LVL</span><strong>07</strong><small>Corner judge</small></div>
      </header>

      <article className="reputation-banner">
        <div>
          <span className="eyebrow">CURRENT SEASON</span>
          <h2>1,840 review points</h2>
          <p>160 points to the next rank. Complete a security or concurrency review for a 1.4× multiplier.</p>
        </div>
        <div className="rank-ring"><span>TOP</span><strong>12%</strong><small>of judges</small></div>
      </article>

      <div className="award-grid">
        {awards.map((award) => (
          <article className={`award-card ${award.earned ? "earned" : ""}`} key={award.name}>
            <span className="award-icon">{award.icon}</span>
            <div className="award-copy">
              <span className="eyebrow">{award.earned ? "EARNED" : `${award.progress}% COMPLETE`}</span>
              <h2>{award.name}</h2>
              <p>{award.description}</p>
            </div>
            <div className="progress-track"><i style={{ width: `${award.progress}%` }} /></div>
            {award.earned && <span className="earned-check"><Check size={14} /> Claimed</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
