import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Nightwatch',
  description: 'Terms of Service for the Nightwatch platform.',
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-xs text-foreground/40 font-headline uppercase tracking-widest mb-12">
          Last updated — April 2026
        </p>

        <div className="space-y-10 text-sm text-foreground/70 leading-relaxed">
          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Nightwatch, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, do not use
              the platform. Nightwatch is a private, invite-only platform and
              access may be revoked at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              2. Platform Description
            </h2>
            <p>
              Nightwatch is a personal streaming companion that enables
              synchronized media playback, watch parties, live streaming,
              messaging, and voice calls. The platform provides tools for
              real-time collaboration around media content.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              3. Content Disclaimer
            </h2>
            <p>
              <strong className="text-foreground">
                Nightwatch does not host, store, upload, or distribute any media
                content.
              </strong>{' '}
              The platform acts solely as a synchronization and communication
              layer. All media content is sourced externally by users.
              Nightwatch has no control over, and assumes no responsibility for,
              the content that users choose to watch or share through the
              platform.
            </p>
            <p className="mt-3">
              Users are solely responsible for ensuring they have the legal
              right to access any content they view through the platform.
              Nightwatch does not endorse, verify, or guarantee the legality of
              any externally sourced content.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              4. User Accounts
            </h2>
            <p>
              Access to Nightwatch requires an invitation. You are responsible
              for maintaining the confidentiality of your account credentials.
              You agree not to share your account with others or create multiple
              accounts. We reserve the right to suspend or terminate accounts
              that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              5. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use the platform for any illegal activity</li>
              <li>
                Attempt to reverse-engineer, exploit, or compromise the platform
              </li>
              <li>Harass, abuse, or harm other users</li>
              <li>
                Distribute malware or malicious content through messaging or
                live streams
              </li>
              <li>Resell or redistribute access to the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              6. Data We Collect
            </h2>
            <p>To provide our services, we collect:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong className="text-foreground">Account information</strong>{' '}
                — name, email address, and profile photo
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — watch
                history, watchlist, and playback preferences
              </li>
              <li>
                <strong className="text-foreground">Messages</strong> — direct
                messages sent through the platform
              </li>
              <li>
                <strong className="text-foreground">Session data</strong> —
                authentication tokens and session identifiers
              </li>
              <li>
                <strong className="text-foreground">Device information</strong>{' '}
                — browser type, operating system, and preferred language
              </li>
            </ul>
            <p className="mt-3">
              We do not sell your data to third parties. For full details, see
              our{' '}
              <Link
                href="/privacy"
                className="text-neo-yellow hover:underline underline-offset-4"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              7. Limitation of Liability
            </h2>
            <p>
              Nightwatch is provided &ldquo;as is&rdquo; without warranties of
              any kind. We are not liable for any damages arising from your use
              of the platform, including but not limited to data loss, service
              interruptions, or third-party content accessed through the
              platform.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-black text-lg uppercase tracking-tight text-foreground mb-3">
              8. Changes to Terms
            </h2>
            <p>
              We may update these terms at any time. Continued use of the
              platform after changes constitutes acceptance of the updated
              terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
