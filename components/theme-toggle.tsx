"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  const options: { value: "light" | "dark" | "system"; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  if (collapsed) {
    // Cycle through modes on click when sidebar is collapsed
    const next =
      theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    return (
      <button
        onClick={() => setTheme(next)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
        title={`Theme: ${theme}`}
      >
        <ThemeIcon theme={theme} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-tertiary p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            theme === opt.value
              ? "bg-surface-primary text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <ThemeIcon theme={opt.value} size={12} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ThemeIcon({
  theme,
  size = 14,
}: {
  theme: "light" | "dark" | "system";
  size?: number;
}) {
  if (theme === "light") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  // system
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
