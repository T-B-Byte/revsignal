"use client";

interface DataTestFormProps {
  slug: string;
  password: string;
  theme?: "dark" | "light";
}

export function DataTestForm({ theme = "dark" }: DataTestFormProps) {
  const t = (dark: string, light: string) => theme === "dark" ? dark : light;

  return (
    <div className={`rounded-xl border p-10 text-center ${t("border-slate-700 bg-slate-800", "border-zinc-200 bg-white shadow-sm")}`}>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-600/15 text-green-400">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M12 21a9 9 0 110-18 9 9 0 010 18z" />
        </svg>
      </div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-green-400">
        Coming soon
      </p>
      <h2 className={`text-2xl font-bold tracking-tight ${t("text-zinc-50", "text-zinc-900")}`}>
        Data Tests
      </h2>
      <p className={`mx-auto mt-3 max-w-lg text-sm leading-relaxed ${t("text-zinc-400", "text-zinc-600")}`}>
        Self-service data tests are almost ready. In the meantime, email{" "}
        <a
          href="mailto:tbean@pharosiq.com"
          className="font-medium text-green-400 underline-offset-2 hover:underline"
        >
          tbean@pharosiq.com
        </a>{" "}
        with your target domain list and we&apos;ll run the test manually within one business day.
      </p>
    </div>
  );
}
