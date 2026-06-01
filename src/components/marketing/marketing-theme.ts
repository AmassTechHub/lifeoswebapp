/** Shared landing page surfaces — keep one light + one dark palette sitewide. */
export const marketingLight = "bg-[#f8fafc] text-slate-900";
export const marketingDark = "bg-[#0d1117] text-white";

/** Section rhythm: light → dark marquee → light blocks → dark showcases → light demos → dark pricing → light footer */
export const sectionLight = marketingLight;
export const sectionDark = marketingDark;

export const marketingLabel =
  "text-xs font-semibold uppercase tracking-[0.2em] text-accent";

export const marketingHeadingAccent = "text-accent";

export const marketingBodyDark = "text-slate-400";
export const marketingBodyLight = "text-slate-600";

export const marketingDarkGlow =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_65%)]";

export const marketingDarkCard =
  "rounded-3xl border bg-[#0c1222]/95 backdrop-blur-md";

export const marketingDarkCardActive =
  "border-accent/30 shadow-[0_0_80px_rgba(59,130,246,0.12),0_30px_70px_rgba(0,0,0,0.55)]";

export const marketingDarkCardIdle =
  "border-white/6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]";
