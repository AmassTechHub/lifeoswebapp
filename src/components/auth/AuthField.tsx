import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends React.ComponentProps<"input"> {
  label: string;
  hint?: string;
  error?: string;
  delay?: number;
}

export function AuthField({
  label,
  hint,
  error,
  delay = 0,
  className,
  id,
  ...props
}: AuthFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div
      className="auth-field-enter space-y-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Label htmlFor={fieldId} className="text-slate-700">
        {label}
      </Label>
      <input
        id={fieldId}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger/40 focus:border-danger focus:ring-danger/15",
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
