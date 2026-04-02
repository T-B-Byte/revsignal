export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-zinc-100">
      {children}
    </div>
  );
}
