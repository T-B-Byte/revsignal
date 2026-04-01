import type { Metadata } from "next";
import { RoomShell } from "@/components/room/room-shell";

export const metadata: Metadata = {
  title: "Deal Room | pharosIQ Data Solutions",
  description: "Your personalized data solutions package from pharosIQ.",
};

export default async function DealRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoomShell slug={slug} />;
}
