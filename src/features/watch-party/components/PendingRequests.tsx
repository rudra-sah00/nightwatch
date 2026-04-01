import { Check, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import type { RoomMember } from '../room/types';

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
    <div className="mx-3 mt-3 mb-2 bg-[#ffcc00] border-[4px] border-border overflow-hidden flex-shrink-0 ">
      <div className="px-3 py-2 flex items-center gap-2 border-b-[4px] border-border bg-white">
        <UserPlus className="w-4 h-4 text-foreground stroke-[3px]" />
        <span className="text-[10px] font-black font-headline text-foreground uppercase tracking-widest">
          {pendingMembers.length} waiting to join
        </span>
      </div>
      <div className="p-3 space-y-3 max-h-40 overflow-y-auto custom-scrollbar bg-[#ffcc00]">
        {pendingMembers.map((pending) => (
          <div
            key={pending.id}
            className="flex items-center gap-2 p-2 bg-white border-[3px] border-border  transition-transform"
          >
            {/* Avatar */}
            {pending.profilePhoto ? (
              <Image
                src={pending.profilePhoto}
                alt={pending.name}
                width={28}
                height={28}
                className="w-7 h-7 border-[2px] border-border object-cover flex-shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-7 h-7 border-[2px] border-border bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black font-headline text-white uppercase tracking-widest">
                  {pending.name.charAt(0)}
                </span>
              </div>
            )}

            {/* Name */}
            <span className="flex-1 text-[11px] font-black font-headline text-foreground uppercase tracking-widest truncate">
              {pending.name}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                type="button"
                onClick={() => onApprove(pending.id)}
                className="p-1 border-[2px] border-border hover:bg-success hover:text-white transition-colors bg-white text-success "
                title="Approve"
              >
                <Check aria-hidden="true" className="w-4 h-4 stroke-[3px]" />
              </Button>
              <Button
                type="button"
                onClick={() => onReject(pending.id)}
                className="p-1 border-[2px] border-border hover:bg-[#e63b2e] hover:text-white transition-colors bg-white text-[#e63b2e] "
                title="Reject"
              >
                <X aria-hidden="true" className="w-4 h-4 stroke-[3px]" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
