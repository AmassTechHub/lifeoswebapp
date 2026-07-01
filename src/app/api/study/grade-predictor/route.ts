import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function daysUntil(date: Date | string): number {
  const due = new Date(date);
  const now = new Date(); now.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

function predictGrade(score: number): string {
  if (score >= 70) return "A";
  if (score >= 65) return "B+";
  if (score >= 60) return "B";
  if (score >= 55) return "C+";
  if (score >= 50) return "C";
  if (score >= 45) return "D+";
  if (score >= 40) return "D";
  return "F";
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 86_400_000);
  const since30 = new Date(now.getTime() - 30 * 86_400_000);

  const [courses, sessions30, flashcards, deadlines] = await Promise.all([
    prisma.studyCourse.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, _count: { select: { notes: true, materials: true } } },
    }),
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: since30 } },
      select: { courseId: true, cardsReviewed: true, cardsCorrect: true, startedAt: true, durationSecs: true },
    }),
    prisma.flashcard.findMany({
      where: { userId },
      select: { courseId: true, difficulty: true, reviewCount: true },
    }),
    prisma.deadline.findMany({
      where: { userId, completed: false, type: { in: ["EXAM", "QUIZ"] }, dueDate: { gte: now } },
      select: { courseId: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const predictors = courses.map(course => {
    const courseSessions = sessions30.filter(s => s.courseId === course.id);
    const sessions7 = courseSessions.filter(s => s.startedAt >= since7);
    const courseCards = flashcards.filter(f => f.courseId === course.id);
    const nearestExam = deadlines.find(d => d.courseId === course.id);

    const totalReviewed = courseSessions.reduce((s, r) => s + r.cardsReviewed, 0);
    const totalCorrect = courseSessions.reduce((s, r) => s + r.cardsCorrect, 0);
    const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : null;

    const totalCards = courseCards.length;
    const masteredCards = courseCards.filter(f => f.difficulty === 1 && f.reviewCount >= 2).length;
    const hardCards = courseCards.filter(f => f.difficulty === 3).length;

    const daysToExam = nearestExam ? daysUntil(nearestExam.dueDate) : null;
    const studySessionsLast7 = sessions7.length;

    // Score calculation: weighted composite
    let score = 50; // baseline
    let confidence: "high" | "medium" | "low" = "low";

    if (accuracy !== null) {
      // Flashcard accuracy is the strongest signal
      score = accuracy * 0.6 + 40; // maps 0-100% accuracy → 40-100 score
      score = Math.min(score, 95);

      if (totalCards > 10) confidence = totalReviewed > 20 ? "high" : "medium";
      else confidence = "medium";
    } else if (totalCards > 0) {
      // Has cards but hasn't reviewed — penalty
      score = 45 + (masteredCards / Math.max(totalCards, 1)) * 30;
      confidence = "low";
    }

    // Materials/notes bonus
    if (course._count.materials > 0) score = Math.min(score + 5, 95);
    if (course._count.notes > 3) score = Math.min(score + 5, 95);

    // Hard cards penalty
    if (totalCards > 0) {
      const hardRatio = hardCards / totalCards;
      score -= hardRatio * 15;
    }

    // Recent study sessions boost
    if (studySessionsLast7 >= 5) score = Math.min(score + 8, 95);
    else if (studySessionsLast7 >= 3) score = Math.min(score + 4, 95);
    else if (studySessionsLast7 === 0 && daysToExam !== null && daysToExam <= 7) score -= 10;

    // Exam urgency penalty if under-prepared
    if (daysToExam !== null && daysToExam <= 3 && score < 65) score -= 5;

    score = Math.max(20, Math.min(95, Math.round(score)));
    const predictedGrade = predictGrade(score);

    // Recommendation
    let recommendation = "";
    let needsAttention = false;

    if (score < 50) {
      recommendation = "Critical: Upload slides, generate flashcards, and do 2 study sessions per day.";
      needsAttention = true;
    } else if (score < 60 && daysToExam !== null && daysToExam <= 7) {
      recommendation = `Exam in ${daysToExam} days — run Exam Prep Quiz daily and review all hard flashcards.`;
      needsAttention = true;
    } else if (hardCards > totalCards * 0.3 && totalCards > 5) {
      recommendation = `${hardCards} cards still rated "Hard". Focus review sessions on those.`;
      needsAttention = true;
    } else if (studySessionsLast7 < 2 && totalCards > 0) {
      recommendation = "Study consistency is low. Aim for at least 3 sessions this week.";
      needsAttention = score < 70;
    } else if (score >= 80) {
      recommendation = "On track for an A. Keep your review schedule to maintain this.";
    } else if (score >= 70) {
      recommendation = "Good progress. One more focused session per week could push this to an A.";
    } else {
      recommendation = "Increase flashcard review frequency and use AI Tutor → Teach Me for weak topics.";
    }

    return {
      courseId: course.id,
      courseName: course.name,
      courseColor: course.color,
      flashcardAccuracy: accuracy,
      cardsReviewed: totalReviewed,
      totalCards,
      daysUntilExam: daysToExam,
      studySessionsLast7,
      predictedGrade,
      predictedScore: score,
      confidence,
      recommendation,
      needsAttention,
    };
  }).filter(c => c.totalCards > 0 || c.cardsReviewed > 0); // Only courses with some data

  // Overall projection
  let overallProjection = "";
  if (predictors.length > 0) {
    const avgScore = Math.round(predictors.reduce((s, c) => s + c.predictedScore, 0) / predictors.length);
    const grade = predictGrade(avgScore);
    overallProjection = `Projected average: ${grade} (~${avgScore}%)`;
  }

  return NextResponse.json({ courses: predictors, overallProjection });
}
