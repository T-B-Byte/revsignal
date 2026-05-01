"use client";

interface DownloadsProps {
  theme: "dark" | "light";
  accentColor: string;
}

interface DownloadFile {
  filename: string;
  downloadAs: string;
  fileType: string;
  title: string;
  description: string;
  bullets: string[];
}

const FILES: DownloadFile[] = [
  {
    filename: "/PharosIQ_Data_Dictionary_2026-04-20.xlsx",
    downloadAs: "PharosIQ_Data_Dictionary.xlsx",
    fileType: "Microsoft Excel Spreadsheet",
    title: "PharosIQ Data Dictionary",
    description:
      "A comprehensive reference guide to the PharosIQ signal data schema, covering all 57 fields across the full contact × signal event grain.",
    bullets: [
      "Field Reference: every field name, data type, description, and example value",
      "Field Index: schema column order for easy alignment with data deliveries",
      "Using the Data: practical Q&A for sales, campaign, and segmentation use cases",
      "Lookups: controlled vocabulary for seniority, industry, and persona mappings",
    ],
  },
  {
    filename: "/global_count_counts_2026-03.xlsx",
    downloadAs: "PharosIQ_Global_Count_Counts_2026-03.xlsx",
    fileType: "Microsoft Excel Spreadsheet",
    title: "2026-03 Global Contact Counts",
    description:
      "The primary contact-count source file for the Audience Intelligence Dashboard — 125.3 million verified B2B contacts pre-aggregated across nine dimensions, with a Pivot sheet ready for slice-and-dice analysis.",
    bullets: [
      "Raw Data: ~791,000 rows covering every unique combination of seniority (7 levels), job function (9 groups), sub-vertical (162 sub-functions), region, country (219), industry, revenue range, and headcount range",
      "Pivot sheet: cross-tabs sub-function by seniority globally, with slicers for region, country, industry, revenue, and headcount",
      "Grand total of 125.3M confirmed via pivot (all slicers set to \"All\")",
      "Largest verticals by contact count: IT (24.2M), Sales (23.7M), Healthcare (17.1M), Finance (14.1M)",
    ],
  },
  {
    filename: "/intent_topics.csv",
    downloadAs: "PharosIQ_Intent_Topics.csv",
    fileType: "CSV",
    title: "Intent Topics",
    description:
      "A complete reference export of all 8,756 intent topics tracked in the PharosIQ audience over the most recent 90-day period.",
    bullets: [
      "8,756 topics with unique company counts and total signal volumes",
      "Regional breakdown across NAMER, EMEA, APAC, LATAM, ANZ, and Global",
      "373,352 verified unique companies across all topics (do not sum per-topic counts)",
      "Ready to filter and map against your ICP or TAL",
    ],
  },
  {
    filename: "/intent_topics_by_period.xlsx",
    downloadAs: "PharosIQ_Intent_Topics_By_Period.xlsx",
    fileType: "Microsoft Excel Spreadsheet",
    title: "Intent Topics by Period",
    description:
      "The same 90-day intent topic data sliced into estimated time windows — monthly, weekly, and daily — alongside the verified 90-day baseline.",
    bullets: [
      "90-Day tab: verified actuals",
      "Monthly, Weekly, and Daily tabs: proportional estimates derived from 90-day totals",
      "Designed for prospects modeling signal velocity and cadence",
      "Useful for projecting intent activity within shorter time horizons",
    ],
  },
  {
    filename: "/taxonomy_bombora_mapping.csv",
    downloadAs: "PharosIQ_Bombora_Taxonomy_Mapping.csv",
    fileType: "CSV",
    title: "PharosIQ to Bombora Taxonomy Mapping",
    description:
      "Maps all 8,756 PharosIQ intent topics to their closest equivalents in the Bombora Topic Taxonomy (April 2026 edition, 20,132 topics). For each PharosIQ topic, the file includes the best-matching Bombora topic name, its unique Bombora topic ID, theme and category, a confidence score (0–100), match type, and an excerpt of Bombora’s topic description for validation.",
    bullets: [
      "1,220 exact matches (14%) — ready for direct activation",
      "993 high/medium-confidence fuzzy matches (11%) — suitable after a quick review",
      "5,994 low-confidence matches (69%) — warrant manual verification",
      "549 topics (6%) with no viable Bombora equivalent — may require custom topic requests",
    ],
  },
];

export function Downloads({ theme, accentColor }: DownloadsProps) {
  const t = (dark: string, light: string) => (theme === "dark" ? dark : light);

  return (
    <div className="space-y-6">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: accentColor }}
        >
          Data Downloads
        </p>
        <h2
          className={`mt-2 text-2xl font-bold ${t("text-zinc-100", "text-zinc-900")}`}
        >
          Reference files for your technical and analytics teams.
        </h2>
      </div>

      <div className="space-y-4">
        {FILES.map((file) => (
          <div
            key={file.filename}
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

            <div className="grid gap-8 p-7 sm:p-8 lg:grid-cols-[1fr_280px] lg:gap-10">
              <div>
                <h3
                  className={`text-lg font-bold ${t("text-zinc-100", "text-zinc-900")}`}
                >
                  {file.title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${t("text-zinc-300", "text-zinc-600")}`}
                >
                  {file.description}
                </p>
                <ul
                  className={`mt-5 space-y-2 text-sm ${t("text-zinc-300", "text-zinc-700")}`}
                >
                  {file.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
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
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col justify-center">
                <div
                  className={`rounded-xl border p-5 ${t(
                    "border-zinc-700 bg-slate-900/60",
                    "border-zinc-200 bg-zinc-50",
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accentColor}1a` }}
                    >
                      <svg
                        className="h-6 w-6"
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
                        className={`truncate text-sm font-semibold ${t("text-zinc-100", "text-zinc-900")}`}
                      >
                        {file.downloadAs}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${t("text-zinc-400", "text-zinc-500")}`}
                      >
                        {file.fileType}
                      </p>
                    </div>
                  </div>

                  <a
                    href={file.filename}
                    download={file.downloadAs}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
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
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
