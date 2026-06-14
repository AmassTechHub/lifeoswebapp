import { FocusMode } from "@/components/focus/FocusMode";
import { requireSession } from "@/lib/session";

export default async function FocusPage() {
  await requireSession();
  return <FocusMode />;
}
