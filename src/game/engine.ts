import type { Card, VipTier } from '../types/snackstakes';
import { DAILY_WHEEL_SEGMENTS, type WheelSegment } from '../data/catalog';

// ===========================
// VIP Tier & XP Progression
// ===========================

export function getVipTier(xp: number): VipTier {
  if (xp >= 6500) return 'VIP';
  if (xp >= 3000) return 'Diamond';
  if (xp >= 1200) return 'Gold';
  if (xp >= 400) return 'Silver';
  return 'Bronze';
}

export interface LevelInfo {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  vipTier: VipTier;
}

export function calculateLevelInfo(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
  const currentThreshold = (level - 1) * (level - 1) * 100;
  const nextThreshold = level * level * 100;
  const span = Math.max(1, nextThreshold - currentThreshold);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((safeXp - currentThreshold) / span) * 100)));

  return {
    level,
    currentLevelXp: safeXp - currentThreshold,
    nextLevelXp: span,
    progressPercent,
    vipTier: getVipTier(safeXp),
  };
}

export function calculateMatchReward(params: {
  won: boolean;
  playerCount: number;
  hasXpBoost: boolean;
  winStreak: number;
}): { xpEarned: number; bonusCoins: number; groupMultiplier: number } {
  const { won, playerCount, hasXpBoost, winStreak } = params;
  const groupMultiplier =
    playerCount >= 6 ? 3.0 : playerCount >= 3 ? 2.25 : playerCount === 2 ? 1.5 : 1.0;

  const baseXp = won ? 60 : 15;
  const streakBonus = won ? Math.min(winStreak, 5) * 10 : 0;
  const boostMultiplier = hasXpBoost ? 2 : 1;
  const xpEarned = Math.round((baseXp * groupMultiplier + streakBonus) * boostMultiplier);
  const bonusCoins = won ? Math.round(25 * groupMultiplier) : 0;

  return { xpEarned, bonusCoins, groupMultiplier };
}

// ===========================
// Deck & Blackjack Engine
// ===========================

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const RANKS: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getCardRankNumber(rank: Card['rank']): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return Number(rank);
}

export interface BlackjackEvaluation {
  total: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export function evaluateBlackjackHand(cards: Card[]): BlackjackEvaluation {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (card.rank === 'K' || card.rank === 'Q' || card.rank === 'J') {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return {
    total,
    isSoft: aces > 0,
    isBust: total > 21,
    isBlackjack: cards.length === 2 && total === 21,
  };
}

export function dealerShouldHit(dealerCards: Card[]): boolean {
  const evalResult = evaluateBlackjackHand(dealerCards);
  return evalResult.total < 17;
}

export function resolveBlackjackOutcome(
  playerCards: Card[],
  dealerCards: Card[],
  betAmount: number,
  doubled = false
): { result: 'blackjack' | 'win' | 'lose' | 'push'; payout: number; netDelta: number } {
  const p = evaluateBlackjackHand(playerCards);
  const d = evaluateBlackjackHand(dealerCards);
  const effectiveBet = doubled ? betAmount * 2 : betAmount;

  if (p.isBust) {
    return { result: 'lose', payout: 0, netDelta: -effectiveBet };
  }
  if (p.isBlackjack && !d.isBlackjack) {
    const winAmount = Math.round(effectiveBet * 1.5);
    return { result: 'blackjack', payout: effectiveBet + winAmount, netDelta: winAmount };
  }
  if (d.isBlackjack && !p.isBlackjack) {
    return { result: 'lose', payout: 0, netDelta: -effectiveBet };
  }
  if (p.isBlackjack && d.isBlackjack) {
    return { result: 'push', payout: effectiveBet, netDelta: 0 };
  }
  if (d.isBust || p.total > d.total) {
    return { result: 'win', payout: effectiveBet * 2, netDelta: effectiveBet };
  }
  if (p.total === d.total) {
    return { result: 'push', payout: effectiveBet, netDelta: 0 };
  }
  return { result: 'lose', payout: 0, netDelta: -effectiveBet };
}

// ===========================
// High-Low Duel Engine
// ===========================

export function compareHighLow(
  current: Card,
  next: Card,
  guess: 'higher' | 'lower'
): 'win' | 'lose' | 'push' {
  const curVal = getCardRankNumber(current.rank);
  const nextVal = getCardRankNumber(next.rank);
  if (nextVal === curVal) return 'push';
  if (guess === 'higher') return nextVal > curVal ? 'win' : 'lose';
  return nextVal < curVal ? 'win' : 'lose';
}

export function highLowMultiplier(streak: number): number {
  return Number((1.4 + Math.min(streak, 6) * 0.35).toFixed(2));
}

// ===========================
// Roulette Engine (European 0-36)
// ===========================

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function getRouletteColor(num: number): 'green' | 'red' | 'black' {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
}

export type RouletteBetType = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'number';

export function resolveRouletteBet(
  betType: RouletteBetType,
  betValue: number | null,
  resultNumber: number,
  stake: number
): { won: boolean; payout: number; netDelta: number } {
  const color = getRouletteColor(resultNumber);
  let won = false;
  let multiplier = 0;

  if (betType === 'red' && color === 'red') {
    won = true;
    multiplier = 2;
  } else if (betType === 'black' && color === 'black') {
    won = true;
    multiplier = 2;
  } else if (betType === 'even' && resultNumber !== 0 && resultNumber % 2 === 0) {
    won = true;
    multiplier = 2;
  } else if (betType === 'odd' && resultNumber % 2 === 1) {
    won = true;
    multiplier = 2;
  } else if (betType === 'low' && resultNumber >= 1 && resultNumber <= 18) {
    won = true;
    multiplier = 2;
  } else if (betType === 'high' && resultNumber >= 19 && resultNumber <= 36) {
    won = true;
    multiplier = 2;
  } else if (betType === 'number' && betValue !== null && resultNumber === betValue) {
    won = true;
    multiplier = 36;
  }

  const payout = won ? stake * multiplier : 0;
  return { won, payout, netDelta: payout - stake };
}

// ===========================
// Dice Roll Engine (2d6)
// ===========================

export type DicePrediction = 'under7' | 'exact7' | 'over7' | 'doubles';

export function resolveDiceBet(
  prediction: DicePrediction,
  die1: number,
  die2: number,
  stake: number
): { won: boolean; sum: number; payout: number; netDelta: number } {
  const sum = die1 + die2;
  let won = false;
  let multiplier = 0;

  if (prediction === 'under7' && sum < 7) {
    won = true;
    multiplier = 2;
  } else if (prediction === 'over7' && sum > 7) {
    won = true;
    multiplier = 2;
  } else if (prediction === 'exact7' && sum === 7) {
    won = true;
    multiplier = 5;
  } else if (prediction === 'doubles' && die1 === die2) {
    won = true;
    multiplier = 5;
  }

  const payout = won ? stake * multiplier : 0;
  return { won, sum, payout, netDelta: payout - stake };
}

// ===========================
// Daily Wheel Spin
// ===========================

export function pickWheelSegment(rng: () => number = Math.random): {
  index: number;
  segment: WheelSegment;
} {
  const index = Math.floor(rng() * DAILY_WHEEL_SEGMENTS.length) % DAILY_WHEEL_SEGMENTS.length;
  return { index, segment: DAILY_WHEEL_SEGMENTS[index] };
}

// ===========================
// Subtle Web Audio Synth FX
// ===========================

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.05) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio errors in headless environments
  }
}

export function playCardSound() {
  playTone(320, 70, 'triangle', 0.04);
}

export function playWinChime() {
  playTone(523.25, 110, 'sine', 0.05);
  setTimeout(() => playTone(659.25, 120, 'sine', 0.05), 90);
  setTimeout(() => playTone(783.99, 180, 'sine', 0.05), 180);
}

export function playLoseTone() {
  playTone(220, 140, 'triangle', 0.04);
  setTimeout(() => playTone(165, 190, 'triangle', 0.04), 110);
}
