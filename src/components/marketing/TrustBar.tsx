const audiences = [
  "Computer Science Students",
  "Medical Students",
  "YouTubers",
  "Startup Founders",
  "Freelancers",
  "Agency Owners",
];

export function TrustBar() {
  return (
    <section className="border-y border-white/5 bg-black/40 py-8">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Built for ambitious people who refuse to stay scattered
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {audiences.map((item) => (
            <span
              key={item}
              className="text-sm font-medium text-white/35 transition-colors hover:text-white/55"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
