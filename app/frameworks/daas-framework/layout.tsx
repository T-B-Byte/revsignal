import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DaaS Product Framework | pharosIQ",
  description:
    "pharosIQ Tiered Data Licensing Model. First-party contact and intent data across four tiers of resolution.",
};

export default function DaasFrameworkLayout({
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
