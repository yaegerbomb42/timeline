"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, KeyRound, Mail, Sparkles, Zap, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

export function AuthCard() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, signInAsAdmin } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "admin">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => {
      if (mode === "admin") return "Admin Access";
      return mode === "signin" ? "Welcome back" : "Begin your journey";
    },
    [mode],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "admin") {
        await signInAsAdmin(password);
      } else if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Animated background particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: Math.random() * 6 + 2,
            height: Math.random() * 6 + 2,
            background: `radial-gradient(circle, rgba(0, 245, 255, ${0.3 + Math.random() * 0.4}), transparent)`,
            boxShadow: `0 0 ${Math.random() * 15 + 5}px rgba(0, 245, 255, 0.5)`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]/80 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
          style={{
            boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 50px rgba(0,245,255,0.2) inset",
          }}
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 -z-10 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, var(--glow-cyan), transparent)",
                "radial-gradient(circle at 100% 100%, var(--glow-purple), transparent)",
                "radial-gradient(circle at 50% 50%, var(--glow-pink), transparent)",
                "radial-gradient(circle at 0% 0%, var(--glow-cyan), transparent)",
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="px-8 pt-8 pb-6 border-b border-[var(--line)]">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="h-14 w-14 rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl flex items-center justify-center"
                style={{
                  boxShadow: "0 0 30px var(--glow-cyan)",
                }}
              >
                <BookOpen className="h-6 w-6 text-[var(--neon-cyan)]" />
              </motion.div>
              <div>
                <motion.div
                  className="font-sans text-xs tracking-[0.3em] uppercase text-[var(--text-secondary)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Timeline
                </motion.div>
                <motion.div
                  className="font-book text-2xl leading-tight mt-1"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-purple), var(--neon-pink))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {title}
                </motion.div>
              </div>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-5 text-sm leading-6 text-[var(--text-secondary)]"
            >
              A vibrant chronicle of existence—each moment pulses with energy. Your story, written in living color.
            </motion.p>
          </div>

          <div className="px-8 py-7">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
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
                "w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl",
                "px-5 py-3.5 font-sans text-sm text-[var(--text-primary)] font-semibold",
                "hover:bg-[var(--bg-surface)]/80 transition-all duration-300",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-3",
              )}
              style={{
                boxShadow: "0 0 20px rgba(0,0,0,0.3)",
              }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-5 w-5 text-[var(--neon-cyan)]" />
              </motion.div>
              Continue with Google
            </motion.button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--line)] to-transparent" />
              <div className="font-sans text-xs text-[var(--text-secondary)]">or</div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--line)] to-transparent" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode !== "admin" && (
                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 font-sans text-xs text-[var(--text-secondary)]">
                    <Mail className="h-4 w-4 text-[var(--neon-purple)]" /> Email
                  </span>
                  <motion.input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@domain.com"
                    whileFocus={{ scale: 1.02 }}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-4 py-3.5 font-sans text-sm text-[var(--text-primary)] outline-none focus:ring-4 focus:ring-[var(--glow-cyan)] transition-all"
                    style={{
                      boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                    }}
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 font-sans text-xs text-[var(--text-secondary)]">
                  <KeyRound className="h-4 w-4 text-[var(--neon-pink)]" /> 
                  {mode === "admin" ? "Admin Password" : "Password"}
                </span>
                <motion.input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  whileFocus={{ scale: 1.02 }}
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl px-4 py-3.5 font-sans text-sm text-[var(--text-primary)] outline-none focus:ring-4 focus:ring-[var(--glow-cyan)] transition-all"
                  style={{
                    boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                  }}
                  required
                />
              </label>

              <motion.button
                type="submit"
                disabled={busy}
                whileHover={!busy ? { scale: 1.02, y: -2 } : {}}
                whileTap={!busy ? { scale: 0.98 } : {}}
                className={cn(
                  "w-full rounded-2xl px-5 py-3.5 font-sans text-sm font-bold text-[var(--bg-deep)]",
                  "bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-pink)]",
                  "shadow-[0_15px_50px_rgba(131,56,236,0.5)]",
                  "hover:shadow-[0_20px_60px_rgba(131,56,236,0.6)] transition-all",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
                  "flex items-center justify-center gap-2",
                )}
              >
                {busy ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap className="h-4 w-4" />
                    </motion.div>
                    {mode === "admin" ? "Signing in…" : mode === "signin" ? "Signing in…" : "Creating account…"}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    {mode === "admin" ? "Admin Sign in" : mode === "signin" ? "Sign in" : "Create account"}
                  </>
                )}
              </motion.button>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="rounded-2xl border border-[var(--neon-pink)]/50 bg-[var(--bg-surface)]/80 px-4 py-3 text-sm text-[var(--text-primary)]"
                    style={{
                      boxShadow: "0 0 20px rgba(255,0,110,0.3)",
                    }}
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-[var(--text-secondary)] font-sans gap-2">
              {mode !== "admin" ? (
                <>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                    className="underline underline-offset-4 hover:text-[var(--neon-cyan)] transition-colors"
                  >
                    {mode === "signin" ? "Create an account" : "I already have an account"}
                  </motion.button>
                </>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMode("signin")}
                  className="underline underline-offset-4 hover:text-[var(--neon-cyan)] transition-colors"
                >
                  Back to sign in
                </motion.button>
              )}
              <span className="opacity-70 text-[10px]">Your entries are private</span>
            </div>

            {/* Guest and Admin access buttons */}
            {mode === "signin" && (
              <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    signInAsGuest();
                  }}
                  className={cn(
                    "w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)]/60 backdrop-blur-xl",
                    "px-5 py-2.5 font-sans text-xs text-[var(--text-secondary)] font-medium",
                    "hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/80 transition-all duration-300"
                  )}
                >
                  Continue as Guest (View Only)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("admin")}
                  className={cn(
                    "w-full rounded-2xl border border-[var(--neon-purple)]/50 bg-[var(--neon-purple)]/10",
                    "px-5 py-2.5 font-sans text-xs text-[var(--neon-purple)] font-medium",
                    "hover:bg-[var(--neon-purple)]/20 transition-all duration-300"
                  )}
                >
                  Admin Access
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
