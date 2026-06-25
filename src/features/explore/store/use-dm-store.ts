import { create } from 'zustand';

export interface Conversation {
  peer_id: string;
  peer_name: string;
  peer_username: string | null;
  peer_photo: string | null;
  content: string | null;
  created_at: string | null;
  read_at: string | null;
  sender_id: string | null;
  archived: boolean;
  locked: boolean;
}

interface DMStore {
  conversations: Conversation[] | null;
  unreadCount: number;
  showArchived: boolean;
  setConversations: (convs: Conversation[]) => void;
  updateConversation: (
    peerId: string,
    content: string,
    senderId: string,
  ) => void;
  markRead: (peerId: string) => void;
  incrementUnread: () => void;
  setUnreadCount: (n: number) => void;
  toggleArchived: () => void;
  setArchived: (peerId: string, archived: boolean) => void;
  setLocked: (peerId: string, locked: boolean) => void;
}

export const useDmStore = create<DMStore>((set) => ({
  conversations: null,
  unreadCount: 0,
  showArchived: false,

  setConversations: (convs) => set({ conversations: convs }),

  updateConversation: (peerId, content, senderId) =>
    set((s) => {
      if (!s.conversations) return s;
      const existing = s.conversations.find((c) => c.peer_id === peerId);
      if (existing) {
        const updated = s.conversations.map((c) =>
          c.peer_id === peerId
            ? {
                ...c,
                content,
                created_at: new Date().toISOString(),
                sender_id: senderId,
                read_at: null,
              }
            : c,
        );
        updated.sort((a, b) => {
          if (!a.created_at && !b.created_at) return 0;
          if (!a.created_at) return 1;
          if (!b.created_at) return -1;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        return { conversations: updated };
      }
      return s;
    }),

  markRead: (peerId) =>
    set((s) => {
      if (!s.conversations) return s;
      return {
        conversations: s.conversations.map((c) =>
          c.peer_id === peerId
            ? { ...c, read_at: new Date().toISOString() }
            : c,
        ),
      };
    }),

  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  setUnreadCount: (n) => set({ unreadCount: n }),
  toggleArchived: () => set((s) => ({ showArchived: !s.showArchived })),

  setArchived: (peerId, archived) =>
    set((s) => {
      if (!s.conversations) return s;
      return {
        conversations: s.conversations.map((c) =>
          c.peer_id === peerId ? { ...c, archived } : c,
        ),
      };
    }),

  setLocked: (peerId, locked) =>
    set((s) => {
      if (!s.conversations) return s;
      return {
        conversations: s.conversations.map((c) =>
          c.peer_id === peerId ? { ...c, locked } : c,
        ),
      };
    }),
}));
