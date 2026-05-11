import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

const GAMES: Record<
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
  'moto-x3m': {
    gameId: '5dd264d4-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '55d9475f-c88a-4900-b4e6-886cdd3c425e',
    title: 'Moto X3M',
  },
  'tunnel-rush': {
    gameId: '5dd2e8e4-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '9b561f41-d917-45f0-b907-d9250767d27e',
    title: 'Tunnel Rush',
  },
  'fruit-ninja': {
    gameId: '8b32c0f4-2dcb-4fdd-bf8b-16df63b01532',
    versionId: '255af3fb-6d80-441b-8cef-e07ff9a9075c',
    title: 'Fruit Ninja',
  },
  'level-devil': {
    gameId: '13acae8c-ec6a-4823-b1a2-8ea20cea56e7',
    versionId: '96498175-12e7-4566-a59f-85d7d853dcac',
    title: 'Level Devil',
  },
  'hill-climb-racing-lite': {
    gameId: '1900a95d-1c74-49c8-b752-b88fe2e67501',
    versionId: '98543aed-5d87-4935-8acd-800372b5cc75',
    title: 'Hill Climb Racing',
  },
  'stickman-hook': {
    gameId: '5dd30ab4-015f-11ea-ad56-9cb6d0d995f7',
    versionId: 'a9b6d9fd-0b47-4682-9649-0e95c2d95625',
    title: 'Stickman Hook',
  },
  'brain-test-tricky-puzzles': {
    gameId: '0322484b-7a58-4454-9667-f805afffded5',
    versionId: '7279cc90-edc4-4854-8b66-b8911f746ebb',
    title: 'Brain Test',
  },
  'retro-bowl': {
    gameId: '806e2242-df99-4dcd-b6ac-2c20175159a8',
    versionId: '9a5a5ef4-bd76-48fa-bf07-5ccbdc09b1f6',
    title: 'Retro Bowl',
  },
  'tribals-io': {
    gameId: '7b8b38ab-a6d7-4ea3-9f17-0be497c2c953',
    versionId: '053b376d-d0a7-4128-ba5c-623ae02fd5b9',
    title: 'Tribals.io',
  },
  'basketball-stars': {
    gameId: '5dd33196-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '0ca48bfa-be18-4697-82ac-b48280d44496',
    title: 'Basketball Stars',
  },
  'stick-merge': {
    gameId: '4e634835-88c8-4de5-8ce4-341fe892a1e0',
    versionId: 'e9056d93-d3b7-4235-be5c-21b4aa3484a9',
    title: 'Stick Merge',
  },
  'monkey-mart': {
    gameId: '1183520a-1ec4-4f33-a7ce-7673c60f912c',
    versionId: '4dbc26ac-2bcf-4173-ae3d-7dc413d48a60',
    title: 'Monkey Mart',
  },
  'smash-karts': {
    gameId: '8f24fefe-be3d-4113-9dc5-0678a20f8cfd',
    versionId: '082d4e7f-d3dc-4365-bb94-7e50290c6f08',
    title: 'Smash Karts',
  },
  'house-of-hazards': {
    gameId: '3a967a52-1a9d-4b2d-b69b-a6368eaea2e2',
    versionId: 'fc02e37e-e061-463f-8375-d8398ed90e4c',
    title: 'House of Hazards',
  },
  'ragdoll-hit': {
    gameId: '5c4828dc-d115-406f-b45e-378ff2736277',
    versionId: 'cdc0f5f6-0c36-40a4-9b56-42aeecda7dc4',
    title: 'Ragdoll Hit',
  },
  'idle-breakout': {
    gameId: '77cbef80-d4f6-4fc9-a1e1-6ac3257fa03d',
    versionId: 'dd8f4357-34c6-4e65-a9fa-e659eae92d3a',
    title: 'Idle Breakout',
  },
  'temple-of-boom': {
    gameId: '5dd29d19-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '40ca118d-5709-4238-832f-1846e52dc34e',
    title: 'Temple of Boom',
  },
  'water-color-sort': {
    gameId: 'a1561333-1cb3-4d20-8013-4b82e3424f9f',
    versionId: '6fcd6282-bc97-4390-846e-684099d8cefc',
    title: 'Water Color Sort',
  },
  'bad-ice-cream': {
    gameId: '7fb1fd45-24ce-4ade-b5c4-9ee55ec99526',
    versionId: '403f9f7f-52b0-4fa1-a4c2-c46883d239b6',
    title: 'Bad Ice Cream',
  },
  'dreadhead-parkour': {
    gameId: 'cc87f5b6-27a5-46a7-a652-4bae67df795b',
    versionId: '36128f6d-00fa-4086-a515-c346ae207412',
    title: 'Dreadhead Parkour',
  },
  tag: {
    gameId: '4cbd654e-3f3e-4507-92b1-572521364188',
    versionId: '00dae3d4-c760-4f62-a2c5-6ec53808e160',
    title: 'Tag',
  },
  'poor-eddie': {
    gameId: '05507bd2-57aa-4b23-80da-b9c16cbd5af7',
    versionId: 'f3c3e9da-d367-4fbc-9ba7-ec18b2743511',
    title: 'Poor Eddie',
  },
  'rocket-soccer-derby': {
    gameId: '315c81e0-540a-4ec9-8371-e182079a24b6',
    versionId: 'b1a247b6-8e44-4b89-972d-385a272d8c01',
    title: 'Rocket Soccer Derby',
  },
  'stick-defenders': {
    gameId: '7252203e-60a1-4698-bba2-5a5327175ce7',
    versionId: '5d940013-da24-4eb6-96f9-8fc86f6d8108',
    title: 'Stick Defenders',
  },
  'getaway-shootout': {
    gameId: '5dd2f896-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '3d7e5c51-2a0d-4e94-8f03-b6ec0e30a65b',
    title: 'Getaway Shootout',
  },
  'rooftop-snipers': {
    gameId: '5dd2c5c4-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '943a5f17-e9b0-45ca-95eb-fb01d7964632',
    title: 'Rooftop Snipers',
  },
  'big-tower-tiny-square': {
    gameId: '70abb787-7973-4319-900a-97b6468eb947',
    versionId: '638c6fd3-67be-4a75-997c-e25c0b2a3ba9',
    title: 'Big Tower Tiny Square',
  },
  'sushi-party-io': {
    gameId: '74b97156-f40b-11e9-859c-c6053849a814',
    versionId: '0384ff80-a8a7-4f4d-b50b-48130a56815d',
    title: 'Sushi Party',
  },
  '1010-color-match': {
    gameId: 'ea6c1952-c977-4772-9d74-217976b150ac',
    versionId: '06658c3b-63a1-4eec-b80d-1dcb09dbc21e',
    title: '1010 Color Match',
  },
  'duo-survival': {
    gameId: '139cf300-dd86-4955-a516-19f27b4c34d8',
    versionId: 'dce23997-2029-4971-bd6c-740f672d4798',
    title: 'Duo Survival',
  },
  'stickman-climb-2': {
    gameId: '3261afcf-2f39-4f8e-8da3-f5029d926ab8',
    versionId: '3bff99d7-6920-492d-b1fb-ce4dd8e7df9e',
    title: 'Stickman Climb 2',
  },
  'scary-teacher-3d': {
    gameId: 'd9916997-6918-46d0-bcb3-f1f1857191a6',
    versionId: '9016a065-45ae-480e-9547-7984ade98232',
    title: 'Scary Teacher 3D',
  },
  'my-perfect-hotel': {
    gameId: 'dec0e7c4-f6bd-4ae6-95f0-e8241d6ca304',
    versionId: 'bea1a935-2356-4744-9ac3-09e05a13eff0',
    title: 'My Perfect Hotel',
  },
  'apple-knight-mini-dungeons': {
    gameId: 'eae577bf-d6dc-4cac-b534-82522b2d47a6',
    versionId: 'be494578-c2f0-4a54-a724-823f975f40ff',
    title: 'Apple Knight',
  },
  'we-become-what-we-behold': {
    gameId: '4041ad3f-ee25-483b-ae8b-51b16b86ac67',
    versionId: 'c2e2e416-d187-42ef-a501-85ff9c905ad4',
    title: 'We Become What We Behold',
  },
  'stickman-dragon-fight': {
    gameId: 'd3e0b244-198d-4e9b-9837-03eb9e42ad68',
    versionId: 'df258d27-9eab-460b-9aa9-2c923d36418c',
    title: 'Stickman Dragon Fight',
  },
  'happy-glass': {
    gameId: '5cac4523-71ea-476e-8acc-a6cb9c25cc06',
    versionId: 'd30b371c-de2c-47b1-bb2f-4324f6395542',
    title: 'Happy Glass',
  },
  'slice-master': {
    gameId: '0e9dcadf-1c75-4c53-a211-b93f4423212a',
    versionId: '2f05f3fa-ed09-41a0-b971-b57ffa82cef9',
    title: 'Slice Master',
  },
  'wheel-master': {
    gameId: 'aae09709-2122-4dac-aee7-7188b690229d',
    versionId: 'ad0753e9-e1a1-418f-90cc-2c91a36e6d0f',
    title: 'Wheel Master',
  },
  'dinosaur-game': {
    gameId: 'a4e4a244-d11b-4d94-b1d8-deb2dbbaff02',
    versionId: '09a3212c-2757-4232-93dc-c002f4ac007f',
    title: 'Dinosaur Game',
  },
  'the-sniper-code': {
    gameId: 'a5b05fa4-241d-48dc-9873-85863fb2f1ab',
    versionId: '4b38eb8a-d524-41a6-ae6f-30d647311181',
    title: 'The Sniper Code',
  },
  'deadrise-io': {
    gameId: 'df912217-8d04-493f-8661-54ae0224584a',
    versionId: '1ed89e0f-bc9c-45e7-a80a-3fa77b71d475',
    title: 'Deadrise.io',
  },
  'zombie-derby-2': {
    gameId: '5dd3321a-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '196b4073-3f7f-4074-b254-742108feca12',
    title: 'Zombie Derby 2',
  },
  'narrow-one': {
    gameId: 'e2c6282e-13db-47a4-99c8-3297118978c1',
    versionId: '129d3d30-8cc7-4b0a-8a4e-f03e60bc3a83',
    title: 'Narrow One',
  },
  'crazy-cars': {
    gameId: 'c55cb8ba-16ce-4e15-b3c7-aa1824c48035',
    versionId: '976584cb-4d27-480d-a73a-2cf235ec6e31',
    title: 'Crazy Cars',
  },
  'like-a-king': {
    gameId: 'bd851282-922c-4482-ae35-db49696684ee',
    versionId: '18909735-76bf-4bf2-96f9-7d1f4dd71e16',
    title: 'Like a King',
  },
  murder: {
    gameId: '5dd25432-015f-11ea-ad56-9cb6d0d995f7',
    versionId: '3f291cf7-d4a3-4d5a-bedb-cdfd0f22f867',
    title: 'Murder',
  },
  'parkour-race': {
    gameId: 'b312ffa1-d199-42ad-a2ee-edf8f7ecddcd',
    versionId: 'c6d12763-fa62-498a-854b-be3ddb724ed4',
    title: 'Parkour Race',
  },
  'rodeo-stampede-savannah': {
    gameId: '5dd3209e-015f-11ea-ad56-9cb6d0d995f7',
    versionId: 'e7f6436c-07a0-4f98-a3db-75473d5ea3b5',
    title: 'Rodeo Stampede',
  },
  'g-switch-4': {
    gameId: '916d4022-90a0-48d3-bc16-177fdf5e23b3',
    versionId: '04a53cb2-1cb1-4c91-8cdb-6bd3abc0ca0f',
    title: 'G-Switch 4',
  },
  'blumgi-rocket': {
    gameId: '76cada96-8623-477f-93f8-c2abef3929e7',
    versionId: 'c547ac9a-1e34-4d1b-aaae-b6933249af1f',
    title: 'Blumgi Rocket',
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get('accessToken') || cookieStore.get('session');

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const game = GAMES[slug];
  if (!game) {
    return new NextResponse('Game not found', { status: 404 });
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>${game.title}</title><style>*{margin:0;padding:0}html,body{width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="https://${game.gameId}.gdn.poki.com/${game.versionId}/index.html?country=IN&site_id=3&iso_lang=en&device=desktop&game_id=${game.gameId}&game_version_id=${game.versionId}" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe></body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'private, no-store',
    },
  });
}
