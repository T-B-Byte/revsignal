"use client";

import { useEffect, useRef, useState } from "react";

const PDF_URL = "/pharosiq-approach-2026q1.pdf";

const SLIDES = [
  {
    label: "How We Do It",
    caption: "Full-funnel contextual insights powered by owned and operated first-party engagement, with contact-level tracking as the core differentiator.",
  },
  {
    label: "Campaign AI Optimisation",
    caption: "Contact insights meet content strategy through our signals engine: target accounts, buyer persona, trend analysis, and messaging all in one loop.",
  },
];

interface PharosiqDifferenceProps {
  theme: "dark" | "light";
}

export function PharosiqDifference({ theme }: PharosiqDifferenceProps) {
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (dark: string, light: string) => theme === "dark" ? dark : light;

  useEffect(() => {
    let cancelled = false;

    async function renderSlides() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjsLib.getDocument(PDF_URL).promise;
        const refs = [canvas1Ref, canvas2Ref];

        for (let i = 0; i < 2; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i + 1);
          const canvas = refs[i].current;
          if (!canvas) continue;

          const containerWidth = canvas.parentElement?.clientWidth || 900;
          const scale = Math.min((containerWidth / page.getViewport({ scale: 1 }).width) * 2, 3);
          const viewport = page.getViewport({ scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";

          await page.render({ canvas, viewport }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setError("Could not load slides. Check that the PDF is in the public folder.");
      }
    }

    renderSlides();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-12">
      {/* Section header */}
      <div className="text-center">
        <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${t("text-teal-400", "text-teal-600")}`}>
          What Sets Us Apart
        </p>
        <h2 className={`text-3xl font-bold tracking-tight ${t("text-zinc-50", "text-zinc-900")}`}>
          The pharosIQ Difference
        </h2>
        <p className={`mt-3 mx-auto max-w-2xl text-sm leading-relaxed ${t("text-zinc-400", "text-zinc-500")}`}>
          Built on a decade of first-party B2B engagement data. These two visuals explain the engine behind everything we sell.
        </p>
      </div>

      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <p className={`text-sm ${t("text-zinc-400", "text-zinc-500")}`}>Loading slides&hellip;</p>
        </div>
      )}

      {error && (
        <div className={`rounded-xl border p-8 text-center ${t("border-red-800 bg-red-900/20 text-red-400", "border-red-200 bg-red-50 text-red-600")}`}>
          {error}
        </div>
      )}

      {/* Slides */}
      {SLIDES.map((slide, i) => (
        <div key={i} className={`rounded-2xl overflow-hidden border ${t("border-zinc-700/60", "border-zinc-200")} ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}>
          {/* Slide canvas */}
          <div className={`w-full ${t("bg-[#0a0a1a]", "bg-zinc-50")}`}>
            <canvas
              ref={i === 0 ? canvas1Ref : canvas2Ref}
              className="w-full h-auto block"
            />
          </div>

          {/* Caption bar */}
          <div className={`px-6 py-4 flex items-start gap-4 ${t("bg-zinc-800/80", "bg-white")}`}>
            <span className={`shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${t("bg-teal-500/20 text-teal-400", "bg-teal-100 text-teal-700")}`}>
              {i + 1}
            </span>
            <div>
              <p className={`text-sm font-semibold ${t("text-zinc-100", "text-zinc-800")}`}>{slide.label}</p>
              <p className={`mt-0.5 text-sm leading-relaxed ${t("text-zinc-400", "text-zinc-500")}`}>{slide.caption}</p>
            </div>
          </div>
        </div>
      ))}

      {/* CTA */}
      {!loading && !error && (
        <div className={`rounded-xl border px-8 py-6 text-center ${t("border-zinc-700/60 bg-zinc-800/40", "border-zinc-200 bg-zinc-50")}`}>
          <p className={`text-sm ${t("text-zinc-300", "text-zinc-700")}`}>
            Want to see this in action against your target accounts?
          </p>
          <a
            href="mailto:tbean@pharosiq.com?subject=pharosIQ Demo Request"
            className={`mt-3 inline-block rounded-lg px-5 py-2 text-sm font-semibold transition ${t("bg-teal-500 hover:bg-teal-400 text-white", "bg-teal-600 hover:bg-teal-500 text-white")}`}
          >
            Request a live demo
          </a>
        </div>
      )}
    </div>
  );
}
