export type GameType = 'blackjack' | 'highlow' | 'roulette' | 'dice';

export type VipTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'VIP';

export type PresenceStatus = 'Online' | 'In Lobby' | 'In Game' | 'Offline';

export interface Profile {
  uid: string;
  username: string;
  avatarUrl: string;
  coins: number;
  xp: number;
  winStreak: number;
  isOnline: boolean;
  presenceStatus: PresenceStatus;
  equippedCardBack: string;
  equippedFelt: string;
  equippedFrame: string;
  xpBoostUntil: number;
  lastDailySpin: number;
  createdAt: string;
  updatedAt: string;
  isBot?: boolean;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  itemType: 'snack' | 'cosmetic' | 'booster';
  quantity: number;
  equipped: boolean;
  updatedAt: string;
}

export interface WagerOffer {
  snackItemId?: string;
  snackName?: string;
  customStake?: string;
  coins: number;
}

export interface Wager {
  id: string;
  creatorId: string;
  opponentId: string;
  creatorName?: string;
  opponentName?: string;
  creatorOffer: WagerOffer;
  opponentOffer: WagerOffer;
  creatorApproved: boolean;
  opponentApproved: boolean;
  gameType: GameType;
  status: 'negotiating' | 'active' | 'completed' | 'cancelled';
  winnerId?: string;
  roomId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}

export interface RoomPlayer {
  uid: string;
  username: string;
  avatarUrl: string;
  stakeOffer: WagerOffer;
  potApproved: boolean;
  isBot?: boolean;
  hand?: Card[];
  stood?: boolean;
  doubled?: boolean;
  busted?: boolean;
  blackjack?: boolean;
  roundBetChoice?: string;
  roundScore?: number;
  outcome?: 'won' | 'lost' | 'push' | 'pending';
}

export interface RoomGameState {
  phase: 'lobby' | 'dealing' | 'player_turns' | 'dealer_turn' | 'resolved';
  turnIndex: number;
  turnDeadline: number;
  dealerHand?: Card[];
  deck?: Card[];
  highLowCurrent?: Card;
  highLowNext?: Card;
  rouletteResult?: number;
  diceResult?: [number, number];
  summaryText?: string;
}

export interface GameRoom {
  id: string;
  roomCode: string;
  hostId: string;
  gameType: GameType;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  players: RoomPlayer[];
  playerIds: string[];
  gameState: RoomGameState;
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  roomId?: string;
  content: string;
  wagerId?: string;
  reactions?: Record<string, string[]>;
  createdAt: string;
}

export interface IouEntry {
  id: string;
  winnerId: string;
  loserId: string;
  winnerName: string;
  loserName: string;
  stakeLabel: string;
  gameType: GameType;
  settled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchHistoryEntry {
  id: string;
  userId: string;
  gameType: GameType;
  mode: 'solo' | '1v1' | 'group';
  result: 'won' | 'lost' | 'push';
  coinsDelta: number;
  xpEarned: number;
  summary: string;
  createdAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  subtitle: string;
  itemType: 'snack' | 'cosmetic' | 'booster';
  cosmeticSlot?: 'cardBack' | 'felt' | 'frame';
  price: number;
  imageUrl?: string;
  accentColor: string;
  tag: string;
}

export interface TickerItem {
  id: string;
  text: string;
  gameType: GameType;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'friend_request' | 'wager_invite' | 'message' | 'iou';
  title: string;
  detail: string;
  actionTab: 'home' | 'friends' | 'messages' | 'rooms' | 'ledger';
  targetId?: string;
  createdAt: string;
}
