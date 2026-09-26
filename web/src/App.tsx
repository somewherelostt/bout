import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { FeedbackDialog } from "./components/FeedbackDialog";
import { initialActivity } from "./data/mock";
import { AwardsPage } from "./pages/AwardsPage";
import { BattlePage } from "./pages/BattlePage";
import { BenchmarksPage } from "./pages/BenchmarksPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { JudgePage } from "./pages/JudgePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { VaultPage } from "./pages/VaultPage";
import type { ActivityItem } from "./types";

const storageKey = "bout-demo-activity";

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as ActivityItem[]) : initialActivity;
    } catch {
      return initialActivity;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(activity));
  }, [activity]);

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const createBout = (title: string, reward: number) => {
    const id = String(8500 + activity.length + 1);
    const next: ActivityItem = {
      id,
      title,
      meta: "private repository · just now",
      reward,
      status: "Draft",
    };
    setActivity((current) => [next, ...current]);
    navigate(`/battle/${id}`);
  };

  return (
    <AppShell
      activity={activity}
      navOpen={navOpen}
      onNavOpen={() => setNavOpen(true)}
      onNavClose={() => setNavOpen(false)}
      onFeedback={() => setFeedbackOpen(true)}
    >
      <Routes>
        <Route path="/" element={<HomePage onCreate={createBout} />} />
        <Route path="/history" element={<HistoryPage activity={activity} />} />
        <Route path="/judge" element={<JudgePage />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/benchmarks" element={<BenchmarksPage />} />
        <Route path="/awards" element={<AwardsPage />} />
        <Route path="/battle/:id" element={<BattlePage activity={activity} />} />
        <Route path="/new" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </AppShell>
  );
}
