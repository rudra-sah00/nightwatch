'use client';

import Link from 'next/link';
import { useState } from 'react';
import { NeoSearchBar } from '@/components/ui/neo-search-bar';

const GAMES = [
  {
    id: 'subway-surfers',
    title: 'Subway Surfers',
    description: 'Endless runner — dodge obstacles, collect coins!',
    thumbnail: '/games/subway-surfers/thumbnail.png',
    video:
      'https://v.poki-cdn.com/6b6c7d15-192b-4add-bba3-18eb57f2e348/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'temple-run-2',
    title: 'Temple Run 2',
    description: 'Run, jump, slide & turn through ancient temples!',
    thumbnail: '/games/temple-run-2/thumbnail.png',
    video:
      'https://v.poki-cdn.com/0e7e3ddd-4bfa-4713-82f6-1d27bda826c8/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'moto-x3m',
    title: 'Moto X3M',
    description: 'Extreme motorcycle racing with stunts!',
    thumbnail: '/games/moto-x3m/thumbnail.png',
    video:
      'https://v.poki-cdn.com/f4fe71f2-e527-474f-a0d7-2ebbf910f128/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'tunnel-rush',
    title: 'Tunnel Rush',
    description: 'Dodge obstacles in a high-speed tunnel!',
    thumbnail: '/games/tunnel-rush/thumbnail.png',
    video:
      'https://v.poki-cdn.com/74714d4a-ca2a-4e79-8e11-4be28c5670d9/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'fruit-ninja',
    title: 'Fruit Ninja',
    description: 'Slice fruit, avoid bombs!',
    thumbnail: '/games/fruit-ninja/thumbnail.png',
    video:
      'https://v.poki-cdn.com/dcf18e39-b784-422d-8e48-5e65f87e164d/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'level-devil',
    title: 'Level Devil',
    description: 'Tricky platformer — nothing is what it seems!',
    thumbnail: '/games/level-devil/thumbnail.png',
    video:
      'https://v.poki-cdn.com/c5f90554-50a7-48c7-8fef-d42420df7c21/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'hill-climb-racing-lite',
    title: 'Hill Climb Racing',
    description: 'Drive uphill without flipping over!',
    thumbnail: '/games/hill-climb-racing-lite/thumbnail.png',
    video:
      'https://v.poki-cdn.com/4b3a0cbf-626d-4627-883c-996e7ccffc03/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'brain-test-tricky-puzzles',
    title: 'Brain Test',
    description: 'Tricky puzzles that challenge your IQ!',
    thumbnail: '/games/brain-test-tricky-puzzles/thumbnail.png',
    video:
      'https://v.poki-cdn.com/6e58374e-d9d5-4bf5-a3f8-9bf656f5cf13/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'stickman-hook',
    title: 'Stickman Hook',
    description: 'Swing through levels like Spider-Man!',
    thumbnail: '/games/stickman-hook/thumbnail.png',
    video:
      'https://v.poki-cdn.com/c5bfe826-608c-4fa4-8ab2-82c07fe27c0d/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'narrow-one',
    title: 'Narrow One',
    description: 'Multiplayer archery in narrow corridors!',
    thumbnail: '/games/narrow-one/thumbnail.png',
    video:
      'https://v.poki-cdn.com/88a3cdef-b050-4d09-9573-d9c930433a26/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'crazy-cars',
    title: 'Crazy Cars',
    description: 'High-speed racing mayhem!',
    thumbnail: '/games/crazy-cars/thumbnail.png',
    video:
      'https://v.poki-cdn.com/d21f42ba-2871-430d-b7d1-0bf1cd727d64/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'basketball-stars',
    title: 'Basketball Stars',
    description: '1v1 basketball — shoot and score!',
    thumbnail: '/games/basketball-stars/thumbnail.png',
    video:
      'https://v.poki-cdn.com/470d0dc8-446b-44f4-a946-6f2cc0d30f8c/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'blumgi-rocket',
    title: 'Blumgi Rocket',
    description: 'Launch rockets and reach the goal!',
    thumbnail: '/games/blumgi-rocket/thumbnail.png',
    video:
      'https://v.poki-cdn.com/52d3706e-8da4-4004-9554-65029a91087d/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'like-a-king',
    title: 'Like a King',
    description: 'Build your army and conquer!',
    thumbnail: '/games/like-a-king/thumbnail.png',
    video:
      'https://v.poki-cdn.com/8fb93f90-7eef-4459-a747-3499327a76b5/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'murder',
    title: 'Murder',
    description: 'Dark humor point-and-click!',
    thumbnail: '/games/murder/thumbnail.png',
    video:
      'https://v.poki-cdn.com/38868ac2-e824-48a5-94d5-8430c881ad54/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'parkour-race',
    title: 'Parkour Race',
    description: 'Race and flip through obstacles!',
    thumbnail: '/games/parkour-race/thumbnail.png',
    video:
      'https://v.poki-cdn.com/477951a3-5b2a-414a-8239-ebdafd717af5/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'rodeo-stampede-savannah',
    title: 'Rodeo Stampede',
    description: 'Tame wild animals in the savannah!',
    thumbnail: '/games/rodeo-stampede-savannah/thumbnail.png',
    video:
      'https://v.poki-cdn.com/d97b255e-bdb3-4ec4-8942-c9cc679b6f63/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'g-switch-4',
    title: 'G-Switch 4',
    description: 'Gravity-flipping multiplayer runner!',
    thumbnail: '/games/g-switch-4/thumbnail.png',
    video:
      'https://v.poki-cdn.com/86e5f44e-a8df-4d92-896f-50827057e5ca/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'monkey-mart',
    title: 'Monkey Mart',
    description: 'Run a supermarket as a monkey!',
    thumbnail: '/games/monkey-mart/thumbnail.png',
    video:
      'https://v.poki-cdn.com/56e350ba-5361-4734-9b20-140b9242b08b/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'smash-karts',
    title: 'Smash Karts',
    description: 'Multiplayer kart battle arena!',
    thumbnail: '/games/smash-karts/thumbnail.png',
    video:
      'https://v.poki-cdn.com/955f0bb1-0222-485d-8fa9-88343588b0c3/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'stick-merge',
    title: 'Stick Merge',
    description: 'Merge sticks to build the ultimate weapon!',
    thumbnail: '/games/stick-merge/thumbnail.png',
    video:
      'https://v.poki-cdn.com/d4c0cee1-1277-47c7-b155-80f938e3802a/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'house-of-hazards',
    title: 'House of Hazards',
    description: 'Survive traps set by your friends!',
    thumbnail: '/games/house-of-hazards/thumbnail.png',
    video:
      'https://v.poki-cdn.com/4f48b1b3-591f-481b-a37f-e1aae1a6156a/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'ragdoll-hit',
    title: 'Ragdoll Hit',
    description: 'Punch ragdolls with satisfying physics!',
    thumbnail: '/games/ragdoll-hit/thumbnail.png',
    video:
      'https://v.poki-cdn.com/522f849f-b693-492a-aa5f-3325b8fe4c6b/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'idle-breakout',
    title: 'Idle Breakout',
    description: 'Idle brick-breaking with upgrades!',
    thumbnail: '/games/idle-breakout/thumbnail.png',
    video:
      'https://v.poki-cdn.com/bc2641a6-c36b-402d-bccd-5b92866dd76a/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'temple-of-boom',
    title: 'Temple of Boom',
    description: 'Explosive multiplayer platformer!',
    thumbnail: '/games/temple-of-boom/thumbnail.png',
    video:
      'https://v.poki-cdn.com/f184a9c2-4b10-4d6b-a00c-2fb9abc675ec/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'dreadhead-parkour',
    title: 'Dreadhead Parkour',
    description: 'Fluid parkour platformer!',
    thumbnail: '/games/dreadhead-parkour/thumbnail.png',
    video:
      'https://v.poki-cdn.com/d49d9ede-5ead-42ef-8805-92b10f01f3ae/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'rooftop-snipers',
    title: 'Rooftop Snipers',
    description: '1v1 rooftop shooting duels!',
    thumbnail: '/games/rooftop-snipers/thumbnail.png',
    video:
      'https://v.poki-cdn.com/ca2037db-d811-4275-b9b6-4fd09c0f416b/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'getaway-shootout',
    title: 'Getaway Shootout',
    description: 'Race to the getaway vehicle!',
    thumbnail: '/games/getaway-shootout/thumbnail.png',
    video:
      'https://v.poki-cdn.com/41dc4d2e-20cf-4f18-8bf1-0cc9645a5189/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'tag',
    title: 'Tag',
    description: 'Multiplayer tag — run or chase!',
    thumbnail: '/games/tag/thumbnail.png',
    video:
      'https://v.poki-cdn.com/6c430da8-91f5-4fb3-9b40-77d349535dd9/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'water-color-sort',
    title: 'Water Color Sort',
    description: 'Sort colored water into bottles!',
    thumbnail: '/games/water-color-sort/thumbnail.png',
    video:
      'https://v.poki-cdn.com/d828a5e4-edc2-4925-8ac4-ef14a76c7e7b/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'bad-ice-cream',
    title: 'Bad Ice Cream',
    description: 'Collect fruit as an ice cream cone!',
    thumbnail: '/games/bad-ice-cream/thumbnail.png',
    video:
      'https://v.poki-cdn.com/ab7c6d55-7c68-4167-afab-87ef9455e519/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'big-tower-tiny-square',
    title: 'Big Tower Tiny Square',
    description: 'Precision platformer — climb the tower!',
    thumbnail: '/games/big-tower-tiny-square/thumbnail.png',
    video:
      'https://v.poki-cdn.com/f0103d14-0782-44d4-8942-41867fffd4b3/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'poor-eddie',
    title: 'Poor Eddie',
    description: 'Help Eddie survive hilarious dangers!',
    thumbnail: '/games/poor-eddie/thumbnail.png',
    video:
      'https://v.poki-cdn.com/a6acd5d5-5309-46cb-bd41-8fd1a2c77e4c/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'rocket-soccer-derby',
    title: 'Rocket Soccer Derby',
    description: 'Cars + soccer = chaos!',
    thumbnail: '/games/rocket-soccer-derby/thumbnail.png',
    video:
      'https://v.poki-cdn.com/3341fa26-ce88-49a8-8971-e88a5fe110b1/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'tribals-io',
    title: 'Tribals.io',
    description: 'Multiplayer tribal survival!',
    thumbnail: '/games/tribals-io/thumbnail.png',
    video:
      'https://v.poki-cdn.com/2836d557-a8ce-416a-88bd-4e8f020030fe/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'stick-defenders',
    title: 'Stick Defenders',
    description: 'Defend your base with stickmen!',
    thumbnail: '/games/stick-defenders/thumbnail.png',
    video:
      'https://v.poki-cdn.com/c8072c93-6aba-4778-9c5b-079724c3fea0/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'sushi-party-io',
    title: 'Sushi Party',
    description: 'Snake-style multiplayer sushi game!',
    thumbnail: '/games/sushi-party-io/thumbnail.png',
    video:
      'https://v.poki-cdn.com/ff8cf01c-b2b7-43ef-ac7c-2e8f355db89f/thumbnail.3x3.h264.mp4',
  },
  {
    id: '1010-color-match',
    title: '1010 Color Match',
    description: 'Relaxing color block puzzle!',
    thumbnail: '/games/1010-color-match/thumbnail.png',
    video:
      'https://v.poki-cdn.com/26c1add0-59cf-44d2-b538-88cbf7f92ca2/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'retro-bowl',
    title: 'Retro Bowl',
    description: 'Retro-style American football!',
    thumbnail: '/games/retro-bowl/thumbnail.png',
    video:
      'https://v.poki-cdn.com/be86cc01-e4d5-4bcf-a44b-59b8086bb0f2/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'duo-survival',
    title: 'Duo Survival',
    description: 'Co-op puzzle platformer for two!',
    thumbnail: '/games/duo-survival/thumbnail.png',
    video:
      'https://v.poki-cdn.com/9fbddbf6-1058-42ba-bc86-b1b849f6c4c8/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'scary-teacher-3d',
    title: 'Scary Teacher 3D',
    description: 'Prank your scary teacher!',
    thumbnail: '/games/scary-teacher-3d/thumbnail.png',
    video:
      'https://v.poki-cdn.com/2fc25127-d713-405c-9286-16ec74a55355/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'slice-master',
    title: 'Slice Master',
    description: 'Slice everything perfectly!',
    thumbnail: '/games/slice-master/thumbnail.png',
    video:
      'https://v.poki-cdn.com/5718f944-f448-40c1-a1b1-65e55936f7bb/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'my-perfect-hotel',
    title: 'My Perfect Hotel',
    description: 'Build and manage your dream hotel!',
    thumbnail: '/games/my-perfect-hotel/thumbnail.png',
    video:
      'https://v.poki-cdn.com/9233b66a-7c0d-4bb0-a714-26474faa7899/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'apple-knight-mini-dungeons',
    title: 'Apple Knight',
    description: 'Hack and slash dungeon crawler!',
    thumbnail: '/games/apple-knight-mini-dungeons/thumbnail.png',
    video:
      'https://v.poki-cdn.com/94345ef3-c5de-47da-963f-179427dfcd0d/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'we-become-what-we-behold',
    title: 'We Become What We Behold',
    description: 'A game about news cycles and violence!',
    thumbnail: '/games/we-become-what-we-behold/thumbnail.png',
    video:
      'https://v.poki-cdn.com/899cd46e-90ca-4709-b542-86bd82c631cf/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'stickman-climb-2',
    title: 'Stickman Climb 2',
    description: 'Climb walls with stretchy arms!',
    thumbnail: '/games/stickman-climb-2/thumbnail.png',
    video:
      'https://v.poki-cdn.com/914700ab-2114-40de-9466-72b8eb714392/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'stickman-dragon-fight',
    title: 'Stickman Dragon Fight',
    description: 'Epic stickman vs dragon battles!',
    thumbnail: '/games/stickman-dragon-fight/thumbnail.png',
    video:
      'https://v.poki-cdn.com/30db7ef1-cff5-4ebf-98bc-5afee99b6f7b/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'happy-glass',
    title: 'Happy Glass',
    description: 'Draw lines to fill the glass!',
    thumbnail: '/games/happy-glass/thumbnail.png',
    video:
      'https://v.poki-cdn.com/caa1642e-d405-47d6-87f7-bd925015c916/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'wheel-master',
    title: 'Wheel Master',
    description: 'Balance and ride through crazy tracks!',
    thumbnail: '/games/wheel-master/thumbnail.png',
    video:
      'https://v.poki-cdn.com/83dafec3-3939-40f7-9d16-a98e460cc063/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'dinosaur-game',
    title: 'Dinosaur Game',
    description: 'The classic Chrome dino runner!',
    thumbnail: '/games/dinosaur-game/thumbnail.png',
    video:
      'https://v.poki-cdn.com/b6746c29-a65b-434d-a04d-fd41282f8565/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'the-sniper-code',
    title: 'The Sniper Code',
    description: 'Tactical sniper puzzle shooter!',
    thumbnail: '/games/the-sniper-code/thumbnail.png',
    video:
      'https://v.poki-cdn.com/5674dc9b-26eb-477d-a208-8efc71df22a6/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'deadrise-io',
    title: 'Deadrise.io',
    description: 'Multiplayer zombie survival shooter!',
    thumbnail: '/games/deadrise-io/thumbnail.png',
    video:
      'https://v.poki-cdn.com/7067823e-eead-4873-b4f3-c33cf66d0a87/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'zombie-derby-2',
    title: 'Zombie Derby 2',
    description: 'Smash through zombies with your car!',
    thumbnail: '/games/zombie-derby-2/thumbnail.png',
    video:
      'https://v.poki-cdn.com/e0894089-aea3-4301-bb21-03b4ad2cf40e/thumbnail.3x3.h264.mp4',
  },
];

export default function GamesPage() {
  const [search, setSearch] = useState('');

  const filtered = GAMES.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-full pb-32 overflow-x-hidden">
      {/* Hero */}
      <div className="mb-8 bg-neo-green relative overflow-hidden rounded-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-20 rotate-12" />
        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
            PLAY
            <br />
            <span className="bg-background px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
              GAMES
            </span>
          </h1>
          <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
            Arcade classics right in your browser
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-[3px] border-border p-4 md:p-6 rounded-md">
            <NeoSearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games..."
            />
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group bg-card p-2 border-[3px] border-border"
              >
                <div className="aspect-video bg-background flex items-center justify-center border-[3px] border-border overflow-hidden relative">
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:opacity-0 transition-opacity"
                  />
                  <video
                    src={game.video}
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const v = e.target as HTMLVideoElement;
                      v.pause();
                      v.currentTime = 0;
                    }}
                  />
                </div>
                <div className="px-2 pt-3 pb-2">
                  <p className="font-headline font-black uppercase tracking-wider text-foreground text-sm">
                    {game.title}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    {game.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
