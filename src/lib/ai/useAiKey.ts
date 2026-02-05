"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const KEY_STORAGE_ID = "timeline_ai_key_secret_v1";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getOrCreateCryptoKey(): Promise<CryptoKey | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  let stored = window.localStorage.getItem(KEY_STORAGE_ID);
  if (!stored) {
    const raw = window.crypto.getRandomValues(new Uint8Array(32));
    stored = bytesToBase64(raw);
    window.localStorage.setItem(KEY_STORAGE_ID, stored);
  }
  const rawBytes = base64ToBytes(stored);
  return window.crypto.subtle.importKey("raw", rawBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptApiKey(value: string) {
  if (!value) return "";
  const key = await getOrCreateCryptoKey();
  if (!key || typeof window === "undefined") return value;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipher))}`;
}

async function decryptApiKey(value: string) {
  if (!value) return "";
  if (!value.startsWith("v1:") || typeof window === "undefined") return value;
  const key = await getOrCreateCryptoKey();
  if (!key) return "";
  const [, ivBase64, cipherBase64] = value.split(":");
  if (!ivBase64 || !cipherBase64) return "";
  const iv = base64ToBytes(ivBase64);
  const cipher = base64ToBytes(cipherBase64);
  try {
    const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}

export function useAiKey(uid?: string | null) {
  const [aiKey, setAiKeyState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load API key from Firebase on mount
  useEffect(() => {
    if (!uid) {
      setHydrated(true);
      return;
    }

    let cancelled = false;
    
    async function loadKey(userId: string) {
      setLoading(true);
      try {
        const settingsRef = collection(db, "users", userId, "settings");
        const docRef = doc(settingsRef, "aiConfig");
        const docSnap = await getDoc(docRef);
        
        if (!cancelled && docSnap.exists()) {
          const data = docSnap.data();
          const rawKey = typeof data?.geminiApiKey === "string" ? data.geminiApiKey : "";
          const decrypted = await decryptApiKey(rawKey);
          setAiKeyState(decrypted);
        }
      } catch (error) {
        console.error("Error loading AI key from Firebase:", error);
        // Silently fail - user can re-enter key
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setLoading(false);
        }
      }
    }

    void loadKey(uid);

    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function setAiKey(next: string) {
    const v = next.trim();
    setAiKeyState(v);
    
    if (!uid) return;
    
    try {
      const settingsRef = collection(db, "users", uid, "settings");
      const docRef = doc(settingsRef, "aiConfig");
      if (!v) {
        // Clear the key by setting it to empty string
        await setDoc(docRef, { geminiApiKey: "" }, { merge: true });
      } else {
        const encrypted = await encryptApiKey(v);
        await setDoc(docRef, { geminiApiKey: encrypted }, { merge: true });
      }
    } catch (error) {
      console.error("Error saving AI key to Firebase:", error);
      // Key is still updated locally, so user can continue using it this session
    }
  }

  function clearAiKey() {
    void setAiKey("");
  }

  return {
    aiKey,
    hydrated,
    loading,
    hasKey: Boolean(aiKey.trim()),
    setAiKey,
    clearAiKey,
  };
}
