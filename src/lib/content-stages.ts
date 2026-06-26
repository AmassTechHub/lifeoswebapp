// ── Content stages ────────────────────────────────────────────────────────
// The database enum has 5 fixed stages. The UI maps platforms to which stages
// are relevant and what they're called — so a blogger sees "Draft" not
// "Recording", and a podcaster sees "Recording" but not "Editing (video)".

export const contentStages = [
  "IDEA",
  "SCRIPT",
  "RECORDING",
  "EDITING",
  "PUBLISHED",
] as const;

export type ContentStage = (typeof contentStages)[number];

// ── Default labels (video-centric) ────────────────────────────────────────
export const contentStageLabels: Record<ContentStage, string> = {
  IDEA:      "Idea",
  SCRIPT:    "Script / Outline",
  RECORDING: "Recording",
  EDITING:   "Editing",
  PUBLISHED: "Published",
};

// ── Platform presets ──────────────────────────────────────────────────────
// Each platform defines which stages are relevant and what to call them.
// The DB stages stay the same — only labels change in the UI.

export type PlatformPreset = {
  label: string;          // display name
  emoji: string;
  stages: ContentStage[]; // subset of contentStages that apply
  stageLabels: Partial<Record<ContentStage, string>>;
};

export const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  youtube: {
    label: "YouTube",
    emoji: "🎬",
    stages: ["IDEA", "SCRIPT", "RECORDING", "EDITING", "PUBLISHED"],
    stageLabels: { SCRIPT: "Script", RECORDING: "Recording", EDITING: "Editing" },
  },
  blog: {
    label: "Blog / Article",
    emoji: "✍️",
    stages: ["IDEA", "SCRIPT", "EDITING", "PUBLISHED"],
    stageLabels: { SCRIPT: "Draft", RECORDING: "Draft", EDITING: "Review" },
  },
  podcast: {
    label: "Podcast",
    emoji: "🎙️",
    stages: ["IDEA", "SCRIPT", "RECORDING", "EDITING", "PUBLISHED"],
    stageLabels: { SCRIPT: "Outline", RECORDING: "Recording", EDITING: "Editing" },
  },
  newsletter: {
    label: "Newsletter",
    emoji: "📧",
    stages: ["IDEA", "SCRIPT", "EDITING", "PUBLISHED"],
    stageLabels: { SCRIPT: "Draft", EDITING: "Review & Schedule" },
  },
  instagram: {
    label: "Instagram / Reels",
    emoji: "📸",
    stages: ["IDEA", "RECORDING", "EDITING", "PUBLISHED"],
    stageLabels: { RECORDING: "Shooting", EDITING: "Edit / Caption" },
  },
  tiktok: {
    label: "TikTok",
    emoji: "🎵",
    stages: ["IDEA", "RECORDING", "EDITING", "PUBLISHED"],
    stageLabels: { RECORDING: "Shooting", EDITING: "Edit" },
  },
  twitter: {
    label: "X / Twitter Thread",
    emoji: "🐦",
    stages: ["IDEA", "SCRIPT", "PUBLISHED"],
    stageLabels: { SCRIPT: "Draft thread" },
  },
  general: {
    label: "General",
    emoji: "📄",
    stages: ["IDEA", "SCRIPT", "EDITING", "PUBLISHED"],
    stageLabels: { SCRIPT: "Draft", EDITING: "Review" },
  },
};

// All known platform name substrings → preset key (case-insensitive match)
const PLATFORM_KEYWORDS: [string, string][] = [
  ["youtube",    "youtube"],
  ["yt ",        "youtube"],
  ["blog",       "blog"],
  ["article",    "blog"],
  ["newsletter", "newsletter"],
  ["email",      "newsletter"],
  ["podcast",    "podcast"],
  ["instagram",  "instagram"],
  ["reel",       "instagram"],
  ["tiktok",     "tiktok"],
  ["twitter",    "twitter"],
  ["thread",     "twitter"],
  ["tweet",      "twitter"],
];

/** Detect platform preset from a free-text channel name. */
export function detectPreset(channel: string): PlatformPreset {
  const lower = channel.toLowerCase();
  for (const [keyword, key] of PLATFORM_KEYWORDS) {
    if (lower.includes(keyword)) return PLATFORM_PRESETS[key]!;
  }
  return PLATFORM_PRESETS.general!;
}

/** Get the label for a stage, respecting platform overrides. */
export function getStageLabelForPlatform(
  stage: ContentStage,
  channel: string
): string {
  const preset = detectPreset(channel);
  return preset.stageLabels[stage] ?? contentStageLabels[stage];
}

/** Get the relevant stages for a platform. */
export function getStagesForPlatform(channel: string): ContentStage[] {
  return detectPreset(channel).stages;
}
