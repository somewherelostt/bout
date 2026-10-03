import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Code2,
  Equal,
  EyeOff,
  FileCode2,
  GitCompareArrows,
  ListChecks,
  LoaderCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveVerdict } from "../api";
import type { BoutRecord, ReportSummary, VerdictRecord } from "../types";

type Outcome = VerdictRecord["winner"];
type Confidence = VerdictRecord["confidence"];

export function BattlePage({ battles, onSaved }: { battles: BoutRecord[]; onSaved: () => Promise<void> }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const battle = battles.find((item) => item.id === id);
  const existing = battle?.verdict;
  const [choice, setChoice] = useState<Outcome | null>(existing?.winner ?? null);
  const [confidence, setConfidence] = useState<Confidence>(existing?.confidence ?? 3);
  const [correctness, setCorrectness] = useState(existing?.correctness ?? "");
  const [security, setSecurity] = useState(existing?.security ?? "");
  const [maintainability, setMaintainability] = useState(existing?.maintainability ?? "");
  const [evidence, setEvidence] = useState(existing?.evidence.join("\n") ?? "");
  const [rationale, setRationale] = useState(existing?.rationale ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(existing));
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

  const evidenceLines = evidence.split(/\r?\n/u).map((line) => line.replace(/^[-*]\s*/u, "").trim()).filter(Boolean);
  const canSubmit = Boolean(choice && correctness.trim() && security.trim() && maintainability.trim() && evidenceLines.length && rationale.trim());
  const markDirty = () => setSaved(false);
  const choose = (outcome: Outcome) => { setChoice(outcome); markDirty(); };

  const submitVerdict = async () => {
    if (!choice || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await saveVerdict(battle.id, {
        winner: choice,
        confidence,
        correctness: correctness.trim(),
        security: security.trim(),
        maintainability: maintainability.trim(),
        evidence: evidenceLines,
        rationale: rationale.trim(),
      });
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
        <div className="battle-payout"><span>{battle.hasPublicationReceipt ? "Published pool" : "Prepared pool"}</span><strong>${formatAmount(battle.reward)}</strong><small>USDC · {battle.hasPublicationReceipt ? "stage task confirmed" : "local draft"}</small></div>
      </header>

      {battle.hasPublicationReceipt && (
        <div className="review-meta-strip">
          <span><BadgeCheck size={16} /> Gibwork task {battle.publicationTaskId}</span>
          <span><ListChecks size={16} /> {battle.submissionCount} synced submissions · {battle.validReviewCount} valid reviews</span>
        </div>
      )}

      <div className="review-meta-strip">
        <span><EyeOff size={16} /> Authors hidden</span>
        <span><Clock3 size={16} /> {formatDate(battle.createdAt)}</span>
        <span><ShieldCheck size={16} /> {battle.verificationCommand ?? "No verification command"}</span>
        <span><CircleDollarSign size={16} /> ${formatAmount(battle.minimumPayout)} minimum payout</span>
      </div>

      <article className="task-brief">
        <div><ListChecks size={19} /><span><strong>Shared task and acceptance criteria</strong><small>Both candidates are judged against this exact saved task.</small></span></div>
        <pre>{battle.task}</pre>
      </article>

      {battle.report && (
        <article className="task-brief">
          <div>
            <BadgeCheck size={19} />
            <span>
              <strong>Gibwork review report: {reportOutcome(battle.report.outcome)}</strong>
              <small>{battle.report.validReviewCount} valid of {battle.submissionCount} synced submissions · generated {formatDateTime(battle.report.generatedAt)}</small>
            </span>
          </div>
          <p>
            {battle.report.resolvedLabel
              ? `The private identity map resolves the consensus to candidate ${battle.report.resolvedLabel}.`
              : "No single source candidate was resolved from the available review consensus."}
          </p>
        </article>
      )}

      <div className="comparison-heading">
        <div><GitCompareArrows size={18} /><span><strong>Compare the saved patches</strong><small>Content and hashes come directly from the review bundle.</small></span></div>
        <span>{battle.id}</span>
      </div>

      <div className="patch-grid">
        {(["A", "B"] as const).map((label) => {
          const patch = label === "A" ? battle.patchA : battle.patchB;
          return (
            <article className={`patch-card ${choice === label ? "selected" : ""}`} key={label}>
              <header><span><FileCode2 size={18} /><strong>Patch {label}</strong></span><span className="anonymous-label">sha256 {patch.sha256.slice(0, 10)}</span></header>
              <div className="diff-summary"><span><em>+{patch.additions}</em><i>−{patch.deletions}</i></span><small>{patch.files} files changed</small></div>
              <pre><code>{patch.content}</code></pre>
              <div className="criteria-pills"><span>SHA-256 recorded</span><span>Saved locally</span></div>
              <button className={choice === label ? "primary-button" : "secondary-button"} type="button" onClick={() => choose(label)}>
                {choice === label ? <><Check size={16} /> Selected winner</> : <>Choose patch {label} <ChevronRight size={16} /></>}
              </button>
            </article>
          );
        })}
      </div>

      <article className="verdict-card structured-verdict">
        <div className="verdict-heading">
          <div><Code2 size={20} /><span><strong>Record the evidence-backed verdict</strong><small>All fields are persisted to review/verdict.json.</small></span></div>
          {existing && <span className="recorded-at"><BadgeCheck size={14} /> last saved {formatDateTime(existing.submittedAt)}</span>}
        </div>

        <fieldset className="outcome-fieldset">
          <legend>Outcome</legend>
          <div className="outcome-options">
            <OutcomeButton active={choice === "A"} onClick={() => choose("A")} label="Patch A" detail="A is stronger" icon={<Check size={16} />} />
            <OutcomeButton active={choice === "B"} onClick={() => choose("B")} label="Patch B" detail="B is stronger" icon={<Check size={16} />} />
            <OutcomeButton active={choice === "TIE"} onClick={() => choose("TIE")} label="Tie" detail="No decisive edge" icon={<Equal size={16} />} />
            <OutcomeButton active={choice === "BOTH_FAILED"} onClick={() => choose("BOTH_FAILED")} label="Both failed" detail="Neither meets task" icon={<XCircle size={16} />} />
          </div>
        </fieldset>

        <fieldset className="confidence-fieldset">
          <legend>Confidence</legend>
          <div>{([1, 2, 3, 4, 5] as const).map((level) => <button className={confidence === level ? "active" : ""} type="button" key={level} onClick={() => { setConfidence(level); markDirty(); }}><b>{level}</b><span>{confidenceLabel(level)}</span></button>)}</div>
        </fieldset>

        <div className="rubric-grid">
          <VerdictField label="Correctness" hint="Behavior, acceptance criteria, regressions" value={correctness} onChange={(value) => { setCorrectness(value); markDirty(); }} />
          <VerdictField label="Security" hint="Trust boundaries, unsafe inputs, leakage" value={security} onChange={(value) => { setSecurity(value); markDirty(); }} />
          <VerdictField label="Maintainability" hint="Clarity, scope, complexity, operability" value={maintainability} onChange={(value) => { setMaintainability(value); markDirty(); }} />
          <VerdictField label="Evidence" hint="One concrete file, line, test, or behavior per line" value={evidence} onChange={(value) => { setEvidence(value); markDirty(); }} placeholder={"src/example.ts:42 — handles the failure path\nnpm test — 28 checks passed"} />
        </div>

        <label className="rationale-field"><span><strong>Decision rationale</strong><small>Synthesize why the selected outcome follows from the evidence above.</small></span><textarea value={rationale} onChange={(event) => { setRationale(event.target.value); markDirty(); }} placeholder="The decisive difference is…" /></label>
        {error && <div className="form-error">{error}</div>}
        {!canSubmit && <div className="verdict-requirements"><AlertTriangle size={14} /> Select an outcome and complete every rubric field with at least one evidence line.</div>}
        <footer>
          <span>{choice ? outcomeDescription(choice) : "No outcome selected"} · confidence {confidence}/5</span>
          <button className="primary-button" type="button" disabled={!canSubmit || saving || saved} onClick={() => void submitVerdict()}>
            {saving ? <><LoaderCircle className="spin" size={16} /> Saving…</> : saved ? <><Check size={16} /> Verdict saved</> : <>Save structured verdict <ChevronRight size={16} /></>}
          </button>
        </footer>
      </article>
    </section>
  );
}

function OutcomeButton({ active, onClick, label, detail, icon }: { active: boolean; onClick: () => void; label: string; detail: string; icon: ReactNode }) {
  return <button className={active ? "active" : ""} type="button" onClick={onClick}><span>{icon}</span><strong>{label}</strong><small>{detail}</small></button>;
}

function VerdictField({ label, hint, value, onChange, placeholder }: { label: string; hint: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label><span><strong>{label}</strong><small>{hint}</small></span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder ?? `Record the ${label.toLowerCase()} findings…`} /></label>;
}

function confidenceLabel(value: number): string {
  return ["", "Low", "Guarded", "Moderate", "High", "Very high"][value];
}

function outcomeDescription(value: Outcome): string {
  if (value === "TIE") return "No decisive preference";
  if (value === "BOTH_FAILED") return "Neither patch satisfies the task";
  return `Patch ${value} preferred`;
}

function reportOutcome(value: ReportSummary["outcome"]): string {
  if (value === "NO_CONSENSUS") return "No consensus";
  if (value === "BOTH_FAILED") return "Both failed";
  if (value === "TIE") return "Tie";
  return `Patch ${value}`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
