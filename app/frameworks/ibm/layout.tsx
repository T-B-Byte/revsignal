import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DaaS Product Framework: IBM | pharosIQ",
  description:
    "pharosIQ Tiered Data Licensing Model, prepared for IBM.",
};

export default function IBMFrameworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      {children}
    </div>
  );
}
