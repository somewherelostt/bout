import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Code2,
  EyeOff,
  FileCode2,
  GitCompareArrows,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { judgeBouts } from "../data/mock";
import type { ActivityItem } from "../types";

export function BattlePage({ activity }: { activity: ActivityItem[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choice, setChoice] = useState<"A" | "B" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const judgeBout = useMemo(() => judgeBouts.find((item) => item.id === id), [id]);
  const mine = useMemo(() => activity.find((item) => item.id === id), [activity, id]);
  const title = judgeBout?.title ?? mine?.title ?? "Untitled review bout";
  const reward = judgeBout?.reward ?? mine?.reward ?? 150;
  const summary = judgeBout?.summary ?? "Two anonymous patches are ready for a structured, evidence-based comparison.";
  const patchA = judgeBout?.patchA ?? { additions: 94, deletions: 32, files: 6 };
  const patchB = judgeBout?.patchB ?? { additions: 81, deletions: 28, files: 5 };

  return (
    <section className="interior-page battle-page">
      <button className="back-button" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
      <header className="battle-header">
        <div>
          <span className="eyebrow">BOUT #{id ?? "—"} · BLIND REVIEW</span>
          <h1>{title}</h1>
          <p>{summary}</p>
        </div>
        <div className="battle-payout"><span>Bounty</span><strong>${reward}</strong><small>paid through Gibwork</small></div>
      </header>

      <div className="review-meta-strip">
        <span><EyeOff size={16} /> Authors hidden</span>
        <span><Clock3 size={16} /> ~18 min review</span>
        <span><ShieldCheck size={16} /> Evidence required</span>
        <span><CircleDollarSign size={16} /> ${reward} reward</span>
      </div>

      <div className="comparison-heading">
        <div><GitCompareArrows size={18} /><span><strong>Compare the two patches</strong><small>Identity is revealed only after a final verdict.</small></span></div>
        <span>01 / 03 · IMPLEMENTATION</span>
      </div>

      <div className="patch-grid">
        {(["A", "B"] as const).map((label) => {
          const patch = label === "A" ? patchA : patchB;
          return (
            <article className={`patch-card ${choice === label ? "selected" : ""}`} key={label}>
              <header>
                <span><FileCode2 size={18} /><strong>Patch {label}</strong></span>
                <span className="anonymous-label">ANONYMOUS</span>
              </header>
              <div className="diff-summary">
                <span><em>+{patch.additions}</em><i>−{patch.deletions}</i></span>
                <small>{patch.files} files changed</small>
              </div>
              <pre><code>{label === "A" ? `+ const result = await withRetry(\n+   () => fetchNext(cursor),\n+   { attempts: 3, jitter: true }\n+ );\n\n- return rows.slice(0, limit);\n+ return stablePage(result, limit);` : `+ const page = await fetchWindow({\n+   cursor, limit, signal\n+ });\n\n+ assertMonotonic(page.items);\n+ return page;`}</code></pre>
              <div className="criteria-pills"><span>Tests pass</span><span>Typed</span><span>No API changes</span></div>
              <button className={choice === label ? "primary-button" : "secondary-button"} type="button" onClick={() => setChoice(label)}>
                {choice === label ? <><Check size={16} /> Selected</> : <>Choose patch {label} <ChevronRight size={16} /></>}
              </button>
            </article>
          );
        })}
      </div>

      <article className="verdict-card">
        <div><Code2 size={20} /><span><strong>Explain your verdict</strong><small>Call out correctness, risk, clarity, and meaningful tradeoffs.</small></span></div>
        <textarea placeholder="Patch A/B is stronger because…" />
        <footer>
          <span>{choice ? `Patch ${choice} selected` : "Choose a patch to continue"}</span>
          <button
            className="primary-button"
            type="button"
            disabled={!choice || submitted}
            onClick={() => setSubmitted(true)}
          >
            {submitted ? <><Check size={16} /> Verdict submitted</> : <>Submit verdict <ChevronRight size={16} /></>}
          </button>
        </footer>
      </article>
    </section>
  );
}
