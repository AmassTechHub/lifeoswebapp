import {
  Bot,
  Calendar,
  CheckSquare,
  ClipboardList,
  DollarSign,
  Flame,
  GraduationCap,
  PenLine,
  Target,
  Users,
  Video,
  Zap,
} from "lucide-react";

export const modules = [
  {
    icon: Target,
    name: "Goals",
    tag: "VISION TO DAILY",
    headline: "Vision down to today.",
    description: "Hierarchy from your life vision down to today's priorities.",
  },
  {
    icon: PenLine,
    name: "Planner",
    tag: "DAILY BLOCKS",
    headline: "Structured days, start to finish.",
    description: "Morning devotion through nightly review with structured days.",
  },
  {
    icon: Calendar,
    name: "Calendar",
    tag: "SMART SCHEDULE",
    headline: "Every event in one place.",
    description: "Classes, clients, church, and personal events unified.",
  },
  {
    icon: CheckSquare,
    name: "Tasks",
    tag: "KANBAN",
    headline: "Backlog to done, clearly.",
    description: "From backlog to done across academics, coding, clients, and content.",
  },
  {
    icon: Flame,
    name: "Habits",
    tag: "STREAKS",
    headline: "Build streaks that stick.",
    description: "Devotion, study, coding, and exercise on a GitHub style heatmap.",
  },
  {
    icon: GraduationCap,
    name: "Learning",
    tag: "SKILL TRACKER",
    headline: "Track what you master.",
    description: "Track learned, practiced, built, and confidence per topic.",
  },
  {
    icon: Video,
    name: "Content Hub",
    tag: "CREATOR PIPELINE",
    headline: "Ideas to published content.",
    description: "From ideas through script, record, and publish for every channel.",
  },
  {
    icon: Users,
    name: "Clients",
    tag: "CLIENT OS",
    headline: "Client work, one hub.",
    description: "Tasks, payments, deadlines, deliverables in one hub.",
  },
  {
    icon: DollarSign,
    name: "Finance",
    tag: "MONEY CLARITY",
    headline: "See where money goes.",
    description:
      "Track every expense and income, visualize spending, and manage client payments. MoMo integration coming to pay and control spend from Life OS.",
  },
  {
    icon: Bot,
    name: "AI Coach",
    tag: "AUTOMATION",
    headline: "AI that runs your week.",
    description: "Plans your day, reviews your week, coaches every domain.",
  },
] as const;

/** Homepage capability cards — what users actually get from Life OS. */
export const landingCapabilities = [
  {
    clayImage: "/clay/clay-navigator.webp",
    glow: "violet",
    title: "AI Coach and Smart System",
    tag: "AUTOMATION",
    description:
      "Life OS plans your day, generates today's focus, runs weekly reviews, and coaches study and content when you need it.",
    bullets: [
      "Daily focus from your goals and calendar",
      "Timetable upload with AI schedule merge",
      "Weekly review and priority suggestions",
    ],
    orbDelay: "0s",
  },
  {
    clayImage: "/clay/clay-hourglass.webp",
    glow: "amber",
    title: "Scheduling and Calendar",
    tag: "SMART SCHEDULE",
    description:
      "Classes, client calls, church, and personal blocks in one timeline. Your week is built around how you actually live.",
    bullets: [
      "Unified calendar for every part of life",
      "AI fills gaps with goals and deep work",
      "Today's schedule on your dashboard",
    ],
    orbDelay: "0.5s",
  },
  {
    clayImage: "/clay/clay-ladder.webp",
    glow: "orange",
    title: "Goals, Tasks, and Planner",
    tag: "VISION TO DAILY",
    description:
      "Vision down to today's tasks in one hierarchy. Planner blocks your day from morning devotion to nightly review.",
    bullets: [
      "Goals linked to daily priorities",
      "Kanban tasks across academics and clients",
      "Structured daily and weekly planning",
    ],
    orbDelay: "1s",
  },
  {
    clayImage: "/clay/clay-sprout.webp",
    glow: "green",
    title: "Habit Tracker",
    tag: "STREAKS",
    description:
      "Build streaks that stick. Track devotion, study, coding, and exercise on a GitHub style heatmap.",
    bullets: [
      "Daily habit check-ins",
      "Streak and consistency view",
      "Habits tied to your life domains",
    ],
    orbDelay: "1.5s",
  },
  {
    clayImage: "/clay/clay-receipt.webp",
    glow: "pink",
    title: "Finance and Expense Tracking",
    tag: "MONEY CLARITY",
    description:
      "Log income and expenses, see where money goes, and track savings and client revenue in one place.",
    bullets: [
      "Expense categories and spending charts",
      "Income vs outflow at a glance",
      "Client payments linked to Finance",
    ],
    comingSoon: "MoMo and mobile money payments from Life OS so you control spending in the app.",
    orbDelay: "2s",
  },
  {
    clayImage: "/clay/clay-director.webp",
    glow: "yellow",
    title: "Learning and Content Hub",
    tag: "GROWTH",
    description:
      "Track skills you are mastering and run a creator pipeline from idea to published content.",
    bullets: [
      "Skill tracker with confidence levels",
      "Content stages from script to publish",
      "Study blocks scheduled by AI Coach",
    ],
    orbDelay: "2.5s",
  },
] as const;

export const smartAutomations = [
  {
    icon: Zap,
    title: "Generate today's focus automatically",
    description: "AI reads your goals, tasks, and calendar with no manual sorting.",
  },
  {
    icon: Calendar,
    title: "Upload timetable, get your schedule",
    description: "Drop your school or work timetable. Life OS builds your week.",
  },
  {
    icon: ClipboardList,
    title: "Weekly review in one click",
    description: "AI summarizes progress, gaps, and what to prioritize next.",
  },
  {
    icon: CheckSquare,
    title: "Tasks from context",
    description: "Deadlines, client work, and assignments surfaced automatically.",
  },
] as const;

export const aiCoachCapabilities = [
  {
    title: "Daily Planner AI",
    detail: "Builds your day from goals, habits, and available time.",
  },
  {
    title: "Timetable Intelligence",
    detail: "Upload a PDF or image to get a structured personal timetable.",
  },
  {
    title: "Goal Coach",
    detail: "Keeps vision, quarterly, and daily goals aligned.",
  },
  {
    title: "Study & Content Coach",
    detail: "Learning plans, video ideas, hooks, and scripts on demand.",
  },
] as const;
