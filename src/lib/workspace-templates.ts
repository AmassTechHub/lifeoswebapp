import type { JSONContent } from "@tiptap/react";

export type WorkspaceTemplateKey = "blank" | "meeting" | "weekly_plan" | "project_brief" | "journal" | "reading_notes";

export type WorkspaceTemplate = {
  key: WorkspaceTemplateKey;
  label: string;
  description: string;
  icon: string;
  content: JSONContent | null;
};

function heading(level: 1 | 2 | 3, text: string): JSONContent {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function paragraph(text?: string): JSONContent {
  return { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
}

function bulletList(items: string[]): JSONContent {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [paragraph(text)],
    })),
  };
}

function taskList(items: string[]): JSONContent {
  return {
    type: "taskList",
    content: items.map((text) => ({
      type: "taskItem",
      attrs: { checked: false },
      content: [paragraph(text)],
    })),
  };
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    key: "blank",
    label: "Blank",
    description: "Start with an empty page",
    icon: "FileText",
    content: null,
  },
  {
    key: "meeting",
    label: "Meeting Notes",
    description: "Attendees, agenda, action items",
    icon: "Users",
    content: {
      type: "doc",
      content: [
        heading(1, "Meeting Notes"),
        paragraph("Date: "),
        paragraph("Attendees: "),
        heading(2, "Agenda"),
        bulletList(["Topic one", "Topic two"]),
        heading(2, "Notes"),
        paragraph(),
        heading(2, "Action Items"),
        taskList(["Follow up on..."]),
      ],
    },
  },
  {
    key: "weekly_plan",
    label: "Weekly Plan",
    description: "Goals and a day-by-day breakdown",
    icon: "CalendarDays",
    content: {
      type: "doc",
      content: [
        heading(1, "Week of "),
        heading(2, "Top Goals"),
        taskList(["Goal one", "Goal two", "Goal three"]),
        heading(2, "Monday"),
        paragraph(),
        heading(2, "Tuesday"),
        paragraph(),
        heading(2, "Wednesday"),
        paragraph(),
        heading(2, "Thursday"),
        paragraph(),
        heading(2, "Friday"),
        paragraph(),
        heading(2, "Reflection"),
        paragraph("What worked, what didn't, what to change next week."),
      ],
    },
  },
  {
    key: "project_brief",
    label: "Project Brief",
    description: "Scope, deliverables, timeline",
    icon: "Briefcase",
    content: {
      type: "doc",
      content: [
        heading(1, "Project Brief"),
        heading(2, "Overview"),
        paragraph("What is this project and why does it matter?"),
        heading(2, "Scope"),
        bulletList(["In scope: ", "Out of scope: "]),
        heading(2, "Deliverables"),
        taskList(["Deliverable one", "Deliverable two"]),
        heading(2, "Timeline"),
        paragraph(),
        heading(2, "Notes"),
        paragraph(),
      ],
    },
  },
  {
    key: "journal",
    label: "Daily Journal",
    description: "Reflection prompts for the day",
    icon: "BookHeart",
    content: {
      type: "doc",
      content: [
        heading(1, "Today"),
        heading(2, "Highlights"),
        paragraph(),
        heading(2, "Challenges"),
        paragraph(),
        heading(2, "Grateful for"),
        paragraph(),
        heading(2, "Tomorrow"),
        paragraph(),
      ],
    },
  },
  {
    key: "reading_notes",
    label: "Reading Notes",
    description: "Source, key ideas, quotes, takeaways",
    icon: "BookOpen",
    content: {
      type: "doc",
      content: [
        heading(1, "Reading Notes"),
        paragraph("Source: "),
        heading(2, "Key Ideas"),
        bulletList(["Idea one", "Idea two"]),
        heading(2, "Quotes"),
        { type: "blockquote", content: [paragraph()] },
        heading(2, "My Takeaway"),
        paragraph(),
      ],
    },
  },
];
