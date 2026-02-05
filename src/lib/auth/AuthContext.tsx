"use client";

import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { auth, db } from "@/lib/firebase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => void;
  signInAsAdmin: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function upsertUserProfile(user: User) {
  const ref = doc(db, "users", user.uid);
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      lastLoginAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check for stored guest/admin mode
    const guestMode = localStorage.getItem("timeline_guest_mode");
    const adminMode = localStorage.getItem("timeline_admin_mode");
    
    if (guestMode === "true") {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    if (adminMode === "true") {
      setIsAdmin(true);
    }

    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        try {
          await upsertUserProfile(u);
          // If user is signed in and admin mode was stored, keep it
          if (adminMode === "true") {
            setIsAdmin(true);
          }
        } catch {
          // Non-fatal; auth still works.
        }
      } else {
        // If not authenticated and not guest, clear admin mode
        if (!guestMode) {
          setIsAdmin(false);
          localStorage.removeItem("timeline_admin_mode");
        }
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isGuest,
      isAdmin,
      async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        await upsertUserProfile(cred.user);
        setIsGuest(false);
        localStorage.removeItem("timeline_guest_mode");
      },
      async signInWithEmail(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await upsertUserProfile(cred.user);
        setIsGuest(false);
        localStorage.removeItem("timeline_guest_mode");
      },
      async signUpWithEmail(email, password) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await upsertUserProfile(cred.user);
        setIsGuest(false);
        localStorage.removeItem("timeline_guest_mode");
      },
      signInAsGuest() {
        setIsGuest(true);
        localStorage.setItem("timeline_guest_mode", "true");
        setLoading(false);
      },
      async signInAsAdmin(password) {
        if (password !== "Zawe1234!") {
          throw new Error("Invalid admin password");
        }
        // Admin mode uses existing authenticated account
        // Just need to verify user is already signed in with main account
        if (!user) {
          throw new Error("Please sign in with your account first, then use admin access");
        }
        setIsAdmin(true);
        setIsGuest(false);
        localStorage.setItem("timeline_admin_mode", "true");
        localStorage.removeItem("timeline_guest_mode");
      },
      async signOut() {
        await firebaseSignOut(auth);
        setIsGuest(false);
        setIsAdmin(false);
        localStorage.removeItem("timeline_guest_mode");
        localStorage.removeItem("timeline_admin_mode");
      },
    }),
    [user, loading, isGuest, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}


