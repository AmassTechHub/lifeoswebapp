"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Plus,
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";

import {
  addProperty,
  addSelectOption,
  addView,
  createRow,
  deleteProperty,
  deleteRow,
  deleteView,
  updateRowValue,
  type Property,
  type PropertyType,
  type View,
} from "@/lib/actions/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Row = { id: string; values: Record<string, unknown> };
type Database = {
  id: string;
  name: string;
  properties: Property[];
  views: View[];
  rows: Row[];
};

const VIEW_ICONS: Record<View["type"], React.ElementType> = {
  table: TableIcon,
  kanban: Columns3,
  calendar: CalendarIcon,
};

function titleOf(row: Row, properties: Property[]): string {
  const textProp = properties.find((p) => p.type === "text");
  if (textProp) {
    const v = row.values[textProp.id];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "Untitled";
}

// ── Cell editor ──────────────────────────────────────────────────────────────

function Cell({
  property,
  value,
  onChange,
  onAddOption,
}: {
  property: Property;
  value: unknown;
  onChange: (v: unknown) => void;
  onAddOption: (label: string) => Promise<string | undefined>;
}) {
  const [addingOption, setAddingOption] = useState(false);
  const [newOption, setNewOption] = useState("");

  if (property.type === "text") {
    return (
      <input
        defaultValue={typeof value === "string" ? value : ""}
        onBlur={(e) => onChange(e.target.value)}
        placeholder="Empty"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
      />
    );
  }

  if (property.type === "number") {
    return (
      <input
        type="number"
        defaultValue={typeof value === "number" ? value : ""}
        onBlur={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder="—"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
      />
    );
  }

  if (property.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-accent"
      />
    );
  }

  if (property.type === "date") {
    const dateVal = typeof value === "string" ? value.slice(0, 10) : "";
    return (
      <input
        type="date"
        defaultValue={dateVal}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className="w-full bg-transparent text-sm outline-none"
      />
    );
  }

  // select
  const options = property.options ?? [];
  const selected = options.find((o) => o.id === value);

  if (addingOption) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const id = await onAddOption(newOption);
          setNewOption("");
          setAddingOption(false);
          if (id) onChange(id);
        }}
        className="flex items-center gap-1"
      >
        <input
          autoFocus
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onBlur={() => setAddingOption(false)}
          placeholder="New option"
          className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none"
        />
      </form>
    );
  }

  return (
    <select
      value={typeof value === "string" ? value : ""}
      onChange={(e) => {
        if (e.target.value === "__add__") { setAddingOption(true); return; }
        onChange(e.target.value || null);
      }}
      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs font-medium outline-none hover:border-border"
      style={selected ? { backgroundColor: `${selected.color}20`, color: selected.color } : undefined}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
      <option value="__add__">+ Add option…</option>
    </select>
  );
}

// ── Table view ───────────────────────────────────────────────────────────────

function TableView({ db, onCellChange, onAddOption }: {
  db: Database;
  onCellChange: (rowId: string, propertyId: string, value: unknown) => void;
  onAddOption: (propertyId: string, label: string) => Promise<string | undefined>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addingProp, setAddingProp] = useState(false);
  const [propName, setPropName] = useState("");
  const [propType, setPropType] = useState<PropertyType>("text");

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            {db.properties.map((p) => (
              <th key={p.id} className="group/th relative px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                <span>{p.name}</span>
                <button
                  onClick={() => startTransition(async () => { await deleteProperty(db.id, p.id); router.refresh(); })}
                  className="ml-1.5 opacity-0 transition-opacity hover:text-danger group-hover/th:opacity-100"
                  title="Delete column"
                >
                  <X className="inline h-3 w-3" />
                </button>
              </th>
            ))}
            <th className="px-3 py-2 text-left">
              {addingProp ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    startTransition(async () => {
                      await addProperty(db.id, propName, propType);
                      setPropName(""); setAddingProp(false);
                      router.refresh();
                    });
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    autoFocus value={propName} onChange={(e) => setPropName(e.target.value)}
                    placeholder="Name" className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                  />
                  <select value={propType} onChange={(e) => setPropType(e.target.value as PropertyType)} className="rounded border border-border bg-background px-1 py-0.5 text-xs">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="date">Date</option>
                  </select>
                  <button type="submit" className="text-accent"><Plus className="h-3.5 w-3.5" /></button>
                </form>
              ) : (
                <button onClick={() => setAddingProp(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" /> Field
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {db.rows.map((row) => (
            <tr key={row.id} className="group/row border-b border-border/40 hover:bg-muted/20">
              {db.properties.map((p) => (
                <td key={p.id} className="px-3 py-2">
                  <Cell
                    property={p}
                    value={row.values[p.id]}
                    onChange={(v) => onCellChange(row.id, p.id, v)}
                    onAddOption={(label) => onAddOption(p.id, label)}
                  />
                </td>
              ))}
              <td className="px-3 py-2">
                <button
                  onClick={() => startTransition(async () => { await deleteRow(row.id); router.refresh(); })}
                  className="text-muted-foreground/40 opacity-0 transition-opacity hover:text-danger group-hover/row:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => startTransition(async () => { await createRow(db.id, {}); router.refresh(); })}
        className="flex w-full items-center gap-1.5 border-t border-border/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/20 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> New row
      </button>
    </div>
  );
}

// ── Kanban view ──────────────────────────────────────────────────────────────

function KanbanView({ db, view, onCellChange, onAddOption }: {
  db: Database;
  view: View;
  onCellChange: (rowId: string, propertyId: string, value: unknown) => void;
  onAddOption: (propertyId: string, label: string) => Promise<string | undefined>;
}) {
  const groupProp = db.properties.find((p) => p.id === view.groupByPropertyId && p.type === "select");
  const [addingCol, setAddingCol] = useState(false);
  const [colLabel, setColLabel] = useState("");
  const columns = groupProp?.options ?? [];
  const groupPropId = groupProp?.id;

  const rowsByOption = useMemo(() => {
    const map = new Map<string, Row[]>();
    map.set("__none__", []);
    for (const c of columns) map.set(c.id, []);
    if (!groupPropId) return map;
    for (const row of db.rows) {
      const v = row.values[groupPropId];
      const key = typeof v === "string" && map.has(v) ? v : "__none__";
      map.get(key)!.push(row);
    }
    return map;
  }, [db.rows, columns, groupPropId]);

  if (!groupProp) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">This board needs a Select property to group by.</p>;
  }

  const resolvedGroupPropId = groupProp.id;

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newOptionId = result.destination.droppableId === "__none__" ? null : result.destination.droppableId;
    onCellChange(result.draggableId, resolvedGroupPropId, newOptionId);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {["__none__", ...columns.map((c) => c.id)].map((colId) => {
          const col = columns.find((c) => c.id === colId);
          const rows = rowsByOption.get(colId) ?? [];
          return (
            <Droppable droppableId={colId} key={colId}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="w-64 shrink-0 rounded-xl border border-border/60 bg-muted/20 p-2">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    {col && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />}
                    <p className="text-xs font-semibold text-foreground">{col ? col.label : "No status"}</p>
                    <span className="ml-auto text-[10px] text-muted-foreground">{rows.length}</span>
                  </div>
                  <div className="space-y-2">
                    {rows.map((row, idx) => (
                      <Draggable draggableId={row.id} index={idx} key={row.id}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...(dragProvided.dragHandleProps ?? {})}
                            style={dragProvided.draggableProps.style as React.CSSProperties}
                            className="rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm shadow-sm"
                          >
                            {titleOf(row, db.properties)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
        <div className="w-56 shrink-0">
          {addingCol ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onAddOption(groupProp.id, colLabel);
                setColLabel(""); setAddingCol(false);
              }}
              className="rounded-xl border border-border/60 p-2"
            >
              <input autoFocus value={colLabel} onChange={(e) => setColLabel(e.target.value)} onBlur={() => setAddingCol(false)} placeholder="Column name" className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
            </form>
          ) : (
            <button onClick={() => setAddingCol(true)} className="flex items-center gap-1.5 rounded-xl border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> Add column
            </button>
          )}
        </div>
      </div>
    </DragDropContext>
  );
}

// ── Calendar view ────────────────────────────────────────────────────────────

function CalendarView({ db, view, onCreateRow, onDeleteRow }: {
  db: Database;
  view: View;
  onCreateRow: (values: Record<string, unknown>) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const dateProp = db.properties.find((p) => p.id === view.groupByPropertyId && p.type === "date");
  const [cursor, setCursor] = useState(() => new Date());
  const datePropId = dateProp?.id;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rowsByDay = useMemo(() => {
    const map = new Map<number, Row[]>();
    if (!datePropId) return map;
    for (const row of db.rows) {
      const v = row.values[datePropId];
      if (typeof v !== "string") continue;
      const d = new Date(v);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(row);
      }
    }
    return map;
  }, [db.rows, datePropId, year, month]);

  if (!dateProp) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">This calendar needs a Date property to group by.</p>;
  }

  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-xl border border-border/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        <div className="flex gap-1">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded p-1 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded p-1 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={cn("min-h-20 rounded-lg border border-border/30 p-1", day === null && "border-transparent")}>
            {day !== null && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{day}</span>
                  <button
                    onClick={() => onCreateRow({ [dateProp.id]: new Date(year, month, day).toISOString() })}
                    className="text-muted-foreground/40 hover:text-accent"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-1 space-y-0.5">
                  {(rowsByDay.get(day) ?? []).map((row) => (
                    <div key={row.id} className="group flex items-center justify-between gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                      <span className="truncate">{titleOf(row, db.properties)}</span>
                      <button onClick={() => onDeleteRow(row.id)} className="opacity-0 group-hover:opacity-100"><X className="h-2.5 w-2.5" /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function DatabaseView({ database }: { database: Database }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeViewId, setActiveViewId] = useState(database.views[0]?.id);
  const [addingView, setAddingView] = useState(false);

  const activeView = database.views.find((v) => v.id === activeViewId) ?? database.views[0];

  function handleCellChange(rowId: string, propertyId: string, value: unknown) {
    startTransition(async () => {
      await updateRowValue(rowId, propertyId, value);
      router.refresh();
    });
  }

  async function handleAddOption(propertyId: string, label: string): Promise<string | undefined> {
    const res = await addSelectOption(database.id, propertyId, label);
    router.refresh();
    return res.optionId;
  }

  function handleCreateRow(values: Record<string, unknown>) {
    startTransition(async () => {
      await createRow(database.id, values);
      router.refresh();
    });
  }

  function handleDeleteRow(rowId: string) {
    startTransition(async () => {
      await deleteRow(rowId);
      router.refresh();
    });
  }

  const selectProps = database.properties.filter((p) => p.type === "select");
  const dateProps = database.properties.filter((p) => p.type === "date");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {database.views.map((v) => {
          const Icon = VIEW_ICONS[v.type];
          return (
            <button
              key={v.id}
              onClick={() => setActiveViewId(v.id)}
              className={cn(
                "group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeView?.id === v.id ? "bg-accent text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {v.name}
              {database.views.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); startTransition(async () => { await deleteView(database.id, v.id); router.refresh(); }); }}
                  className="ml-0.5 opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}

        {addingView ? (
          <AddViewForm
            selectProps={selectProps}
            dateProps={dateProps}
            onSubmit={async (name, type, groupByPropertyId) => {
              const res = await addView(database.id, name, type, groupByPropertyId);
              setAddingView(false);
              if (res.viewId) setActiveViewId(res.viewId);
              router.refresh();
            }}
            onCancel={() => setAddingView(false)}
          />
        ) : (
          <button onClick={() => setAddingView(true)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Plus className="h-3.5 w-3.5" /> View
          </button>
        )}
      </div>

      {activeView?.type === "table" && (
        <TableView db={database} onCellChange={handleCellChange} onAddOption={handleAddOption} />
      )}
      {activeView?.type === "kanban" && (
        <KanbanView db={database} view={activeView} onCellChange={handleCellChange} onAddOption={handleAddOption} />
      )}
      {activeView?.type === "calendar" && (
        <CalendarView db={database} view={activeView} onCreateRow={handleCreateRow} onDeleteRow={handleDeleteRow} />
      )}
    </div>
  );
}

function AddViewForm({
  selectProps,
  dateProps,
  onSubmit,
  onCancel,
}: {
  selectProps: Property[];
  dateProps: Property[];
  onSubmit: (name: string, type: View["type"], groupByPropertyId?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<View["type"]>("table");
  const [groupBy, setGroupBy] = useState<string>("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name || type, type, groupBy || undefined);
      }}
      className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2 py-1"
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="View name" className="h-7 w-28 text-xs" />
      <select value={type} onChange={(e) => setType(e.target.value as View["type"])} className="rounded border border-border bg-background px-1.5 py-1 text-xs">
        <option value="table">Table</option>
        <option value="kanban">Board</option>
        <option value="calendar">Calendar</option>
      </select>
      {type === "kanban" && (
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="rounded border border-border bg-background px-1.5 py-1 text-xs">
          <option value="">Group by…</option>
          {selectProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {type === "calendar" && (
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="rounded border border-border bg-background px-1.5 py-1 text-xs">
          <option value="">Date field…</option>
          {dateProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <button type="submit" className="text-accent"><Plus className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={onCancel} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
    </form>
  );
}
