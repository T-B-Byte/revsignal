"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const POMODOROS_BEFORE_LONG_BREAK = 4;

type TimerPhase = "work" | "short_break" | "long_break";

interface PomodoroTimerProps {
  /** Compact inline mode vs expanded */
  compact?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PomodoroTimer({ compact = false }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds =
    phase === "work"
      ? WORK_MINUTES * 60
      : phase === "short_break"
        ? SHORT_BREAK_MINUTES * 60
        : LONG_BREAK_MINUTES * 60;

  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const playNotification = useCallback(() => {
    // Use Web Audio API for a gentle chime
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = phase === "work" ? 880 : 660;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio not available, skip
    }
  }, [phase]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Timer complete
          playNotification();

          if (phase === "work") {
            const newCount = completedPomodoros + 1;
            setCompletedPomodoros(newCount);
            if (newCount % POMODOROS_BEFORE_LONG_BREAK === 0) {
              setPhase("long_break");
              return LONG_BREAK_MINUTES * 60;
            } else {
              setPhase("short_break");
              return SHORT_BREAK_MINUTES * 60;
            }
          } else {
            // Break over, back to work
            setPhase("work");
            return WORK_MINUTES * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, completedPomodoros, playNotification]);

  const reset = useCallback(() => {
    setRunning(false);
    setPhase("work");
    setSecondsLeft(WORK_MINUTES * 60);
    setCompletedPomodoros(0);
  }, []);

  const skip = useCallback(() => {
    setRunning(false);
    if (phase === "work") {
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      if (newCount % POMODOROS_BEFORE_LONG_BREAK === 0) {
        setPhase("long_break");
        setSecondsLeft(LONG_BREAK_MINUTES * 60);
      } else {
        setPhase("short_break");
        setSecondsLeft(SHORT_BREAK_MINUTES * 60);
      }
    } else {
      setPhase("work");
      setSecondsLeft(WORK_MINUTES * 60);
    }
  }, [phase, completedPomodoros]);

  const phaseLabel =
    phase === "work" ? "Focus" : phase === "short_break" ? "Break" : "Long Break";

  const phaseColor =
    phase === "work"
      ? "text-accent-primary"
      : phase === "short_break"
        ? "text-status-green"
        : "text-status-yellow";

  const progressColor =
    phase === "work"
      ? "bg-accent-primary"
      : phase === "short_break"
        ? "bg-status-green"
        : "bg-status-yellow";

  // Compact inline view (collapsed)
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border-primary bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        {running ? (
          <span className={phaseColor}>
            {phaseLabel} {formatTime(secondsLeft)}
          </span>
        ) : (
          "Pomodoro"
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border-primary bg-surface-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Pomodoro Timer
          </span>
        </div>
        {compact && (
          <button
            onClick={() => setExpanded(false)}
            className="text-text-muted hover:text-text-primary text-xs"
          >
            Minimize
          </button>
        )}
      </div>

      {/* Timer display */}
      <div className="text-center mb-3">
        <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${phaseColor}`}>
          {phaseLabel}
        </p>
        <p className="text-3xl font-bold text-text-primary tabular-nums">
          {formatTime(secondsLeft)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-surface-primary overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Pomodoro dots */}
      <div className="flex justify-center gap-1.5 mb-3">
        {Array.from({ length: POMODOROS_BEFORE_LONG_BREAK }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full border transition-colors ${
              i < completedPomodoros % POMODOROS_BEFORE_LONG_BREAK ||
              (completedPomodoros > 0 &&
                completedPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0 &&
                i < POMODOROS_BEFORE_LONG_BREAK)
                ? "bg-accent-primary border-accent-primary"
                : "bg-surface-primary border-border-primary"
            }`}
          />
        ))}
        {completedPomodoros > 0 && (
          <span className="text-[10px] text-text-muted ml-1 self-center">
            {completedPomodoros} done
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
            running
              ? "bg-status-yellow/10 text-status-yellow border border-status-yellow/30 hover:bg-status-yellow/20"
              : "bg-accent-primary text-white hover:bg-accent-primary/80"
          }`}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={skip}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary border border-border-primary hover:bg-surface-tertiary transition-colors"
        >
          Skip
        </button>
        <button
          onClick={reset}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
