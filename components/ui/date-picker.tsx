"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse } from "date-fns";

interface DatePickerProps {
  value?: string; // yyyy-MM-dd
  defaultValue?: string; // yyyy-MM-dd
  onChange?: (value: string) => void;
  min?: string; // yyyy-MM-dd
  max?: string; // yyyy-MM-dd
  name?: string;
  label?: string;
  helperText?: string;
  error?: string;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export function DatePicker({
  value,
  defaultValue,
  onChange,
  min,
  max,
  name,
  label,
  helperText,
  error,
  placeholder = "Pick a date",
  className = "",
  size = "md",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const current = value !== undefined ? value : internalValue;

  const selected = current
    ? parse(current, "yyyy-MM-dd", new Date())
    : undefined;

  const fromDate = min ? parse(min, "yyyy-MM-dd", new Date()) : undefined;
  const toDate = max ? parse(max, "yyyy-MM-dd", new Date()) : undefined;

  function handleSelect(day: Date | undefined) {
    const formatted = day ? format(day, "yyyy-MM-dd") : "";
    if (value === undefined) setInternalValue(formatted);
    onChange?.(formatted);
    setOpen(false);
  }

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Reposition popover if it would overflow viewport
  useEffect(() => {
    if (!open || !popoverRef.current || !containerRef.current) return;
    const popover = popoverRef.current;
    const rect = popover.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Flip up if overflows bottom
    if (rect.bottom > viewportHeight - 8) {
      popover.style.bottom = "100%";
      popover.style.top = "auto";
      popover.style.marginBottom = "4px";
      popover.style.marginTop = "0";
    }
    // Shift left if overflows right
    if (rect.right > viewportWidth - 8) {
      popover.style.right = "0";
      popover.style.left = "auto";
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs"
      : "px-3 py-2 text-sm";

  const displayText = selected
    ? format(selected, "MMM d, yyyy")
    : placeholder;

  const inputId = label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={current} />}

        <button
          type="button"
          id={inputId}
          onClick={() => setOpen(!open)}
          className={`w-full text-left rounded-md border bg-surface-secondary
            focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary
            ${error ? "border-status-red" : "border-border-primary"}
            ${selected ? "text-text-primary" : "text-text-muted"}
            ${sizeClasses} ${className}`}
        >
          <span className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-text-muted"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {displayText}
          </span>
        </button>

        {/* Calendar popover */}
        {open && (
          <div
            ref={popoverRef}
            className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border-primary bg-surface-secondary shadow-lg"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected || new Date()}
              disabled={[
                ...(fromDate ? [{ before: fromDate }] : []),
                ...(toDate ? [{ after: toDate }] : []),
              ]}
              classNames={{
                root: "p-3",
                months: "flex flex-col",
                month_caption: "flex justify-center items-center mb-2",
                caption_label: "text-sm font-semibold text-text-primary",
                nav: "flex items-center gap-1",
                button_previous:
                  "absolute left-3 top-3 h-7 w-7 flex items-center justify-center rounded-md hover:bg-surface-tertiary text-text-secondary",
                button_next:
                  "absolute right-3 top-3 h-7 w-7 flex items-center justify-center rounded-md hover:bg-surface-tertiary text-text-secondary",
                weekdays: "flex",
                weekday:
                  "w-9 text-[11px] font-medium text-text-muted text-center",
                week: "flex mt-0.5",
                day: "w-9 h-9 flex items-center justify-center text-xs rounded-md text-text-primary hover:bg-surface-tertiary cursor-pointer",
                day_button: "w-full h-full flex items-center justify-center",
                selected:
                  "!bg-accent-primary !text-white hover:!bg-accent-primary/90",
                today: "font-bold text-accent-primary",
                disabled: "text-text-muted/40 cursor-not-allowed hover:bg-transparent",
                outside: "text-text-muted/30",
              }}
            />
            {current && (
              <div className="border-t border-border-primary px-3 py-2">
                <button
                  type="button"
                  onClick={() => handleSelect(undefined)}
                  className="text-xs text-text-muted hover:text-status-red transition-colors"
                >
                  Clear date
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-status-red">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
}
