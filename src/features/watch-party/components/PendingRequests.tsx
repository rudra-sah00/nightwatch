import { Check, X } from 'lucide-react';
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
    <div className="border-b border-white/10 bg-white/5 flex-shrink-0 mb-2">
      <div className="p-2 px-3 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
        Pending Requests ({pendingMembers.length})
      </div>
      <div className="p-2 space-y-1">
        {pendingMembers.map((pending) => (
          <div
            key={pending.id}
            className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5"
          >
            <span className="text-sm text-white/80 truncate max-w-[120px]">
              {pending.name}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onApprove(pending.id)}
                className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition-colors"
                title="Approve"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onReject(pending.id)}
                className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
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
