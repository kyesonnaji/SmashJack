import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  SNACK_AND_SHOP_CATALOG,
  INITIAL_TICKER_ITEMS,
} from './src/data/catalog.ts';
import {
  calculateMatchReward,
  compareHighLow,
  createDeck,
  dealerShouldHit,
  evaluateBlackjackHand,
  pickWheelSegment,
  resolveBlackjackOutcome,
  resolveDiceBet,
  resolveRouletteBet,
  shuffleDeck,
  type DicePrediction,
  type RouletteBetType,
} from './src/game/engine.ts';
import type {
  Card,
  ChatMessage,
  Friendship,
  GameRoom,
  GameType,
  InventoryItem,
  IouEntry,
  MatchHistoryEntry,
  Profile,
  RoomPlayer,
  TickerItem,
  Wager,
  WagerOffer,
} from './src/types/snackstakes.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'snackstakes-state.json');

interface AuthUserRecord {
  uid: string;
  email: string;
  passwordHash: string;
  salt: string;
}

interface DatabaseState {
  authUsers: AuthUserRecord[];
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

interface SessionInfo {
  uid: string;
  token: string;
  createdAt: number;
}

const sessions = new Map<string, SessionInfo>();
const wsClients = new Map<WebSocket, { uid: string | null }>();

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

function hashPassword(password: string, salt?: string) {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string) {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

function createSeedState(): DatabaseState {
  const t = nowIso();
  const seedProfiles: Profile[] = [
    {
      uid: 'player_tunde',
      username: 'Tunde',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Tunde',
      coins: 1840,
      xp: 3420,
      winStreak: 4,
      isOnline: true,
      presenceStatus: 'In Lobby',
      equippedCardBack: 'cosmetic_gold_foil',
      equippedFelt: 'cosmetic_emerald_felt',
      equippedFrame: 'cosmetic_gold_frame',
      xpBoostUntil: 0,
      lastDailySpin: 0,
      createdAt: t,
      updatedAt: t,
      isBot: true,
    },
    {
      uid: 'player_sarah',
      username: 'Sarah',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
      coins: 1420,
      xp: 1980,
      winStreak: 2,
      isOnline: true,
      presenceStatus: 'Online',
      equippedCardBack: 'default',
      equippedFelt: 'cosmetic_emerald_felt',
      equippedFrame: 'default',
      xpBoostUntil: 0,
      lastDailySpin: 0,
      createdAt: t,
      updatedAt: t,
      isBot: true,
    },
    {
      uid: 'player_kofi',
      username: 'Kofi',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Kofi',
      coins: 2650,
      xp: 4820,
      winStreak: 6,
      isOnline: true,
      presenceStatus: 'In Game',
      equippedCardBack: 'cosmetic_neon_flame',
      equippedFelt: 'cosmetic_crimson_felt',
      equippedFrame: 'cosmetic_ember_frame',
      xpBoostUntil: 0,
      lastDailySpin: 0,
      createdAt: t,
      updatedAt: t,
      isBot: true,
    },
    {
      uid: 'player_maya',
      username: 'Maya',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maya',
      coins: 960,
      xp: 760,
      winStreak: 1,
      isOnline: true,
      presenceStatus: 'Online',
      equippedCardBack: 'default',
      equippedFelt: 'default',
      equippedFrame: 'default',
      xpBoostUntil: 0,
      lastDailySpin: 0,
      createdAt: t,
      updatedAt: t,
      isBot: true,
    },
  ];

  const seedRooms: GameRoom[] = [
    {
      id: 'room_vip_bj_1',
      roomCode: 'VIP777',
      hostId: 'player_tunde',
      gameType: 'blackjack',
      maxPlayers: 6,
      status: 'waiting',
      players: [
        {
          uid: 'player_tunde',
          username: 'Tunde',
          avatarUrl: seedProfiles[0].avatarUrl,
          stakeOffer: { snackItemId: 'snack_friday', snackName: 'Friday Snack', coins: 100 },
          potApproved: true,
          isBot: true,
        },
        {
          uid: 'player_sarah',
          username: 'Sarah',
          avatarUrl: seedProfiles[1].avatarUrl,
          stakeOffer: { snackItemId: 'snack_monday', snackName: 'Monday Snack', coins: 100 },
          potApproved: true,
          isBot: true,
        },
      ],
      playerIds: ['player_tunde', 'player_sarah'],
      gameState: {
        phase: 'lobby',
        turnIndex: 0,
        turnDeadline: 0,
      },
      createdAt: t,
      updatedAt: t,
    },
    {
      id: 'room_suya_dice_2',
      roomCode: 'SUYA88',
      hostId: 'player_kofi',
      gameType: 'dice',
      maxPlayers: 4,
      status: 'waiting',
      players: [
        {
          uid: 'player_kofi',
          username: 'Kofi',
          avatarUrl: seedProfiles[2].avatarUrl,
          stakeOffer: { snackItemId: 'snack_grilled_meat', snackName: 'Grilled Meat / Suya Platter', coins: 150 },
          potApproved: true,
          isBot: true,
        },
      ],
      playerIds: ['player_kofi'],
      gameState: {
        phase: 'lobby',
        turnIndex: 0,
        turnDeadline: 0,
      },
      createdAt: t,
      updatedAt: t,
    },
  ];

  return {
    authUsers: [],
    profiles: seedProfiles,
    friendships: [],
    messages: [],
    inventory: [],
    wagers: [],
    rooms: seedRooms,
    ious: [],
    matchHistory: [],
    ticker: [...INITIAL_TICKER_ITEMS],
  };
}

function loadDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && Array.isArray(parsed.profiles)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read DB state, initializing fresh seed:', err);
  }
  const initial = createSeedState();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(state: DatabaseState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist DB state:', err);
  }
}

const dbState = loadDatabase();

function broadcastEvent(event: string, payload: unknown, targetUids?: string[]) {
  const message = JSON.stringify({ event, payload });
  for (const [client, meta] of wsClients.entries()) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (targetUids && (!meta.uid || !targetUids.includes(meta.uid))) continue;
    client.send(message);
  }
}

function grantStarterInventory(uid: string) {
  const t = nowIso();
  const starter: InventoryItem[] = [
    {
      id: makeId('inv'),
      userId: uid,
      itemId: 'snack_egg',
      itemName: 'Egg',
      itemType: 'snack',
      quantity: 2,
      equipped: false,
      updatedAt: t,
    },
    {
      id: makeId('inv'),
      userId: uid,
      itemId: 'snack_monday',
      itemName: 'Monday Snack',
      itemType: 'snack',
      quantity: 1,
      equipped: false,
      updatedAt: t,
    },
    {
      id: makeId('inv'),
      userId: uid,
      itemId: 'snack_grilled_meat',
      itemName: 'Grilled Meat / Suya Platter',
      itemType: 'snack',
      quantity: 1,
      equipped: false,
      updatedAt: t,
    },
  ];
  dbState.inventory.push(...starter);
}

function seedUserSocialState(uid: string, username: string) {
  const t = nowIso();
  // Create initial friendship with Tunde and Sarah + a pending invite from Maya so user has live social activity immediately
  dbState.friendships.push(
    {
      id: makeId('fr'),
      userId: uid,
      friendId: 'player_tunde',
      status: 'accepted',
      createdAt: t,
      updatedAt: t,
    },
    {
      id: makeId('fr'),
      userId: uid,
      friendId: 'player_sarah',
      status: 'accepted',
      createdAt: t,
      updatedAt: t,
    },
    {
      id: makeId('fr'),
      userId: 'player_maya',
      friendId: uid,
      status: 'pending',
      createdAt: t,
      updatedAt: t,
    }
  );

  // Welcome DM from Tunde
  dbState.messages.push({
    id: makeId('msg'),
    senderId: 'player_tunde',
    senderName: 'Tunde',
    receiverId: uid,
    content: `Welcome to the lounge, ${username}! Ready to put a Monday Snack on Blackjack?`,
    reactions: {},
    createdAt: t,
  });

  // Sample active IOU so user can test "Mark Delivered / Settled" immediately
  dbState.ious.push({
    id: makeId('iou'),
    winnerId: uid,
    loserId: 'player_tunde',
    winnerName: username,
    loserName: 'Tunde',
    stakeLabel: 'Monday Snack + 50 Coins',
    gameType: 'blackjack',
    settled: false,
    createdAt: t,
    updatedAt: t,
  });
}

function getUserStateSnapshot(uid: string) {
  const profile = dbState.profiles.find((p) => p.uid === uid) || null;
  const friendships = dbState.friendships.filter(
    (f) => f.userId === uid || f.friendId === uid
  );
  const myRoomIds = new Set(
    dbState.rooms.filter((r) => r.playerIds.includes(uid)).map((r) => r.id)
  );
  const messages = dbState.messages.filter(
    (m) =>
      m.senderId === uid ||
      m.receiverId === uid ||
      (m.roomId && myRoomIds.has(m.roomId))
  );
  const inventory = dbState.inventory.filter((i) => i.userId === uid && i.quantity > 0);
  const wagers = dbState.wagers.filter(
    (w) => w.creatorId === uid || w.opponentId === uid
  );
  const rooms = dbState.rooms.filter(
    (r) => r.status === 'waiting' || r.playerIds.includes(uid)
  );
  const ious = dbState.ious.filter(
    (i) => i.winnerId === uid || i.loserId === uid
  );
  const matchHistory = dbState.matchHistory
    .filter((m) => m.userId === uid)
    .slice(0, 30);

  return {
    profile,
    profiles: dbState.profiles,
    friendships,
    messages,
    inventory,
    wagers,
    rooms,
    ious,
    matchHistory,
    ticker: dbState.ticker.slice(0, 20),
  };
}

function formatStakeLabel(offer: WagerOffer): string {
  const parts: string[] = [];
  if (offer.snackName) parts.push(offer.snackName);
  if (offer.customStake && offer.customStake.trim()) parts.push(offer.customStake.trim());
  if (offer.coins > 0) parts.push(`${offer.coins} Coins`);
  return parts.length > 0 ? parts.join(' + ') : 'Friendly Bragging Rights';
}

function pushTicker(text: string, gameType: GameType) {
  const item: TickerItem = {
    id: makeId('tick'),
    text,
    gameType,
    createdAt: nowIso(),
  };
  dbState.ticker.unshift(item);
  if (dbState.ticker.length > 30) dbState.ticker.length = 30;
  broadcastEvent('ticker:new', item);
}

interface AuthExpressRequest extends Request {
  authUid?: string;
}

function requireSession(req: AuthExpressRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7).trim();
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  req.authUid = session.uid;
  next();
}

function finalizeBlackjackRoom(room: GameRoom) {
  const deck = [...(room.gameState.deck || [])];
  const dealerHand = [...(room.gameState.dealerHand || [])];

  while (dealerShouldHit(dealerHand) && deck.length > 0) {
    dealerHand.push(deck.pop()!);
  }

  let bestScore = -1;
  let winnerUid = room.players[0]?.uid;

  const updatedPlayers: RoomPlayer[] = room.players.map((p) => {
    const hand = p.hand || [];
    const evalP = evaluateBlackjackHand(hand);
    const betCoins = Math.max(0, p.stakeOffer.coins || 50);
    const outcomeObj = resolveBlackjackOutcome(hand, dealerHand, betCoins, Boolean(p.doubled));
    const outcome: 'won' | 'lost' | 'push' =
      outcomeObj.result === 'win' || outcomeObj.result === 'blackjack'
        ? 'won'
        : outcomeObj.result === 'push'
          ? 'push'
          : 'lost';

    if (!evalP.isBust && evalP.total > bestScore) {
      bestScore = evalP.total;
      winnerUid = p.uid;
    }

    const prof = dbState.profiles.find((pr) => pr.uid === p.uid);
    if (prof) {
      const reward = calculateMatchReward({
        won: outcome === 'won',
        playerCount: room.players.length,
        hasXpBoost: prof.xpBoostUntil > Date.now(),
        winStreak: prof.winStreak,
      });
      prof.coins = Math.max(0, prof.coins + outcomeObj.netDelta + reward.bonusCoins);
      prof.xp += reward.xpEarned;
      prof.winStreak = outcome === 'won' ? prof.winStreak + 1 : outcome === 'lost' ? 0 : prof.winStreak;
      prof.presenceStatus = 'In Lobby';
      prof.updatedAt = nowIso();

      dbState.matchHistory.unshift({
        id: makeId('mh'),
        userId: prof.uid,
        gameType: 'blackjack',
        mode: room.players.length > 2 ? 'group' : '1v1',
        result: outcome,
        coinsDelta: outcomeObj.netDelta + reward.bonusCoins,
        xpEarned: reward.xpEarned,
        summary: `Blackjack ${room.roomCode} (${evalP.total} vs Dealer ${evaluateBlackjackHand(dealerHand).total})`,
        createdAt: nowIso(),
      });
    }

    return {
      ...p,
      outcome,
      roundScore: evalP.total,
    };
  });

  // Generate IOU if someone lost a snack stake
  const winnerProfile = dbState.profiles.find((p) => p.uid === winnerUid);
  if (winnerProfile) {
    for (const p of updatedPlayers) {
      if (p.uid !== winnerProfile.uid && (p.stakeOffer.snackName || p.stakeOffer.customStake)) {
        const t = nowIso();
        dbState.ious.unshift({
          id: makeId('iou'),
          winnerId: winnerProfile.uid,
          loserId: p.uid,
          winnerName: winnerProfile.username,
          loserName: p.username,
          stakeLabel: formatStakeLabel(p.stakeOffer),
          gameType: 'blackjack',
          settled: false,
          createdAt: t,
          updatedAt: t,
        });
      }
    }
    pushTicker(
      `${winnerProfile.username} won the pot in ${room.players.length}-player Blackjack (${room.roomCode})`,
      'blackjack'
    );
  }

  room.players = updatedPlayers;
  room.status = 'finished';
  room.winnerId = winnerUid;
  room.gameState = {
    ...room.gameState,
    phase: 'resolved',
    dealerHand,
    deck,
    summaryText: `Dealer finished at ${evaluateBlackjackHand(dealerHand).total}. ${winnerProfile?.username || 'Player'} leads the table!`,
  };
  room.updatedAt = nowIso();
}

function advanceBlackjackBots(room: GameRoom) {
  while (
    room.status === 'playing' &&
    room.gameState.phase === 'player_turns' &&
    room.gameState.turnIndex < room.players.length
  ) {
    const activePlayer = room.players[room.gameState.turnIndex];
    if (!activePlayer.isBot) break;

    const deck = [...(room.gameState.deck || [])];
    const hand = [...(activePlayer.hand || [])];
    while (evaluateBlackjackHand(hand).total < 17 && deck.length > 0) {
      hand.push(deck.pop()!);
    }
    const evalHand = evaluateBlackjackHand(hand);
    activePlayer.hand = hand;
    activePlayer.stood = true;
    activePlayer.busted = evalHand.isBust;
    room.gameState.deck = deck;
    room.gameState.turnIndex += 1;
  }

  if (room.gameState.turnIndex >= room.players.length) {
    finalizeBlackjackRoom(room);
  } else {
    room.gameState.turnDeadline = Date.now() + 25000;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // Public ticker endpoint for Landing Page
  app.get('/api/public/ticker', (_req, res) => {
    res.json({ ticker: dbState.ticker.slice(0, 15) });
  });

  // Public leaderboard preview for Landing Page
  app.get('/api/public/leaderboard', (_req, res) => {
    const top = [...dbState.profiles]
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10)
      .map((p) => ({
        uid: p.uid,
        username: p.username,
        xp: p.xp,
        coins: p.coins,
        winStreak: p.winStreak,
      }));
    res.json({ leaderboard: top });
  });

  // Auth: Register with Email + Password + Unique Username
  app.post('/api/auth/register', (req, res) => {
    const { email, password, username } = req.body as {
      email?: string;
      password?: string;
      username?: string;
    };

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUser = (username || '').trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!cleanUser || !/^[a-zA-Z0-9_]{3,20}$/.test(cleanUser)) {
      return res.status(400).json({
        error: 'Username must be 3–20 characters using letters, numbers, or underscores.',
      });
    }

    if (dbState.authUsers.some((u) => u.email === cleanEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    if (
      dbState.profiles.some(
        (p) => p.username.toLowerCase() === cleanUser.toLowerCase()
      )
    ) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const uid = makeId('usr');
    const { salt, hash } = hashPassword(password);
    const t = nowIso();

    dbState.authUsers.push({
      uid,
      email: cleanEmail,
      passwordHash: hash,
      salt,
    });

    const profile: Profile = {
      uid,
      username: cleanUser,
      avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`,
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
      createdAt: t,
      updatedAt: t,
    };

    dbState.profiles.push(profile);
    grantStarterInventory(uid);
    seedUserSocialState(uid, cleanUser);
    saveDatabase(dbState);

    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { uid, token, createdAt: Date.now() });

    res.json({ token, state: getUserStateSnapshot(uid) });
  });

  // Auth: Login with Email & Password
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = dbState.authUsers.find((u) => u.email === cleanEmail);
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const profile = dbState.profiles.find((p) => p.uid === user.uid);
    if (profile) {
      profile.isOnline = true;
      profile.presenceStatus = 'Online';
      profile.updatedAt = nowIso();
      saveDatabase(dbState);
    }

    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { uid: user.uid, token, createdAt: Date.now() });
    res.json({ token, state: getUserStateSnapshot(user.uid) });
  });

  // Auth: Quick Demo Mode (creates instant live multi-device session)
  app.post('/api/auth/demo', (req, res) => {
    const requestedName = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    let username = requestedName && /^[a-zA-Z0-9_]{3,20}$/.test(requestedName)
      ? requestedName
      : `Guest_${crypto.randomInt(1000, 9999)}`;

    while (dbState.profiles.some((p) => p.username.toLowerCase() === username.toLowerCase())) {
      username = `Guest_${crypto.randomInt(1000, 9999)}`;
    }

    const uid = makeId('demo');
    const t = nowIso();
    const profile: Profile = {
      uid,
      username,
      avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
      coins: 750,
      xp: 120,
      winStreak: 0,
      isOnline: true,
      presenceStatus: 'Online',
      equippedCardBack: 'default',
      equippedFelt: 'default',
      equippedFrame: 'default',
      xpBoostUntil: 0,
      lastDailySpin: 0,
      createdAt: t,
      updatedAt: t,
    };

    dbState.profiles.push(profile);
    grantStarterInventory(uid);
    seedUserSocialState(uid, username);
    saveDatabase(dbState);

    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { uid, token, createdAt: Date.now() });
    broadcastEvent('state:refresh', { reason: 'player_joined' });

    res.json({ token, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/auth/logout', requireSession, (req: AuthExpressRequest, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.slice(7).trim();
    sessions.delete(token);
    const prof = dbState.profiles.find((p) => p.uid === req.authUid);
    if (prof) {
      prof.isOnline = false;
      prof.presenceStatus = 'Offline';
      prof.updatedAt = nowIso();
      saveDatabase(dbState);
      broadcastEvent('state:refresh', { reason: 'logout' });
    }
    res.json({ ok: true });
  });

  app.get('/api/state', requireSession, (req: AuthExpressRequest, res) => {
    res.json({ state: getUserStateSnapshot(req.authUid!) });
  });

  // Friends API
  app.post('/api/friends/request', requireSession, (req: AuthExpressRequest, res) => {
    const { friendId } = req.body as { friendId?: string };
    const uid = req.authUid!;
    if (!friendId || friendId === uid) {
      return res.status(400).json({ error: 'Invalid friend selected.' });
    }
    const target = dbState.profiles.find((p) => p.uid === friendId);
    if (!target) {
      return res.status(404).json({ error: 'Player not found.' });
    }
    const existing = dbState.friendships.find(
      (f) =>
        (f.userId === uid && f.friendId === friendId) ||
        (f.userId === friendId && f.friendId === uid)
    );
    if (existing) {
      return res.status(409).json({ error: 'Friend connection or request already exists.' });
    }
    const t = nowIso();
    const friendship: Friendship = {
      id: makeId('fr'),
      userId: uid,
      friendId,
      status: target.isBot ? 'accepted' : 'pending',
      createdAt: t,
      updatedAt: t,
    };
    dbState.friendships.push(friendship);
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'friend_request' }, [uid, friendId]);
    res.json({ friendship, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/friends/accept', requireSession, (req: AuthExpressRequest, res) => {
    const { friendshipId } = req.body as { friendshipId?: string };
    const uid = req.authUid!;
    const fr = dbState.friendships.find((f) => f.id === friendshipId);
    if (!fr || fr.friendId !== uid) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }
    fr.status = 'accepted';
    fr.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'friend_accepted' }, [fr.userId, fr.friendId]);
    res.json({ state: getUserStateSnapshot(uid) });
  });

  app.post('/api/friends/decline', requireSession, (req: AuthExpressRequest, res) => {
    const { friendshipId } = req.body as { friendshipId?: string };
    const uid = req.authUid!;
    const idx = dbState.friendships.findIndex(
      (f) => f.id === friendshipId && (f.userId === uid || f.friendId === uid)
    );
    if (idx === -1) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }
    const removed = dbState.friendships.splice(idx, 1)[0];
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'friend_removed' }, [removed.userId, removed.friendId]);
    res.json({ state: getUserStateSnapshot(uid) });
  });

  // Messages API
  app.post('/api/messages', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const { receiverId, roomId, content, wagerId } = req.body as {
      receiverId?: string;
      roomId?: string;
      content?: string;
      wagerId?: string;
    };
    const cleanContent = (content || '').trim();
    if (!cleanContent || cleanContent.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1–1000 characters.' });
    }
    if (!receiverId && !roomId) {
      return res.status(400).json({ error: 'Recipient or room is required.' });
    }
    const sender = dbState.profiles.find((p) => p.uid === uid);
    if (!sender) return res.status(404).json({ error: 'Sender profile missing.' });

    const msg: ChatMessage = {
      id: makeId('msg'),
      senderId: uid,
      senderName: sender.username,
      receiverId,
      roomId,
      content: cleanContent,
      wagerId,
      reactions: {},
      createdAt: nowIso(),
    };
    dbState.messages.push(msg);

    // If messaging a simulated community friend directly, trigger a friendly contextual response?
    // Wait: real-time guidelines forbid using AI/LLM to fake multi-user behavior, so we only save the real user message!
    saveDatabase(dbState);
    broadcastEvent('chat:message', msg);
    res.json({ message: msg, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/messages/:id/react', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const { emoji } = req.body as { emoji?: string };
    const msg = dbState.messages.find((m) => m.id === req.params.id);
    if (!msg || !emoji) {
      return res.status(404).json({ error: 'Message or emoji missing.' });
    }
    msg.reactions = msg.reactions || {};
    const list = msg.reactions[emoji] || [];
    if (list.includes(uid)) {
      msg.reactions[emoji] = list.filter((x) => x !== uid);
    } else {
      msg.reactions[emoji] = [...list, uid];
    }
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'reaction' });
    res.json({ state: getUserStateSnapshot(uid) });
  });

  // 1v1 Wager Negotiation API
  app.post('/api/wagers', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const { opponentId, creatorOffer, gameType, sendInChat } = req.body as {
      opponentId?: string;
      creatorOffer?: WagerOffer;
      gameType?: GameType;
      sendInChat?: boolean;
    };
    const creator = dbState.profiles.find((p) => p.uid === uid);
    const opponent = dbState.profiles.find((p) => p.uid === opponentId);
    if (!creator || !opponent || creator.uid === opponent.uid) {
      return res.status(400).json({ error: 'Valid opponent is required.' });
    }
    const validGames: GameType[] = ['blackjack', 'highlow', 'roulette', 'dice'];
    const selectedGame = validGames.includes(gameType as GameType) ? (gameType as GameType) : 'blackjack';
    const offer: WagerOffer = {
      snackItemId: creatorOffer?.snackItemId,
      snackName: creatorOffer?.snackName,
      customStake: creatorOffer?.customStake?.trim() || undefined,
      coins: Math.max(0, Math.floor(Number(creatorOffer?.coins || 0))),
    };

    const t = nowIso();
    const wager: Wager = {
      id: makeId('wg'),
      creatorId: creator.uid,
      opponentId: opponent.uid,
      creatorName: creator.username,
      opponentName: opponent.username,
      creatorOffer: offer,
      opponentOffer: opponent.isBot
        ? { snackItemId: 'snack_monday', snackName: 'Monday Snack', coins: offer.coins }
        : { coins: 0 },
      creatorApproved: true,
      opponentApproved: Boolean(opponent.isBot),
      gameType: selectedGame,
      status: opponent.isBot ? 'active' : 'negotiating',
      createdAt: t,
      updatedAt: t,
    };

    if (wager.status === 'active') {
      const room = createRoomInternal(creator, selectedGame, 2, [
        {
          uid: creator.uid,
          username: creator.username,
          avatarUrl: creator.avatarUrl,
          stakeOffer: wager.creatorOffer,
          potApproved: true,
        },
        {
          uid: opponent.uid,
          username: opponent.username,
          avatarUrl: opponent.avatarUrl,
          stakeOffer: wager.opponentOffer,
          potApproved: true,
          isBot: opponent.isBot,
        },
      ]);
      wager.roomId = room.id;
    }

    dbState.wagers.unshift(wager);

    if (sendInChat) {
      dbState.messages.push({
        id: makeId('msg'),
        senderId: creator.uid,
        senderName: creator.username,
        receiverId: opponent.uid,
        content: `Sent a 1v1 ${selectedGame.toUpperCase()} wager invite: ${formatStakeLabel(offer)}`,
        wagerId: wager.id,
        reactions: {},
        createdAt: t,
      });
    }

    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'wager_created' }, [creator.uid, opponent.uid]);
    res.json({ wager, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/wagers/:id/offer', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const wager = dbState.wagers.find((w) => w.id === req.params.id);
    if (!wager || (wager.creatorId !== uid && wager.opponentId !== uid)) {
      return res.status(404).json({ error: 'Wager not found.' });
    }
    if (wager.status !== 'negotiating') {
      return res.status(400).json({ error: 'Wager is no longer in negotiation.' });
    }
    const { offer, approve } = req.body as { offer?: WagerOffer; approve?: boolean };
    const cleanOffer: WagerOffer | undefined = offer
      ? {
          snackItemId: offer.snackItemId,
          snackName: offer.snackName,
          customStake: offer.customStake?.trim() || undefined,
          coins: Math.max(0, Math.floor(Number(offer.coins || 0))),
        }
      : undefined;

    if (uid === wager.creatorId) {
      if (cleanOffer) {
        wager.creatorOffer = cleanOffer;
        wager.opponentApproved = false;
      }
      if (typeof approve === 'boolean') wager.creatorApproved = approve;
    } else {
      if (cleanOffer) {
        wager.opponentOffer = cleanOffer;
        wager.creatorApproved = false;
      }
      if (typeof approve === 'boolean') wager.opponentApproved = approve;
    }

    if (wager.creatorApproved && wager.opponentApproved) {
      const creator = dbState.profiles.find((p) => p.uid === wager.creatorId)!;
      const opponent = dbState.profiles.find((p) => p.uid === wager.opponentId)!;
      const room = createRoomInternal(creator, wager.gameType, 2, [
        {
          uid: creator.uid,
          username: creator.username,
          avatarUrl: creator.avatarUrl,
          stakeOffer: wager.creatorOffer,
          potApproved: true,
        },
        {
          uid: opponent.uid,
          username: opponent.username,
          avatarUrl: opponent.avatarUrl,
          stakeOffer: wager.opponentOffer,
          potApproved: true,
          isBot: opponent.isBot,
        },
      ]);
      wager.status = 'active';
      wager.roomId = room.id;
    }

    wager.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'wager_updated' }, [wager.creatorId, wager.opponentId]);
    res.json({ wager, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/wagers/:id/cancel', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const wager = dbState.wagers.find((w) => w.id === req.params.id);
    if (!wager || (wager.creatorId !== uid && wager.opponentId !== uid)) {
      return res.status(404).json({ error: 'Wager not found.' });
    }
    if (wager.status === 'completed' || wager.status === 'cancelled') {
      return res.status(400).json({ error: 'Wager already finalized.' });
    }
    wager.status = 'cancelled';
    wager.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'wager_cancelled' }, [wager.creatorId, wager.opponentId]);
    res.json({ wager, state: getUserStateSnapshot(uid) });
  });

  function createRoomInternal(
    host: Profile,
    gameType: GameType,
    maxPlayers: number,
    initialPlayers?: RoomPlayer[]
  ): GameRoom {
    const t = nowIso();
    let code = makeRoomCode();
    while (dbState.rooms.some((r) => r.roomCode === code)) {
      code = makeRoomCode();
    }
    const players: RoomPlayer[] = initialPlayers || [
      {
        uid: host.uid,
        username: host.username,
        avatarUrl: host.avatarUrl,
        stakeOffer: { coins: 50 },
        potApproved: false,
      },
    ];
    const room: GameRoom = {
      id: makeId('rm'),
      roomCode: code,
      hostId: host.uid,
      gameType,
      maxPlayers: Math.min(8, Math.max(2, maxPlayers)),
      status: 'waiting',
      players,
      playerIds: players.map((p) => p.uid),
      gameState: {
        phase: 'lobby',
        turnIndex: 0,
        turnDeadline: 0,
      },
      createdAt: t,
      updatedAt: t,
    };
    dbState.rooms.unshift(room);
    return room;
  }

  // Rooms & Matchmaking API
  app.post('/api/rooms', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const host = dbState.profiles.find((p) => p.uid === uid);
    if (!host) return res.status(404).json({ error: 'Profile not found.' });
    const { gameType, maxPlayers } = req.body as { gameType?: GameType; maxPlayers?: number };
    const validGames: GameType[] = ['blackjack', 'highlow', 'roulette', 'dice'];
    const g = validGames.includes(gameType as GameType) ? (gameType as GameType) : 'blackjack';
    const room = createRoomInternal(host, g, Number(maxPlayers || 4));
    host.presenceStatus = 'In Lobby';
    host.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'room_created' });
    res.json({ room, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/rooms/join', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const player = dbState.profiles.find((p) => p.uid === uid);
    if (!player) return res.status(404).json({ error: 'Profile not found.' });
    const { roomId, roomCode } = req.body as { roomId?: string; roomCode?: string };
    const cleanCode = (roomCode || '').trim().toUpperCase();
    const room = dbState.rooms.find(
      (r) => (roomId && r.id === roomId) || (cleanCode && r.roomCode === cleanCode)
    );
    if (!room) {
      return res.status(404).json({ error: 'Room not found. Check the 6-character code.' });
    }
    if (!room.playerIds.includes(uid)) {
      if (room.status !== 'waiting') {
        return res.status(400).json({ error: 'This match is already underway.' });
      }
      if (room.players.length >= room.maxPlayers) {
        return res.status(400).json({ error: 'Room is full.' });
      }
      room.players.push({
        uid: player.uid,
        username: player.username,
        avatarUrl: player.avatarUrl,
        stakeOffer: { coins: 50 },
        potApproved: false,
      });
      room.playerIds.push(player.uid);
      room.updatedAt = nowIso();
    }
    player.presenceStatus = 'In Lobby';
    player.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'room_joined', roomId: room.id });
    res.json({ room, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/rooms/quick-match', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const player = dbState.profiles.find((p) => p.uid === uid);
    if (!player) return res.status(404).json({ error: 'Profile not found.' });
    const { gameType } = req.body as { gameType?: GameType };
    const preferredGame = gameType || 'blackjack';

    let room = dbState.rooms.find(
      (r) =>
        r.status === 'waiting' &&
        r.players.length < r.maxPlayers &&
        (!gameType || r.gameType === gameType) &&
        !r.playerIds.includes(uid)
    );

    if (!room) {
      // Auto-pair into an existing waiting room or create one with an online friend
      const onlineFriend = dbState.profiles.find((p) => p.uid !== uid && p.isOnline);
      const initial: RoomPlayer[] = [
        {
          uid: player.uid,
          username: player.username,
          avatarUrl: player.avatarUrl,
          stakeOffer: { coins: 50 },
          potApproved: false,
        },
      ];
      if (onlineFriend) {
        initial.push({
          uid: onlineFriend.uid,
          username: onlineFriend.username,
          avatarUrl: onlineFriend.avatarUrl,
          stakeOffer: { snackItemId: 'snack_egg', snackName: 'Egg', coins: 50 },
          potApproved: true,
          isBot: onlineFriend.isBot,
        });
      }
      room = createRoomInternal(player, preferredGame, 4, initial);
    } else {
      room.players.push({
        uid: player.uid,
        username: player.username,
        avatarUrl: player.avatarUrl,
        stakeOffer: { coins: 50 },
        potApproved: false,
      });
      room.playerIds.push(player.uid);
      room.updatedAt = nowIso();
    }

    player.presenceStatus = 'In Lobby';
    player.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'quick_match', roomId: room.id });
    res.json({ room, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/rooms/:id/add-friend', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const room = dbState.rooms.find((r) => r.id === req.params.id);
    if (!room || !room.playerIds.includes(uid)) {
      return res.status(404).json({ error: 'Room not found.' });
    }
    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'Cannot add players after match starts.' });
    }
    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: 'Room is already at max capacity.' });
    }
    const { friendId } = req.body as { friendId?: string };
    const target = dbState.profiles.find((p) => p.uid === friendId);
    if (!target) return res.status(404).json({ error: 'Player not found.' });
    if (room.playerIds.includes(target.uid)) {
      return res.status(400).json({ error: 'Player is already in this room.' });
    }
    room.players.push({
      uid: target.uid,
      username: target.username,
      avatarUrl: target.avatarUrl,
      stakeOffer: { snackItemId: 'snack_monday', snackName: 'Monday Snack', coins: 50 },
      potApproved: Boolean(target.isBot),
      isBot: target.isBot,
    });
    room.playerIds.push(target.uid);
    room.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'room_player_added', roomId: room.id });
    res.json({ room, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/rooms/:id/stake', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const room = dbState.rooms.find((r) => r.id === req.params.id);
    if (!room || !room.playerIds.includes(uid)) {
      return res.status(404).json({ error: 'Room not found.' });
    }
    const { stakeOffer, approvePot } = req.body as {
      stakeOffer?: WagerOffer;
      approvePot?: boolean;
    };
    const seat = room.players.find((p) => p.uid === uid);
    if (!seat) return res.status(404).json({ error: 'Seat not found.' });

    if (stakeOffer) {
      seat.stakeOffer = {
        snackItemId: stakeOffer.snackItemId,
        snackName: stakeOffer.snackName,
        customStake: stakeOffer.customStake?.trim() || undefined,
        coins: Math.max(0, Math.floor(Number(stakeOffer.coins || 0))),
      };
      // Reset others' pot approval only if stake changed by another player? Keep simple: changing own stake leaves potApproved boolean up to explicit action
    }
    if (typeof approvePot === 'boolean') {
      seat.potApproved = approvePot;
    }
    room.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'room_stake_updated', roomId: room.id });
    res.json({ room, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/rooms/:id/start', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const room = dbState.rooms.find((r) => r.id === req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (room.hostId !== uid) {
      return res.status(403).json({ error: 'Only the room host can start the round.' });
    }
    if (room.players.length < 2) {
      return res.status(400).json({ error: 'At least 2 players are needed to start.' });
    }
    if (room.players.some((p) => !p.potApproved)) {
      return res.status(400).json({ error: 'All players must click Approve Pot before starting.' });
    }

    room.status = 'playing';
    room.winnerId = undefined;
    for (const p of room.players) {
      const prof = dbState.profiles.find((pr) => pr.uid === p.uid);
      if (prof) {
        prof.presenceStatus = 'In Game';
        prof.updatedAt = nowIso();
      }
    }

    const deck = shuffleDeck(createDeck());
    if (room.gameType === 'blackjack') {
      const dealerHand: Card[] = [deck.pop()!, deck.pop()!];
      room.players = room.players.map((p) => {
        const hand: Card[] = [deck.pop()!, deck.pop()!];
        const evalH = evaluateBlackjackHand(hand);
        return {
          ...p,
          hand,
          stood: evalH.isBlackjack,
          doubled: false,
          busted: false,
          blackjack: evalH.isBlackjack,
          outcome: 'pending',
        };
      });
      room.gameState = {
        phase: 'player_turns',
        turnIndex: 0,
        turnDeadline: Date.now() + 25000,
        dealerHand,
        deck,
        summaryText: 'Round started — play your hand before the turn timer expires.',
      };
      advanceBlackjackBots(room);
    } else if (room.gameType === 'highlow') {
      const current = deck.pop()!;
      room.players = room.players.map((p) => ({
        ...p,
        roundBetChoice: undefined,
        outcome: 'pending',
      }));
      room.gameState = {
        phase: 'player_turns',
        turnIndex: 0,
        turnDeadline: Date.now() + 25000,
        highLowCurrent: current,
        deck,
        summaryText: `Current card is ${current.rank}${current.suit}. Lock in Higher or Lower!`,
      };
    } else if (room.gameType === 'roulette') {
      room.players = room.players.map((p) => ({
        ...p,
        roundBetChoice: undefined,
        outcome: 'pending',
      }));
      room.gameState = {
        phase: 'player_turns',
        turnIndex: 0,
        turnDeadline: Date.now() + 25000,
        summaryText: 'Place your Roulette calls (Red, Black, Even, Odd, or Number) to spin.',
      };
    } else {
      room.players = room.players.map((p) => ({
        ...p,
        roundBetChoice: undefined,
        outcome: 'pending',
      }));
      room.gameState = {
        phase: 'player_turns',
        turnIndex: 0,
        turnDeadline: Date.now() + 25000,
        summaryText: 'Pick Under 7, Lucky 7, Over 7, or Doubles and roll the dice.',
      };
    }

    room.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'room_started', roomId: room.id });
    res.json({ room, state: getUserStateSnapshot(uid) });
  });

  app.post('/api/rooms/:id/action', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const room = dbState.rooms.find((r) => r.id === req.params.id);
    if (!room || !room.playerIds.includes(uid)) {
      return res.status(404).json({ error: 'Room not found.' });
    }
    const { action, choice } = req.body as { action?: string; choice?: string };

    if (action === 'rematch' && room.hostId === uid && room.status === 'finished') {
      room.status = 'waiting';
      room.winnerId = undefined;
      room.players = room.players.map((p) => ({
        ...p,
        potApproved: Boolean(p.isBot),
        hand: undefined,
        stood: false,
        doubled: false,
        busted: false,
        blackjack: false,
        roundBetChoice: undefined,
        outcome: undefined,
      }));
      room.gameState = { phase: 'lobby', turnIndex: 0, turnDeadline: 0 };
      room.updatedAt = nowIso();
      saveDatabase(dbState);
      broadcastEvent('state:refresh', { reason: 'room_rematch', roomId: room.id });
      return res.json({ room, state: getUserStateSnapshot(uid) });
    }

    if (room.status !== 'playing') {
      return res.status(400).json({ error: 'Match is not active.' });
    }

    if (room.gameType === 'blackjack') {
      const currentSeat = room.players[room.gameState.turnIndex];
      if (!currentSeat || currentSeat.uid !== uid) {
        return res.status(400).json({ error: 'Not your turn.' });
      }
      const deck = [...(room.gameState.deck || [])];
      const hand = [...(currentSeat.hand || [])];

      if (action === 'hit') {
        if (deck.length > 0) hand.push(deck.pop()!);
        const ev = evaluateBlackjackHand(hand);
        currentSeat.hand = hand;
        currentSeat.busted = ev.isBust;
        if (ev.isBust || ev.total === 21) {
          currentSeat.stood = true;
          room.gameState.turnIndex += 1;
        }
      } else if (action === 'stand') {
        currentSeat.stood = true;
        room.gameState.turnIndex += 1;
      } else if (action === 'double') {
        currentSeat.doubled = true;
        if (deck.length > 0) hand.push(deck.pop()!);
        const ev = evaluateBlackjackHand(hand);
        currentSeat.hand = hand;
        currentSeat.busted = ev.isBust;
        currentSeat.stood = true;
        room.gameState.turnIndex += 1;
      }

      room.gameState.deck = deck;
      advanceBlackjackBots(room);
    } else if (room.gameType === 'highlow') {
      const seat = room.players.find((p) => p.uid === uid);
      if (!seat) return res.status(404).json({ error: 'Seat not found.' });
      seat.roundBetChoice = choice === 'lower' ? 'lower' : 'higher';

      // Auto-fill bot guesses
      for (const p of room.players) {
        if (p.isBot && !p.roundBetChoice) {
          p.roundBetChoice = Math.random() > 0.5 ? 'higher' : 'lower';
        }
      }

      if (room.players.every((p) => Boolean(p.roundBetChoice))) {
        const deck = [...(room.gameState.deck || [])];
        const nextCard = deck.pop() || { suit: '♠', rank: 'A' };
        const currentCard = room.gameState.highLowCurrent!;
        let winnerUid = room.players[0].uid;

        room.players = room.players.map((p) => {
          const outcome = compareHighLow(
            currentCard,
            nextCard,
            p.roundBetChoice === 'lower' ? 'lower' : 'higher'
          );
          const stake = Math.max(25, p.stakeOffer.coins || 50);
          const delta = outcome === 'win' ? stake : outcome === 'lose' ? -stake : 0;
          if (outcome === 'win') winnerUid = p.uid;
          const prof = dbState.profiles.find((pr) => pr.uid === p.uid);
          if (prof) {
            const reward = calculateMatchReward({
              won: outcome === 'win',
              playerCount: room.players.length,
              hasXpBoost: prof.xpBoostUntil > Date.now(),
              winStreak: prof.winStreak,
            });
            prof.coins = Math.max(0, prof.coins + delta + reward.bonusCoins);
            prof.xp += reward.xpEarned;
            prof.winStreak = outcome === 'win' ? prof.winStreak + 1 : 0;
            prof.presenceStatus = 'In Lobby';
            prof.updatedAt = nowIso();
          }
          return {
            ...p,
            outcome: outcome === 'win' ? 'won' : outcome === 'push' ? 'push' : 'lost',
          };
        });

        const winnerProf = dbState.profiles.find((p) => p.uid === winnerUid);
        if (winnerProf) {
          pushTicker(`${winnerProf.username} called High-Low (${nextCard.rank}${nextCard.suit}) in room ${room.roomCode}`, 'highlow');
        }
        room.status = 'finished';
        room.winnerId = winnerUid;
        room.gameState = {
          ...room.gameState,
          phase: 'resolved',
          highLowNext: nextCard,
          deck,
          summaryText: `Drew ${nextCard.rank}${nextCard.suit} after ${currentCard.rank}${currentCard.suit}!`,
        };
      }
    } else if (room.gameType === 'roulette') {
      const seat = room.players.find((p) => p.uid === uid);
      if (!seat) return res.status(404).json({ error: 'Seat not found.' });
      seat.roundBetChoice = choice || 'red';

      for (const p of room.players) {
        if (p.isBot && !p.roundBetChoice) {
          p.roundBetChoice = Math.random() > 0.5 ? 'red' : 'black';
        }
      }

      if (room.players.every((p) => Boolean(p.roundBetChoice))) {
        const resultNumber = crypto.randomInt(0, 37);
        let winnerUid = room.players[0].uid;

        room.players = room.players.map((p) => {
          const betStr = p.roundBetChoice || 'red';
          const isNum = betStr.startsWith('num:');
          const betType: RouletteBetType = isNum ? 'number' : (betStr as RouletteBetType);
          const betVal = isNum ? Number(betStr.slice(4)) : null;
          const stake = Math.max(25, p.stakeOffer.coins || 50);
          const resObj = resolveRouletteBet(betType, betVal, resultNumber, stake);
          if (resObj.won) winnerUid = p.uid;
          const prof = dbState.profiles.find((pr) => pr.uid === p.uid);
          if (prof) {
            const reward = calculateMatchReward({
              won: resObj.won,
              playerCount: room.players.length,
              hasXpBoost: prof.xpBoostUntil > Date.now(),
              winStreak: prof.winStreak,
            });
            prof.coins = Math.max(0, prof.coins + resObj.netDelta + reward.bonusCoins);
            prof.xp += reward.xpEarned;
            prof.winStreak = resObj.won ? prof.winStreak + 1 : 0;
            prof.presenceStatus = 'In Lobby';
            prof.updatedAt = nowIso();
          }
          return { ...p, outcome: resObj.won ? 'won' : 'lost' };
        });

        const winnerProf = dbState.profiles.find((p) => p.uid === winnerUid);
        if (winnerProf) {
          pushTicker(`${winnerProf.username} hit Roulette #${resultNumber} in room ${room.roomCode}`, 'roulette');
        }
        room.status = 'finished';
        room.winnerId = winnerUid;
        room.gameState = {
          ...room.gameState,
          phase: 'resolved',
          rouletteResult: resultNumber,
          summaryText: `Ball landed on ${resultNumber}!`,
        };
      }
    } else if (room.gameType === 'dice') {
      const seat = room.players.find((p) => p.uid === uid);
      if (!seat) return res.status(404).json({ error: 'Seat not found.' });
      seat.roundBetChoice = choice || 'over7';

      for (const p of room.players) {
        if (p.isBot && !p.roundBetChoice) {
          p.roundBetChoice = Math.random() > 0.5 ? 'over7' : 'under7';
        }
      }

      if (room.players.every((p) => Boolean(p.roundBetChoice))) {
        const d1 = crypto.randomInt(1, 7);
        const d2 = crypto.randomInt(1, 7);
        let winnerUid = room.players[0].uid;

        room.players = room.players.map((p) => {
          const pred = (p.roundBetChoice || 'over7') as DicePrediction;
          const stake = Math.max(25, p.stakeOffer.coins || 50);
          const resObj = resolveDiceBet(pred, d1, d2, stake);
          if (resObj.won) winnerUid = p.uid;
          const prof = dbState.profiles.find((pr) => pr.uid === p.uid);
          if (prof) {
            const reward = calculateMatchReward({
              won: resObj.won,
              playerCount: room.players.length,
              hasXpBoost: prof.xpBoostUntil > Date.now(),
              winStreak: prof.winStreak,
            });
            prof.coins = Math.max(0, prof.coins + resObj.netDelta + reward.bonusCoins);
            prof.xp += reward.xpEarned;
            prof.winStreak = resObj.won ? prof.winStreak + 1 : 0;
            prof.presenceStatus = 'In Lobby';
            prof.updatedAt = nowIso();
          }
          return { ...p, outcome: resObj.won ? 'won' : 'lost' };
        });

        const winnerProf = dbState.profiles.find((p) => p.uid === winnerUid);
        if (winnerProf) {
          pushTicker(`${winnerProf.username} rolled ${d1} + ${d2} (${d1 + d2}) in Dice Roll (${room.roomCode})`, 'dice');
        }
        room.status = 'finished';
        room.winnerId = winnerUid;
        room.gameState = {
          ...room.gameState,
          phase: 'resolved',
          diceResult: [d1, d2],
          summaryText: `Rolled ${d1} + ${d2} = ${d1 + d2}!`,
        };
      }
    }

    room.updatedAt = nowIso();
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'room_action', roomId: room.id });
    res.json({ room, state: getUserStateSnapshot(uid) });
  });

  // Shop & Inventory API
  app.post('/api/shop/buy', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const { itemId } = req.body as { itemId?: string };
    const profile = dbState.profiles.find((p) => p.uid === uid);
    const catalogItem = SNACK_AND_SHOP_CATALOG.find((i) => i.id === itemId);
    if (!profile || !catalogItem) {
      return res.status(404).json({ error: 'Shop item not found.' });
    }
    if (profile.coins < catalogItem.price) {
      return res.status(400).json({ error: `Not enough Coins. Need ${catalogItem.price} Coins.` });
    }
    profile.coins -= catalogItem.price;
    profile.updatedAt = nowIso();

    if (catalogItem.itemType === 'booster') {
      profile.xpBoostUntil = Math.max(Date.now(), profile.xpBoostUntil) + 24 * 60 * 60 * 1000;
    }

    const existing = dbState.inventory.find(
      (inv) => inv.userId === uid && inv.itemId === catalogItem.id
    );
    if (existing) {
      existing.quantity += 1;
      existing.updatedAt = nowIso();
    } else {
      dbState.inventory.push({
        id: makeId('inv'),
        userId: uid,
        itemId: catalogItem.id,
        itemName: catalogItem.name,
        itemType: catalogItem.itemType,
        quantity: 1,
        equipped: false,
        updatedAt: nowIso(),
      });
    }

    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'shop_purchase' }, [uid]);
    res.json({ state: getUserStateSnapshot(uid) });
  });

  app.post('/api/shop/equip', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const { itemId } = req.body as { itemId?: string };
    const profile = dbState.profiles.find((p) => p.uid === uid);
    const catalogItem = SNACK_AND_SHOP_CATALOG.find((i) => i.id === itemId);
    const owned = dbState.inventory.find((i) => i.userId === uid && i.itemId === itemId && i.quantity > 0);
    if (!profile || !catalogItem || !owned) {
      return res.status(404).json({ error: 'Item not owned.' });
    }

    if (catalogItem.cosmeticSlot === 'cardBack') {
      profile.equippedCardBack = catalogItem.id;
    } else if (catalogItem.cosmeticSlot === 'felt') {
      profile.equippedFelt = catalogItem.id;
    } else if (catalogItem.cosmeticSlot === 'frame') {
      profile.equippedFrame = catalogItem.id;
    }
    for (const inv of dbState.inventory) {
      if (inv.userId === uid) {
        const meta = SNACK_AND_SHOP_CATALOG.find((c) => c.id === inv.itemId);
        if (meta?.cosmeticSlot && meta.cosmeticSlot === catalogItem.cosmeticSlot) {
          inv.equipped = inv.itemId === catalogItem.id;
          inv.updatedAt = nowIso();
        }
      }
    }
    profile.updatedAt = nowIso();
    saveDatabase(dbState);
    res.json({ state: getUserStateSnapshot(uid) });
  });

  // Daily Wheel Spin API
  app.post('/api/wheel/spin', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const profile = dbState.profiles.find((p) => p.uid === uid);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const cooldownMs = 24 * 60 * 60 * 1000;
    if (profile.lastDailySpin && Date.now() - profile.lastDailySpin < cooldownMs) {
      return res.status(400).json({ error: 'Daily Wheel already spun today. Come back tomorrow!' });
    }

    const { index, segment } = pickWheelSegment();
    profile.lastDailySpin = Date.now();
    if (segment.rewardType === 'coins') {
      profile.coins += segment.amount;
    } else if (segment.rewardType === 'booster') {
      profile.xpBoostUntil = Math.max(Date.now(), profile.xpBoostUntil) + 24 * 60 * 60 * 1000;
    } else if (segment.rewardType === 'snack' && segment.snackId && segment.snackName) {
      const existing = dbState.inventory.find(
        (i) => i.userId === uid && i.itemId === segment.snackId
      );
      if (existing) {
        existing.quantity += 1;
        existing.updatedAt = nowIso();
      } else {
        dbState.inventory.push({
          id: makeId('inv'),
          userId: uid,
          itemId: segment.snackId,
          itemName: segment.snackName,
          itemType: 'snack',
          quantity: 1,
          equipped: false,
          updatedAt: nowIso(),
        });
      }
    }
    profile.updatedAt = nowIso();
    saveDatabase(dbState);
    res.json({ index, segment, state: getUserStateSnapshot(uid) });
  });

  // IOU Settlement API
  app.post('/api/ious/:id/settle', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const iou = dbState.ious.find((i) => i.id === req.params.id);
    if (!iou) return res.status(404).json({ error: 'IOU entry not found.' });
    if (iou.winnerId !== uid) {
      return res.status(403).json({ error: 'Only the winner can mark this snack as Delivered / Settled.' });
    }
    iou.settled = true;
    iou.updatedAt = nowIso();
    pushTicker(`${iou.winnerName} settled a ${iou.stakeLabel} wager with ${iou.loserName}`, iou.gameType);
    saveDatabase(dbState);
    broadcastEvent('state:refresh', { reason: 'iou_settled' }, [iou.winnerId, iou.loserId]);
    res.json({ iou, state: getUserStateSnapshot(uid) });
  });

  // Solo Practice Complete API (records coins, XP, match history)
  app.post('/api/solo/complete', requireSession, (req: AuthExpressRequest, res) => {
    const uid = req.authUid!;
    const profile = dbState.profiles.find((p) => p.uid === uid);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    const { gameType, result, coinsDelta, summary } = req.body as {
      gameType?: GameType;
      result?: 'won' | 'lost' | 'push';
      coinsDelta?: number;
      summary?: string;
    };
    const validGames: GameType[] = ['blackjack', 'highlow', 'roulette', 'dice'];
    const g = validGames.includes(gameType as GameType) ? (gameType as GameType) : 'blackjack';
    const r = result === 'won' || result === 'lost' || result === 'push' ? result : 'push';
    const safeDelta = Math.max(-5000, Math.min(50000, Math.round(Number(coinsDelta || 0))));

    const reward = calculateMatchReward({
      won: r === 'won',
      playerCount: 1,
      hasXpBoost: profile.xpBoostUntil > Date.now(),
      winStreak: profile.winStreak,
    });

    profile.coins = Math.max(0, profile.coins + safeDelta + reward.bonusCoins);
    profile.xp += reward.xpEarned;
    profile.winStreak = r === 'won' ? profile.winStreak + 1 : r === 'lost' ? 0 : profile.winStreak;
    profile.updatedAt = nowIso();

    dbState.matchHistory.unshift({
      id: makeId('mh'),
      userId: uid,
      gameType: g,
      mode: 'solo',
      result: r,
      coinsDelta: safeDelta + reward.bonusCoins,
      xpEarned: reward.xpEarned,
      summary: (summary || `${g} solo round`).slice(0, 160),
      createdAt: nowIso(),
    });

    if (r === 'won' && safeDelta >= 100) {
      pushTicker(`${profile.username} won +${safeDelta + reward.bonusCoins} Coins in Solo ${g}`, g);
    }

    saveDatabase(dbState);
    res.json({ xpEarned: reward.xpEarned, state: getUserStateSnapshot(uid) });
  });

  // Vite Dev Middleware or Production Static Assets
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    wsClients.set(ws, { uid: null });

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(String(raw)) as {
          type?: string;
          token?: string;
          receiverId?: string;
          roomId?: string;
          isTyping?: boolean;
        };
        if (parsed.type === 'auth' && parsed.token) {
          const sess = sessions.get(parsed.token);
          if (sess) {
            wsClients.set(ws, { uid: sess.uid });
            ws.send(JSON.stringify({ event: 'ws:ready', payload: { uid: sess.uid } }));
          }
        } else if (parsed.type === 'typing') {
          const meta = wsClients.get(ws);
          if (meta?.uid) {
            const prof = dbState.profiles.find((p) => p.uid === meta.uid);
            broadcastEvent('typing:indicator', {
              senderId: meta.uid,
              senderName: prof?.username || 'Player',
              receiverId: parsed.receiverId,
              roomId: parsed.roomId,
              isTyping: Boolean(parsed.isTyping),
            });
          }
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SnackStakes server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
