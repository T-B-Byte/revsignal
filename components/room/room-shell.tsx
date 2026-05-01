"use client";

import { useState, useCallback, useEffect } from "react";
import { PasswordGate } from "./password-gate";
import { RoomContent } from "./room-content";

interface RoomData {
  log_id: string | null;
  room: Record<string, unknown>;
  products: Record<string, unknown>[];
}

export function RoomShell({ slug, autoPassword }: { slug: string; autoPassword?: string }) {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [password, setPassword] = useState("");
  const [autoUnlocking, setAutoUnlocking] = useState(!!autoPassword);

  const handleUnlock = useCallback((data: RoomData, pwd: string) => {
    setRoomData(data);
    setPassword(pwd);
  }, []);

  useEffect(() => {
    if (!autoPassword) return;

    fetch(`/api/room/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: autoPassword }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setRoomData(data);
          setPassword(autoPassword);
        } else {
          setAutoUnlocking(false);
        }
      })
      .catch(() => setAutoUnlocking(false));
  }, [slug, autoPassword]);

  if (!roomData) {
    if (autoUnlocking) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-zinc-400">Opening deal room...</p>
        </div>
      );
    }
    return <PasswordGate slug={slug} onUnlock={handleUnlock} />;
  }

  return (
    <RoomContent
      room={roomData.room}
      products={roomData.products}
      slug={slug}
      password={password}
      logId={roomData.log_id}
    />
  );
}
