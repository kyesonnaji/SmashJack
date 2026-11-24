import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  addDoc,
} from 'firebase/firestore';
import { signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth, db, googleAuthProvider } from './firebase';
import { OperationType, handleFirestoreError } from './firestoreError';
import type {
  ChatMessage,
  Friendship,
  GameRoom,
  GameType,
  InventoryItem,
  IouEntry,
  MatchHistoryEntry,
  Profile,
  TickerItem,
  Wager,
  WagerOffer,
} from '../types/snackstakes';
import { INITIAL_TICKER_ITEMS } from '../data/catalog';

export interface AppStateSnapshot {
  profile: Profile | null;
  profiles: Profile[];
  friendships: Friendship[];
  messages: ChatMessage[];
  inventory: InventoryItem[];
  wagers: Wager[];
  rooms: GameRoom[];
  ious: IouEntry[];
  matchHistory: MatchHistoryEntry[];
  ticker: TickerItem[];
}

export type AuthMode = 'server' | 'firebase';

async function apiFetch<T>(
  url: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const serverApi = {
  async getPublicLandingData(): Promise<{
    ticker: TickerItem[];
    leaderboard: Array<{ uid: string; username: string; xp: number; coins: number; winStreak: number }>;
  }> {
    const [tRes, lRes] = await Promise.all([
      fetch('/api/public/ticker').then((r) => r.json()).catch(() => ({ ticker: INITIAL_TICKER_ITEMS })),
      fetch('/api/public/leaderboard').then((r) => r.json()).catch(() => ({ leaderboard: [] })),
    ]);
    return {
      ticker: tRes.ticker || INITIAL_TICKER_ITEMS,
      leaderboard: lRes.leaderboard || [],
    };
  },

  register: (email: string, password: string, username: string) =>
    apiFetch<{ token: string; state: AppStateSnapshot }>('/api/auth/register', null, {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ token: string; state: AppStateSnapshot }>('/api/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  demoLogin: (username?: string) =>
    apiFetch<{ token: string; state: AppStateSnapshot }>('/api/auth/demo', null, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  logout: (token: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/logout', token, { method: 'POST' }),

  getState: (token: string) =>
    apiFetch<{ state: AppStateSnapshot }>('/api/state', token),

  sendFriendRequest: (token: string, friendId: string) =>
    apiFetch<{ state: AppStateSnapshot }>('/api/friends/request', token, {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    }),

  acceptFriend: (token: string, friendshipId: string) =>
    apiFetch<{ state: AppStateSnapshot }>('/api/friends/accept', token, {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    }),

  declineFriend: (token: string, friendshipId: string) =>
    apiFetch<{ state: AppStateSnapshot }>('/api/friends/decline', token, {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    }),

  sendMessage: (
    token: string,
    payload: { receiverId?: string; roomId?: string; content: string; wagerId?: string }
  ) =>
    apiFetch<{ state: AppStateSnapshot }>('/api/messages', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reactToMessage: (token: string, messageId: string, emoji: string) =>
    apiFetch<{ state: AppStateSnapshot }>(`/api/messages/${messageId}/react`, token, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  createWager: (
    token: string,
    payload: { opponentId: string; creatorOffer: WagerOffer; gameType: GameType; sendInChat?: boolean }
  ) =>
    apiFetch<{ wager: Wager; state: AppStateSnapshot }>('/api/wagers', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateWagerOffer: (
    token: string,
    wagerId: string,
    payload: { offer?: WagerOffer; approve?: boolean }
  ) =>
    apiFetch<{ wager: Wager; state: AppStateSnapshot }>(`/api/wagers/${wagerId}/offer`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelWager: (token: string, wagerId: string) =>
    apiFetch<{ wager: Wager; state: AppStateSnapshot }>(`/api/wagers/${wagerId}/cancel`, token, {
      method: 'POST',
    }),

  createRoom: (token: string, gameType: GameType, maxPlayers: number) =>
    apiFetch<{ room: GameRoom; state: AppStateSnapshot }>('/api/rooms', token, {
      method: 'POST',
      body: JSON.stringify({ gameType, maxPlayers }),
    }),

  joinRoom: (token: string, payload: { roomId?: string; roomCode?: string }) =>
    apiFetch<{ room: GameRoom; state: AppStateSnapshot }>('/api/rooms/join', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  quickMatch: (token: string, gameType?: GameType) =>
    apiFetch<{ room: GameRoom; state: AppStateSnapshot }>('/api/rooms/quick-match', token, {
      method: 'POST',
      body: JSON.stringify({ gameType }),
    }),

  addFriendToRoom: (token: string, roomId: string, friendId: string) =>
    apiFetch<{ room: GameRoom; state: AppStateSnapshot }>(`/api/rooms/${roomId}/add-friend`, token, {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    }),

  updateRoomStake: (
    token: string,
    roomId: string,
    payload: { stakeOffer?: WagerOffer; approvePot?: boolean }
  ) =>
    apiFetch<{ room: GameRoom; state: AppStateSnapshot }>(`/api/rooms/${roomId}/stake`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  startRoom: (token: string, roomId: string) =>
    apiFetch<{ room: GameRoom; state: AppStateSnapshot }>(`/api/rooms/${roomId}/start`, token, {
      method: 'POST',
    }),

  roomAction: (token: string, roomId: string, action: string, choice?: string) =>
    apiFetch<{ room: GameRoom; state: AppStateSnapshot }>(`/api/rooms/${roomId}/action`, token, {
      method: 'POST',
      body: JSON.stringify({ action, choice }),
    }),

  buyShopItem: (token: string, itemId: string) =>
    apiFetch<{ state: AppStateSnapshot }>('/api/shop/buy', token, {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),

  equipShopItem: (token: string, itemId: string) =>
    apiFetch<{ state: AppStateSnapshot }>('/api/shop/equip', token, {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),

  spinDailyWheel: (token: string) =>
    apiFetch<{ index: number; segment: { label: string }; state: AppStateSnapshot }>(
      '/api/wheel/spin',
      token,
      { method: 'POST' }
    ),

  settleIou: (token: string, iouId: string) =>
    apiFetch<{ state: AppStateSnapshot }>(`/api/ious/${iouId}/settle`, token, {
      method: 'POST',
    }),

  completeSoloRound: (
    token: string,
    payload: { gameType: GameType; result: 'won' | 'lost' | 'push'; coinsDelta: number; summary: string }
  ) =>
    apiFetch<{ xpEarned: number; state: AppStateSnapshot }>('/api/solo/complete', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ===========================
// Firebase Firestore Sync Helpers
// ===========================

export async function signInWithGoogleFirebase(): Promise<User> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
}

export async function signOutFirebase() {
  await firebaseSignOut(auth);
}

export async function ensureFirebaseProfile(user: User, preferredUsername?: string): Promise<void> {
  const profileRef = doc(db, 'profiles', user.uid);
  const cleanName = (preferredUsername || user.displayName || 'Player')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 20);
  const safeUsername = cleanName.length >= 3 ? cleanName : `Player_${user.uid.slice(0, 5)}`;

  try {
    const existing = await getDocs(query(collection(db, 'profiles'), where('uid', '==', user.uid)));
    if (existing.empty) {
      await setDoc(profileRef, {
        uid: user.uid,
        username: safeUsername,
        avatarUrl: user.photoURL || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(safeUsername)}`,
        coins: 500,
        xp: 0,
        winStreak: 0,
        isOnline: true,
        presenceStatus: 'Online',
        equippedCardBack: 'default',
        equippedFelt: 'default',
        equippedFrame: 'default',
        xpBoostUntil: 0,
        lastDailySpin: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'inventory'), {
        userId: user.uid,
        itemId: 'snack_egg',
        itemName: 'Egg',
        itemType: 'snack',
        quantity: 2,
        equipped: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(profileRef, {
        isOnline: true,
        presenceStatus: 'Online',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `profiles/${user.uid}`);
  }
}

export function subscribeFirebaseState(
  uid: string,
  onUpdate: (partial: Partial<AppStateSnapshot>) => void
): () => void {
  const unsubs: Array<() => void> = [];

  unsubs.push(
    onSnapshot(
      collection(db, 'profiles'),
      (snap) => {
        const profiles = snap.docs.map((d) => d.data() as Profile);
        const profile = profiles.find((p) => p.uid === uid) || null;
        onUpdate({ profiles, profile });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'profiles')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'inventory'), where('userId', '==', uid)),
      (snap) => {
        const inventory = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
        onUpdate({ inventory });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'inventory')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'game_rooms'), where('status', '==', 'waiting')),
      (snap) => {
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GameRoom));
        onUpdate({ rooms });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'game_rooms')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'match_history'), where('userId', '==', uid)),
      (snap) => {
        const matchHistory = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchHistoryEntry));
        onUpdate({ matchHistory });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'match_history')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}
