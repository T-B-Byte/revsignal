"use client";

import type { Flashcard } from "@/types/database";

interface FlashcardFlipProps {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  /** Hide the answer side entirely (used in quiz before reveal) */
  hideBack?: boolean;
}

// Stable color assignment based on name string
const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-violet-500 to-violet-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-cyan-500 to-cyan-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-orange-500 to-orange-700",
  "from-teal-500 to-teal-700",
  "from-indigo-500 to-indigo-700",
  "from-pink-500 to-pink-700",
  "from-lime-500 to-lime-700",
  "from-sky-500 to-sky-700",
  "from-red-500 to-red-700",
  "from-purple-500 to-purple-700",
  "from-yellow-500 to-yellow-700",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter((w) => w.length > 0 && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

export function FlashcardFlip({
  card,
  flipped,
  onFlip,
  hideBack = false,
}: FlashcardFlipProps) {
  const nameFromBack = card.back_content.split(",")[0].trim();
  const initials = getInitials(nameFromBack);
  const avatarColor = getAvatarColor(nameFromBack);

  return (
    <div
      className="mx-auto w-full max-w-sm cursor-pointer select-none"
      style={{ perspective: "1200px" }}
      onClick={onFlip}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          aspectRatio: "5 / 7",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ===== FRONT FACE ===== */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Card body */}
          <div className="h-full flex flex-col bg-surface-secondary border-2 border-border-primary rounded-2xl shadow-lg shadow-black/10">
            {/* Top edge decoration */}
            <div className="h-1.5 bg-gradient-to-r from-accent-primary via-blue-500 to-accent-primary rounded-t-2xl" />

            {/* Card content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              {/* Photo / Avatar for image cards */}
              {card.card_type === "image" && (
                <div className="mb-5">
                  {card.image_url ? (
                    <img
                      src={card.image_url}
                      alt=""
                      className="h-28 w-28 rounded-full object-cover border-[3px] border-white/20 shadow-md"
                    />
                  ) : (
                    <div
                      className={`flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor} shadow-md border-[3px] border-white/20`}
                    >
                      <span className="text-3xl font-bold text-white drop-shadow-sm">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Question text */}
              <p className="text-lg font-medium text-text-primary leading-relaxed">
                {card.card_type === "fill_blank"
                  ? card.front_content.replace(
                      /_______/g,
                      "\u00A0\u00A0______\u00A0\u00A0"
                    )
                  : card.front_content}
              </p>

              {card.source_attribution && !flipped && (
                <p className="mt-3 text-xs text-text-muted italic">
                  — {card.source_attribution}
                </p>
              )}
            </div>

            {/* Bottom decoration */}
            <div className="px-6 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted text-center">
                Tap to flip
              </p>
            </div>
          </div>
        </div>

        {/* ===== BACK FACE ===== */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {hideBack ? (
            /* Card back pattern (unrevealed) */
            <div className="h-full rounded-2xl border-2 border-border-primary bg-surface-tertiary flex items-center justify-center">
              <div className="h-[calc(100%-16px)] w-[calc(100%-16px)] rounded-xl border border-border-primary bg-surface-secondary flex items-center justify-center"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    var(--color-border-primary) 10px,
                    var(--color-border-primary) 11px
                  )`,
                  opacity: 0.3,
                }}
              >
                <div className="bg-surface-secondary rounded-full p-4 shadow-sm border border-border-primary">
                  <svg className="h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            /* Answer side */
            <div className="h-full flex flex-col bg-surface-secondary border-2 border-status-green/40 rounded-2xl shadow-lg shadow-black/10">
              {/* Top edge */}
              <div className="h-1.5 bg-gradient-to-r from-status-green via-emerald-500 to-status-green rounded-t-2xl" />

              {/* Answer content */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
                {card.card_type === "fill_blank" ? (
                  <>
                    <p className="text-xl font-bold text-status-green mb-3">
                      {card.back_content}
                    </p>
                    {card.back_detail && (
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {card.back_detail}
                      </p>
                    )}
                    {card.source_attribution && (
                      <p className="mt-3 text-xs text-text-muted italic">
                        — {card.source_attribution}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-text-primary mb-3">
                      {card.back_content}
                    </p>
                    {card.back_detail && (
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {card.back_detail}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Bottom label */}
              <div className="px-6 pb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted text-center">
                  Answer
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
