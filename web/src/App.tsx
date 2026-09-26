import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { createBout, loadWorkspace } from "./api";
import { AppShell } from "./components/AppShell";
import { FeedbackDialog } from "./components/FeedbackDialog";
import { AwardsPage } from "./pages/AwardsPage";
import { BattlePage } from "./pages/BattlePage";
import { BenchmarksPage } from "./pages/BenchmarksPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { JudgePage } from "./pages/JudgePage";
import { MethodPage } from "./pages/MethodPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SecurityPage } from "./pages/SecurityPage";
import { VaultPage } from "./pages/VaultPage";
import type { CreateBoutInput, WorkspaceSnapshot } from "./types";

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setSnapshot(await loadWorkspace());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleCreate = async (input: CreateBoutInput) => {
    const result = await createBout(input);
    await refresh();
    navigate(`/battle/${result.battleId}`);
  };

  if (!snapshot && !error) {
    return (
      <div className="boot-state">
        <div className="boot-window">
          <div className="window-titlebar"><span>BOUT.EXE</span><span className="window-controls" aria-hidden="true"><i /><i /><i /></span></div>
          <div className="boot-body">
            <strong>Opening your Bout workspace…</strong>
            <span>Reading local battle bundles and live connection status.</span>
            <div className="boot-progress" aria-label="Loading"><i /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="boot-state error-state">
        <div className="boot-window">
          <div className="window-titlebar"><span>BOUT.EXE / CONNECTION ERROR</span><span className="window-controls" aria-hidden="true"><i /><i /><i /></span></div>
          <div className="boot-body">
            <AlertTriangle size={24} />
            <strong>The local Bout API is unavailable.</strong>
            <span>{error}</span>
            <button className="primary-button" type="button" onClick={() => void refresh()}><RefreshCw size={16} /> Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      activity={snapshot.battles}
      navOpen={navOpen}
      onNavOpen={() => setNavOpen(true)}
      onNavClose={() => setNavOpen(false)}
      onFeedback={() => setFeedbackOpen(true)}
    >
      {error && <div className="sync-warning"><AlertTriangle size={14} /> {error}</div>}
      <Routes>
        <Route
          path="/"
          element={(
            <HomePage
              onCreate={handleCreate}
              hostedReadOnly={snapshot.storage.persistence === "Read-only"}
            />
          )}
        />
        <Route path="/history" element={<HistoryPage battles={snapshot.battles} />} />
        <Route path="/judge" element={<JudgePage snapshot={snapshot} />} />
        <Route path="/vault" element={<VaultPage snapshot={snapshot} />} />
        <Route path="/benchmarks" element={<BenchmarksPage snapshot={snapshot} />} />
        <Route path="/evidence" element={<Navigate to="/benchmarks" replace />} />
        <Route path="/method" element={<MethodPage snapshot={snapshot} />} />
        <Route path="/security" element={<SecurityPage snapshot={snapshot} />} />
        <Route path="/awards" element={<AwardsPage snapshot={snapshot} />} />
        <Route
          path="/battle/:id"
          element={<BattlePage battles={snapshot.battles} onSaved={refresh} />}
        />
        <Route path="/new" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </AppShell>
  );
}
