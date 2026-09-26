import {
  ChartNoAxesColumnIncreasing,
  Gavel,
  History,
  KeyRound,
  LockKeyhole,
  Menu,
  Microscope,
  Plus,
  Trophy,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import type { BoutRecord } from "../types";
import { Brand } from "./Brand";

interface SidebarProps {
  activity: BoutRecord[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function Sidebar({ activity, open, onOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const latest = activity[0];

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}

      <header className={`sidebar system-header ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-head system-titlebar">
          <NavLink to="/" onClick={onClose}><Brand /></NavLink>
          <span className="system-caption">Bout review workbench</span>
          <span className="system-session">LOCAL / PRIVATE</span>
          <span className="window-controls" aria-hidden="true"><i /><i /><i /></span>
          <button
            className="mobile-menu"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={open ? onClose : onOpen}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="system-toolbar">
          <button className="new-bout-button" type="button" onClick={() => go("/")}>
            <Plus size={17} strokeWidth={1.8} />
            <span>New bout</span>
            <kbd>⌘N</kbd>
          </button>

          <nav className="sidebar-nav" aria-label="Primary navigation">
            <NavLink to="/history" onClick={onClose}><History size={16} />History</NavLink>
            <NavLink to="/judge" onClick={onClose}><Gavel size={16} />Judge</NavLink>
            <NavLink to="/benchmarks" onClick={onClose}><ChartNoAxesColumnIncreasing size={16} />Evidence</NavLink>
            <NavLink to="/method" onClick={onClose}><Microscope size={16} />Method</NavLink>
            <NavLink to="/awards" onClick={onClose}><Trophy size={16} />Awards</NavLink>
            <NavLink to="/vault" onClick={onClose}><KeyRound size={16} />Vault</NavLink>
          </nav>

          <div className="toolbar-spacer" />
          <div className="workspace-pulse" title={latest ? `Latest: ${latest.title}` : "No local bouts yet"}>
            <i className={latest ? `status-dot ${latest.status.toLowerCase()}` : "status-dot"} />
            <span><strong>{activity.length}</strong> local bout{activity.length === 1 ? "" : "s"}</span>
          </div>
          <button className="profile-row" type="button" onClick={() => go("/security")}>
            <LockKeyhole size={15} />
            <span><strong>Security</strong><small>keys stay local</small></span>
          </button>
        </div>
      </header>
    </>
  );
}
