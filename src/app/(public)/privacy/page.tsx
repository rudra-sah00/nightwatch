import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Nightwatch',
  description: 'Privacy Policy for the Nightwatch platform.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-10 text-muted-foreground hover:text-foreground text-sm font-headline font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-foreground/40 font-headline uppercase tracking-widest mb-12">
          Last updated — April 2026
        </p>

        <div className="space-y-10 text-sm text-foreground/70 leading-relaxed">
          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              1. Information We Collect
            </h2>
            <p>
              When you use Nightwatch, we collect the following information:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong className="text-foreground">Account data</strong> —
                name, email address, username, and profile photo you provide
                during registration
              </li>
              <li>
                <strong className="text-foreground">Authentication data</strong>{' '}
                — hashed passwords and HTTP-only session cookies
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — watch
                history, watchlist items, playback preferences, and search
                queries
              </li>
              <li>
                <strong className="text-foreground">Messages</strong> — direct
                messages and conversation metadata
              </li>
              <li>
                <strong className="text-foreground">Device data</strong> —
                browser type, operating system, screen resolution, and preferred
                language
              </li>
              <li>
                <strong className="text-foreground">Connection data</strong> —
                IP address and approximate location for server selection
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              2. How We Use Your Data
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Authenticate your identity and maintain your session</li>
              <li>
                Synchronize playback and enable real-time features (watch
                parties, messaging, voice calls)
              </li>
              <li>Store your watchlist, watch history, and preferences</li>
              <li>Deliver messages between you and your friends</li>
              <li>Route you to the nearest server for optimal performance</li>
              <li>Detect and prevent abuse or unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              3. Cookies & Local Storage
            </h2>
            <p>We use the following:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong className="text-foreground">
                  HTTP-only session cookies
                </strong>{' '}
                — for secure authentication (cannot be accessed by JavaScript)
              </li>
              <li>
                <strong className="text-foreground">
                  Language preference cookie
                </strong>{' '}
                — to remember your selected language
              </li>
              <li>
                <strong className="text-foreground">Theme preference</strong> —
                stored in localStorage to prevent flash of unstyled content
              </li>
              <li>
                <strong className="text-foreground">
                  Service Worker cache
                </strong>{' '}
                — for offline functionality and faster load times
              </li>
            </ul>
            <p className="mt-3">
              We do not use third-party tracking cookies, advertising cookies,
              or analytics services that track you across other websites.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              4. Data Sharing
            </h2>
            <p>
              <strong className="text-foreground">
                We do not sell, rent, or share your personal data with third
                parties.
              </strong>
            </p>
            <p className="mt-3">Your data may be processed by:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong className="text-foreground">Agora</strong> — for
                real-time messaging and video call infrastructure (connection
                metadata only)
              </li>
              <li>
                <strong className="text-foreground">AWS</strong> — for cloud
                hosting and file storage (profile photos)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              5. Data Retention
            </h2>
            <p>
              Your account data is retained for as long as your account is
              active. Messages are stored to enable conversation history. If you
              delete your account, your personal data will be removed from our
              systems within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              6. Data Security
            </h2>
            <p>
              We protect your data with encrypted connections (HTTPS/TLS),
              HTTP-only cookies, hashed passwords, and anti-bot verification.
              While we take reasonable measures to protect your information, no
              system is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              7. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us through the platform or via
              email.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              8. Content Disclaimer
            </h2>
            <p>
              Nightwatch does not host, store, or distribute any media content.
              All media is sourced externally by users. We have no control over
              and accept no responsibility for third-party content accessed
              through the platform. See our{' '}
              <Link
                href="/terms"
                className="text-neo-yellow hover:underline underline-offset-4"
              >
                Terms of Service
              </Link>{' '}
              for more details.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Continued use
              of Nightwatch after changes constitutes acceptance of the updated
              policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
