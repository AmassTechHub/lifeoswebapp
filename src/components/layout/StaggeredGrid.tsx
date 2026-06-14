"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function StaggeredGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("h-full", className)}
    >
      {children}
    </motion.div>
  );
}
