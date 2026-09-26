import {
  ArrowRight,
  Check,
  Code2,
  DollarSign,
  FileCode2,
  LoaderCircle,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import type { CreateBoutInput } from "../types";

interface HomePageProps {
  onCreate: (input: CreateBoutInput) => Promise<void>;
}

export function HomePage({ onCreate }: HomePageProps) {
  const [prompt, setPrompt] = useState("");
  const [repo, setRepo] = useState("");
  const [verification, setVerification] = useState("");
  const [pool, setPool] = useState(150);
  const [minimumPayout, setMinimumPayout] = useState(50);
  const [deadline, setDeadline] = useState("");
  const [candidateOne, setCandidateOne] = useState<File | null>(null);
  const [candidateTwo, setCandidateTwo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!candidateOne || !candidateTwo) {
      setError("Choose two different patch files before creating the bout.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        task: prompt,
        repository: repo,
        candidateOne: await candidateOne.text(),
        candidateTwo: await candidateTwo.text(),
        ...(verification.trim() ? { verificationCommand: verification.trim() } : {}),
        poolAmount: pool,
        minimumPayout,
        ...(deadline ? { deadline: new Date(`${deadline}T23:59:59Z`).toISOString() } : {}),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setSubmitting(false);
    }
  };

  return (
    <section className="home-page">
      <div className="corner-note top-right">GOOD PATCHES<br />BETTER SOFTWARE</div>
      <div className="corner-note middle-left">REAL INPUTS<br />TRACEABLE OUTPUTS</div>
      <div className="corner-note middle-right">PEOPLE REVIEW<br />PROGRESS WINS</div>

      <div className="hero-copy">
        <div className="hero-system-line"><span>BOUT://NEW_REVIEW</span><i />LOCAL WORKSPACE</div>
        <span className="eyebrow">Paid blind code review</span>
        <h1>Two patches enter.<br /><em>Evidence decides.</em></h1>
        <p>Package two real changes against one task, hide their authors, and prepare a paid review without moving funds.</p>
      </div>

      <form className="composer-card" onSubmit={(event) => void submit(event)}>
        <div className="window-titlebar composer-titlebar">
          <span><FileCode2 size={14} /> NEW_BOUT.BOUT</span>
          <span className="window-controls" aria-hidden="true"><i /><i /><i /></span>
        </div>
        <div className="composer-body">
        <div className="field-heading">
          <label htmlFor="task-prompt">Task and acceptance criteria</label>
          <span>Saved to task.md</span>
        </div>
        <textarea
          id="task-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the task, expected behavior, constraints, and what success means…"
          required
        />

        <div className="composer-grid two-up">
          <label className="control-group">
            <span>Repository</span>
            <span className="input-with-icon">
              <Code2 size={16} />
              <input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/repository" required />
            </span>
          </label>
          <label className="control-group">
            <span>Verification command <small>(optional)</small></span>
            <span className="input-with-icon">
              <ShieldCheck size={16} />
              <input value={verification} onChange={(event) => setVerification(event.target.value)} placeholder="npm test" />
            </span>
          </label>
        </div>

        <div className="composer-grid two-up patch-input-grid">
          <PatchInput label="Candidate one" file={candidateOne} onChange={setCandidateOne} />
          <PatchInput label="Candidate two" file={candidateTwo} onChange={setCandidateTwo} />
        </div>

        <div className="composer-grid three-up">
          <label className="control-group">
            <span>Bounty pool (USDC)</span>
            <span className="input-with-icon">
              <DollarSign size={16} />
              <input type="number" min="0.000001" step="0.01" value={pool} onChange={(event) => setPool(Number(event.target.value))} required />
            </span>
            <small>Prepared locally; no funds move.</small>
          </label>
          <label className="control-group">
            <span>Minimum payout (USDC)</span>
            <span className="input-with-icon">
              <DollarSign size={16} />
              <input type="number" min="0.000001" step="0.01" value={minimumPayout} onChange={(event) => setMinimumPayout(Number(event.target.value))} required />
            </span>
            <small>Must not exceed the pool.</small>
          </label>
          <label className="control-group">
            <span>Deadline <small>(optional)</small></span>
            <span className="input-with-icon">
              <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </span>
            <small>Recorded in the draft payload.</small>
          </label>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="composer-footer">
          <span>Creates `.bout/battles/&lt;id&gt;` and a review-ready bounty draft.</span>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? <><LoaderCircle className="spin" size={17} /> Creating…</> : <>Create real bout <ArrowRight size={17} /></>}
          </button>
        </div>
        </div>
      </form>

      <div className="real-flow-strip">
        <span><b>01</b><Check size={14} /> Hash both patch files</span>
        <span><b>02</b><FileCode2 size={14} /> Randomize A/B identity</span>
        <span><b>03</b><ShieldCheck size={14} /> Save a local Gibwork draft</span>
      </div>

      <div className="arena-caption"><SlidersHorizontal size={13} /> REVIEW WORKBENCH / ARTIFACTS STAY LOCAL</div>
    </section>
  );
}

function PatchInput({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="control-group patch-file-control">
      <span>{label}</span>
      <span className="file-drop">
        <FileCode2 size={19} />
        <span><strong>{file?.name ?? "Choose a Git patch"}</strong><small>{file ? `${Math.ceil(file.size / 1024)} KB` : ".patch or .diff"}</small></span>
        <input type="file" accept=".patch,.diff,text/plain" onChange={(event) => onChange(event.target.files?.[0] ?? null)} required />
      </span>
    </label>
  );
}
