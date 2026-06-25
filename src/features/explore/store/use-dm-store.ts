import { create } from 'zustand';

interface Conversation {
  peer_id: string;
  peer_name: string;
  peer_username: string | null;
  peer_photo: string | null;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_id: string;
}

interface DMStore {
  conversations: Conversation[] | null;
  unreadCount: number;
  setConversations: (convs: Conversation[]) => void;
  updateConversation: (
    peerId: string,
    content: string,
    senderId: string,
  ) => void;
  markRead: (peerId: string) => void;
  incrementUnread: () => void;
  setUnreadCount: (n: number) => void;
}

export const useDmStore = create<DMStore>((set) => ({
  conversations: null,
  unreadCount: 0,

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
        updated.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        return { conversations: updated };
      }
      // New conversation — will be fetched on next load
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
}));
