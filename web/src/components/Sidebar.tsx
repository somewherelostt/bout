import {
  ArrowUpRight,
  Clock3,
  History,
  KeyRound,
  Menu,
  Plus,
  Trophy,
  X,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { ActivityItem } from "../types";
import { Brand } from "./Brand";

interface SidebarProps {
  activity: ActivityItem[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const statusClass = (status: ActivityItem["status"]) =>
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
                  <small>{item.meta}</small>
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
          </div>
        </section>

        <div className="sidebar-bottom">
          <nav className="sidebar-nav secondary" aria-label="Reports navigation">
            <NavLink to="/benchmarks" onClick={onClose}>
              <ChartNoAxesColumnIncreasing size={19} strokeWidth={1.7} />
              Benchmarks
            </NavLink>
            <NavLink to="/awards" onClick={onClose}>
              <Trophy size={19} strokeWidth={1.7} />
              Awards
            </NavLink>
          </nav>

          <button className="profile-row" type="button" onClick={() => go("/vault")}>
            <span className="avatar">MA</span>
            <span>
              <strong>Maaz</strong>
              <small>Builder · Reviewer</small>
            </span>
            <ArrowUpRight size={15} />
          </button>

          <div className="sidebar-legal">
            <span>Built with Gibwork</span>
            <span>Privacy · Terms</span>
          </div>
        </div>
      </aside>
    </>
  );
}
