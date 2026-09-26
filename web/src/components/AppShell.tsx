import { MessageSquareText } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { ActivityItem } from "../types";
import { Sidebar } from "./Sidebar";

interface AppShellProps extends PropsWithChildren {
  activity: ActivityItem[];
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
      <Sidebar activity={activity} open={navOpen} onOpen={onNavOpen} onClose={onNavClose} />
      <main className="main-canvas">
        <div className="ambient ambient-blue" />
        <div className="ambient ambient-coral" />
        <div className="arena-lines" />
        <div className="page-content">{children}</div>
        <button className="feedback-button" type="button" onClick={onFeedback}>
          <MessageSquareText size={15} /> Feedback
        </button>
      </main>
    </div>
  );
}
