import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Search,
  Star,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { judgeBouts } from "../data/mock";

export function JudgePage() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("All languages");
  const navigate = useNavigate();
  const filtered = useMemo(
    () =>
      judgeBouts.filter(
        (bout) =>
          `${bout.title} ${bout.summary} ${bout.languages.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (language === "All languages" || bout.languages.includes(language)),
      ),
    [query, language],
  );

  return (
    <section className="interior-page judge-page">
      <header className="page-header judge-header">
        <div>
          <span className="eyebrow">A FAIRER CODE WORLD</span>
          <h1>Judge queue</h1>
          <p>Review anonymous patches, compare tradeoffs, and earn for useful judgment.</p>
        </div>
        <div className="header-stat">
          <strong>$860</strong>
          <span>open rewards</span>
        </div>
      </header>

      <div className="toolbar judge-toolbar">
        <label className="search-control">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, stacks, or outcomes…" />
        </label>
        <label className="select-control">
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option>All languages</option>
            <option>TypeScript</option>
            <option>Go</option>
            <option>Rust</option>
            <option>Markdown</option>
          </select>
        </label>
        <label className="select-control">
          <select defaultValue="reward">
            <option value="reward">Highest reward</option>
            <option value="newest">Newest first</option>
            <option value="fastest">Quickest review</option>
          </select>
        </label>
      </div>

      <div className="judge-list">
        {filtered.map((bout, index) => (
          <article className={`judge-card ${index === 0 ? "featured" : ""}`} key={bout.id}>
            <div className="judge-card-main">
              {index === 0 && <span className="featured-label"><Star size={13} fill="currentColor" /> FEATURED BOUT</span>}
              <h2>{bout.title}</h2>
              <p>{bout.summary}</p>
              {index === 0 && (
                <div className="patch-preview">
                  <span><b>Patch A</b><small><em>+{bout.patchA.additions}</em> <i>−{bout.patchA.deletions}</i> · {bout.patchA.files} files</small></span>
                  <strong>VS</strong>
                  <span><b>Patch B</b><small><em>+{bout.patchB.additions}</em> <i>−{bout.patchB.deletions}</i> · {bout.patchB.files} files</small></span>
                </div>
              )}
            </div>

            <div className="judge-card-meta">
              <span className="category-label">{bout.category}</span>
              <div className="tag-list">
                {bout.languages.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <div className="micro-stats">
                <span><Clock3 size={15} /> {bout.estimate}</span>
                <span><Trophy size={15} /> ${bout.reward}</span>
                <span><CalendarDays size={15} /> {bout.deadline}</span>
              </div>
            </div>

            <div className="judge-card-action">
              <span><i className="status-dot open" /> OPEN</span>
              <button className="primary-button" type="button" onClick={() => navigate(`/battle/${bout.id}`)}>
                Review bout <ArrowRight size={16} />
              </button>
              <small>{bout.reviews} reviewers watching</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
