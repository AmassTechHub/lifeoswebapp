import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";

interface AuthSplitLayoutProps {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function AuthSplitLayout({
  mode,
  title,
  subtitle,
  footer,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel mode={mode} />

      <div className="relative flex flex-col bg-background px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-accent/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-accent/[0.03] blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="text-sm font-semibold text-foreground transition-opacity hover:opacity-70"
            >
              Life OS
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>

          <div className="auth-form-enter mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {mode === "register" ? "Get started" : "Sign in"}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>

          <div className="auth-form-enter rounded-2xl border border-border/80 bg-card p-6 shadow-[0_8px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] sm:p-8 [animation-delay:80ms]">
            {children}
          </div>

          <p className="auth-form-enter mt-8 text-center text-sm text-muted-foreground [animation-delay:160ms]">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
