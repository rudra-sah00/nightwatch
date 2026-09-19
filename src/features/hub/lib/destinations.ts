import {
  BookOpen,
  Bot,
  Film,
  Gamepad2,
  type LucideIcon,
  Music,
  Radio,
} from 'lucide-react';

/**
 * A destination on the entry hub.
 *
 * `labelKey` is resolved against the `common` namespace. Where a nav label already
 * exists and reads well as a tile title it is reused rather than duplicated, so the
 * sidebar and the hub cannot drift apart or fall out of translation sync.
 */
export interface HubDestination {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
  /** Tailwind background class for the tile's icon plate. */
  accent: string;
  /**
   * Whether the destination is reachable on Android TV.
   *
   * Games is the one exclusion: the catalogue is embedded HTML5 that expects a
   * pointer or keyboard, there is no TvGames page, and it is absent from TvNavbar.
   * Offering it on the hub would strand a D-pad user inside a game they cannot quit.
   */
  onTv: boolean;
}

export const HUB_DESTINATIONS: HubDestination[] = [
  {
    id: 'live',
    href: '/live',
    icon: Radio,
    labelKey: 'hub.liveChannels',
    accent: 'bg-neo-red',
    onTv: true,
  },
  {
    id: 'movies',
    href: '/search',
    icon: Film,
    labelKey: 'hub.moviesAndSeries',
    accent: 'bg-neo-blue',
    onTv: true,
  },
  {
    id: 'music',
    href: '/music',
    icon: Music,
    labelKey: 'nav.music',
    accent: 'bg-neo-green',
    onTv: true,
  },
  {
    id: 'manga',
    href: '/manga',
    icon: BookOpen,
    labelKey: 'nav.manga',
    accent: 'bg-neo-orange',
    onTv: true,
  },
  {
    id: 'ask-ai',
    href: '/ask-ai',
    icon: Bot,
    labelKey: 'nav.askAi',
    accent: 'bg-neo-cyan',
    onTv: true,
  },
  {
    id: 'games',
    href: '/games',
    icon: Gamepad2,
    labelKey: 'nav.games',
    accent: 'bg-neo-yellow',
    onTv: false,
  },
];

/** Destinations available on the current platform. */
export function hubDestinationsFor(platform: 'web' | 'tv'): HubDestination[] {
  return platform === 'tv'
    ? HUB_DESTINATIONS.filter((d) => d.onTv)
    : HUB_DESTINATIONS;
}
