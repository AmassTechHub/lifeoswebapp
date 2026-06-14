import {
  Bot,
  Calendar,
  CheckSquare,
  DollarSign,
  Flame,
  Focus,
  GraduationCap,
  LayoutDashboard,
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

/** Sidebar grouped by how you actually use Life OS — one area at a time. */
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
    ],
  },
  {
    label: "Study & Create",
    items: [
      { title: "Learning", href: "/learning", icon: GraduationCap },
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

/** Flat list for matchers and legacy use */
export const navItems = [
  ...navSections.flatMap((s) => s.items),
  settingsNavItem,
] as const;
