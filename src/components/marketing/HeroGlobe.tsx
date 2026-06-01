export function HeroGlobe() {
  return (
    <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[440px] xl:max-w-[500px]">
      <div className="globe-breathe pointer-events-none absolute inset-[18%] rounded-full bg-accent/10 blur-3xl" />

      <svg
        viewBox="0 0 400 400"
        className="relative h-full w-full"
        aria-hidden
      >
        <defs>
          <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="200" cy="200" r="165" fill="url(#globeGlow)" />

        <g className="globe-ring-outer">
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            opacity="0.7"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 200 200"
            to="360 200 200"
            dur="48s"
            repeatCount="indefinite"
          />
        </g>

        <g>
          {[0, 30, 60, 90, 120, 150].map((rotate) => (
            <ellipse
              key={rotate}
              cx="200"
              cy="200"
              rx="160"
              ry="48"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="0.8"
              opacity="0.85"
              transform={`rotate(${rotate} 200 200)`}
            />
          ))}
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 200 200"
            to="360 200 200"
            dur="36s"
            repeatCount="indefinite"
          />
        </g>

        <g>
          {[0, 45, 90, 135].map((rotate) => (
            <ellipse
              key={`v-${rotate}`}
              cx="200"
              cy="200"
              rx="48"
              ry="160"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="0.8"
              opacity="0.65"
              transform={`rotate(${rotate} 200 200)`}
            />
          ))}
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 200 200"
            to="0 200 200"
            dur="28s"
            repeatCount="indefinite"
          />
        </g>

        {[
          [260, 140, 0],
          [120, 180, 0.8],
          [240, 260, 1.6],
          [170, 110, 2.4],
          [300, 220, 3.2],
          [90, 250, 4],
        ].map(([cx, cy, delay], i) => (
          <g key={i} filter="url(#dotGlow)">
            <circle cx={cx} cy={cy} r="12" fill="#3b82f6" opacity="0.1">
              <animate
                attributeName="r"
                values="10;16;10"
                dur="3s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.08;0.22;0.08"
                dur="3s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx={cx} cy={cy} r="4" fill="#3b82f6">
              <animate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur="2.5s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}

        <circle cx="360" cy="200" r="3" fill="#60a5fa" opacity="0.9">
          <animateMotion
            dur="8s"
            repeatCount="indefinite"
            path="M 360 200 A 160 160 0 1 1 359.9 200"
          />
          <animate
            attributeName="opacity"
            values="0.3;1;0.3"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}
