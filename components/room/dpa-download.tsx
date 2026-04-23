"use client";

interface DpaDownloadProps {
  theme: "dark" | "light";
  accentColor: string;
  companyName: string;
}

const DPA_FILE = "/pharosIQ-DPA.docx";
const DOWNLOAD_FILENAME = "pharosIQ-DPA.docx";

export function DpaDownload({ theme, accentColor, companyName }: DpaDownloadProps) {
  const t = (dark: string, light: string) => (theme === "dark" ? dark : light);

  return (
    <section
      className={`overflow-hidden rounded-2xl border ${t(
        "border-zinc-800 bg-slate-800/40",
        "border-zinc-200 bg-white",
      )}`}
    >
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />

      <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${t(
              "text-zinc-400",
              "text-zinc-500",
            )}`}
            style={{ color: accentColor }}
          >
            Data Processing Agreement
          </p>
          <h2
            className={`mt-3 text-3xl font-bold leading-tight sm:text-4xl ${t(
              "text-zinc-100",
              "text-zinc-900",
            )}`}
          >
            Our DPA, ready for your legal team.
          </h2>
          <p
            className={`mt-4 text-base leading-relaxed ${t(
              "text-zinc-300",
              "text-zinc-600",
            )}`}
          >
            This is the standard pharosIQ Data Processing Agreement that
            governs how we handle and protect data across every commercial
            engagement. Share it with {companyName}&apos;s legal and
            procurement teams to accelerate review.
          </p>

          <ul
            className={`mt-8 space-y-3 text-sm ${t(
              "text-zinc-300",
              "text-zinc-700",
            )}`}
          >
            {[
              "GDPR, CCPA, and CPRA aligned terms",
              "Sub-processor transparency and change notification",
              "Security, confidentiality, and breach notification obligations",
              "Standard contractual clauses for cross-border transfers",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${accentColor}22` }}
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 10.5l3 3 7-7"
                    />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center">
          <div
            className={`rounded-xl border p-6 ${t(
              "border-zinc-700 bg-slate-900/60",
              "border-zinc-200 bg-zinc-50",
            )}`}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${accentColor}1a` }}
              >
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v12a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold ${t(
                    "text-zinc-100",
                    "text-zinc-900",
                  )}`}
                >
                  pharosIQ-DPA.docx
                </p>
                <p
                  className={`mt-0.5 text-xs ${t(
                    "text-zinc-400",
                    "text-zinc-500",
                  )}`}
                >
                  Microsoft Word Document
                </p>
              </div>
            </div>

            <a
              href={DPA_FILE}
              download={DOWNLOAD_FILENAME}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                />
              </svg>
              Download DPA
            </a>

            <p
              className={`mt-4 text-xs leading-relaxed ${t(
                "text-zinc-400",
                "text-zinc-500",
              )}`}
            >
              Questions about redlines or supplemental terms? Reply to your
              deal room email and we&apos;ll route it to the right person on
              our side.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
