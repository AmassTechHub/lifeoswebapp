import {
  Award,
  Bot,
  Calendar,
  CheckSquare,
  DollarSign,
  Flame,
  Focus,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  PenLine,
  FileText,
  Settings,
  Target,
  Users,
  Video,
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

export const navSections: NavSection[] = [
  {
    label: "Today",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Focus", href: "/focus", icon: Focus },
      { title: "Planner", href: "/planner", icon: PenLine },
      { title: "Workspace", href: "/workspace", icon: FileText },
      { title: "Calendar", href: "/calendar", icon: Calendar },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "Journal", href: "/journal", icon: NotebookPen },
    ],
  },
  {
    label: "Study & Create",
    items: [
      { title: "Learning", href: "/learning", icon: GraduationCap },
      { title: "CGPA Tracker", href: "/grades", icon: Award },
      { title: "Content Hub", href: "/content", icon: Video },
    ],
  },
  {
    label: "Life",
    items: [
      { title: "Goals", href: "/goals", icon: Target },
      { title: "Habits", href: "/habits", icon: Flame },
      { title: "Finance", href: "/finance", icon: DollarSign },
      { title: "Clients", href: "/clients", icon: Users },
    ],
  },
  {
    label: "Assistant",
    items: [{ title: "AI Coach", href: "/coach", icon: Bot }],
  },
];

export const settingsNavItem: NavItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
};

export const navItems = [
  ...navSections.flatMap((s) => s.items),
  settingsNavItem,
] as const;
