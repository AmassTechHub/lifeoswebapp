import {
  Bot,
  Calendar,
  CheckSquare,
  DollarSign,
  Flame,
  GraduationCap,
  LayoutDashboard,
  PenLine,
  Settings,
  Target,
  Users,
  Video,
} from "lucide-react";

export const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Planner", href: "/planner", icon: PenLine },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Habits", href: "/habits", icon: Flame },
  { title: "Learning", href: "/learning", icon: GraduationCap },
  { title: "Content Hub", href: "/content", icon: Video },
  { title: "Clients", href: "/clients", icon: Users },
  { title: "Finance", href: "/finance", icon: DollarSign },
  { title: "AI Coach", href: "/coach", icon: Bot },
  { title: "Settings", href: "/settings", icon: Settings },
] as const;
