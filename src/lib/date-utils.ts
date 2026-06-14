export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

export function atTime(base: Date, hours: number, minutes = 0) {
  const x = startOfDay(base);
  x.setHours(hours, minutes, 0, 0);
  return x;
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDueLabel(due: Date, now = new Date()) {
  const today = startOfDay(now);
  const dueDay = startOfDay(due);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (diff === 0) return `Today, ${formatTime(due)}`;
  if (diff === 1) return "Tomorrow";
  if (diff < 7) {
    return due.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dateKey(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10);
}
