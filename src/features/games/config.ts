export function getGameUrl(_gameId: string, _versionId: string): string {
  // Game assets served from MinIO via presigned URL — fetched at runtime by the page component
  return '';
}

export const GAME_DATA: Record<
  string,
  { gameId: string; versionId: string; title: string }
> = {
  'subway-surfers': {
    gameId: '5dd312fa-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '3b92beeb-6b18-43a2-a0b6-aac2c34ed26d',
    title: 'Subway Surfers',
  },
};
