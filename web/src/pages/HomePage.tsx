import {
  ArrowRight,
  Scale,
  ChevronDown,
  Code2,
  DollarSign,
  EyeOff,
  FileArchive,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useRef, useState } from "react";

interface HomePageProps {
  onCreate: (title: string, reward: number) => void;
}

const suggestions = [
  {
    icon: <FileArchive size={17} />,
    title: "Optimize a slow query",
    prompt: "Compare two patches that reduce the p95 latency of our activity feed without changing the API contract.",
  },
  {
    icon: <ShieldCheck size={17} />,
    title: "Improve input validation",
    prompt: "Judge two implementations of strict request validation for correctness, useful errors, and maintainability.",
  },
  {
    icon: <Code2 size={17} />,
    title: "Refactor for clarity",
    prompt: "Compare two refactors and select the one with the cleanest module boundaries and lowest regression risk.",
  },
];

export function HomePage({ onCreate }: HomePageProps) {
  const [prompt, setPrompt] = useState("");
  const [repo, setRepo] = useState("");
  const [reward, setReward] = useState(150);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const title = prompt.trim().split(/[.!?\n]/)[0] || "Untitled code review";
    onCreate(title.length > 68 ? `${title.slice(0, 65)}…` : title, reward);
  };

  return (
    <section className="home-page">
      <div className="corner-note top-right">GOOD PATCHES<br />BETTER SOFTWARE</div>
      <div className="corner-note middle-left">DIFFERENT APPROACHES<br />STRONGER OUTCOMES</div>
      <div className="corner-note middle-right">PEOPLE REVIEW<br />PROGRESS WINS</div>

      <div className="hero-copy">
        <span className="eyebrow">PAID BLIND CODE REVIEW</span>
        <h1>Put two patches in the ring.<br />Pay for the better answer.</h1>
        <p>Two competing implementations. One independent reviewer.<br />Bounties powered by Gibwork.</p>
      </div>

      <form className="composer-card" onSubmit={submit}>
        <div className="field-heading">
          <label htmlFor="task-prompt">Task prompt</label>
          <span>Markdown supported</span>
        </div>
        <textarea
          id="task-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the task, requirements, and constraints…"
          required
        />

        <div className="composer-grid two-up">
          <label className="control-group">
            <span>Repository</span>
            <span className="input-with-icon">
              <Code2 size={16} />
              <input
                value={repo}
                onChange={(event) => setRepo(event.target.value)}
                placeholder="owner/repository"
                required
              />
            </span>
          </label>

          <div className="control-group">
            <span>Attach <small>(optional)</small></span>
            <button className="input-button" type="button" onClick={() => fileInput.current?.click()}>
              <Paperclip size={16} /> Add files, logs, or references
            </button>
            <input className="sr-only" ref={fileInput} type="file" multiple />
          </div>
        </div>

        <div className="composer-grid three-up">
          <label className="control-group">
            <span>Evaluation mode</span>
            <span className="select-shell">
              <Scale size={16} />
              <select defaultValue="correctness">
                <option value="correctness">Correctness first</option>
                <option value="security">Security first</option>
                <option value="maintainability">Maintainability first</option>
              </select>
              <ChevronDown size={15} />
            </span>
            <small>Prioritize soundness, safety, and evidence.</small>
          </label>

          <label className="control-group">
            <span>Visibility</span>
            <span className="select-shell">
              <EyeOff size={16} />
              <select defaultValue="blind">
                <option value="blind">Blind (recommended)</option>
                <option value="private">Private invite</option>
                <option value="public">Public after close</option>
              </select>
              <ChevronDown size={15} />
            </span>
            <small>Author and reviewer identities stay hidden.</small>
          </label>

          <label className="control-group">
            <span>Bounty amount (USD)</span>
            <span className="input-with-icon">
              <DollarSign size={16} />
              <input
                type="number"
                min="50"
                step="10"
                value={reward}
                onChange={(event) => setReward(Number(event.target.value))}
                required
              />
            </span>
            <small>Published through Gibwork.</small>
          </label>
        </div>

        <div className="composer-footer">
          <span>Two patches. One winner. A fairer way to review.</span>
          <button className="primary-button" type="submit">
            Start bout <ArrowRight size={17} />
          </button>
        </div>
      </form>

      <div className="samples-block">
        <span className="eyebrow">TRY A SAMPLE BOUT</span>
        <div className="suggestion-grid">
          {suggestions.map((suggestion) => (
            <button key={suggestion.title} type="button" onClick={() => setPrompt(suggestion.prompt)}>
              <span className="suggestion-icon">{suggestion.icon}</span>
              <span>
                <strong>{suggestion.title}</strong>
                <small>{suggestion.prompt}</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))}
          <button className="shuffle-suggestion" type="button" onClick={() => setPrompt("")}>
            <RefreshCw size={16} />
            <span>
              <strong>Clear the ring</strong>
              <small>Start from an empty task prompt.</small>
            </span>
          </button>
        </div>
      </div>

      <div className="arena-caption">
        <SlidersHorizontal size={13} /> IDEAS COMPETE HERE
      </div>
    </section>
  );
}
