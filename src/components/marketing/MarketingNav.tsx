"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", href: "#capabilities" },
  { label: "Modules", href: "#modules" },
  { label: "AI Coach", href: "#ai-coach" },
  { label: "Pricing", href: "#pricing" },
];

const navLinkClass =
  "relative text-sm font-medium text-slate-600 transition-colors hover:text-accent after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200 hover:after:scale-x-100";

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f8fafc]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          Life OS
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={navLinkClass}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={`${navLinkClass} hidden sm:inline`}
          >
            Sign in
          </Link>
          <Button
            size="sm"
            className="hidden rounded-full bg-accent px-5 shadow-sm shadow-accent/25 hover:bg-accent/90 sm:inline-flex"
            asChild
          >
            <Link href="/register">
              Start Your Life OS
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "fixed inset-0 top-16 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close menu"
          onClick={closeMenu}
        />

        <nav
          className={cn(
            "relative border-b border-slate-200/70 bg-[#f8fafc] px-6 py-6 shadow-lg transition-all duration-300 ease-out",
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          )}
          aria-label="Mobile"
        >
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-xl border border-transparent px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:border-accent/20 hover:bg-accent/5 hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-3 border-t border-slate-200/70 pt-6">
            <Link
              href="/login"
              onClick={closeMenu}
              className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-accent/5 hover:text-accent"
            >
              Sign in
            </Link>
            <Button className="h-11 w-full rounded-full bg-accent hover:bg-accent/90" asChild>
              <Link href="/register" onClick={closeMenu}>
                Start Your Life OS
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
