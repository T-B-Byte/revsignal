"use client";

import { useState, useCallback } from "react";
import { PasswordGate } from "./password-gate";
import { RoomContent } from "./room-content";

interface RoomData {
  room: Record<string, unknown>;
  products: Record<string, unknown>[];
}

export function RoomShell({ slug }: { slug: string }) {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [password, setPassword] = useState("");

  const handleUnlock = useCallback((data: RoomData, pwd: string) => {
    setRoomData(data);
    setPassword(pwd);
  }, []);

  if (!roomData) {
    return <PasswordGate slug={slug} onUnlock={handleUnlock} />;
  }

  return (
    <RoomContent
      room={roomData.room}
      products={roomData.products}
      slug={slug}
      password={password}
    />
  );
}
