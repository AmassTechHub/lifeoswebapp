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
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <AuthBrandPanel mode={mode} />

      <div className="flex min-h-screen flex-col bg-background">
        {/* Mobile header */}
        <div className="flex h-14 items-center justify-between border-b border-border/50 px-5 lg:hidden">
          <Link href="/" className="text-[15px] font-semibold text-foreground">
            Life OS
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-90">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {/* Form */}
            {children}

            {/* Footer link */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
