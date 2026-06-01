"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { AuthField } from "@/components/auth/AuthField";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error: resetError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? "Could not send reset link. Try again.");
      return;
    }

    setSent(true);
  }

  return (
    <AuthSplitLayout
      mode="login"
      title="Reset your password"
      subtitle="Enter your email and we will send you a link to choose a new password."
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-4 text-sm text-slate-700">
            If an account exists for that email, a reset link has been sent.
            {process.env.NODE_ENV === "development" && (
              <p className="mt-2 text-xs text-slate-500">
                In development, check your terminal console for the reset URL.
              </p>
            )}
          </div>
          <Button variant="outline" className="w-full rounded-xl" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            delay={0}
          />

          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="auth-field-enter h-12 w-full rounded-xl text-base shadow-md shadow-accent/20"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              <>
                Send reset link
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
