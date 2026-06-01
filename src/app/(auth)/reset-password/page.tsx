"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(
    errorParam === "INVALID_TOKEN"
      ? "This reset link is invalid or expired. Request a new one."
      : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Missing reset token. Request a new link.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? "Could not reset password. Request a new link.");
      return;
    }

    router.push("/login?reset=success");
  }

  if (!token && errorParam) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
        <Button className="w-full rounded-xl" asChild>
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PasswordField
        label="New password"
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        delay={0}
      />

      <PasswordField
        label="Confirm password"
        id="confirm-password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Repeat your password"
        delay={80}
        showStrength={false}
      />

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="auth-field-enter h-12 w-full rounded-xl text-base shadow-md shadow-accent/20 [animation-delay:160ms]"
        disabled={loading || !token}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          <>
            Set new password
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthSplitLayout
      mode="login"
      title="Choose a new password"
      subtitle="Pick a strong password you have not used here before."
      footer={
        <>
          Back to{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            sign in
          </Link>
        </>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
