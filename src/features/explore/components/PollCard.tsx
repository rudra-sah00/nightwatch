'use client';

import type { PollOption, PostPoll } from '@/features/explore/types';

interface PollCardProps {
  postId: string;
  poll: PostPoll;
  onVote: (postId: string, optionId: string) => void;
  hasVoted: boolean;
}

export function PollCard({ postId, poll, onVote, hasVoted }: PollCardProps) {
  const options: PollOption[] = Array.isArray(poll.options)
    ? poll.options
    : Object.values(poll.options || {});
  const totalVotes = options.reduce(
    (sum: number, o: PollOption) => sum + (o.votes || 0),
    0,
  );
  const isExpired = new Date(poll.endsAt) < new Date();
  const voted = hasVoted || poll.voterIds.includes('__self__');
  const showResults = voted || isExpired;

  return (
    <div className="mt-3 border border-border rounded-xl p-3 space-y-2">
      {options.map((option, idx) => {
        const percent =
          totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
        return (
          <button
            key={option.id || idx}
            type="button"
            disabled={showResults}
            onClick={() => onVote(postId, option.id)}
            className={`relative w-full text-left px-3 py-2 rounded-lg border transition-colors overflow-hidden ${
              showResults
                ? 'border-border cursor-default'
                : 'border-border hover:border-primary hover:bg-primary/5'
            }`}
          >
            {showResults && (
              <div
                className="absolute inset-0 bg-primary/10 rounded-lg"
                style={{ width: `${percent}%` }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="text-sm font-medium">{option.text}</span>
              {showResults && (
                <span className="text-xs text-foreground/60">{percent}%</span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-foreground/40">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {isExpired ? ' · Ended' : ''}
      </p>
    </div>
  );
}
