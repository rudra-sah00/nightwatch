/**
 * Seed script for local development.
 * - Posts → Firestore emulator (via REST)
 * - Users, Friendships, Messages → PostgreSQL (via docker exec psql)
 *
 * Run: node scripts/seed-emulator.mjs
 */

import { execSync } from 'node:child_process';

const FIRESTORE_HOST = '127.0.0.1:8180';
const PROJECT_ID = 'nightwatch-prod';
const baseUrl = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const now = Date.now();

// --- Run SQL in docker postgres ---
function runSQL(query) {
  execSync(
    `docker exec nightwatch_postgres_dev psql -U nightwatch -d nightwatch_dev -c "${query.replace(/"/g, '\\"')}"`,
    { stdio: 'pipe' },
  );
}

// --- Firestore helpers ---
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj))
    fields[key] = toFirestoreValue(value);
  return fields;
}
function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number')
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object')
    return { mapValue: { fields: toFirestoreFields(value) } };
}
async function createDoc(col, docId, data) {
  const res = await fetch(`${baseUrl}/${col}?documentId=${docId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  return res.ok;
}
async function clearFirestore() {
  await fetch(
    `http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  ).catch(() => {});
}

async function seed() {
  console.log('🌱 Seeding local development...\n');

  // --- 1. PostgreSQL: Users ---
  console.log('👤 Upserting users in PostgreSQL...');
  // bcrypt hash of "Test123"
  const hash = '$2a$12$LQv3c1yqBo9SkvXS7QTJPOoqL.KmKff2c8/wJCXtl0z1G0ht8S3He';

  const users = [
    {
      name: 'Rudra Patel',
      email: 'test@gmail.com',
      username: 'rudra',
      photo: 'https://i.pravatar.cc/150?u=rudra',
    },
    {
      name: 'Aarav Sharma',
      email: 'aarav@test.com',
      username: 'aarav',
      photo: 'https://i.pravatar.cc/150?u=aarav',
    },
    {
      name: 'Priya Nair',
      email: 'priya@test.com',
      username: 'priya',
      photo: 'https://i.pravatar.cc/150?u=priya',
    },
    {
      name: 'Kira Tanaka',
      email: 'kira@test.com',
      username: 'kira',
      photo: 'https://i.pravatar.cc/150?u=kira',
    },
    {
      name: 'Arjun Mehta',
      email: 'arjun@test.com',
      username: 'arjun',
      photo: 'https://i.pravatar.cc/150?u=arjun',
    },
    {
      name: 'Nightwatch AI',
      email: 'ai@nightwatch.in',
      username: 'nightwatch',
      photo: 'https://i.pravatar.cc/150?u=nightwatch',
    },
  ];

  for (const u of users) {
    runSQL(
      `INSERT INTO users (id, name, email, username, password, profile_photo, created_at, updated_at) VALUES (gen_random_uuid(), '${u.name}', '${u.email}', '${u.username}', '${hash}', '${u.photo}', NOW() - INTERVAL '30 days', NOW()) ON CONFLICT (email) DO UPDATE SET name='${u.name}', username='${u.username}', profile_photo='${u.photo}', updated_at=NOW();`,
    );
    console.log(`   ✓ ${u.name} (@${u.username})`);
  }

  // Get user IDs
  const idOutput = execSync(
    `docker exec nightwatch_postgres_dev psql -U nightwatch -d nightwatch_dev -t -A -c "SELECT username, id FROM users WHERE username IN ('rudra','aarav','priya','kira','arjun','nightwatch');"`,
    { encoding: 'utf8' },
  );
  const userIds = {};
  for (const line of idOutput.trim().split('\n')) {
    const [username, id] = line.split('|');
    if (username && id) userIds[username] = id;
  }
  console.log(`   IDs loaded: ${Object.keys(userIds).join(', ')}`);

  // --- 2. PostgreSQL: Friendships ---
  console.log('\n🤝 Creating friendships...');
  const pairs = [
    ['rudra', 'aarav'],
    ['rudra', 'priya'],
    ['rudra', 'kira'],
    ['rudra', 'arjun'],
    ['aarav', 'priya'],
    ['priya', 'arjun'],
  ];
  for (const [a, b] of pairs) {
    runSQL(
      `INSERT INTO friendships (id, sender_id, receiver_id, status, created_at, updated_at) VALUES (gen_random_uuid(), '${userIds[a]}', '${userIds[b]}', 'accepted', NOW()-INTERVAL '7 days', NOW()) ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status='accepted';`,
    );
    console.log(`   ✓ @${a} ↔ @${b}`);
  }

  // --- 3. PostgreSQL: DM Messages ---
  console.log('\n💬 Creating DM messages...');
  const dms = [
    {
      from: 'aarav',
      to: 'rudra',
      content: 'Hey! Wanna watch something tonight?',
      ago: 7200000,
    },
    {
      from: 'rudra',
      to: 'aarav',
      content: 'Yeah sure! What do you have in mind?',
      ago: 7000000,
    },
    {
      from: 'aarav',
      to: 'rudra',
      content: 'How about Dune 3? Heard its amazing',
      ago: 6800000,
    },
    {
      from: 'priya',
      to: 'rudra',
      content: 'Check out the AoT post! Join the watch party',
      ago: 5000000,
    },
    {
      from: 'rudra',
      to: 'priya',
      content: 'Yooo count me in!! When are we starting?',
      ago: 4800000,
    },
    {
      from: 'kira',
      to: 'rudra',
      content: 'Have you heard the new Kendrick album??',
      ago: 3600000,
    },
    {
      from: 'rudra',
      to: 'kira',
      content: 'Not yet! Adding it to my queue right now',
      ago: 3400000,
    },
    {
      from: 'arjun',
      to: 'rudra',
      content: 'Bro the poll results are crazy Dune winning',
      ago: 1800000,
    },
  ];
  for (const dm of dms) {
    const ts = new Date(now - dm.ago).toISOString();
    runSQL(
      `INSERT INTO messages (id, sender_id, receiver_id, content, created_at) VALUES (gen_random_uuid(), '${userIds[dm.from]}', '${userIds[dm.to]}', '${dm.content}', '${ts}'::timestamptz);`,
    );
    console.log(
      `   ✓ @${dm.from} → @${dm.to}: "${dm.content.slice(0, 35)}..."`,
    );
  }

  // --- 4. Firestore: Explore Posts ---
  console.log('\n📝 Creating explore posts in Firestore...');
  await clearFirestore();

  const posts = [
    {
      id: 'post-1',
      authorId: userIds.aarav,
      authorName: 'Aarav Sharma',
      authorUsername: 'aarav',
      authorPhoto: 'https://i.pravatar.cc/150?u=aarav',
      content:
        'Just finished watching Interstellar for the 5th time. The docking scene still gives me chills 🚀',
      type: 'text',
      tags: [
        { type: 'movie', id: 'interstellar', title: 'Interstellar', image: '' },
      ],
      parentId: null,
      threadRootId: null,
      stats: { replies: 2, reposts: 1, reactions: 5 },
      reactionsMap: { '🔥': 3, '❤️': 2 },
      visibility: 'public',
      mentions: [],
      createdAt: new Date(now - 3600000).toISOString(),
      updatedAt: new Date(now - 3600000).toISOString(),
    },
    {
      id: 'post-2',
      authorId: userIds.priya,
      authorName: 'Priya Nair',
      authorUsername: 'priya',
      authorPhoto: 'https://i.pravatar.cc/150?u=priya',
      content:
        'Anyone wanna start a watch party for Attack on Titan final season? @rudra @aarav',
      type: 'text',
      tags: [
        { type: 'series', id: 'aot', title: 'Attack on Titan', image: '' },
      ],
      parentId: null,
      threadRootId: null,
      stats: { replies: 3, reposts: 0, reactions: 8 },
      reactionsMap: { '⚔️': 4, '🔥': 3, '👀': 1 },
      visibility: 'public',
      mentions: [
        { userId: userIds.rudra, username: 'rudra', name: 'Rudra Patel' },
        { userId: userIds.aarav, username: 'aarav', name: 'Aarav Sharma' },
      ],
      createdAt: new Date(now - 7200000).toISOString(),
      updatedAt: new Date(now - 7200000).toISOString(),
    },
    {
      id: 'post-3',
      authorId: userIds.kira,
      authorName: 'Kira Tanaka',
      authorUsername: 'kira',
      authorPhoto: 'https://i.pravatar.cc/150?u=kira',
      content:
        'This new Kendrick album is absolutely insane. Every track hits different.',
      type: 'text',
      tags: [
        {
          type: 'music',
          id: 'kendrick-gnx',
          title: 'GNX - Kendrick Lamar',
          image: '',
        },
      ],
      parentId: null,
      threadRootId: null,
      stats: { replies: 1, reposts: 4, reactions: 12 },
      reactionsMap: { '🎵': 5, '🔥': 4, '💯': 3 },
      visibility: 'public',
      mentions: [],
      createdAt: new Date(now - 1800000).toISOString(),
      updatedAt: new Date(now - 1800000).toISOString(),
    },
    {
      id: 'post-4',
      authorId: userIds.arjun,
      authorName: 'Arjun Mehta',
      authorUsername: 'arjun',
      authorPhoto: 'https://i.pravatar.cc/150?u=arjun',
      content: 'Poll time! What are we watching tonight?',
      type: 'poll',
      tags: [],
      poll: {
        options: [
          { id: 'opt-1', text: 'The Boys S5', votes: 7 },
          { id: 'opt-2', text: 'Jujutsu Kaisen', votes: 5 },
          { id: 'opt-3', text: 'Dune Part 3', votes: 9 },
        ],
        endsAt: new Date(now + 86400000).toISOString(),
        voterIds: [userIds.rudra, userIds.aarav, userIds.priya],
      },
      parentId: null,
      threadRootId: null,
      stats: { replies: 4, reposts: 0, reactions: 3 },
      reactionsMap: { '🍿': 3 },
      visibility: 'public',
      mentions: [],
      createdAt: new Date(now - 600000).toISOString(),
      updatedAt: new Date(now - 600000).toISOString(),
    },
    {
      id: 'post-5',
      authorId: userIds.rudra,
      authorName: 'Rudra Patel',
      authorUsername: 'rudra',
      authorPhoto: 'https://i.pravatar.cc/150?u=rudra',
      content:
        'Built the explore feed today. Real-time Firestore + REST writes hybrid architecture feels so smooth 🛠️',
      type: 'text',
      tags: [],
      parentId: null,
      threadRootId: null,
      stats: { replies: 1, reposts: 2, reactions: 6 },
      reactionsMap: { '🚀': 4, '💪': 2 },
      visibility: 'public',
      mentions: [],
      createdAt: new Date(now - 300000).toISOString(),
      updatedAt: new Date(now - 300000).toISOString(),
    },
    {
      id: 'post-6',
      authorId: userIds.nightwatch,
      authorName: 'Nightwatch AI',
      authorUsername: 'nightwatch',
      authorPhoto: 'https://i.pravatar.cc/150?u=nightwatch',
      content:
        '🎬 Trending tonight: Dune Part 3 is breaking records. 94% on RT. Who has seen it?',
      type: 'text',
      tags: [
        { type: 'movie', id: 'dune-3', title: 'Dune: Part Three', image: '' },
      ],
      parentId: null,
      threadRootId: null,
      stats: { replies: 6, reposts: 3, reactions: 15 },
      reactionsMap: { '🔥': 8, '🍿': 4, '❤️': 3 },
      visibility: 'public',
      mentions: [],
      createdAt: new Date(now - 120000).toISOString(),
      updatedAt: new Date(now - 120000).toISOString(),
    },
  ];

  for (const post of posts) {
    const { id, ...data } = post;
    const ok = await createDoc('explore_posts', id, data);
    if (ok) console.log(`   ✓ [${post.type}] ${post.content.slice(0, 50)}...`);
  }

  console.log('\n✅ Done!');
  console.log(`   • ${users.length} users (PostgreSQL)`);
  console.log(`   • ${pairs.length} friendships (PostgreSQL)`);
  console.log(`   • ${dms.length} DM messages (PostgreSQL)`);
  console.log(`   • ${posts.length} explore posts (Firestore)`);
  console.log('\n🔑 Login: test@gmail.com / Test123');
  console.log('   All users password: Test123');
  console.log('🔗 Firestore UI: http://127.0.0.1:4040/firestore');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
