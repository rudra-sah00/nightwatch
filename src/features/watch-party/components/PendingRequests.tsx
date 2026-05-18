import { Check, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('party.pending');

  if (pendingMembers.length === 0) {
    return null;
  }

  return (
    <div className="mx-3 mt-3 mb-2 flex-shrink-0">
      <div className="px-2 py-1.5 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-white/60 stroke-[3px]" />
        <span className="text-[10px] font-black font-headline text-white/60 uppercase tracking-widest">
          {t('waitingToJoin', { count: pendingMembers.length })}
        </span>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {pendingMembers.map((pending) => (
          <div key={pending.id} className="flex items-center gap-2 px-2 py-1.5">
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
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black font-headline text-white uppercase">
                  {pending.name.charAt(0)}
                </span>
              </div>
            )}

            {/* Name */}
            <span className="flex-1 text-[11px] font-bold text-white truncate">
              {pending.name}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => onApprove(pending.id)}
                className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                title={t('approve')}
              >
                <Check aria-hidden="true" className="w-4 h-4 stroke-[3px]" />
              </button>
              <button
                type="button"
                onClick={() => onReject(pending.id)}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title={t('reject')}
              >
                <X aria-hidden="true" className="w-4 h-4 stroke-[3px]" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
