"use client";

import { useEffect, useState } from "react";

interface AnimatedStatProps {
  value: number;
  suffix?: string;
  duration?: number;
}

export function AnimatedStat({
  value,
  suffix = "",
  duration = 1200,
}: AnimatedStatProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}
