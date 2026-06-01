"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PasswordFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  delay?: number;
  required?: boolean;
  showStrength?: boolean;
  id?: string;
}

export function PasswordField({
  label = "Password",
  value,
  onChange,
  placeholder = "At least 8 characters",
  minLength = 8,
  delay = 0,
  required = true,
  showStrength = true,
  id = "password",
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const strength =
    showStrength && value.length >= 12
      ? "strong"
      : showStrength && value.length >= 8
        ? "good"
        : showStrength && value.length > 0
          ? "weak"
          : null;

  return (
    <div
      className="auth-field-enter space-y-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      {label ? (
        <Label htmlFor={id} className="text-slate-700">
          {label}
        </Label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={showStrength ? "new-password" : "current-password"}
          className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 pr-11 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {strength && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  (strength === "weak" && i === 1) ||
                    (strength === "good" && i <= 2) ||
                    (strength === "strong" && i <= 3)
                    ? strength === "weak"
                      ? "bg-amber-400"
                      : strength === "good"
                        ? "bg-accent"
                        : "bg-emerald-500"
                    : "bg-slate-200"
                )}
              />
            ))}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {strength}
          </span>
        </div>
      )}
    </div>
  );
}
