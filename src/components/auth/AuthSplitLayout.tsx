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

      <div className="relative flex flex-col bg-[#f8fafc] px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-accent/[0.04] blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-900 transition-opacity hover:opacity-80"
            >
              Life OS
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>

          <div className="auth-form-enter mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {mode === "register" ? "Get started" : "Sign in"}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {subtitle}
            </p>
          </div>

          <div className="auth-form-enter rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.06)] sm:p-8 [animation-delay:80ms]">
            {children}
          </div>

          <p className="auth-form-enter mt-8 text-center text-sm text-slate-500 [animation-delay:160ms]">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
