import {
  ArrowUpRight,
  Clock3,
  History,
  KeyRound,
  LockKeyhole,
  Menu,
  Microscope,
  Plus,
  Trophy,
  X,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { BoutRecord } from "../types";
import { Brand } from "./Brand";

interface SidebarProps {
  activity: BoutRecord[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const statusClass = (status: BoutRecord["status"]) =>
  status.toLowerCase().replace(" ", "-");

export function Sidebar({ activity, open, onOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const judgeActive = location.pathname.startsWith("/judge");

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <button
        className="mobile-menu"
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={open ? onClose : onOpen}
      >
        {open ? <X size={19} /> : <Menu size={19} />}
      </button>

      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-head">
          <NavLink to="/" onClick={onClose}>
            <Brand />
          </NavLink>
          <span className="sidebar-kicker">Blind review<br />brighter code</span>
        </div>

        <button className="new-bout-button" type="button" onClick={() => go("/")}>
          <Plus size={20} strokeWidth={1.8} />
          <span>New bout</span>
          <kbd>⌘ N</kbd>
        </button>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <NavLink to="/history" onClick={onClose}>
            <History size={19} strokeWidth={1.7} />
            History
          </NavLink>
          <NavLink to="/vault" onClick={onClose}>
            <KeyRound size={19} strokeWidth={1.7} />
            Vault
          </NavLink>
        </nav>

        <div className="mode-switch" aria-label="Workspace mode">
          <button
            className={!judgeActive ? "active" : ""}
            type="button"
            onClick={() => go("/history")}
          >
            Mine
          </button>
          <button
            className={judgeActive ? "active" : ""}
            type="button"
            onClick={() => go("/judge")}
          >
            Judge
          </button>
        </div>

        <section className="sidebar-activity" aria-labelledby="recent-bouts-title">
          <div className="section-label-row">
            <span id="recent-bouts-title">Recent bouts</span>
            <button type="button" onClick={() => go(judgeActive ? "/judge" : "/history")}>
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="activity-list">
            {activity.slice(0, 5).map((item) => (
              <button
                type="button"
                className="activity-item"
                key={item.id}
                onClick={() => go(`/battle/${item.id}`)}
              >
                <span className="activity-copy">
                  <strong>{item.title}</strong>
                  <small>{item.repo} · {formatRelative(item.createdAt)}</small>
                </span>
                <span className="activity-meta">
                  <b>${item.reward}</b>
                  <small>
                    <i className={`status-dot ${statusClass(item.status)}`} />
                    {item.status}
                  </small>
                </span>
              </button>
            ))}
            {activity.length === 0 && <p className="sidebar-empty">No local bouts yet.</p>}
          </div>
        </section>

        <div className="sidebar-bottom">
          <nav className="sidebar-nav secondary" aria-label="Reports navigation">
            <NavLink to="/benchmarks" onClick={onClose}>
              <ChartNoAxesColumnIncreasing size={19} strokeWidth={1.7} />
              Evidence
            </NavLink>
            <NavLink to="/method" onClick={onClose}>
              <Microscope size={19} strokeWidth={1.7} />
              Method
            </NavLink>
            <NavLink to="/awards" onClick={onClose}>
              <Trophy size={19} strokeWidth={1.7} />
              Awards
            </NavLink>
          </nav>

          <button className="profile-row" type="button" onClick={() => go("/security")}>
            <span className="avatar"><LockKeyhole size={16} /></span>
            <span>
              <strong>Security boundary</strong>
              <small>Local keys · explicit publishing</small>
            </span>
            <ArrowUpRight size={15} />
          </button>

          <div className="sidebar-legal">
            <span>Built with Gibwork</span>
            <NavLink to="/security" onClick={onClose}>Security</NavLink>
          </div>
        </div>
      </aside>
    </>
  );
}

function formatRelative(value: string): string {
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta) || delta < 0) return "just now";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
