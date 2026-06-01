import { PageHeader } from "@/components/layout/PageHeader";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-8">
      <PageHeader title={title} description={description} />
      <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          {title} module is coming in Phase 1 development.
        </p>
      </div>
    </div>
  );
}
