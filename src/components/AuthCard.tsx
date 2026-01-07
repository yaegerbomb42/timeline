"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, KeyRound, Mail, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

export function AuthCard() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === "signin" ? "Welcome back" : "Begin your ledger"),
    [mode],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password);
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-[var(--line)] bg-white/50 backdrop-blur-sm shadow-[0_20px_70px_var(--shadow)] overflow-hidden">
          <div className="px-7 pt-7 pb-6 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl border border-[var(--line)] bg-[rgba(176,141,87,0.08)] flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-[color:var(--brass-2)]" />
              </div>
              <div>
                <div className="font-sans text-xs tracking-[0.22em] uppercase text-[color:var(--muted)]">
                  Timeline
                </div>
                <div className="font-serif text-lg leading-tight text-[color:var(--ink)]">
                  {title}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--ink-2)]">
              A quiet place to write—and later, ask the librarian to summarize the chapters you’ve lived.
            </p>
          </div>

          <div className="px-7 py-6">
            <button
              onClick={async () => {
                setError(null);
                setBusy(true);
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  setError(err?.message ?? "Google sign-in failed.");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className={cn(
                "w-full rounded-2xl border border-[var(--line)] bg-white/60",
                "px-4 py-3 font-sans text-sm text-[color:var(--ink)]",
                "hover:bg-white/80 transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-[color:var(--brass-2)]" />
                Continue with Google
              </span>
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--line)]" />
              <div className="font-sans text-xs text-[color:var(--muted)]">or</div>
              <div className="h-px flex-1 bg-[var(--line)]" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-2 font-sans text-xs text-[color:var(--muted)]">
                  <Mail className="h-3.5 w-3.5" /> Email
                </span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 font-sans text-sm text-[color:var(--ink)] outline-none focus:ring-4 focus:ring-[var(--ring)]"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-2 font-sans text-xs text-[color:var(--muted)]">
                  <KeyRound className="h-3.5 w-3.5" /> Password
                </span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3 font-sans text-sm text-[color:var(--ink)] outline-none focus:ring-4 focus:ring-[var(--ring)]"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "w-full rounded-2xl px-4 py-3 font-sans text-sm text-[color:var(--paper)]",
                  "bg-[linear-gradient(135deg,var(--brass),var(--brass-2))]",
                  "shadow-[0_10px_30px_rgba(176,141,87,0.25)]",
                  "hover:shadow-[0_14px_40px_rgba(176,141,87,0.28)] transition-shadow",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="rounded-2xl border border-[rgba(140,60,40,0.25)] bg-[rgba(140,60,40,0.06)] px-4 py-3 text-sm text-[color:var(--ink)]"
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </form>

            <div className="mt-5 flex items-center justify-between text-xs text-[color:var(--muted)] font-sans">
              <button
                type="button"
                onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                className="underline underline-offset-4 hover:text-[color:var(--ink)] transition-colors"
              >
                {mode === "signin" ? "Create an account" : "I already have an account"}
              </button>
              <span className="opacity-70">Your entries are private to your login.</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


