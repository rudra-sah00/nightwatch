import { Check, Crown, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WatchPartyRoom } from '../types';

interface WatchPartyParticipantsProps {
  room: WatchPartyRoom;
  isHost: boolean;
  onKick: (userId: string) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

export function WatchPartyParticipants({
  room,
  isHost,
  onKick,
  onApprove,
  onReject,
}: WatchPartyParticipantsProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Pending Requests (Host Only) */}
      {isHost && room.pendingMembers && room.pendingMembers.length > 0 && (
        <div className="border-b border-white/10 bg-white/5 flex-shrink-0">
          <div className="p-3 px-4 text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" />
            Pending Requests ({room.pendingMembers.length})
          </div>
          <div className="p-2 space-y-1">
            {room.pendingMembers.map((pending) => (
              <div
                key={pending.id}
                className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5"
              >
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  {pending.profilePhoto ? (
                    <img
                      src={pending.profilePhoto}
                      alt={pending.name}
                      className="w-6 h-6 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-medium text-white/70">
                        {pending.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-white/80 truncate">
                    {pending.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onApprove(pending.id)}
                    className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition-colors"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(pending.id)}
                    className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Members List */}
      <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
        {/* Deduplicate members just in case */}
        {room.members &&
          Array.from(new Map(room.members.map((m) => [m.id, m])).values()).map(
            (member) => (
              <div
                key={member.id}
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {member.isHost ? (
                    <div className="relative">
                      {member.profilePhoto ? (
                        <img
                          src={member.profilePhoto}
                          alt={member.name}
                          className="w-8 h-8 rounded-full border border-yellow-500/50 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                          <span className="text-xs font-bold text-yellow-500">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                        <Crown className="w-3 h-3 text-yellow-500" />
                      </div>
                    </div>
                  ) : member.profilePhoto ? (
                    <img
                      src={member.profilePhoto}
                      alt={member.name}
                      className="w-8 h-8 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white/70">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        'text-sm font-medium truncate',
                        member.isHost ? 'text-yellow-500' : 'text-white/90',
                      )}
                    >
                      {member.name}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {member.isHost ? 'Host' : 'Viewer'}
                    </span>
                  </div>
                </div>

                {isHost && !member.isHost && (
                  <button
                    type="button"
                    onClick={() => onKick(member.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-full text-red-500 transition-all"
                    title="Remove member"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ),
          )}
      </div>
    </div>
  );
}
