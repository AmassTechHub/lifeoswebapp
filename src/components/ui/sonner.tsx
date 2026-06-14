"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-white group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          success: "group-[.toaster]:text-success group-[.toaster]:border-success/20",
          error: "group-[.toaster]:text-danger group-[.toaster]:border-danger/20",
          warning: "group-[.toaster]:text-warning group-[.toaster]:border-warning/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
