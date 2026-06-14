import { AppLayoutClient } from "@/components/layout/AppLayoutClient";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
