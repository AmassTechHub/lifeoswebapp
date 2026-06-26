// ── Grading systems ──────────────────────────────────────────────────────────

export type GradingSystemKey = "knust" | "us" | "uk_percentage" | "ib" | "waec" | "custom_100";

export type GradingSystem = {
  key: GradingSystemKey;
  label: string;
  description: string;
  grades: Record<string, number>; // letter grade → GPA/points
  scoreRanges: { min: number; grade: string }[];
  midpoints: Record<string, number>;
  classifications: AcademicClass[];
  maxGPA: number;
  usePercentageAsDefault: boolean;
};

export type AcademicClass = {
  label: string;
  cwaMin: number;
  gpaMin: number;
  color: string;
  bgColor: string;
};

// ── KNUST / UK Commonwealth (percentage-based, 4.0 GPA) ─────────────────────
const KNUST_SYSTEM: GradingSystem = {
  key: "knust",
  label: "KNUST / Commonwealth",
  description: "70=A, 65=B+, 60=B… | First Class ≥70%",
  grades: { "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5, "C": 2.0, "D+": 1.5, "D": 1.0, "F": 0.0 },
  scoreRanges: [
    { min: 70, grade: "A" }, { min: 65, grade: "B+" }, { min: 60, grade: "B" },
    { min: 55, grade: "C+" }, { min: 50, grade: "C" }, { min: 45, grade: "D+" },
    { min: 40, grade: "D" }, { min: 0, grade: "F" },
  ],
  midpoints: { "A": 75, "B+": 67, "B": 62, "C+": 57, "C": 52, "D+": 47, "D": 42, "F": 20 },
  classifications: [
    { label: "First Class",        cwaMin: 70, gpaMin: 3.5, color: "text-success",         bgColor: "bg-success/10" },
    { label: "Second Class Upper", cwaMin: 60, gpaMin: 3.0, color: "text-accent",           bgColor: "bg-accent/10" },
    { label: "Second Class Lower", cwaMin: 50, gpaMin: 2.0, color: "text-warning",          bgColor: "bg-warning/10" },
    { label: "Third Class",        cwaMin: 45, gpaMin: 1.0, color: "text-orange-500",       bgColor: "bg-orange-500/10" },
    { label: "Pass",               cwaMin: 40, gpaMin: 0.5, color: "text-muted-foreground", bgColor: "bg-muted/30" },
    { label: "Fail",               cwaMin: 0,  gpaMin: 0,   color: "text-danger",           bgColor: "bg-danger/10" },
  ],
  maxGPA: 4.0,
  usePercentageAsDefault: true,
};

// ── US Standard (letter grade, 4.0 GPA) ─────────────────────────────────────
const US_SYSTEM: GradingSystem = {
  key: "us",
  label: "US Standard (4.0)",
  description: "93=A, 90=A-, 87=B+… | GPA 4.0 scale",
  grades: { "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0 },
  scoreRanges: [
    { min: 93, grade: "A" }, { min: 90, grade: "A-" }, { min: 87, grade: "B+" },
    { min: 83, grade: "B" }, { min: 80, grade: "B-" }, { min: 77, grade: "C+" },
    { min: 73, grade: "C" }, { min: 70, grade: "C-" }, { min: 60, grade: "D" },
    { min: 0,  grade: "F" },
  ],
  midpoints: { "A": 96, "A-": 91, "B+": 88, "B": 85, "B-": 81, "C+": 78, "C": 75, "C-": 71, "D": 65, "F": 30 },
  classifications: [
    { label: "Summa Cum Laude", cwaMin: 97, gpaMin: 3.9, color: "text-success",         bgColor: "bg-success/10" },
    { label: "Magna Cum Laude", cwaMin: 93, gpaMin: 3.7, color: "text-accent",           bgColor: "bg-accent/10" },
    { label: "Cum Laude",       cwaMin: 90, gpaMin: 3.5, color: "text-warning",          bgColor: "bg-warning/10" },
    { label: "Good Standing",   cwaMin: 70, gpaMin: 2.0, color: "text-muted-foreground", bgColor: "bg-muted/30" },
    { label: "Probation",       cwaMin: 60, gpaMin: 1.0, color: "text-orange-500",       bgColor: "bg-orange-500/10" },
    { label: "Fail",            cwaMin: 0,  gpaMin: 0,   color: "text-danger",           bgColor: "bg-danger/10" },
  ],
  maxGPA: 4.0,
  usePercentageAsDefault: false,
};

// ── UK Percentage (Hons classification) ─────────────────────────────────────
const UK_SYSTEM: GradingSystem = {
  key: "uk_percentage",
  label: "UK Percentage",
  description: "70%=First, 60%=2:1, 50%=2:2…",
  grades: { "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5, "C": 2.0, "D": 1.0, "F": 0.0 },
  scoreRanges: [
    { min: 70, grade: "A" }, { min: 60, grade: "B+" }, { min: 50, grade: "B" },
    { min: 40, grade: "C" }, { min: 0, grade: "F" },
  ],
  midpoints: { "A": 80, "B+": 65, "B": 55, "C+": 52, "C": 45, "D": 35, "F": 20 },
  classifications: [
    { label: "First Class (1st)",  cwaMin: 70, gpaMin: 3.5, color: "text-success",         bgColor: "bg-success/10" },
    { label: "Upper Second (2:1)", cwaMin: 60, gpaMin: 3.0, color: "text-accent",           bgColor: "bg-accent/10" },
    { label: "Lower Second (2:2)", cwaMin: 50, gpaMin: 2.0, color: "text-warning",          bgColor: "bg-warning/10" },
    { label: "Third Class (3rd)",  cwaMin: 40, gpaMin: 1.0, color: "text-orange-500",       bgColor: "bg-orange-500/10" },
    { label: "Fail",               cwaMin: 0,  gpaMin: 0,   color: "text-danger",           bgColor: "bg-danger/10" },
  ],
  maxGPA: 4.0,
  usePercentageAsDefault: true,
};

// ── IB (International Baccalaureate) — 1-7 scale ────────────────────────────
const IB_SYSTEM: GradingSystem = {
  key: "ib",
  label: "IB (International Baccalaureate)",
  description: "7-point scale | 7=Excellent, 4=Satisfactory, 3=Mediocre",
  grades: { "7": 4.0, "6": 3.5, "5": 3.0, "4": 2.5, "3": 2.0, "2": 1.0, "1": 0.0 },
  scoreRanges: [
    { min: 86, grade: "7" }, { min: 72, grade: "6" }, { min: 58, grade: "5" },
    { min: 44, grade: "4" }, { min: 30, grade: "3" }, { min: 15, grade: "2" },
    { min: 0,  grade: "1" },
  ],
  midpoints: { "7": 93, "6": 79, "5": 65, "4": 51, "3": 37, "2": 22, "1": 7 },
  classifications: [
    { label: "Bilingual Diploma (7+7)",  cwaMin: 86, gpaMin: 3.7, color: "text-success",         bgColor: "bg-success/10" },
    { label: "Diploma with Distinction", cwaMin: 72, gpaMin: 3.3, color: "text-accent",           bgColor: "bg-accent/10" },
    { label: "Diploma",                  cwaMin: 44, gpaMin: 2.5, color: "text-warning",          bgColor: "bg-warning/10" },
    { label: "Conditional Pass",         cwaMin: 30, gpaMin: 2.0, color: "text-orange-500",       bgColor: "bg-orange-500/10" },
    { label: "No Diploma",               cwaMin: 0,  gpaMin: 0,   color: "text-danger",           bgColor: "bg-danger/10" },
  ],
  maxGPA: 4.0,
  usePercentageAsDefault: true,
};

// ── WAEC / WASSCE (West Africa) ───────────────────────────────────────────────
const WAEC_SYSTEM: GradingSystem = {
  key: "waec",
  label: "WAEC / WASSCE",
  description: "A1–F9 scale | A1 Excellent, C6 Credit, F9 Fail",
  grades: { "A1": 4.0, "B2": 3.5, "B3": 3.2, "C4": 3.0, "C5": 2.5, "C6": 2.0, "D7": 1.5, "E8": 1.0, "F9": 0.0 },
  scoreRanges: [
    { min: 75, grade: "A1" }, { min: 70, grade: "B2" }, { min: 65, grade: "B3" },
    { min: 60, grade: "C4" }, { min: 55, grade: "C5" }, { min: 50, grade: "C6" },
    { min: 45, grade: "D7" }, { min: 40, grade: "E8" }, { min: 0,  grade: "F9" },
  ],
  midpoints: { "A1": 88, "B2": 72, "B3": 67, "C4": 62, "C5": 57, "C6": 52, "D7": 47, "E8": 42, "F9": 20 },
  classifications: [
    { label: "Distinction (A1–B3)",   cwaMin: 65, gpaMin: 3.2, color: "text-success",         bgColor: "bg-success/10" },
    { label: "Credit (C4–C6)",        cwaMin: 50, gpaMin: 2.0, color: "text-accent",           bgColor: "bg-accent/10" },
    { label: "Pass (D7–E8)",          cwaMin: 40, gpaMin: 1.0, color: "text-warning",          bgColor: "bg-warning/10" },
    { label: "Fail (F9)",             cwaMin: 0,  gpaMin: 0,   color: "text-danger",           bgColor: "bg-danger/10" },
  ],
  maxGPA: 4.0,
  usePercentageAsDefault: true,
};

// ── Generic 100% scale (no institution-specific classifications) ─────────────
const CUSTOM_100_SYSTEM: GradingSystem = {
  key: "custom_100",
  label: "Generic Percentage (0–100%)",
  description: "Simple 100% scale | No institutional classification",
  grades: { "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0 },
  scoreRanges: [
    { min: 80, grade: "A" }, { min: 70, grade: "B" }, { min: 60, grade: "C" },
    { min: 50, grade: "D" }, { min: 0,  grade: "F" },
  ],
  midpoints: { "A": 90, "B": 75, "C": 65, "D": 55, "F": 25 },
  classifications: [
    { label: "Distinction",  cwaMin: 80, gpaMin: 3.5, color: "text-success",         bgColor: "bg-success/10" },
    { label: "Merit",        cwaMin: 70, gpaMin: 3.0, color: "text-accent",           bgColor: "bg-accent/10" },
    { label: "Pass",         cwaMin: 50, gpaMin: 2.0, color: "text-warning",          bgColor: "bg-warning/10" },
    { label: "Fail",         cwaMin: 0,  gpaMin: 0,   color: "text-danger",           bgColor: "bg-danger/10" },
  ],
  maxGPA: 4.0,
  usePercentageAsDefault: true,
};

export const GRADING_SYSTEMS: Record<GradingSystemKey, GradingSystem> = {
  knust: KNUST_SYSTEM,
  us: US_SYSTEM,
  uk_percentage: UK_SYSTEM,
  ib: IB_SYSTEM,
  waec: WAEC_SYSTEM,
  custom_100: CUSTOM_100_SYSTEM,
};

export const DEFAULT_SYSTEM = KNUST_SYSTEM;

// ── Backward-compat exports (used by existing server actions) ────────────────
export const KNUST_GRADES = KNUST_SYSTEM.grades;
export const SCORE_RANGES = KNUST_SYSTEM.scoreRanges;
export const GRADE_MIDPOINT = KNUST_SYSTEM.midpoints;
export const ACADEMIC_CLASSES = KNUST_SYSTEM.classifications;

export function scoreToGrade(score: number, system: GradingSystem = DEFAULT_SYSTEM): string {
  for (const r of system.scoreRanges) {
    if (score >= r.min) return r.grade;
  }
  return "F";
}

export function getAcademicClass(wa: number, system: GradingSystem = DEFAULT_SYSTEM): AcademicClass {
  return system.classifications.find((c) => wa >= c.cwaMin) ?? system.classifications[system.classifications.length - 1];
}

export function getAcademicClassByGPA(gpa: number, system: GradingSystem = DEFAULT_SYSTEM): AcademicClass {
  return system.classifications.find((c) => gpa >= c.gpaMin) ?? system.classifications[system.classifications.length - 1];
}
