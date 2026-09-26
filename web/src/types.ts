export type BoutStatus = "Published" | "Prepared" | "Complete" | "Draft";

export interface BoutRecord {
  id: string;
  title: string;
  repo: string;
  reward: number;
  minimumPayout: number;
  createdAt: string;
  deadline: string | null;
  status: BoutStatus;
  task: string;
  verificationCommand: string | null;
  patchA: PatchRecord;
  patchB: PatchRecord;
  verdict: VerdictRecord | null;
  publicationTaskId: string | null;
}

export interface PatchRecord {
  content: string;
  sha256: string;
  additions: number;
  deletions: number;
  files: number;
}

export interface VerdictRecord {
  winner: "A" | "B";
  rationale: string;
  submittedAt: string;
}

export interface LiveBounty {
  id: string;
  title: string;
  tags: string[];
  reward: number;
  symbol: string;
  submissions: number;
  deadline: string | null;
  minSubmissionAmount: number;
}

export interface WorkspaceStats {
  total: number;
  prepared: number;
  published: number;
  reviewed: number;
  totalPool: number;
}

export interface WorkspaceSnapshot {
  battles: BoutRecord[];
  liveBounties: LiveBounty[];
  liveStatus: "connected" | "unconfigured" | "error";
  liveMessage: string;
  workspacePath: string;
  stats: WorkspaceStats;
}

export interface CreateBoutInput {
  task: string;
  repository: string;
  candidateOne: string;
  candidateTwo: string;
  verificationCommand?: string;
  poolAmount: number;
  minimumPayout: number;
  deadline?: string;
}
