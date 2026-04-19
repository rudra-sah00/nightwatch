import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Login | Watch Rudra',
  description: 'Login to your account to start watching movies and TV shows.',
};

export default async function LoginPage() {
  // Mandatory 2.5s delay to showcase premium loading animation

  return <LoginClient />;
}
