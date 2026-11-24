import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevelInfo,
  calculateMatchReward,
  compareHighLow,
  createDeck,
  dealerShouldHit,
  evaluateBlackjackHand,
  getRouletteColor,
  getVipTier,
  pickWheelSegment,
  resolveBlackjackOutcome,
  resolveDiceBet,
  resolveRouletteBet,
  shuffleDeck,
} from './engine';

test('VIP tier thresholds and level progression calculate accurately', () => {
  assert.equal(getVipTier(0), 'Bronze');
  assert.equal(getVipTier(400), 'Silver');
  assert.equal(getVipTier(1200), 'Gold');
  assert.equal(getVipTier(3000), 'Diamond');
  assert.equal(getVipTier(6500), 'VIP');

  const lvl1 = calculateLevelInfo(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.progressPercent, 0);

  const lvl2 = calculateLevelInfo(100);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.vipTier, 'Bronze');

  const boostedGroupWin = calculateMatchReward({
    won: true,
    playerCount: 4,
    hasXpBoost: true,
    winStreak: 3,
  });
  assert.equal(boostedGroupWin.groupMultiplier, 2.25);
  // (60 * 2.25 + 30) * 2 = 330 XP
  assert.equal(boostedGroupWin.xpEarned, 330);
});

test('Deck creation and deterministic shuffle preserve 52 unique cards', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  const shuffled = shuffleDeck(deck, () => 0.42);
  assert.equal(shuffled.length, 52);
  const unique = new Set(shuffled.map((c) => `${c.rank}${c.suit}`));
  assert.equal(unique.size, 52);
});

test('Blackjack evaluates soft aces, busts, naturals, and dealer hit rules', () => {
  const bj = evaluateBlackjackHand([
    { suit: '♠', rank: 'A' },
    { suit: '♥', rank: 'K' },
  ]);
  assert.equal(bj.total, 21);
  assert.equal(bj.isBlackjack, true);
  assert.equal(bj.isBust, false);

  const softAce = evaluateBlackjackHand([
    { suit: '♠', rank: 'A' },
    { suit: '♦', rank: '6' },
    { suit: '♣', rank: '9' },
  ]);
  assert.equal(softAce.total, 16);
  assert.equal(softAce.isSoft, false);
  assert.equal(softAce.isBust, false);

  assert.equal(dealerShouldHit([{ suit: '♠', rank: '10' }, { suit: '♥', rank: '6' }]), true);
  assert.equal(dealerShouldHit([{ suit: '♠', rank: '10' }, { suit: '♥', rank: '7' }]), false);

  const naturalWin = resolveBlackjackOutcome(
    [{ suit: '♠', rank: 'A' }, { suit: '♥', rank: 'Q' }],
    [{ suit: '♣', rank: '10' }, { suit: '♦', rank: '9' }],
    100
  );
  assert.equal(naturalWin.result, 'blackjack');
  assert.equal(naturalWin.netDelta, 150);

  const doubledWin = resolveBlackjackOutcome(
    [{ suit: '♠', rank: '10' }, { suit: '♥', rank: '9' }],
    [{ suit: '♣', rank: '10' }, { suit: '♦', rank: '8' }],
    100,
    true
  );
  assert.equal(doubledWin.result, 'win');
  assert.equal(doubledWin.netDelta, 200);
});

test('High-Low duel compares card ranks including Ace-high and pushes on ties', () => {
  assert.equal(
    compareHighLow({ suit: '♠', rank: '9' }, { suit: '♥', rank: 'A' }, 'higher'),
    'win'
  );
  assert.equal(
    compareHighLow({ suit: '♠', rank: 'K' }, { suit: '♥', rank: '5' }, 'lower'),
    'win'
  );
  assert.equal(
    compareHighLow({ suit: '♠', rank: '8' }, { suit: '♦', rank: '8' }, 'higher'),
    'push'
  );
});

test('Roulette color mapping and straight/outside payouts are exact', () => {
  assert.equal(getRouletteColor(0), 'green');
  assert.equal(getRouletteColor(17), 'black');
  assert.equal(getRouletteColor(32), 'red');

  const straightWin = resolveRouletteBet('number', 17, 17, 50);
  assert.equal(straightWin.won, true);
  assert.equal(straightWin.payout, 1800);
  assert.equal(straightWin.netDelta, 1750);

  const redLossOnZero = resolveRouletteBet('red', null, 0, 50);
  assert.equal(redLossOnZero.won, false);
  assert.equal(redLossOnZero.netDelta, -50);
});

test('Dice roll resolves under7, exact7, over7, and doubles payouts', () => {
  const exact7 = resolveDiceBet('exact7', 3, 4, 40);
  assert.equal(exact7.won, true);
  assert.equal(exact7.payout, 200);

  const doubles = resolveDiceBet('doubles', 6, 6, 30);
  assert.equal(doubles.won, true);
  assert.equal(doubles.payout, 150);

  const under7Loss = resolveDiceBet('under7', 4, 5, 50);
  assert.equal(under7Loss.won, false);
  assert.equal(under7Loss.netDelta, -50);
});

test('Daily wheel spin selects valid segment index', () => {
  const { index, segment } = pickWheelSegment(() => 0.5);
  assert.ok(index >= 0 && index < 8);
  assert.ok(segment.label.length > 0);
});
