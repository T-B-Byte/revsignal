import type { Metadata } from "next";
import { RoomShell } from "@/components/room/room-shell";

export const metadata: Metadata = {
  title: "Deal Room | pharosIQ Data Solutions",
  description: "Your personalized data solutions package from pharosIQ.",
};

export default async function DealRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pw?: string }>;
}) {
  const { slug } = await params;
  const { pw } = await searchParams;
  return <RoomShell slug={slug} autoPassword={pw} />;
}
