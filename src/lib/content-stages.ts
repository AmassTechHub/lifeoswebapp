export const contentStages = [
  "IDEA",
  "SCRIPT",
  "RECORDING",
  "EDITING",
  "PUBLISHED",
] as const;

export type ContentStage = (typeof contentStages)[number];

export const contentStageLabels: Record<ContentStage, string> = {
  IDEA: "Idea",
  SCRIPT: "Script",
  RECORDING: "Recording",
  EDITING: "Editing",
  PUBLISHED: "Published",
};
