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
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveVerdict } from "../api";
import type { BoutRecord } from "../types";

export function BattlePage({ battles, onSaved }: { battles: BoutRecord[]; onSaved: () => Promise<void> }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const battle = battles.find((item) => item.id === id);
  const [choice, setChoice] = useState<"A" | "B" | null>(battle?.verdict?.winner ?? null);
  const [rationale, setRationale] = useState(battle?.verdict?.rationale ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(battle?.verdict));
  const [error, setError] = useState<string | null>(null);

  if (!battle) {
    return (
      <section className="not-found">
        <span className="eyebrow">NOT FOUND ON DISK</span>
        <h1>That local bout does not exist.</h1>
        <p>The workspace API did not return a matching battle manifest.</p>
        <button className="primary-button" type="button" onClick={() => navigate("/history")}><ArrowLeft size={16} /> Back to history</button>
      </section>
    );
  }

  const submitVerdict = async () => {
    if (!choice || !rationale.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await saveVerdict(battle.id, { winner: choice, rationale: rationale.trim() });
      await onSaved();
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="interior-page battle-page">
      <button className="back-button" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
      <header className="battle-header">
        <div><span className="eyebrow">BOUT {battle.id.slice(0, 8)} · {battle.status.toUpperCase()}</span><h1>{battle.title}</h1><p>{battle.repo}</p></div>
        <div className="battle-payout"><span>Prepared pool</span><strong>${formatAmount(battle.reward)}</strong><small>USDC · local draft</small></div>
      </header>

      <div className="review-meta-strip">
        <span><EyeOff size={16} /> Authors hidden</span>
        <span><Clock3 size={16} /> {formatDate(battle.createdAt)}</span>
        <span><ShieldCheck size={16} /> {battle.verificationCommand ?? "No verification command"}</span>
        <span><CircleDollarSign size={16} /> ${formatAmount(battle.minimumPayout)} minimum payout</span>
      </div>

      <div className="comparison-heading">
        <div><GitCompareArrows size={18} /><span><strong>Compare the saved patches</strong><small>Content and hashes come directly from the review bundle.</small></span></div>
        <span>{battle.id}</span>
      </div>

      <div className="patch-grid">
        {(["A", "B"] as const).map((label) => {
          const patch = label === "A" ? battle.patchA : battle.patchB;
          return (
            <article className={`patch-card ${choice === label ? "selected" : ""}`} key={label}>
              <header><span><FileCode2 size={18} /><strong>Patch {label}</strong></span><span className="anonymous-label">{patch.sha256.slice(0, 10)}</span></header>
              <div className="diff-summary"><span><em>+{patch.additions}</em><i>−{patch.deletions}</i></span><small>{patch.files} files changed</small></div>
              <pre><code>{patch.content}</code></pre>
              <div className="criteria-pills"><span>SHA-256 verified</span><span>Saved locally</span></div>
              <button className={choice === label ? "primary-button" : "secondary-button"} type="button" onClick={() => { setChoice(label); setSaved(false); }}>
                {choice === label ? <><Check size={16} /> Selected</> : <>Choose patch {label} <ChevronRight size={16} /></>}
              </button>
            </article>
          );
        })}
      </div>

      <article className="verdict-card">
        <div><Code2 size={20} /><span><strong>Explain your verdict</strong><small>This rationale will be written to review/verdict.json.</small></span></div>
        <textarea value={rationale} onChange={(event) => { setRationale(event.target.value); setSaved(false); }} placeholder="Patch A/B is stronger because…" />
        {error && <div className="form-error">{error}</div>}
        <footer>
          <span>{choice ? `Patch ${choice} selected` : "Choose a patch to continue"}</span>
          <button className="primary-button" type="button" disabled={!choice || !rationale.trim() || saving || saved} onClick={() => void submitVerdict()}>
            {saving ? <><LoaderCircle className="spin" size={16} /> Saving…</> : saved ? <><Check size={16} /> Verdict saved</> : <>Save verdict <ChevronRight size={16} /></>}
          </button>
        </footer>
      </article>
    </section>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
