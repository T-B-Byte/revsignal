import type { TradeshowContact } from "@/types/database";

interface TradeshowContactRowProps {
  contact: TradeshowContact;
}

export function TradeshowContactRow({ contact }: TradeshowContactRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border-primary bg-surface-secondary p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-glow text-xs font-medium text-accent-primary">
        {contact.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {contact.name}
          </span>
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-primary hover:underline"
            >
              LinkedIn
            </a>
          )}
        </div>
        {contact.title && (
          <p className="text-xs text-text-muted">{contact.title}</p>
        )}
        {contact.why_this_person && (
          <p className="mt-1 text-xs text-text-secondary">
            {contact.why_this_person}
          </p>
        )}
        {contact.approach_strategy && (
          <p className="mt-1 text-xs italic text-text-muted">
            Approach: {contact.approach_strategy}
          </p>
        )}
      </div>
    </div>
  );
}
