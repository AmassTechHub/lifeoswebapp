import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from "@tiptap/suggestion";

export type SlashItem = {
  title: string;
  description: string;
  icon: string;
  run: (editor: Editor, range: Range) => void;
};

export const SLASH_ITEMS: SlashItem[] = [
  { title: "Text", description: "Plain paragraph", icon: "¶", run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { title: "Heading 1", description: "Big section heading", icon: "H1", run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run() },
  { title: "Heading 2", description: "Medium section heading", icon: "H2", run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run() },
  { title: "Heading 3", description: "Small section heading", icon: "H3", run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run() },
  { title: "Bullet list", description: "Unordered list", icon: "•", run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: "Numbered list", description: "Ordered list", icon: "1.", run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: "Checklist", description: "To-do list with checkboxes", icon: "☑", run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { title: "Table", description: "3x3 table", icon: "▦", run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "Quote", description: "Blockquote", icon: "❝", run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { title: "Code block", description: "Monospace code block", icon: "</>", run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { title: "Divider", description: "Horizontal rule", icon: "—", run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
];

function buildMenu(
  items: SlashItem[],
  onPick: (item: SlashItem) => void
): { el: HTMLDivElement; setSelected: (i: number) => void } {
  const el = document.createElement("div");
  el.className = "slash-menu";
  let selected = 0;

  function render() {
    el.innerHTML = "";
    items.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `slash-menu-item${i === selected ? " is-selected" : ""}`;
      btn.innerHTML = `<span style="width:1.5rem;text-align:center;opacity:0.6;font-size:11px;">${item.icon}</span><span><span style="display:block;font-weight:600;">${item.title}</span><span style="display:block;opacity:0.6;font-size:11px;">${item.description}</span></span>`;
      btn.addEventListener("mousedown", (e) => { e.preventDefault(); onPick(item); });
      el.appendChild(btn);
    });
  }
  render();

  return {
    el,
    setSelected: (i: number) => { selected = i; render(); },
  };
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        items: ({ query }: { query: string }) =>
          SLASH_ITEMS.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
          props.run(editor, range);
        },
        render: () => {
          let menu: ReturnType<typeof buildMenu> | null = null;
          let currentItems: SlashItem[] = [];
          let selectedIndex = 0;
          let latestProps: SuggestionProps<SlashItem> | null = null;

          function position(props: SuggestionProps<SlashItem>) {
            if (!menu) return;
            const rect = props.clientRect?.();
            if (!rect) return;
            menu.el.style.left = `${rect.left}px`;
            menu.el.style.top = `${rect.bottom + 6}px`;
          }

          return {
            onStart: (props: SuggestionProps<SlashItem>) => {
              latestProps = props;
              currentItems = props.items;
              selectedIndex = 0;
              menu = buildMenu(currentItems, (item) => props.command(item));
              document.body.appendChild(menu.el);
              position(props);
            },
            onUpdate: (props: SuggestionProps<SlashItem>) => {
              latestProps = props;
              currentItems = props.items;
              selectedIndex = 0;
              if (!menu) return;
              menu.el.remove();
              menu = buildMenu(currentItems, (item) => props.command(item));
              document.body.appendChild(menu.el);
              position(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (!menu || currentItems.length === 0) return false;
              if (props.event.key === "ArrowDown") {
                selectedIndex = (selectedIndex + 1) % currentItems.length;
                menu.setSelected(selectedIndex);
                return true;
              }
              if (props.event.key === "ArrowUp") {
                selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
                menu.setSelected(selectedIndex);
                return true;
              }
              if (props.event.key === "Enter") {
                latestProps?.command(currentItems[selectedIndex]);
                return true;
              }
              if (props.event.key === "Escape") {
                menu.el.remove();
                menu = null;
                return true;
              }
              return false;
            },
            onExit: () => {
              menu?.el.remove();
              menu = null;
            },
          };
        },
      }),
    ];
  },
});
