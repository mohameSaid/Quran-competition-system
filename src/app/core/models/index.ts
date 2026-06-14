// ─────────────────────────────────────────────────────────────
// DOMAIN MODELS  — single source of truth
// ─────────────────────────────────────────────────────────────

export type UserRole              = 'admin' | 'sheikh' | 'public';
export type CompetitionCategory   = 'full30' | 'half15' | 'ten10' | 'five5';
export type StudentStatus         = 'pending' | 'scheduled' | 'evaluated' | 'published';
export type SessionStatus         = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

// ── Auth user (stored in /users/{uid}) ───────────────────────
export interface AppUser {
  uid:          string;
  email:        string;
  displayName:  string;
  role:         UserRole;
  sheikhId?:    string;   // only when role === 'sheikh'
  createdAt:    Date;
}

// ── Sheikh (stored in /sheikhs/{id}) ─────────────────────────
export interface Sheikh {
  id:               string;
  name:             string;
  phone:            string;
  categories:       CompetitionCategory[];
  totalEvaluated:   number;
  isActive:         boolean;
  createdAt:        Date;
  createdBy:        string;
}

// ── Student (stored in /competitions/{cId}/students/{id}) ────
export interface Student {
  id:             string;
  fullName:       string;
  nationalId:     string;
  parentPhone:    string;
  sheikhId:       string;   // FK → /sheikhs/{id}
  sheikhName:     string;   // denormalised for display
  age:            number;
  juzCount:       number;   // memorised juz (1–30)
  category:       CompetitionCategory;
  status:         StudentStatus;
  sessionId?:     string;
  competitionId:  string;
  registeredBy:   string;   // uid
  createdAt:      Date;
  updatedAt:      Date;
}

// ── Score (stored in /competitions/{cId}/scores/{id}) ────────
export interface ScoreBreakdown {
  hifz:    number;  // /40
  tajweed: number;  // /30
  ada:     number;  // /20
  waqf:    number;  // /10
}
export interface Score {
  id:          string;
  studentId:   string;
  studentName: string;   // denormalised
  sessionId:   string;
  sheikhId:    string;
  breakdown:   ScoreBreakdown;
  total:       number;
  notes:       string;
  isPublished: boolean;
  submittedAt: Date;
  submittedBy: string;
}

// ── Session (stored in /competitions/{cId}/sessions/{id}) ────
export interface ExamSession {
  id:           string;
  name:         string;
  competitionId:string;
  sheikhId:     string;
  sheikhName:   string;
  category:     CompetitionCategory;
  date:         Date;
  startTime:    string;
  endTime:      string;
  capacity:     number;
  studentIds:   string[];
  status:       SessionStatus;
  createdAt:    Date;
  createdBy:    string;
}

// ── Competition (/competitions/{id}) ─────────────────────────
export interface Competition {
  id:                 string;
  name:               string;
  year:               number;
  village?:           string;
  registrationOpen:   boolean;
  resultsPublished:   boolean;
  prizes:             Record<CompetitionCategory, number>;
  registrationStart:  Date;
  registrationEnd:    Date;
  examStart:          Date;
  examEnd:            Date;
  resultsDate:        Date;
  ceremonyDate:       Date;
  createdAt:          Date;
}

// ── Audit log (/auditLogs/{id}) — immutable ──────────────────
export interface AuditLog {
  id:         string;
  action:     string;
  userId:     string;
  userEmail:  string;
  targetId?:  string;
  targetType?:string;
  meta?:      Record<string, unknown>;
  timestamp:  Date;
}

// ── UI constants ─────────────────────────────────────────────
export const CATEGORY_LABELS: Record<CompetitionCategory, string> = {
  full30: 'الحفظ الكامل (30 جزء)',
  half15: '15 جزءاً',
  ten10:  '10 أجزاء',
  five5:  '5 أجزاء',
};

export const SCORE_MAX: ScoreBreakdown = { hifz: 40, tajweed: 30, ada: 20, waqf: 10 };

export const JUZ_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);
