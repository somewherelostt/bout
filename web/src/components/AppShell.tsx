import { MessageSquareText } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { BoutRecord } from "../types";
import { Sidebar } from "./Sidebar";

interface AppShellProps extends PropsWithChildren {
  activity: BoutRecord[];
  navOpen: boolean;
  onNavOpen: () => void;
  onNavClose: () => void;
  onFeedback: () => void;
}

export function AppShell({
  activity,
  navOpen,
  onNavOpen,
  onNavClose,
  onFeedback,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-workbench">Skip to workspace</a>
      <Sidebar activity={activity} open={navOpen} onOpen={onNavOpen} onClose={onNavClose} />
      <main className="main-canvas" id="main-workbench">
        <div className="ambient ambient-blue" aria-hidden="true" />
        <div className="ambient ambient-coral" aria-hidden="true" />
        <div className="arena-lines" aria-hidden="true" />
        <div className="texture-field" aria-hidden="true" />
        <div className="page-content">{children}</div>
        <button className="feedback-button" type="button" onClick={onFeedback}>
          <MessageSquareText size={15} /> Feedback
        </button>
      </main>
    </div>
  );
}
