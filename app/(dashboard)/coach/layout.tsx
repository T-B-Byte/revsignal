/**
 * Coach layout overrides the default dashboard padding/scrolling.
 * The threaded coach UI manages its own layout (sidebar + chat).
 */
export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {children}
    </div>
  );
}
