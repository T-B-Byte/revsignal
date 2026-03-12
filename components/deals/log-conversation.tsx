"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { logConversation } from "@/app/(dashboard)/deals/[dealId]/actions";
import type { Contact } from "@/types/database";

interface LogConversationProps {
  dealId: string;
  contacts: Contact[];
}

const channelOptions = [
  { value: "email", label: "Email" },
  { value: "teams", label: "Teams" },
  { value: "call", label: "Call" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "in_person", label: "In Person" },
  { value: "manual", label: "Manual / Note" },
];

const ownerOptions = [
  { value: "me", label: "Me" },
  { value: "them", label: "Them" },
];

export function LogConversation({ dealId, contacts }: LogConversationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const contactOptions = contacts.map((c) => ({
    value: c.contact_id,
    label: `${c.name}${c.role ? ` (${c.role})` : ""}`,
  }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("deal_id", dealId);

    startTransition(async () => {
      const result = await logConversation(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setIsOpen(false);
    });
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M8 3v10M3 8h10" />
        </svg>
        Log Conversation
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a Conversation</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              name="channel"
              label="Channel"
              options={channelOptions}
              defaultValue="email"
            />

            {contactOptions.length > 0 && (
              <Select
                name="contact_id"
                label="Contact"
                options={contactOptions}
                placeholder="Select contact"
              />
            )}
          </div>

          <Input
            name="subject"
            label="Subject"
            placeholder="Brief description of the conversation"
          />

          <Textarea
            name="raw_text"
            label="Content"
            placeholder="What was discussed? Key points, decisions, quotes..."
            rows={5}
            required
          />

          <DatePicker name="follow_up_date" label="Follow-up Date" placeholder="Pick date" />

          {/* Next step prompt */}
          <div className="border border-border-primary rounded-md p-4 bg-surface-secondary/50 space-y-3">
            <p className="text-sm font-medium text-text-primary">
              What&apos;s the next step? When?
            </p>
            <p className="text-xs text-text-muted">
              Capture the next action to keep this deal moving forward.
            </p>
            <Input
              name="next_step"
              label="Next Step"
              placeholder="e.g., Send proposal, Schedule technical review"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                name="next_step_owner"
                label="Owner"
                options={ownerOptions}
                defaultValue="me"
              />
              <DatePicker
                name="next_step_due"
                label="Due Date"
                placeholder="Pick date"
                helperText="Uses follow-up date if not set"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Log Conversation
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
