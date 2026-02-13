/**
 * Party Layout - Allows both authenticated users and guests
 * No authentication enforcement for watch party access
 */
export default function PartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
