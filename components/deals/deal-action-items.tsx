"use client";

import { useState, useTransition } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  updateActionItem,
  createActionItem,
} from "@/app/(dashboard)/deals/[dealId]/actions";
import type {
  ActionItem,
  ActionStatus,
  EscalationLevel,
} from "@/types/database";
import { format } from "date-fns";

interface DealActionItemsProps {
  actionItems: ActionItem[];
  dealId: string;
}

function getEscalationVariant(level: EscalationLevel): BadgeVariant {
  switch (level) {
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "red":
      return "red";
    default:
      return "gray";
  }
}

function getStatusStyle(status: ActionStatus): string {
  switch (status) {
    case "completed":
      return "line-through text-text-muted";
    case "overdue":
      return "text-status-red";
    case "cancelled":
      return "line-through text-text-muted opacity-60";
    default:
      return "text-text-primary";
  }
}

export function DealActionItems({
  actionItems,
  dealId,
}: DealActionItemsProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggleStatus(item: ActionItem) {
    const newStatus: ActionStatus =
      item.status === "completed" ? "pending" : "completed";

    startTransition(async () => {
      await updateActionItem(item.item_id, { status: newStatus }, dealId);
    });
  }

  function handleCreateItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("deal_id", dealId);

    startTransition(async () => {
      const result = await createActionItem(formData);
      if (!("error" in result)) {
        setShowCreateForm(false);
      }
    });
  }

  const pending = actionItems.filter(
    (item) => item.status === "pending" || item.status === "overdue"
  );
  const completed = actionItems.filter(
    (item) => item.status === "completed" || item.status === "cancelled"
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Action Items
          {pending.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted">
              ({pending.length} open)
            </span>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {/* Create form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateItem}
            className="mb-4 p-3 bg-surface-secondary/50 border border-border-primary rounded-md space-y-3"
          >
            <Input
              name="description"
              label="Description"
              placeholder="What needs to be done?"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                name="owner"
                label="Owner"
                options={[
                  { value: "me", label: "Me" },
                  { value: "them", label: "Them" },
                ]}
                defaultValue="me"
              />
              <DatePicker name="due_date" label="Due Date" placeholder="Pick date" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isPending}>
                Add Item
              </Button>
            </div>
          </form>
        )}

        {actionItems.length === 0 && !showCreateForm ? (
          <div className="text-center py-8 text-text-muted">
            <p className="text-sm">No action items yet.</p>
            <p className="text-xs mt-1">
              Add items manually or log a conversation with next steps.
            </p>
          </div>
        ) : (
          <div className={`space-y-4 ${isPending ? "opacity-60" : ""}`}>
            {/* Pending items */}
            {pending.length > 0 && (
              <div className="space-y-2">
                {pending.map((item) => (
                  <ActionItemRow
                    key={item.item_id}
                    item={item}
                    onToggle={() => handleToggleStatus(item)}
                  />
                ))}
              </div>
            )}

            {/* Completed items */}
            {completed.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider pt-2">
                  Completed ({completed.length})
                </p>
                {completed.map((item) => (
                  <ActionItemRow
                    key={item.item_id}
                    item={item}
                    onToggle={() => handleToggleStatus(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Action Item Row ---

interface ActionItemRowProps {
  item: ActionItem;
  onToggle: () => void;
}

function ActionItemRow({ item, onToggle }: ActionItemRowProps) {
  const isCompleted =
    item.status === "completed" || item.status === "cancelled";

  return (
    <div className="flex items-start gap-3 py-2 px-1 group">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
          isCompleted
            ? "bg-accent-primary border-accent-primary"
            : "border-border-primary hover:border-accent-primary"
        }`}
        aria-label={
          isCompleted ? "Mark as pending" : "Mark as completed"
        }
      >
        {isCompleted && (
          <svg
            className="w-3 h-3 text-white"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${getStatusStyle(item.status)}`}>
          {item.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={item.owner === "me" ? "blue" : "yellow"}
            className="text-[10px]"
          >
            {item.owner === "me" ? "You" : "Them"}
          </Badge>

          {item.due_date && (
            <span className="text-[10px] text-text-muted">
              Due: {format(new Date(item.due_date), "MMM d, yyyy")}
            </span>
          )}

          <Badge
            variant={getEscalationVariant(item.escalation_level)}
            className="text-[10px]"
          >
            {item.escalation_level}
          </Badge>

          {item.status === "overdue" && (
            <Badge variant="red" className="text-[10px]">
              Overdue
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
