export type PostType =
  | 'text'
  | 'media'
  | 'poll'
  | 'watch-party-invite'
  | 'clip-share'
  | 'activity';
export type PostVisibility = 'public' | 'friends';
export type TagType =
  | 'movie'
  | 'series'
  | 'music'
  | 'game'
  | 'channel'
  | 'manga';
export type FeedTab = 'foryou' | 'trending';

export interface PostTag {
  type: TagType;
  id: string;
  title: string;
  image?: string;
}

export interface PostMedia {
  urls: string[];
  type: 'image' | 'video';
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PostPoll {
  options: PollOption[];
  endsAt: string;
  voterIds: string[];
}

export interface PostWatchParty {
  roomId: string;
  contentTitle: string;
  contentImage?: string;
}

export interface PostRepost {
  postId: string;
  authorName: string;
  content: string;
}

export interface PostStats {
  replies: number;
  reposts: number;
  reactions: number;
}

/** Mention embedded in post content — resolved from @username */
export interface PostMention {
  userId: string;
  username: string;
  name: string;
}

export interface ExplorePost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  content: string;
  type: PostType;
  tags: PostTag[];
  media?: PostMedia;
  poll?: PostPoll;
  watchParty?: PostWatchParty;
  clipId?: string;
  repostOf?: PostRepost;
  parentId: string | null;
  threadRootId: string | null;
  stats: PostStats;
  reactionsMap: Record<string, number>;
  visibility: PostVisibility;
  mentions?: PostMention[];
  editHistory?: { content: string; editedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  posts: ExplorePost[];
  nextCursor?: string;
}

/** Slash command types for the composer */
export type SlashCommand =
  | '/music'
  | '/movie'
  | '/series'
  | '/game'
  | '/channel'
  | '/manga';

export const SLASH_COMMANDS: {
  command: SlashCommand;
  label: string;
  tagType: TagType;
}[] = [
  { command: '/music', label: 'Search Music', tagType: 'music' },
  { command: '/movie', label: 'Search Movies', tagType: 'movie' },
  { command: '/series', label: 'Search Series', tagType: 'series' },
  { command: '/game', label: 'Search Games', tagType: 'game' },
  { command: '/channel', label: 'Search Channels', tagType: 'channel' },
  { command: '/manga', label: 'Search Manga', tagType: 'manga' },
];
