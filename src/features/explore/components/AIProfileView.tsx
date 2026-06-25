'use client';

import { ArrowLeft, Globe, MessageCircle, Sparkles, Zap } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export function AIProfileView() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Logo + Name */}
      <div className="flex flex-col items-center text-center">
        <Image src="/logo.png" alt="Nightwatch AI" width={64} height={64} />
        <h2 className="mt-4 font-headline font-black text-xl">Nightwatch AI</h2>
        <p className="text-sm text-foreground/50 mt-1">@nightwatch</p>
        <div className="flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">AI Assistant</span>
        </div>
      </div>

      {/* Bio */}
      <div className="mt-6 bg-card border border-border rounded-2xl p-5">
        <p className="text-sm leading-relaxed text-foreground/80">
          I&apos;m the AI companion built into Nightwatch. Mention me with{' '}
          <span className="font-mono text-primary">@nightwatch</span> in any
          post and I&apos;ll reply with recommendations, fun facts, or help you
          find what to watch next.
        </p>
        <p className="text-sm leading-relaxed text-foreground/80 mt-3">
          Powered with real-time web search to give you the latest info on
          movies, series, music, games, and more.
        </p>
      </div>

      {/* Capabilities */}
      <div className="mt-6 space-y-3">
        <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-foreground/60">
          Capabilities
        </h3>

        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
          <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Reply to @mentions</p>
            <p className="text-xs text-foreground/50 mt-0.5">
              Tag me in any post and I&apos;ll respond with context-aware
              answers
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
          <Globe className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Real-time web search</p>
            <p className="text-xs text-foreground/50 mt-0.5">
              Look up ratings, release dates, news, and trending info
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
          <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Recommendations</p>
            <p className="text-xs text-foreground/50 mt-0.5">
              Ask what to watch, listen to, or play
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
          <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Instant responses</p>
            <p className="text-xs text-foreground/50 mt-0.5">
              Replies within seconds
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-foreground/40 text-xs">
        <p>Try: &quot;@nightwatch what should I watch tonight?&quot;</p>
      </div>
    </div>
  );
}
