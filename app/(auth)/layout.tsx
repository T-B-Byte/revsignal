export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-primary">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            Rev<span className="text-accent-primary">Signal</span>
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Where signals become revenue
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
