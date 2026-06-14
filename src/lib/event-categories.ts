export const eventCategories = [
  "PERSONAL",
  "ACADEMICS",
  "CODING",
  "CONTENT",
  "CLIENTS",
  "CHURCH",
  "OTHER",
] as const;

export type EventCategoryValue = (typeof eventCategories)[number];
