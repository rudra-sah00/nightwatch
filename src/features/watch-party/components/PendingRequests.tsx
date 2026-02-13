import { Check, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import type { RoomMember } from '../types';

interface PendingRequestsProps {
  pendingMembers: RoomMember[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

/**
 * Pending join requests panel for host
 * Shows list of members waiting for approval
 */
export function PendingRequests({
  pendingMembers,
  onApprove,
  onReject,
}: PendingRequestsProps) {
  if (pendingMembers.length === 0) {
    return null;
  }

  return (
    <div className="mx-3 mt-3 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20 overflow-hidden flex-shrink-0">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-amber-500/10">
        <UserPlus className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-400">
          {pendingMembers.length} waiting to join
        </span>
      </div>
      <div className="p-2 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
        {pendingMembers.map((pending) => (
          <div
            key={pending.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-black/30 hover:bg-black/40 transition-colors"
          >
            {/* Avatar */}
            {pending.profilePhoto ? (
              <Image
                src={pending.profilePhoto}
                alt={pending.name}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-white/70">
                  {pending.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name */}
            <span className="flex-1 text-sm text-white/90 truncate">
              {pending.name}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onApprove(pending.id)}
                className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 active:scale-95 transition-all"
                title="Approve"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onReject(pending.id)}
                className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 active:scale-95 transition-all"
                title="Reject"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
