import type { Metadata } from 'next';
import SignupClient from './SignupClient';

export const metadata: Metadata = {
  title: 'Sign Up | Watch Rudra',
  description: 'Create an account to start watching movies and TV shows.',
};

export default async function SignupPage() {
  // Mandatory 2.5s delay to showcase premium loading animation
  await new Promise((resolve) => setTimeout(resolve, 2500));

  return <SignupClient />;
}
