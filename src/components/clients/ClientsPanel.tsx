"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users } from "lucide-react";

import {
  createClient,
  createDeliverable,
  deleteClient,
  deleteDeliverable,
  updateDeliverableStatus,
} from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  deliverables: {
    id: string;
    title: string;
    dueDate: Date | null;
    status: string;
    amount: number | null;
  }[];
};

export function ClientsPanel({ clients: initial }: { clients: Client[] }) {
  const router = useRouter();
  const [clients] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const selected = clients.find((c) => c.id === selectedId) ?? clients[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-accent" />
          <p className="text-sm text-muted-foreground">
            Client work, deliverables, and deadlines. Tied into your daily automation
            and dashboard.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1">
              {clients.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                      selected?.id === c.id
                        ? "bg-accent/15 text-accent"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await createClient(new FormData(e.currentTarget));
                  toast.success("Client added");
                  router.refresh();
                });
              }}
              className="space-y-2 border-t border-border pt-3"
            >
              <Input name="name" placeholder="Client name" required />
              <Button type="submit" size="sm" className="w-full gap-1" disabled={pending}>
                <Plus className="h-4 w-4" /> Add client
              </Button>
            </form>
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger"
                onClick={() => {
                  if (confirm("Delete client and all deliverables?")) {
                    startTransition(async () => {
                      await deleteClient(selected.id);
                      toast.success("Client removed");
                      router.refresh();
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">New deliverable</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("clientId", selected.id);
                    startTransition(async () => {
                      await createDeliverable(fd);
                      toast.success("Deliverable added");
                      router.refresh();
                    });
                  }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <Input
                    name="title"
                    placeholder="Website review, proposal..."
                    required
                    className="sm:col-span-2"
                  />
                  <div>
                    <Label className="text-xs">Due date</Label>
                    <Input name="dueDate" type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Amount (GHS)</Label>
                    <Input name="amount" type="number" step="0.01" className="mt-1" />
                  </div>
                  <Button type="submit" disabled={pending} className="sm:col-span-2 gap-1">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add deliverable
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {selected.deliverables.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deliverables yet.</p>
              ) : (
                selected.deliverables.map((d) => (
                  <Card key={d.id} className="border-border/70 bg-card/80">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.dueDate
                            ? new Date(d.dueDate).toLocaleDateString()
                            : "No due date"}
                          {d.amount != null ? ` · ₵${d.amount}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={d.status}
                          onChange={(e) =>
                            startTransition(async () => {
                              await updateDeliverableStatus(d.id, e.target.value);
                              router.refresh();
                            })
                          }
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="DONE">Done</option>
                        </select>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-danger"
                          onClick={() =>
                            startTransition(async () => {
                              await deleteDeliverable(d.id);
                              toast.success("Deliverable removed");
                              router.refresh();
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <Card className="border-dashed p-12 text-center text-muted-foreground">
            Add your first client to track deliverables.
          </Card>
        )}
      </div>
    </div>
  );
}
