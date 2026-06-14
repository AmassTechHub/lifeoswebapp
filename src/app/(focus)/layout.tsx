export const dynamic = "force-dynamic";

/** Distraction-free layout — no sidebar */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
