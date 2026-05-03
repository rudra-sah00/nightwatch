export interface LiveTeam {
  id: string;
  name: string;
  score: string;
  avatar: string;
}

export interface CricketMatchInfo {
  score: string;
  crtRunsScored: string;
  crtWicketsLost: string;
  crtOvers: string;
  crtOversExtraBalls: string;
}

export interface LiveMatch {
  id: string;
  team1: LiveTeam;
  team2: LiveTeam;
  status: 'MatchNotStart' | 'MatchIng' | 'MatchEnded' | string;
  startTime: number;
  endTime: number;
  league: string;
  type: string;
  timeDesc?: string;
  playPath?: string;
  playType?: string;
  isStreamAvailable?: boolean;
  /** Cricket-specific: batting/bowling info for team 1 */
  teamMatchInfo1?: CricketMatchInfo;
  /** Cricket-specific: batting/bowling info for team 2 */
  teamMatchInfo2?: CricketMatchInfo;
  /** Cricket-specific: human-readable match situation */
  matchResult?: string;
  /** UI hint to render as a channel card (single stream) */
  contentKind?: 'match' | 'channel';
  /** Optional channel name for channel-focused lists */
  channelName?: string;
  /** Online/offline status for channel cards */
  channelStatus?: 'online' | 'offline';
}

export interface LivestreamScheduleResponse {
  success: boolean;
  count: number;
  items: LiveMatch[];
}

export interface LivestreamMatchResponse {
  success: boolean;
  match: LiveMatch;
}
