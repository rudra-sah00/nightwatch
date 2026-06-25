import { getApps } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  type DocumentSnapshot,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  type QueryDocumentSnapshot,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import type { ExplorePost } from './types';

let db: Firestore | null = null;
let emulatorConnected = false;

function getDb(): Firestore | null {
  if (db) return db;
  const apps = getApps();
  if (!apps.length) return null;
  const isDev = process.env.NODE_ENV === 'development';
  // Emulator only supports default DB
  db = isDev ? getFirestore(apps[0]) : getFirestore(apps[0], 'nightwatch-prod');
  if (!emulatorConnected && isDev) {
    connectFirestoreEmulator(db, '127.0.0.1', 8180);
    emulatorConnected = true;
  }
  return db;
}

const POSTS = 'explore_posts';

/** Safely convert Firestore doc data to ExplorePost with proper timestamp handling */
function docToPost(d: QueryDocumentSnapshot): ExplorePost {
  const data = d.data();
  return {
    ...data,
    id: d.id,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  } as ExplorePost;
}

/** Fetch paginated public posts (one-time read) */
export async function fetchPublicPosts(
  pageSize = 20,
  cursorDoc?: DocumentSnapshot,
): Promise<{ posts: ExplorePost[]; lastDoc: QueryDocumentSnapshot | null }> {
  const firestore = getDb();
  if (!firestore) return { posts: [], lastDoc: null };

  let q = query(
    collection(firestore, POSTS),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );

  if (cursorDoc) {
    q = query(
      collection(firestore, POSTS),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      startAfter(cursorDoc),
      limit(pageSize),
    );
  }

  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => docToPost(d)).filter((p) => !p.parentId);
  const lastDoc = snap.docs[snap.docs.length - 1] || null;

  return { posts, lastDoc };
}

/** Subscribe to real-time new posts (prepends to feed) */
export function subscribeToNewPosts(
  onNewPost: (post: ExplorePost) => void,
  onModifiedPost?: (post: ExplorePost) => void,
): () => void {
  const firestore = getDb();
  if (!firestore) return () => {};

  const q = query(
    collection(firestore, POSTS),
    where('visibility', '==', 'public'),
    where('parentId', '==', null),
    orderBy('createdAt', 'desc'),
    limit(1),
  );

  let isFirst = true;
  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      // Skip initial snapshot (we already have the feed loaded)
      if (isFirst) {
        isFirst = false;
        return;
      }
      for (const change of snap.docChanges()) {
        const post = docToPost(change.doc);
        if (change.type === 'added') {
          onNewPost(post);
        } else if (change.type === 'modified' && onModifiedPost) {
          onModifiedPost(post);
        }
      }
    },
    () => {
      // Listener failed (auth/network) — silent in prod, subscriber will get stale data
    },
  );

  return unsubscribe;
}

/** Fetch replies for a post */
export async function fetchReplies(
  postId: string,
  max = 3,
): Promise<ExplorePost[]> {
  const firestore = getDb();
  if (!firestore) return [];

  const q = query(
    collection(firestore, POSTS),
    where('parentId', '==', postId),
    orderBy('createdAt', 'asc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToPost(d));
}

/** Fetch full thread */
export async function fetchThread(postId: string): Promise<ExplorePost[]> {
  const firestore = getDb();
  if (!firestore) return [];

  // Get root post
  const rootSnap = await getDoc(doc(firestore, POSTS, postId));
  if (!rootSnap.exists()) return [];
  const rootData = rootSnap.data();
  const root: ExplorePost = {
    ...rootData,
    id: rootSnap.id,
    createdAt:
      rootData.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt:
      rootData.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  } as ExplorePost;

  // Get replies
  const q = query(
    collection(firestore, POSTS),
    where('threadRootId', '==', postId),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  const snap2 = await getDocs(q);
  const replies = snap2.docs.map((d) => docToPost(d));

  return [root, ...replies];
}
