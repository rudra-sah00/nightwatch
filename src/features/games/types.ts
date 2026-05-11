export interface GameMeta {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  path: string;
}

export interface GameScore {
  gameId: string;
  score: number;
  date: string;
}
