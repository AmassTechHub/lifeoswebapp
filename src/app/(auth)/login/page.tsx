"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { AuthField } from "@/components/auth/AuthField";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message ?? "Could not sign in. Check your email and password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {resetSuccess && (
        <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          Password updated. Sign in with your new password.
        </div>
      )}

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

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Password</span>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordField
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          delay={80}
          minLength={1}
          showStrength={false}
          label=""
        />
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="auth-field-enter h-12 w-full rounded-xl text-base shadow-md shadow-accent/20 [animation-delay:160ms]"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthSplitLayout
      mode="login"
      title="Welcome back"
      subtitle="Sign in to continue building your Life OS."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            Create one free
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
        <LoginForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
