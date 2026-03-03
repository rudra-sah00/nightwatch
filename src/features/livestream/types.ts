export interface LiveTeam {
  id: string;
  name: string;
  score: string;
  avatar: string;
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
