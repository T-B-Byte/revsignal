"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WorkflowStep } from "@/types/database";
import { WORKFLOW_TEMPLATES } from "@/types/database";

interface WorkflowBuilderProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
}

export function WorkflowBuilder({ steps, onChange }: WorkflowBuilderProps) {
  const [showTemplates, setShowTemplates] = useState(steps.length === 0);

  function addStep() {
    const nextNumber = steps.length > 0
      ? Math.max(...steps.map((s) => s.step_number)) + 1
      : 1;
    onChange([...steps, { step_number: nextNumber, description: "" }]);
  }

  function updateStep(index: number, description: string) {
    const updated = steps.map((s, i) =>
      i === index ? { ...s, description } : s
    );
    onChange(updated);
  }

  function removeStep(index: number) {
    const updated = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, step_number: i + 1 }));
    onChange(updated);
  }

  function moveStep(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }
    const updated = [...steps];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    onChange(updated.map((s, i) => ({ ...s, step_number: i + 1 })));
  }

  function applyTemplate(templateIndex: number) {
    const template = WORKFLOW_TEMPLATES[templateIndex];
    onChange([...template.steps]);
    setShowTemplates(false);
  }

  return (
    <div className="space-y-4">
      {/* Template selector */}
      {showTemplates && (
        <div className="rounded-lg border border-border-primary bg-surface-secondary/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">
              Start from a template
            </p>
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              Build from scratch
            </button>
          </div>
          <p className="text-xs text-text-muted">
            Choose a common workflow pattern, then customize the steps for this deal.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {WORKFLOW_TEMPLATES.map((template, i) => (
              <button
                key={template.name}
                type="button"
                onClick={() => applyTemplate(i)}
                className="rounded-md border border-border-primary bg-surface-secondary px-4 py-3 text-left hover:border-accent-primary/40 hover:bg-accent-primary/5 transition-colors"
              >
                <p className="text-sm font-medium text-text-primary">
                  {template.name}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {template.steps.length} steps
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Steps list */}
      {steps.length > 0 && (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex gap-3 rounded-lg border border-border-primary bg-surface-secondary/50 p-3"
            >
              {/* Step number */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-semibold text-accent-primary">
                  {step.step_number}
                </span>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveStep(index, "up")}
                    disabled={index === 0}
                    className="text-text-muted hover:text-text-secondary disabled:opacity-30 transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(index, "down")}
                    disabled={index === steps.length - 1}
                    className="text-text-muted hover:text-text-secondary disabled:opacity-30 transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="flex-1">
                <Textarea
                  value={step.description}
                  onChange={(e) => updateStep(index, e.target.value)}
                  rows={2}
                  placeholder="Describe what happens at this step..."
                  className="text-sm"
                />
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="mt-1 shrink-0 text-text-muted hover:text-status-red transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={addStep}>
          + Add step
        </Button>
        {steps.length > 0 && !showTemplates && (
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Load a template
          </button>
        )}
      </div>
    </div>
  );
}
