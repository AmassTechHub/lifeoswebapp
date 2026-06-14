"use client";

import { motion } from "framer-motion";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full overflow-x-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-100"
        style={{
          background: "radial-gradient(ellipse at top, var(--glow), transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8"
      >
        {children}
      </motion.div>
    </div>
  );
}
