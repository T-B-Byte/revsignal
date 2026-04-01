"use client";

import { useEffect, useRef, useState } from "react";

interface DataCoverageProps {
  accentColor?: string;
  theme?: "dark" | "light";
}

interface BarData {
  label: string;
  value: string;
  percentage: number;
}

const AUDIENCE_BY_VERTICAL: BarData[] = [
  { label: "Information Technology", value: "31.2M", percentage: 25 },
  { label: "Sales & Business Dev", value: "28.8M", percentage: 23 },
  { label: "Marketing", value: "22.4M", percentage: 18 },
  { label: "Finance & Accounting", value: "14.9M", percentage: 12 },
  { label: "Executive Management", value: "11.2M", percentage: 9 },
  { label: "Healthcare", value: "8.7M", percentage: 7 },
  { label: "Human Resources", value: "7.5M", percentage: 6 },
];

const INTENT_BY_REGION: BarData[] = [
  { label: "North America", value: "198.2M", percentage: 57 },
  { label: "EMEA", value: "87.2M", percentage: 25 },
  { label: "APAC", value: "45.4M", percentage: 13 },
  { label: "LATAM", value: "18.1M", percentage: 5 },
];

const SENIORITY_DISTRIBUTION: BarData[] = [
  { label: "C-Suite & Founders", value: "8%", percentage: 8 },
  { label: "VP Level", value: "12%", percentage: 12 },
  { label: "Director Level", value: "18%", percentage: 18 },
  { label: "Manager Level", value: "27%", percentage: 27 },
  { label: "Individual Contributor", value: "35%", percentage: 35 },
];

const HERO_STATS = [
  { label: "Contacts", value: "360M+", color: "#4f6ef7" },
  { label: "Intent Signals", value: "348.9M", color: "#7c3aed" },
  { label: "Intent Topics", value: "7,879", color: "#f59e0b" },
  { label: "Companies", value: "25M+", color: "#10b981" },
];

// Each section gets its own solid color, like the audience dashboard
const SECTION_COLORS = {
  vertical: "#4f6ef7",    // blue
  region: "#7c3aed",      // purple
  seniority: "#10b981",   // emerald
};

const STAGGER_MS = 100;
const BASE_DELAY_MS = 150;

function useInViewAnimation(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

function AnimatedBar({
  bar,
  index,
  animate,
  color,
  theme,
  maxPercentage,
}: {
  bar: BarData;
  index: number;
  animate: boolean;
  color: string;
  theme: "dark" | "light";
  maxPercentage: number;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => {
      setWidth((bar.percentage / maxPercentage) * 100);
    }, BASE_DELAY_MS + index * STAGGER_MS);
    return () => clearTimeout(timer);
  }, [animate, bar.percentage, index, maxPercentage]);

  const barBg = theme === "dark" ? "bg-white/[0.06]" : "bg-zinc-100";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span
          className={theme === "dark" ? "text-sm text-zinc-200" : "text-sm text-zinc-700"}
        >
          {bar.label}
        </span>
        <span
          className={`font-mono text-sm font-semibold ${
            theme === "dark" ? "text-zinc-300" : "text-zinc-600"
          }`}
        >
          {bar.value}
          {!bar.value.endsWith("%") && (
            <span className="ml-1 text-xs font-normal opacity-50">({bar.percentage}%)</span>
          )}
        </span>
      </div>
      <div className={`h-3 w-full overflow-hidden rounded-full ${barBg}`}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

function BarSection({
  title,
  subtitle,
  bars,
  color,
  theme,
}: {
  title: string;
  subtitle: string;
  bars: BarData[];
  color: string;
  theme: "dark" | "light";
}) {
  const [ref, inView] = useInViewAnimation();
  const maxPercentage = Math.max(...bars.map((b) => b.percentage));

  const t = (dark: string, light: string) => (theme === "dark" ? dark : light);

  return (
    <div
      ref={ref}
      className={t(
        "rounded-xl border border-zinc-800 bg-zinc-900/60 p-6",
        "rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      )}
    >
      <div className="flex items-center gap-3 mb-1">
        <div
          className="h-3 w-3 rounded-sm shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3 className={t("text-base font-semibold text-white", "text-base font-semibold text-zinc-900")}>
          {title}
        </h3>
      </div>
      <p className={t("text-sm text-zinc-500 mb-5", "text-sm text-zinc-400 mb-5")}>
        {subtitle}
      </p>
      <div className="space-y-3">
        {bars.map((bar, i) => (
          <AnimatedBar
            key={bar.label}
            bar={bar}
            index={i}
            animate={inView}
            color={color}
            theme={theme}
            maxPercentage={maxPercentage}
          />
        ))}
      </div>
    </div>
  );
}

export function DataCoverage({ theme = "dark" }: DataCoverageProps) {
  const t = (dark: string, light: string) => (theme === "dark" ? dark : light);

  return (
    <div className="space-y-6">
      {/* Hero stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {HERO_STATS.map((stat) => (
          <div
            key={stat.label}
            className={t(
              "flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-5",
              "flex flex-col items-center rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm"
            )}
          >
            <span
              className="font-mono text-2xl font-bold sm:text-3xl"
              style={{ color: stat.color }}
            >
              {stat.value}
            </span>
            <span className={t("mt-1 text-xs text-zinc-400", "mt-1 text-xs text-zinc-500")}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Audience Coverage by Vertical */}
      <BarSection
        title="Audience Coverage by Vertical"
        subtitle="360M+ first-party business contacts"
        bars={AUDIENCE_BY_VERTICAL}
        color={SECTION_COLORS.vertical}
        theme={theme}
      />

      {/* Intent Signals by Region */}
      <BarSection
        title="Intent Signals by Region"
        subtitle="348.9M signals tracked (last 90 days)"
        bars={INTENT_BY_REGION}
        color={SECTION_COLORS.region}
        theme={theme}
      />

      {/* Seniority Distribution */}
      <BarSection
        title="Contact Seniority Distribution"
        subtitle="Decision-maker density across the database"
        bars={SENIORITY_DISTRIBUTION}
        color={SECTION_COLORS.seniority}
        theme={theme}
      />
    </div>
  );
}
