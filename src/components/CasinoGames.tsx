import React, { useEffect, useState } from 'react';
import { Dices, Flame, RotateCcw, Spade, Timer } from 'lucide-react';
import {
  compareHighLow,
  createDeck,
  dealerShouldHit,
  evaluateBlackjackHand,
  getRouletteColor,
  highLowMultiplier,
  playCardSound,
  playLoseTone,
  playWinChime,
  resolveBlackjackOutcome,
  resolveDiceBet,
  resolveRouletteBet,
  shuffleDeck,
  type DicePrediction,
  type RouletteBetType,
} from '../game/engine';
import type { Card, GameRoom, GameType, Profile } from '../types/snackstakes';
import { PlayingCard } from './PlayingCard';

interface SoloProps {
  profile: Profile;
  initialGame?: GameType;
  onCompleteSoloRound: (payload: {
    gameType: GameType;
    result: 'won' | 'lost' | 'push';
    coinsDelta: number;
    summary: string;
  }) => Promise<void>;
}

export const SoloCasinoArena: React.FC<SoloProps> = ({
  profile,
  initialGame = 'blackjack',
  onCompleteSoloRound,
}) => {
  const [selectedGame, setSelectedGame] = useState<GameType>(initialGame);
  const [stake, setStake] = useState<number>(50);

  // Blackjack solo state
  const [bjDeck, setBjDeck] = useState<Card[]>([]);
  const [bjPlayer, setBjPlayer] = useState<Card[]>([]);
  const [bjDealer, setBjDealer] = useState<Card[]>([]);
  const [bjPhase, setBjPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [bjDoubled, setBjDoubled] = useState(false);
  const [bjMessage, setBjMessage] = useState('Place a coin stake and deal to practice.');

  // High-Low solo state
  const [hlDeck, setHlDeck] = useState<Card[]>(() => shuffleDeck(createDeck()));
  const [hlCurrent, setHlCurrent] = useState<Card>(() => ({ suit: '♠', rank: '7' }));
  const [hlNext, setHlNext] = useState<Card | null>(null);
  const [hlStreak, setHlStreak] = useState(0);
  const [hlMessage, setHlMessage] = useState('Predict whether the next card is Higher or Lower.');

  // Roulette solo state
  const [rBetType, setRBetType] = useState<RouletteBetType>('red');
  const [rBetNum, setRBetNum] = useState<number>(17);
  const [rSpinning, setRSpinning] = useState(false);
  const [rRotation, setRRotation] = useState(0);
  const [rResult, setRResult] = useState<number | null>(null);
  const [rMessage, setRMessage] = useState('Pick a color, parity, or lucky number and spin.');

  // Dice solo state
  const [dPred, setDPred] = useState<DicePrediction>('over7');
  const [diceVals, setDiceVals] = useState<[number, number]>([4, 5]);
  const [dRolling, setDRolling] = useState(false);
  const [dMessage, setDMessage] = useState('Choose a sum prediction and roll 2d6.');

  const feltBg =
    profile.equippedFelt === 'cosmetic_crimson_felt'
      ? 'from-[#2A1015] to-[#131822]'
      : 'from-[#0D281E] to-[#131822]';

  // --- Blackjack handlers ---
  const dealBlackjack = () => {
    if (profile.coins < stake) {
      setBjMessage('Insufficient Coins for this stake.');
      return;
    }
    const deck = shuffleDeck(createDeck());
    const pHand = [deck.pop()!, deck.pop()!];
    const dHand = [deck.pop()!, deck.pop()!];
    playCardSound();
    setBjDeck(deck);
    setBjPlayer(pHand);
    setBjDealer(dHand);
    setBjDoubled(false);

    const pEval = evaluateBlackjackHand(pHand);
    if (pEval.isBlackjack) {
      finishBlackjack(pHand, dHand, deck, false);
    } else {
      setBjPhase('playing');
      setBjMessage(`Your hand is ${pEval.total}. Hit, Stand, or Double Down.`);
    }
  };

  const finishBlackjack = async (
    pHand: Card[],
    dHand: Card[],
    deck: Card[],
    doubled: boolean
  ) => {
    const finalDealer = [...dHand];
    const workDeck = [...deck];
    const pEval = evaluateBlackjackHand(pHand);
    if (!pEval.isBust) {
      while (dealerShouldHit(finalDealer) && workDeck.length > 0) {
        finalDealer.push(workDeck.pop()!);
      }
    }
    setBjDealer(finalDealer);
    setBjDeck(workDeck);
    setBjPhase('done');

    const res = resolveBlackjackOutcome(pHand, finalDealer, stake, doubled);
    const dTotal = evaluateBlackjackHand(finalDealer).total;

    if (res.result === 'blackjack' || res.result === 'win') {
      playWinChime();
      setBjMessage(
        `${res.result === 'blackjack' ? 'Blackjack!' : 'You won!'} ${pEval.total} vs Dealer ${dTotal} (+${res.netDelta} Coins)`
      );
      await onCompleteSoloRound({
        gameType: 'blackjack',
        result: 'won',
        coinsDelta: res.netDelta,
        summary: `Solo Blackjack win (${pEval.total} vs ${dTotal})`,
      });
    } else if (res.result === 'push') {
      setBjMessage(`Push at ${pEval.total}. Stake returned.`);
      await onCompleteSoloRound({
        gameType: 'blackjack',
        result: 'push',
        coinsDelta: 0,
        summary: `Solo Blackjack push (${pEval.total})`,
      });
    } else {
      playLoseTone();
      setBjMessage(
        `${pEval.isBust ? 'Bust!' : 'Dealer wins.'} ${pEval.total} vs Dealer ${dTotal} (${res.netDelta} Coins)`
      );
      await onCompleteSoloRound({
        gameType: 'blackjack',
        result: 'lost',
        coinsDelta: res.netDelta,
        summary: `Solo Blackjack loss (${pEval.total} vs ${dTotal})`,
      });
    }
  };

  const hitBlackjack = () => {
    if (bjPhase !== 'playing' || bjDeck.length === 0) return;
    const nextDeck = [...bjDeck];
    const nextHand = [...bjPlayer, nextDeck.pop()!];
    playCardSound();
    setBjDeck(nextDeck);
    setBjPlayer(nextHand);
    const ev = evaluateBlackjackHand(nextHand);
    if (ev.isBust || ev.total === 21) {
      void finishBlackjack(nextHand, bjDealer, nextDeck, bjDoubled);
    } else {
      setBjMessage(`Hand total: ${ev.total}. Hit or Stand?`);
    }
  };

  const doubleBlackjack = () => {
    if (bjPhase !== 'playing' || bjDeck.length === 0 || bjPlayer.length !== 2) return;
    const nextDeck = [...bjDeck];
    const nextHand = [...bjPlayer, nextDeck.pop()!];
    playCardSound();
    setBjDeck(nextDeck);
    setBjPlayer(nextHand);
    setBjDoubled(true);
    void finishBlackjack(nextHand, bjDealer, nextDeck, true);
  };

  // --- High-Low handler ---
  const playHighLow = async (guess: 'higher' | 'lower') => {
    let deck = [...hlDeck];
    if (deck.length < 4) deck = shuffleDeck(createDeck());
    const next = deck.pop()!;
    playCardSound();
    setHlNext(next);
    setHlDeck(deck);

    const outcome = compareHighLow(hlCurrent, next, guess);
    if (outcome === 'win') {
      const nextStreak = hlStreak + 1;
      const mult = highLowMultiplier(hlStreak);
      const gain = Math.round(stake * (mult - 1));
      setHlStreak(nextStreak);
      playWinChime();
      setHlMessage(`Correct! ${next.rank}${next.suit} (${mult}x streak). +${gain} Coins`);
      await onCompleteSoloRound({
        gameType: 'highlow',
        result: 'won',
        coinsDelta: gain,
        summary: `High-Low call (${hlCurrent.rank} -> ${next.rank})`,
      });
    } else if (outcome === 'push') {
      setHlMessage(`Tie on ${next.rank}${next.suit}! Stake returned.`);
      await onCompleteSoloRound({
        gameType: 'highlow',
        result: 'push',
        coinsDelta: 0,
        summary: `High-Low push on ${next.rank}`,
      });
    } else {
      setHlStreak(0);
      playLoseTone();
      setHlMessage(`Missed! Drew ${next.rank}${next.suit}. -${stake} Coins`);
      await onCompleteSoloRound({
        gameType: 'highlow',
        result: 'lost',
        coinsDelta: -stake,
        summary: `High-Low miss (${hlCurrent.rank} -> ${next.rank})`,
      });
    }
    setHlCurrent(next);
  };

  // --- Roulette handler ---
  const spinRoulette = () => {
    if (rSpinning) return;
    if (profile.coins < stake) {
      setRMessage('Insufficient Coins for this bet.');
      return;
    }
    setRSpinning(true);
    const winningNum = Math.floor(Math.random() * 37);
    const extraSpin = 1080 + winningNum * (360 / 37);
    setRRotation((prev) => prev + extraSpin);
    playCardSound();

    setTimeout(async () => {
      setRSpinning(false);
      setRResult(winningNum);
      const color = getRouletteColor(winningNum);
      const res = resolveRouletteBet(
        rBetType,
        rBetType === 'number' ? rBetNum : null,
        winningNum,
        stake
      );
      if (res.won) {
        playWinChime();
        setRMessage(`Ball landed on ${winningNum} (${color.toUpperCase()})! +${res.netDelta} Coins`);
      } else {
        playLoseTone();
        setRMessage(`Ball landed on ${winningNum} (${color.toUpperCase()}). -${stake} Coins`);
      }
      await onCompleteSoloRound({
        gameType: 'roulette',
        result: res.won ? 'won' : 'lost',
        coinsDelta: res.netDelta,
        summary: `Roulette spin #${winningNum} (${rBetType})`,
      });
    }, 900);
  };

  // --- Dice handler ---
  const rollDice = () => {
    if (dRolling) return;
    if (profile.coins < stake) {
      setDMessage('Insufficient Coins for this roll.');
      return;
    }
    setDRolling(true);
    playCardSound();
    setTimeout(async () => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setDiceVals([d1, d2]);
      setDRolling(false);
      const res = resolveDiceBet(dPred, d1, d2, stake);
      if (res.won) {
        playWinChime();
        setDMessage(`Rolled ${d1} + ${d2} = ${res.sum}! Won +${res.netDelta} Coins`);
      } else {
        playLoseTone();
        setDMessage(`Rolled ${d1} + ${d2} = ${res.sum}. -${stake} Coins`);
      }
      await onCompleteSoloRound({
        gameType: 'dice',
        result: res.won ? 'won' : 'lost',
        coinsDelta: res.netDelta,
        summary: `Dice Roll ${d1}+${d2}=${res.sum}`,
      });
    }, 550);
  };

  const bjPlayerEval = evaluateBlackjackHand(bjPlayer);
  const bjDealerEval = evaluateBlackjackHand(bjDealer);

  return (
    <div className="bg-[#131822] border border-white/8 rounded-2xl overflow-hidden">
      {/* Header + Game Switcher */}
      <div className="px-6 py-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white font-display">
            Solo Practice &amp; Quick Casino Lounge
          </h2>
          <p className="text-xs text-slate-400">
            Test strategies against the house and earn Coins + XP
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0E14] border border-white/8">
            {(
              [
                ['blackjack', 'Blackjack'],
                ['highlow', 'High-Low'],
                ['roulette', 'Roulette'],
                ['dice', 'Dice'],
              ] as Array<[GameType, string]>
            ).map(([g, label]) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGame(g)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedGame === g
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-white/8 text-xs">
            <span className="text-slate-400">Stake:</span>
            {[25, 50, 100, 250].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setStake(amt)}
                className={`px-2 py-0.5 rounded font-mono tabular-nums cursor-pointer ${
                  stake === amt
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Canvas */}
      <div className={`p-6 bg-gradient-to-b ${feltBg} min-h-[320px] flex flex-col justify-between`}>
        {selectedGame === 'blackjack' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-300 font-medium">
                  Dealer Hand{' '}
                  <span className="font-mono tabular-nums text-amber-300">
                    {bjPhase === 'done' ? `(${bjDealerEval.total})` : bjDealer.length ? '(?)' : ''}
                  </span>
                </p>
                <div className="flex items-center gap-2.5 min-h-[96px]">
                  {bjDealer.length === 0 ? (
                    <div className="h-24 px-5 rounded-lg border border-dashed border-white/15 flex items-center text-xs text-slate-400">
                      Ready to deal
                    </div>
                  ) : (
                    bjDealer.map((c, idx) => (
                      <PlayingCard
                        key={`d-${idx}`}
                        card={c}
                        faceDown={bjPhase === 'playing' && idx === 1}
                        cardBackSkin={profile.equippedCardBack}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-300 font-medium">
                  Your Hand{' '}
                  <span className="font-mono tabular-nums text-emerald-300">
                    {bjPlayer.length > 0 ? `(${bjPlayerEval.total})` : ''}
                  </span>
                </p>
                <div className="flex items-center gap-2.5 min-h-[96px]">
                  {bjPlayer.length === 0 ? (
                    <div className="h-24 px-5 rounded-lg border border-dashed border-white/15 flex items-center text-xs text-slate-400">
                      Click Deal Hand
                    </div>
                  ) : (
                    bjPlayer.map((c, idx) => <PlayingCard key={`p-${idx}`} card={c} />)
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-white font-medium">{bjMessage}</p>
              <div className="flex items-center gap-2.5">
                {bjPhase !== 'playing' ? (
                  <button
                    type="button"
                    onClick={dealBlackjack}
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Spade className="w-4 h-4" />
                    {bjPhase === 'done' ? 'Deal New Hand' : 'Deal Hand'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={hitBlackjack}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Hit
                    </button>
                    <button
                      type="button"
                      onClick={() => finishBlackjack(bjPlayer, bjDealer, bjDeck, bjDoubled)}
                      className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                    >
                      Stand
                    </button>
                    {bjPlayer.length === 2 && (
                      <button
                        type="button"
                        onClick={doubleBlackjack}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        Double Down
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedGame === 'highlow' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-8">
              <div className="space-y-2">
                <p className="text-xs text-slate-300">Current Card</p>
                <PlayingCard card={hlCurrent} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-300">Last Draw</p>
                <PlayingCard
                  card={hlNext || undefined}
                  faceDown={!hlNext}
                  cardBackSkin={profile.equippedCardBack}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Active Streak Multiplier</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                  {highLowMultiplier(hlStreak)}x
                </p>
                <p className="text-xs text-slate-400 tabular-nums">Streak: {hlStreak}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-white font-medium">{hlMessage}</p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => playHighLow('higher')}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Flame className="w-4 h-4" />
                  Higher
                </button>
                <button
                  type="button"
                  onClick={() => playHighLow('lower')}
                  className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Lower
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedGame === 'roulette' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Wheel Visual */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <div
                  className="w-36 h-36 rounded-full border-4 border-amber-500/70 bg-[conic-gradient(#065f46_0deg_12deg,#dc2626_12deg_24deg,#0f172a_24deg_36deg,#dc2626_36deg_48deg,#0f172a_48deg_60deg,#dc2626_60deg_72deg,#0f172a_72deg_84deg,#dc2626_84deg_96deg,#0f172a_96deg_108deg,#dc2626_108deg_120deg,#0f172a_120deg_132deg,#dc2626_132deg_144deg,#0f172a_144deg_156deg,#dc2626_156deg_168deg,#0f172a_168deg_180deg,#dc2626_180deg_192deg,#0f172a_192deg_204deg,#dc2626_204deg_216deg,#0f172a_216deg_228deg,#dc2626_228deg_240deg,#0f172a_240deg_252deg,#dc2626_252deg_264deg,#0f172a_264deg_276deg,#dc2626_276deg_288deg,#0f172a_288deg_300deg,#dc2626_300deg_312deg,#0f172a_312deg_324deg,#dc2626_324deg_336deg,#0f172a_336deg_348deg,#dc2626_348deg_360deg)] transition-transform duration-700 ease-out"
                  style={{ transform: `rotate(${rRotation}deg)` }}
                />
                <div className="absolute inset-5 rounded-full bg-[#0B0E14] border border-white/15 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-400">Result</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-white">
                    {rResult !== null ? rResult : '—'}
                  </span>
                </div>
              </div>

              {/* Bet Controls */}
              <div className="flex-1 space-y-3 w-full">
                <p className="text-xs text-slate-300">Select Bet Call</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(
                    [
                      ['red', 'Red (2x)'],
                      ['black', 'Black (2x)'],
                      ['even', 'Even (2x)'],
                      ['odd', 'Odd (2x)'],
                      ['low', '1–18 (2x)'],
                      ['high', '19–36 (2x)'],
                    ] as Array<[RouletteBetType, string]>
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRBetType(type)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                        rBetType === type
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-[#0B0E14]/80 text-slate-300 border-white/10 hover:border-white/25'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setRBetType('number')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                      rBetType === 'number'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#0B0E14]/80 text-slate-300 border-white/10'
                    }`}
                  >
                    Straight Number (35:1)
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={36}
                    aria-label="Roulette number 0 to 36"
                    value={rBetNum}
                    onChange={(e) => {
                      setRBetType('number');
                      setRBetNum(Math.min(36, Math.max(0, Number(e.target.value || 0))));
                    }}
                    className="w-20 px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-white font-medium">{rMessage}</p>
              <button
                type="button"
                disabled={rSpinning}
                onClick={spinRoulette}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold cursor-pointer"
              >
                {rSpinning ? 'Spinning...' : 'Spin Wheel'}
              </button>
            </div>
          </div>
        )}

        {selectedGame === 'dice' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-4">
                {diceVals.map((val, i) => (
                  <div
                    key={i}
                    className={`w-16 h-16 rounded-xl bg-white text-slate-950 font-mono text-2xl font-extrabold flex items-center justify-center shadow-lg transition-transform duration-200 ${
                      dRolling ? 'scale-90 opacity-75' : 'scale-100'
                    }`}
                  >
                    {val}
                  </div>
                ))}
                <div className="pl-2">
                  <p className="text-xs text-slate-400">Total Sum</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                    {diceVals[0] + diceVals[1]}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    ['under7', 'Under 7 (2x)'],
                    ['exact7', 'Lucky 7 (5x)'],
                    ['over7', 'Over 7 (2x)'],
                    ['doubles', 'Doubles (5x)'],
                  ] as Array<[DicePrediction, string]>
                ).map(([pred, label]) => (
                  <button
                    key={pred}
                    type="button"
                    onClick={() => setDPred(pred)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                      dPred === pred
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-[#0B0E14]/80 text-slate-300 border-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-white font-medium">{dMessage}</p>
              <button
                type="button"
                disabled={dRolling}
                onClick={rollDice}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Dices className="w-4 h-4" />
                {dRolling ? 'Rolling...' : 'Roll 2d6'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface RoomTableProps {
  room: GameRoom;
  currentUid: string;
  profile: Profile;
  onAction: (action: string, choice?: string) => Promise<void>;
}

export const MultiplayerRoomTable: React.FC<RoomTableProps> = ({
  room,
  currentUid,
  profile,
  onAction,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(25);
  const [rouletteNum, setRouletteNum] = useState(17);

  useEffect(() => {
    if (room.status !== 'playing' || !room.gameState.turnDeadline) return;
    const update = () => {
      const rem = Math.max(0, Math.ceil((room.gameState.turnDeadline - Date.now()) / 1000));
      setSecondsLeft(rem);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [room.status, room.gameState.turnDeadline]);

  const activeSeat = room.players[room.gameState.turnIndex];
  const isMyBjTurn =
    room.gameType === 'blackjack' &&
    room.status === 'playing' &&
    activeSeat?.uid === currentUid;
  const mySeat = room.players.find((p) => p.uid === currentUid);

  return (
    <div className="bg-gradient-to-b from-[#0D281E] to-[#131822] border border-emerald-500/25 rounded-2xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white capitalize font-display">
            Live {room.gameType === 'highlow' ? 'High-Low Duel' : room.gameType} Table
          </h3>
          <p className="text-xs text-emerald-300 mt-0.5">
            {room.gameState.summaryText || 'Table active'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {room.status === 'playing' && (
            <div className="px-3 py-1.5 rounded-lg bg-[#0B0E14]/80 border border-white/10 flex items-center gap-1.5 text-xs font-mono tabular-nums text-amber-300">
              <Timer className="w-3.5 h-3.5" />
              {secondsLeft}s
            </div>
          )}
          {room.status === 'finished' && room.hostId === currentUid && (
            <button
              type="button"
              onClick={() => onAction('rematch')}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Round
            </button>
          )}
        </div>
      </div>

      {/* Game-Specific Board */}
      {room.gameType === 'blackjack' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Dealer{' '}
              <span className="font-mono tabular-nums text-amber-300">
                {room.status === 'finished' && room.gameState.dealerHand
                  ? `(${evaluateBlackjackHand(room.gameState.dealerHand).total})`
                  : '(?)'}
              </span>
            </p>
            <div className="flex items-center gap-2">
              {(room.gameState.dealerHand || []).map((c, i) => (
                <PlayingCard
                  key={`rd-${i}`}
                  card={c}
                  faceDown={room.status === 'playing' && i === 1}
                  cardBackSkin={profile.equippedCardBack}
                  compact
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {room.players.map((p, idx) => {
              const ev = p.hand ? evaluateBlackjackHand(p.hand) : null;
              const isTurn = room.status === 'playing' && room.gameState.turnIndex === idx;
              return (
                <div
                  key={p.uid}
                  className={`p-4 rounded-xl bg-[#0B0E14]/80 border ${
                    isTurn ? 'border-emerald-400' : 'border-white/10'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      {p.username} {p.uid === currentUid ? '(You)' : ''}
                    </span>
                    <span className="font-mono tabular-nums text-emerald-300">
                      {ev ? `${ev.total}${ev.isBust ? ' BUST' : ev.isBlackjack ? ' BJ' : ''}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(p.hand || []).map((c, ci) => (
                      <PlayingCard key={`${p.uid}-${ci}`} card={c} compact />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {p.stakeOffer.snackName || p.stakeOffer.customStake || `${p.stakeOffer.coins} Coins`}
                    </span>
                    {p.outcome && p.outcome !== 'pending' && (
                      <span
                        className={
                          p.outcome === 'won'
                            ? 'text-emerald-400 font-bold uppercase'
                            : p.outcome === 'push'
                              ? 'text-amber-300 font-bold uppercase'
                              : 'text-red-400 font-bold uppercase'
                        }
                      >
                        {p.outcome}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isMyBjTurn && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onAction('hit')}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Hit
              </button>
              <button
                type="button"
                onClick={() => onAction('stand')}
                className="px-5 py-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
              >
                Stand
              </button>
              {(mySeat?.hand?.length || 0) === 2 && (
                <button
                  type="button"
                  onClick={() => onAction('double')}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Double Down
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {room.gameType === 'highlow' && (
        <div className="space-y-5">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-300 mb-1.5">Current Card</p>
              <PlayingCard card={room.gameState.highLowCurrent} />
            </div>
            <div>
              <p className="text-xs text-slate-300 mb-1.5">Next Card</p>
              <PlayingCard
                card={room.gameState.highLowNext}
                faceDown={!room.gameState.highLowNext}
                cardBackSkin={profile.equippedCardBack}
              />
            </div>
          </div>
          {room.status === 'playing' && !mySeat?.roundBetChoice && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onAction('guess', 'higher')}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Call Higher
              </button>
              <button
                type="button"
                onClick={() => onAction('guess', 'lower')}
                className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Call Lower
              </button>
            </div>
          )}
        </div>
      )}

      {room.gameType === 'roulette' && (
        <div className="space-y-4">
          {room.gameState.rouletteResult !== undefined && (
            <p className="text-lg font-bold font-mono text-amber-300">
              Winning Number: {room.gameState.rouletteResult}
            </p>
          )}
          {room.status === 'playing' && !mySeat?.roundBetChoice && (
            <div className="flex flex-wrap items-center gap-2">
              {['red', 'black', 'even', 'odd', 'low', 'high'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onAction('bet', c)}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase cursor-pointer"
                >
                  {c}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={rouletteNum}
                  onChange={(e) => setRouletteNum(Math.min(36, Math.max(0, Number(e.target.value || 0))))}
                  className="w-16 px-2 py-1.5 rounded bg-[#0B0E14] border border-white/15 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() => onAction('bet', `num:${rouletteNum}`)}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Bet #{rouletteNum}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {room.gameType === 'dice' && (
        <div className="space-y-4">
          {room.gameState.diceResult && (
            <div className="flex items-center gap-3">
              {room.gameState.diceResult.map((d, i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-lg bg-white text-slate-950 font-mono text-xl font-extrabold flex items-center justify-center"
                >
                  {d}
                </div>
              ))}
            </div>
          )}
          {room.status === 'playing' && !mySeat?.roundBetChoice && (
            <div className="flex flex-wrap items-center gap-2">
              {[
                ['under7', 'Under 7 (2x)'],
                ['exact7', 'Lucky 7 (5x)'],
                ['over7', 'Over 7 (2x)'],
                ['doubles', 'Doubles (5x)'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onAction('roll', key)}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Non-blackjack Player Outcome Strip */}
      {room.gameType !== 'blackjack' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {room.players.map((p) => (
            <div
              key={p.uid}
              className="p-3 rounded-lg bg-[#0B0E14]/75 border border-white/10 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white truncate">{p.username}</span>
                {p.outcome && p.outcome !== 'pending' && (
                  <span
                    className={
                      p.outcome === 'won'
                        ? 'text-emerald-400 font-bold uppercase'
                        : p.outcome === 'push'
                          ? 'text-amber-300 font-bold uppercase'
                          : 'text-red-400 font-bold uppercase'
                    }
                  >
                    {p.outcome}
                  </span>
                )}
              </div>
              <p className="text-slate-400 truncate">
                Call: {p.roundBetChoice || 'Waiting...'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
