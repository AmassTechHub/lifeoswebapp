import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function MarketingFooter() {
  return (
    <footer className="bg-[#f8fafc] px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
        <h2 className="max-w-xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Ready to design your life and execute your vision?
        </h2>
        <p className="max-w-lg text-slate-600">
          Join Life OS and turn scattered tools into one system that helps you
          become the person you want to become.
        </p>
        <Button
          size="lg"
          className="rounded-full bg-accent px-7 shadow-md shadow-accent/20"
          asChild
        >
          <Link href="/register">
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Life OS · The Operating System For Your
          Life
        </p>
      </div>
    </footer>
  );
}
