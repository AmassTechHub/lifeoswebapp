"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { AuthField } from "@/components/auth/AuthField";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = new URLSearchParams(window.location.search).get("email");
    if (emailParam) setEmail(emailParam);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } = await authClient.signUp.email({
      name: name.trim(),
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      const message =
        signUpError.message ??
        (signUpError.status === 500
          ? "Server error. Run npm run db:push in the LifeOS folder, then try again."
          : "Could not create account.");
      setError(message);
      return;
    }

    // Hard navigation, not router.push — discards any client-side cache left
    // over from a previous account in this browser tab.
    window.location.href = "/dashboard";
  }

  return (
    <AuthSplitLayout
      mode="register"
      title="Create your account"
      subtitle="One account. One system. Start executing better today."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Full name"
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
          required
          delay={0}
        />

        <AuthField
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          delay={80}
        />

        <PasswordField
          value={password}
          onChange={setPassword}
          delay={160}
        />

        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="auth-field-enter h-12 w-full rounded-xl text-base shadow-md shadow-accent/20 [animation-delay:240ms]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="auth-field-enter text-center text-xs leading-relaxed text-muted-foreground [animation-delay:280ms]">
          By creating an account, you agree to use Life OS to plan, track, and
          execute your personal goals.
        </p>
      </form>
    </AuthSplitLayout>
  );
}
