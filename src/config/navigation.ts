import {
  AlarmClock,
  Bot,
  Calendar,
  CheckSquare,
  Clapperboard,
  DollarSign,
  FileText,
  Flame,
  Focus,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Target,
  Users,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// ── Navigation sections ────────────────────────────────────────────────────
// "Today" and "Life" are always shown.
// "Study" only shows for students (role: student).
// "Work" only shows for creators and professionals (roles: creator, professional).
// The AppSidebar filters by useCases from the user's profile.
// If no use-cases are set, all sections are shown.

export const navSections: NavSection[] = [
  {
    label: "Today",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Tasks",     href: "/tasks",     icon: CheckSquare },
      { title: "Calendar",  href: "/calendar",  icon: Calendar },
      { title: "Focus",     href: "/focus",     icon: Focus },
      { title: "Journal",   href: "/journal",   icon: NotebookPen },
    ],
  },
  {
    label: "Study",
    items: [
      { title: "Learning",  href: "/learning",  icon: GraduationCap },
      { title: "Deadlines", href: "/deadlines", icon: AlarmClock },
    ],
  },
  {
    label: "Work",
    items: [
      { title: "Content",   href: "/content",   icon: Clapperboard },
      { title: "Clients",   href: "/clients",   icon: Users },
      { title: "Workspace", href: "/workspace", icon: FileText },
    ],
  },
  {
    label: "Life",
    items: [
      { title: "Goals",    href: "/goals",    icon: Target },
      { title: "Habits",   href: "/habits",   icon: Flame },
      { title: "Finance",  href: "/finance",  icon: DollarSign },
      { title: "AI Coach", href: "/coach",    icon: Bot },
    ],
  },
];

export const settingsNavItem: NavItem = {
  title: "Settings",
  href:  "/settings",
  icon:  Settings,
};

export const navItems = [
  ...navSections.flatMap((s) => s.items),
  settingsNavItem,
] as const;
