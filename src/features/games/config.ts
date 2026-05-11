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
  'temple-run-2': {
    gameId: '84938be4-42ce-42a8-9968-2f5f2a7618d8',
    versionId: 'f2e6056e-ac6f-4d61-bec9-5618e79105e7',
    title: 'Temple Run 2',
  },
  'temple-run-2-frozen-shadows': {
    gameId: '84938be4-42ce-42a8-9968-2f5f2a7618d8',
    versionId: 'f2e6056e-ac6f-4d61-bec9-5618e79105e7',
    title: 'Temple Run 2: Frozen Shadows',
  },
};
