
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sprout,
} from "lucide-react";

import { supabaseAuth } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: signInError } =
        await supabaseAuth.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signInError || !data.session) {
        setError(
          "Unable to sign in. Please check your credentials and try again."
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError(
        "Unable to connect to the authentication service. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div
          role="status"
          className="flex items-center gap-3 text-sm text-slate-500"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          Checking your session...
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh bg-slate-50">
      {/* Left Brand Panel */}
      <section className="relative hidden min-h-dvh w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex xl:p-16">
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="absolute -left-20 bottom-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
            <Sprout className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold">
              GrowPilot AI
            </h1>

            <p className="text-xs text-slate-400">
              Intelligent Business Growth
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
            <Sprout className="h-4 w-4" />
            AI-Powered Retention Intelligence
          </div>

          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Turn customer data into smarter growth decisions.
          </h2>

          <p className="max-w-lg text-base leading-8 text-slate-400">
            Analyze customer behavior, discover retention
            opportunities, generate AI recommendations,
            and manage business actions from one place.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">
                AI Intelligence
              </p>

              <p className="mt-2 text-xs leading-6 text-slate-400">
                Data-driven customer retention insights.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">
                Human Control
              </p>

              <p className="mt-2 text-xs leading-6 text-slate-400">
                Review and approve AI-generated actions.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          GrowPilot AI · Business Growth Platform
        </p>
      </section>

      {/* Login Form */}
      <section className="flex min-h-dvh w-full items-center justify-center px-5 py-12 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Sprout className="h-6 w-6" />
            </div>

            <div>
              <p className="text-lg font-bold text-slate-900">
                GrowPilot AI
              </p>

              <p className="text-xs text-slate-500">
                Business Growth Platform
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <LockKeyhole className="h-6 w-6 text-blue-600" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Sign in to your account to access your
              business dashboard and AI tools.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter your email"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <p className="text-xs leading-6 text-slate-500">
              Authentication is managed by Supabase.
              Access to business data requires additional
              server-side authorization.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            GrowPilot AI · Secure Business Access
          </p>
        </div>
      </section>
    </main>
  );
}
