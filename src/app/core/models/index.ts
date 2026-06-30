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
  email?:           string;
  authUid?:         string;
  categories:       CompetitionCategory[];
  totalEvaluated:   number;
  isActive:         boolean;
  createdAt:        Date;
  createdBy:        string;
}

// ── Memorizer / محفّظ (stored in /memorizers/{id}) ─────────────
export interface Memorizer {
  id:        string;
  name:      string;
  isActive:  boolean;
  createdAt: Date;
}

// ── Student (stored in /competitions/{cId}/students/{id}) ────
export interface Student {
  id:             string;
  fullName:       string;   // اسم المتسابق — رباعي على الأقل
  nationalId:     string;   // الرقم القومي (14 رقم) — المصدر الأساسي، يُشتق منه تاريخ الميلاد
  motherName:     string;   // اسم الأم (إجباري)
  birthPlace:     string;   // محل الميلاد الحالي
  birthDate:      Date;     // مُشتق برمجياً من الرقم القومي
  parentPhone:    string;   // رقم هاتف ولي الأمر
  alternatePhone: string;   // رقم هاتف آخر
  memorizerId:    string;   // يطابق memorizerName (نص حر، ليس FK)
  memorizerName:  string;   // اسم المحفّظ (نص حر)
  juzCount:       number;
  previousLevel:  string;   // المستوى السابق في آخر مسابقة
  category:       CompetitionCategory;   // يختاره المتسابق صراحةً (مع التحقق مقابل عدد الأجزاء)
  status:         StudentStatus;
  sessionId?:     string;
  competitionId:  string;
  registeredBy:   string;
  createdAt:      Date;
  updatedAt:      Date;
  /** @deprecated legacy records */
  age?:           number;
  sheikhId?:      string;
  sheikhName?:    string;
}

// ── Score (stored in /competitions/{cId}/scores/{id}) ────────

/** نظام التقييم الفعّال — قابل للتبديل من إعدادات المسابقة */
export type EvaluationSystem = 'legacy' | 'questions10';

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
  /** present in legacy system only; absent for questions10 scores */
  breakdown?:  ScoreBreakdown;
  total:       number;
  notes:       string;
  isPublished: boolean;
  submittedAt: Date;
  submittedBy: string;
  /** undefined ⇒ legacy (old records). 'questions10' ⇒ uses `questions`. */
  system?:        EvaluationSystem;
  /** questions10 only — 10 integers, each /10, summed into `total` */
  questions?:     number[];
  /** التجويد — للتكريم فقط، خارج المجموع الأساسي (/10) */
  tajweedScore?:  number;
}

// ── Evaluation config (derived at runtime from competition settings) ──
export interface EvaluationCriterion {
  key:    string;   // hifz | tajweed | ada | waqf | q1..q10
  label:  string;
  max:    number;
  desc?:  string;
  color?: string;
}
export interface EvaluationConfig {
  system:   EvaluationSystem;
  criteria: EvaluationCriterion[];   // الأبواب التي تُجمع في المجموع
  maxTotal: number;                  // 100
  /** التجويد المنفصل (تكريم فقط) — خارج المجموع */
  tajweed:  { enabled: boolean; required: boolean; max: number };
  waqfEnabled: boolean;              // معطّل مؤقتاً
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

  // ── Dynamic settings (إعدادات المسابقة) — additive, defaulted on read ──
  /** نظام التقييم الفعّال (افتراضي: questions10) */
  evaluationSystem?:        EvaluationSystem;
  /** تفعيل تقييم التجويد */
  tajweedEnabled?:          boolean;
  /** التجويد إجباري فقط في مستوى ختم القرآن (full30) */
  tajweedRequiredAtKhatm?:  boolean;
  /** الربط مع بيانات المسابقات السابقة */
  previousLinkingEnabled?:  boolean;
  /** أنواع الاختبارات المتاحة */
  examTypes?:               string[];
}

/** القيم الافتراضية للإعدادات الديناميكية (عند غياب الحقل على الوثيقة) */
export const DEFAULT_COMPETITION_SETTINGS = {
  evaluationSystem:       'questions10' as EvaluationSystem,
  tajweedEnabled:         true,
  tajweedRequiredAtKhatm: true,
  previousLinkingEnabled: false,
  examTypes:              [] as string[],
};

// ── Home page CMS content (/siteContent/home) ────────────────
export interface HeroStat    { label: string; value: string; }
export interface NewsItem    { id: string; title: string; body: string; date: Date | null; image?: string; tag?: string; }
export interface FigureItem  { id: string; name: string; role: string; photo?: string; }
export interface ServiceItem { id: string; title: string; desc: string; icon?: string; }
export interface ObituaryItem{ id: string; name: string; text: string; date: Date | null; }
export interface HomeContent {
  heroStats:  HeroStat[];
  news:       NewsItem[];
  figures:    FigureItem[];
  services:   ServiceItem[];
  obituaries: ObituaryItem[];
}

// ── Previous-competition participation (/previousParticipations/{id}) ──
export interface PreviousParticipation {
  id?:            string;
  name:           string;
  birthDate:      Date | null;
  mobileNumbers:  string[];
  studyGrade:     string;
  memorizerName:  string;
  memorizedParts: string;
  level:          string;
  notes:          string | null;
}

// ── Audit log — removed (cost/performance)

// ── UI constants ─────────────────────────────────────────────
export const CATEGORY_LABELS: Record<CompetitionCategory, string> = {
  full30: 'الحفظ الكامل (30 جزء)',
  half15: '15 جزءاً',
  ten10:  '10 أجزاء',
  five5:  '5 أجزاء',
};

export const SCORE_MAX: ScoreBreakdown = { hifz: 40, tajweed: 30, ada: 20, waqf: 10 };

export const JUZ_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

/** ترتيب المستويات تصاعدياً — يُستخدم لقاعدة "مساوٍ أو أعلى" في اختيار المستوى */
export const CATEGORY_RANK: Record<CompetitionCategory, number> = {
  five5: 1, ten10: 2, half15: 3, full30: 4,
};

/** أدنى عدد أجزاء مطلوب لكل مستوى — للتحقق من اتساق المستوى مع الحفظ */
export const CATEGORY_MIN_JUZ: Record<CompetitionCategory, number> = {
  five5: 5, ten10: 10, half15: 15, full30: 30,
};


export enum StudentStatusEnum {
  Pending = 'pending',
  Scheduled = 'scheduled',
  Evaluated = 'evaluated',
  Published = 'published',
}