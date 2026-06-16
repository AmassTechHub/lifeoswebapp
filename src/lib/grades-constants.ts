// ── Grading systems ──────────────────────────────────────────────────────────

export type GradingSystemKey = "knust" | "us" | "uk_percentage";

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
  description: "80=A, 75=B+, 70=B… | First Class ≥70%",
  grades: { "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5, "C": 2.0, "D+": 1.5, "D": 1.0, "F": 0.0 },
  scoreRanges: [
    { min: 80, grade: "A" }, { min: 75, grade: "B+" }, { min: 70, grade: "B" },
    { min: 65, grade: "C+" }, { min: 60, grade: "C" }, { min: 55, grade: "D+" },
    { min: 50, grade: "D" }, { min: 0, grade: "F" },
  ],
  midpoints: { "A": 85, "B+": 77, "B": 72, "C+": 67, "C": 62, "D+": 57, "D": 52, "F": 25 },
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

export const GRADING_SYSTEMS: Record<GradingSystemKey, GradingSystem> = {
  knust: KNUST_SYSTEM,
  us: US_SYSTEM,
  uk_percentage: UK_SYSTEM,
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
