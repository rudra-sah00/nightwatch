import { Check, Copy, LogOut } from 'lucide-react';

interface PartyActionsProps {
  isHost: boolean;
  linkCopied: boolean;
  onCopyLink: () => void;
  onLeave: () => void;
}

/**
 * Action buttons for the sidebar (copy link, leave party)
 */
export function PartyActions({
  isHost,
  linkCopied,
  onCopyLink,
  onLeave,
}: PartyActionsProps) {
  return (
    <div className="p-4 border-t border-white/10 space-y-3 bg-black/40 backdrop-blur-md">
      {isHost && (
        <button
          type="button"
          onClick={onCopyLink}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
        >
          {linkCopied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy Invite Link
            </>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onLeave}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        {isHost ? 'End Party' : 'Leave Party'}
      </button>
    </div>
  );
}
