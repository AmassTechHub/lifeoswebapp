export type PropertyType = "text" | "number" | "select" | "checkbox" | "date";
export type PropertyOption = { id: string; label: string; color: string };
export type Property = { id: string; name: string; type: PropertyType; options?: PropertyOption[] };
export type ViewType = "table" | "kanban" | "calendar";
export type View = { id: string; name: string; type: ViewType; groupByPropertyId?: string };

export const OPTION_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function colorFor(index: number) {
  return OPTION_COLORS[index % OPTION_COLORS.length];
}

function selectProp(name: string, labels: string[]): Property {
  return {
    id: newId("prop"),
    name,
    type: "select",
    options: labels.map((label, i) => ({ id: newId("opt"), label, color: colorFor(i) })),
  };
}

export type DatabaseTemplateKey = "blank" | "tasks" | "reading" | "habits" | "content" | "clients";

export type DatabaseTemplate = {
  key: DatabaseTemplateKey;
  label: string;
  description: string;
  icon: string;
  build: () => { properties: Property[]; views: View[] };
};

export const DATABASE_TEMPLATES: DatabaseTemplate[] = [
  {
    key: "blank",
    label: "Blank",
    description: "Just a Name column — add your own properties",
    icon: "Table",
    build: () => {
      const nameProp: Property = { id: newId("prop"), name: "Name", type: "text" };
      return {
        properties: [nameProp],
        views: [{ id: newId("view"), name: "Table", type: "table" }],
      };
    },
  },
  {
    key: "tasks",
    label: "Task Tracker",
    description: "Status, due date — table, board, and calendar views",
    icon: "CheckSquare",
    build: () => {
      const nameProp: Property = { id: newId("prop"), name: "Name", type: "text" };
      const statusProp = selectProp("Status", ["Todo", "In Progress", "Done"]);
      const dateProp: Property = { id: newId("prop"), name: "Date", type: "date" };
      return {
        properties: [nameProp, statusProp, dateProp],
        views: [
          { id: newId("view"), name: "Table", type: "table" },
          { id: newId("view"), name: "Board", type: "kanban", groupByPropertyId: statusProp.id },
          { id: newId("view"), name: "Calendar", type: "calendar", groupByPropertyId: dateProp.id },
        ],
      };
    },
  },
  {
    key: "reading",
    label: "Reading List",
    description: "Status, rating, genre — table and board views",
    icon: "BookOpen",
    build: () => {
      const nameProp: Property = { id: newId("prop"), name: "Title", type: "text" };
      const statusProp = selectProp("Status", ["Want to Read", "Reading", "Finished"]);
      const ratingProp: Property = { id: newId("prop"), name: "Rating", type: "number" };
      const genreProp = selectProp("Genre", ["Fiction", "Non-fiction", "Academic", "Other"]);
      return {
        properties: [nameProp, statusProp, ratingProp, genreProp],
        views: [
          { id: newId("view"), name: "Table", type: "table" },
          { id: newId("view"), name: "Board", type: "kanban", groupByPropertyId: statusProp.id },
        ],
      };
    },
  },
  {
    key: "habits",
    label: "Habit Tracker",
    description: "Frequency, streak status — table and board views",
    icon: "Repeat",
    build: () => {
      const nameProp: Property = { id: newId("prop"), name: "Habit", type: "text" };
      const freqProp = selectProp("Frequency", ["Daily", "Weekly", "Monthly"]);
      const statusProp = selectProp("Status", ["On Track", "Slipping", "Broken"]);
      const streakProp: Property = { id: newId("prop"), name: "Streak", type: "number" };
      return {
        properties: [nameProp, freqProp, statusProp, streakProp],
        views: [
          { id: newId("view"), name: "Table", type: "table" },
          { id: newId("view"), name: "Board", type: "kanban", groupByPropertyId: statusProp.id },
        ],
      };
    },
  },
  {
    key: "content",
    label: "Content Calendar",
    description: "Platform, status, publish date — board and calendar views",
    icon: "CalendarDays",
    build: () => {
      const nameProp: Property = { id: newId("prop"), name: "Title", type: "text" };
      const platformProp = selectProp("Platform", ["YouTube", "Instagram", "TikTok", "Blog"]);
      const statusProp = selectProp("Status", ["Idea", "Drafting", "Scheduled", "Published"]);
      const dateProp: Property = { id: newId("prop"), name: "Publish Date", type: "date" };
      return {
        properties: [nameProp, platformProp, statusProp, dateProp],
        views: [
          { id: newId("view"), name: "Board", type: "kanban", groupByPropertyId: statusProp.id },
          { id: newId("view"), name: "Calendar", type: "calendar", groupByPropertyId: dateProp.id },
        ],
      };
    },
  },
  {
    key: "clients",
    label: "Client Pipeline",
    description: "Stage, value — board view for tracking leads",
    icon: "Users",
    build: () => {
      const nameProp: Property = { id: newId("prop"), name: "Client", type: "text" };
      const stageProp = selectProp("Stage", ["Lead", "Proposal Sent", "Negotiating", "Won", "Lost"]);
      const valueProp: Property = { id: newId("prop"), name: "Value (GHS)", type: "number" };
      return {
        properties: [nameProp, stageProp, valueProp],
        views: [
          { id: newId("view"), name: "Board", type: "kanban", groupByPropertyId: stageProp.id },
          { id: newId("view"), name: "Table", type: "table" },
        ],
      };
    },
  },
];
