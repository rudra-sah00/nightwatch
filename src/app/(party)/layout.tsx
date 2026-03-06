/**
 * Party Layout - Allows both authenticated users and guests
 * No authentication enforcement for watch party access
 */
export default function PartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
