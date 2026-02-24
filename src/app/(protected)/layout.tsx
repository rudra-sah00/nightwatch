import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken');

  // If no refresh token is present, user is definitely not authenticated
  if (!refreshToken) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
