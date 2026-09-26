import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BoutRecord } from "../types";

export function HistoryPage({ battles }: { battles: BoutRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const navigate = useNavigate();
  const filtered = useMemo(
    () =>
      battles.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) &&
          (status === "All" || item.status === status),
      ),
    [battles, query, status],
  );

  return (
    <section className="interior-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Bout history</h1>
          <p>Every comparison, decision, and payout in one clear trail.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => navigate("/")}>
          New bout <ArrowRight size={16} />
        </button>
      </header>

      <div className="toolbar">
        <label className="search-control">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your bouts…" />
        </label>
        <label className="select-control">
          <SlidersHorizontal size={16} />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            <option>Draft</option>
            <option>Prepared</option>
            <option>Published</option>
            <option>Synced</option>
            <option>Complete</option>
          </select>
        </label>
      </div>

      <div className="table-card">
        <div className="table-head history-grid">
          <span>Bout</span>
          <span>Status</span>
          <span>Reward</span>
          <span>Updated</span>
          <span />
        </div>
        {filtered.map((item) => (
          <button
            className="table-row history-grid"
            type="button"
            key={item.id}
            onClick={() => navigate(`/battle/${item.id}`)}
          >
            <span className="row-title">
              <b>#{item.id}</b>
              <strong>{item.title}</strong>
              <small>{item.repo}</small>
            </span>
            <span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>
            <span className="money">${item.reward}</span>
            <span>{formatDate(item.createdAt)}</span>
            <ArrowRight size={16} />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <strong>{battles.length === 0 ? "No local bouts yet." : "No bouts match that search."}</strong>
            <span>{battles.length === 0 ? "Create one from two real patch files." : "Try a different keyword or status."}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
