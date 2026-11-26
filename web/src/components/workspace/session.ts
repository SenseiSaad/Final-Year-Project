"use client";

import { useSyncExternalStore } from "react";

/*
  Sign-in is open in this demo, but the app still behaves like an app: you sign in,
  the browser remembers it, and signing out returns you to the sign-in page.
*/
const KEY = "docutrust:session";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function signIn() {
  try {
    localStorage.setItem(KEY, "admin");
  } catch {
    /* storage blocked: the session lasts until the page reloads */
    memory = true;
  }
  emit();
}

export function signOut() {
  memory = false;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
  emit();
}

let memory = false;

function read(): "in" | "out" {
  try {
    return localStorage.getItem(KEY) ? "in" : memory ? "in" : "out";
  } catch {
    return memory ? "in" : "out";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** "unknown" while rendering on the server, so nothing flashes before the browser is checked */
export function useSession(): "unknown" | "in" | "out" {
  return useSyncExternalStore(subscribe, read, () => "unknown");
}
