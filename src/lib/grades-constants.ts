// Letter grade → GPA points (KNUST 4.0 scale)
export const KNUST_GRADES: Record<string, number> = {
  "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5,
  "C": 2.0, "D+": 1.5, "D": 1.0, "F": 0.0,
};

// Percentage score → letter grade (KNUST)
export const SCORE_RANGES = [
  { min: 80, grade: "A" },
  { min: 75, grade: "B+" },
  { min: 70, grade: "B" },
  { min: 65, grade: "C+" },
  { min: 60, grade: "C" },
  { min: 55, grade: "D+" },
  { min: 50, grade: "D" },
  { min: 0,  grade: "F" },
] as const;

export function scoreToGrade(score: number): string {
  for (const r of SCORE_RANGES) {
    if (score >= r.min) return r.grade;
  }
  return "F";
}

// Midpoint score for each letter grade (used for reverse CWA estimates)
export const GRADE_MIDPOINT: Record<string, number> = {
  "A": 85, "B+": 77, "B": 72, "C+": 67,
  "C": 62, "D+": 57, "D": 52, "F": 25,
};

// CWA classification thresholds (KNUST)
export type AcademicClass = {
  label: string;
  cwaMin: number;
  gpaMin: number;
  color: string;
  bgColor: string;
};

export const ACADEMIC_CLASSES: AcademicClass[] = [
  { label: "First Class",          cwaMin: 70, gpaMin: 3.5, color: "text-success",         bgColor: "bg-success/10" },
  { label: "Second Class Upper",   cwaMin: 60, gpaMin: 3.0, color: "text-accent",           bgColor: "bg-accent/10" },
  { label: "Second Class Lower",   cwaMin: 50, gpaMin: 2.0, color: "text-warning",          bgColor: "bg-warning/10" },
  { label: "Third Class",          cwaMin: 45, gpaMin: 1.0, color: "text-orange-500",       bgColor: "bg-orange-500/10" },
  { label: "Pass",                 cwaMin: 40, gpaMin: 0.5, color: "text-muted-foreground", bgColor: "bg-muted/30" },
  { label: "Fail",                 cwaMin: 0,  gpaMin: 0,   color: "text-danger",           bgColor: "bg-danger/10" },
];

export function getAcademicClass(cwa: number): AcademicClass {
  return ACADEMIC_CLASSES.find((c) => cwa >= c.cwaMin) ?? ACADEMIC_CLASSES[ACADEMIC_CLASSES.length - 1];
}

export function getAcademicClassByGPA(gpa: number): AcademicClass {
  return ACADEMIC_CLASSES.find((c) => gpa >= c.gpaMin) ?? ACADEMIC_CLASSES[ACADEMIC_CLASSES.length - 1];
}

