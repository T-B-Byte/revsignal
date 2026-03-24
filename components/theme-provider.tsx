"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "revsignal-theme";
const VALID_THEMES: Theme[] = ["light", "dark", "system"];

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored as Theme)) return stored as Theme;
  } catch { /* localStorage unavailable */ }
  return "dark";
}

function writeStoredTheme(value: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch { /* localStorage unavailable */ }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  const resolve = useCallback((preference: Theme): "light" | "dark" => {
    if (preference === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "dark";
    }
    return preference;
  }, []);

  // Apply: dark = no class (default CSS), light = .light class
  const apply = useCallback((resolved: "light" | "dark") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (resolved === "light") {
      root.classList.add("light");
    }
    setResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    const preference = readStoredTheme();
    setThemeState(preference);
    apply(resolve(preference));
  }, [apply, resolve]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply(resolve("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, apply, resolve]);

  function setTheme(next: Theme) {
    setThemeState(next);
    writeStoredTheme(next);
    apply(resolve(next));
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
