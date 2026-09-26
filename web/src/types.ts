export type BoutStatus = "Open" | "Judging" | "Complete" | "Draft";

export interface BoutRecord {
  id: string;
  title: string;
  repo: string;
  category: string;
  languages: string[];
  reward: number;
  reviews: number;
  estimate: string;
  deadline: string;
  status: BoutStatus;
  summary: string;
  patchA: { additions: number; deletions: number; files: number };
  patchB: { additions: number; deletions: number; files: number };
}

export interface ActivityItem {
  id: string;
  title: string;
  meta: string;
  reward: number;
  status: BoutStatus;
}
