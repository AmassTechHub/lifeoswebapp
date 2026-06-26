"use client";

import { motion } from "framer-motion";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Pass maxWidth="full" for pages that need edge-to-edge content */
  maxWidth?: "default" | "full" | "narrow";
}

export function DashboardShell({ children, maxWidth = "default" }: DashboardShellProps) {
  const widthClass =
    maxWidth === "full"
      ? "max-w-full"
      : maxWidth === "narrow"
        ? "max-w-2xl"
        : "max-w-6xl";

  return (
    <div className="relative min-h-full overflow-x-hidden">
      {/* Subtle ambient glow at the top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60"
        style={{
          background: "radial-gradient(ellipse at top, var(--glow), transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`relative mx-auto ${widthClass} px-4 py-5 sm:px-6 sm:py-7`}
      >
        {children}
      </motion.div>
    </div>
  );
}
