"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn("gap-2 text-muted-foreground hover:text-foreground", className)}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-xs">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-xs">Dark</span>
        </>
      )}
    </Button>
  );
}
