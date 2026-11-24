import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Crown,
  Dices,
  Flame,
  Spade,
  Trophy,
  Utensils,
} from 'lucide-react';
import { GAME_META, HERO_LOUNGE_IMAGE, INITIAL_TICKER_ITEMS } from '../data/catalog';
import { serverApi } from '../lib/snackApi';
import type { Card, GameType, TickerItem } from '../types/snackstakes';
import { evaluateBlackjackHand } from '../game/engine';

interface Props {
  onOpenAuth: (tab: 'login' | 'signup') => void;
  onQuickDemo: () => void;
}

const PREVIEW_DEALER: Card[] = [
  { suit: '♠', rank: 'K' },
  { suit: '♦', rank: '7' },
];

export const LandingPage: React.FC<Props> = ({ onOpenAuth, onQuickDemo }) => {
  const [ticker, setTicker] = useState<TickerItem[]>(INITIAL_TICKER_ITEMS);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ uid: string; username: string; xp: number; coins: number; winStreak: number }>
  >([]);
  const [heroPlayerHand, setHeroPlayerHand] = useState<Card[]>([
    { suit: '♥', rank: 'A' },
    { suit: '♣', rank: '8' },
  ]);
  const [heroStanding, setHeroStanding] = useState(false);

  useEffect(() => {
    serverApi.getPublicLandingData().then((data) => {
      if (data.ticker.length > 0) setTicker(data.ticker);
      if (data.leaderboard.length > 0) setLeaderboard(data.leaderboard);
    });
  }, []);

  const heroEval = evaluateBlackjackHand(heroPlayerHand);

  const handleHeroHit = () => {
    if (heroStanding || heroEval.isBust) {
      setHeroPlayerHand([
        { suit: '♥', rank: 'A' },
        { suit: '♣', rank: '8' },
      ]);
      setHeroStanding(false);
      return;
    }
    const nextCards = [
      { suit: '♦' as const, rank: '2' as const },
      { suit: '♠' as const, rank: '10' as const },
      { suit: '♥' as const, rank: '5' as const },
    ];
    const nextCard = nextCards[(heroPlayerHand.length - 2) % nextCards.length];
    setHeroPlayerHand([...heroPlayerHand, nextCard]);
  };

  const gameList: Array<{ key: GameType; icon: React.ReactNode }> = [
    { key: 'blackjack', icon: <Spade className="w-5 h-5 text-emerald-400" /> },
    { key: 'highlow', icon: <Flame className="w-5 h-5 text-amber-400" /> },
    { key: 'roulette', icon: <Crown className="w-5 h-5 text-orange-400" /> },
    { key: 'dice', icon: <Dices className="w-5 h-5 text-emerald-400" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col">
      {/* Top Navigation Bar (3-zone contract) */}
      <header className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-md border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            className="text-xl font-extrabold tracking-tight text-white font-display whitespace-nowrap shrink-0"
          >
            Snack<span className="text-emerald-400">Stakes</span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300"
          >
            <a
              href="#how-it-works"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#games"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Games
            </a>
            <a
              href="#leaderboard"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Leaderboard
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Live Win Ticker Bar */}
      <div className="border-b border-white/8 bg-[#131822]/80 overflow-hidden py-2.5">
        <div className="animate-ticker flex items-center gap-10 px-6 text-xs text-slate-300">
          {[...ticker, ...ticker].map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-2 whitespace-nowrap shrink-0">
              <span className="text-amber-400 font-semibold">LIVE WIN</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium text-emerald-400 tracking-wide">
                1v1 Duels · 3–8 Player Group Pots · Live IOU Food Ledger
              </p>
              <h1
                className="font-display font-bold text-white tracking-tight leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.65rem)', textWrap: 'balance' }}
              >
                Play Casino Classics. Bet Real Snacks &amp; Friendly Stakes.
              </h1>
              <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                Challenge friends in live 1v1 duels or open 3–8 player group tables for Blackjack,
                High-Low, Roulette, and Dice Roll. Lock in Egg tokens, Friday Platters, or Grilled
                Meat stakes before the cards fly, then track every payout in the IOU ledger.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap"
                >
                  Start Playing Free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onQuickDemo}
                  className="px-5 py-3 rounded-lg bg-[#131822] border border-white/12 hover:border-amber-500/50 text-amber-300 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Try Quick Demo Mode
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/8 max-w-lg">
                <div>
                  <p className="text-xl font-bold text-white tabular-nums">4 Games</p>
                  <p className="text-xs text-slate-400 mt-0.5">Synced live tables</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white tabular-nums">2–8 Seats</p>
                  <p className="text-xs text-slate-400 mt-0.5">6-char invite codes</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white tabular-nums">8 Snacks</p>
                  <p className="text-xs text-slate-400 mt-0.5">Daily &amp; meat menu</p>
                </div>
              </div>
            </div>

            {/* Interactive Visual Preview: Live Blackjack Table & Food Bet Slip */}
            <div className="lg:col-span-6 bg-[#131822] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between">
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-[#0F172A]">
                <img
                  src={HERO_LOUNGE_IMAGE}
                  alt="VIP emerald felt blackjack table with gourmet grilled skewers"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131822] via-[#131822]/40 to-transparent" />
                <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Interactive Table Preview</span>
                  <span className="text-emerald-300 font-mono tabular-nums">Room VIP777 · 4/6 Seats</span>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Interactive Blackjack Hand */}
                  <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/8 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Dealer: {evaluateBlackjackHand(PREVIEW_DEALER).total}</span>
                      <span className="text-emerald-400 font-mono tabular-nums">
                        You: {heroEval.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {heroPlayerHand.map((c, idx) => (
                        <div
                          key={`${c.rank}-${c.suit}-${idx}`}
                          className="w-12 h-16 rounded-lg bg-white text-slate-950 font-bold flex flex-col items-center justify-center shadow-sm text-sm"
                        >
                          <span>{c.rank}</span>
                          <span className={c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-slate-900'}>
                            {c.suit}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleHeroHit}
                        className="flex-1 py-1.5 px-3 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {heroEval.isBust || heroStanding ? 'Reset Hand' : 'Hit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroStanding(true)}
                        className="flex-1 py-1.5 px-3 rounded-md bg-white/8 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Stand
                      </button>
                    </div>
                  </div>

                  {/* Food Bet Slip Preview */}
                  <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/8 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-amber-400" />
                        Food Bet Slip
                      </span>
                      <span className="text-xs text-emerald-400 font-medium">Both Approved</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Your Stake</span>
                        <span className="font-semibold text-amber-300">Friday Snack</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Tunde&apos;s Stake</span>
                        <span className="font-semibold text-orange-300">Grilled Meat</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Coin Side-Pot</span>
                        <span className="font-mono tabular-nums text-white">200 Coins</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('signup')}
                      className="w-full py-1.5 px-3 rounded-md bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Lock In Real Wager
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step How It Works */}
        <section id="how-it-works" className="border-t border-white/8 py-16">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
                How SnackStakes Works
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Friendly stakes agreed upfront, synced in real time across devices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-[#131822] border border-white/8 space-y-3">
                <span className="text-xs font-mono font-semibold text-emerald-400">01. Connect</span>
                <h3 className="text-lg font-semibold text-white">Add Friends &amp; Join a Room</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Search friends by username, send a chat invite, or launch a 2–8 player table with
                  a shareable 6-character Room Code.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-[#131822] border border-white/8 space-y-3">
                <span className="text-xs font-mono font-semibold text-amber-400">02. Negotiate</span>
                <h3 className="text-lg font-semibold text-white">Lock In Your Food or Snack Wager</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Stake Egg tokens, Friday Platters, Grilled Meat, or custom food dares. Every
                  player approves the pot before a single card is dealt.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-[#131822] border border-white/8 space-y-3">
                <span className="text-xs font-mono font-semibold text-orange-400">03. Settle</span>
                <h3 className="text-lg font-semibold text-white">Winner Takes the Pot &amp; Earns XP</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Earn bonus Coins and group XP multipliers. Every won snack drops straight into the
                  Who Owes Who IOU tracker until delivered.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Games Showcase */}
        <section id="games" className="border-t border-white/8 py-16">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
                  Featured Casino Games
                </h2>
                <p className="text-sm text-slate-400 mt-2">
                  Play Solo Practice against the house or wager with friends in live rooms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer whitespace-nowrap self-start"
              >
                Enter the Lounge →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {gameList.map(({ key, icon }) => {
                const game = GAME_META[key];
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="text-left p-6 rounded-xl bg-[#131822] border border-white/8 hover:border-emerald-500/40 transition-colors cursor-pointer flex flex-col justify-between space-y-5 group"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0B0E14] border border-white/8 flex items-center justify-center">
                        {icon}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                          {game.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {game.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-white/6 flex items-center justify-between text-xs text-slate-400">
                      <span>{game.playersLabel}</span>
                      <span className="text-emerald-400 font-semibold">Play Now</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Leaderboard Preview */}
        <section id="leaderboard" className="border-t border-white/8 py-16">
          <div className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2.5">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  Lounge High-Roller Leaderboard
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Live rankings synced from completed 1v1 and group room matches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Claim Your Spot
              </button>
            </div>

            <div className="bg-[#131822] border border-white/8 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/8 text-xs text-slate-400">
                    <tr>
                      <th className="py-3.5 px-5 font-medium">Rank</th>
                      <th className="py-3.5 px-5 font-medium">Player</th>
                      <th className="py-3.5 px-5 font-medium text-right">XP</th>
                      <th className="py-3.5 px-5 font-medium text-right">Coins</th>
                      <th className="py-3.5 px-5 font-medium text-right">Win Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {(leaderboard.length > 0
                      ? leaderboard.slice(0, 5)
                      : [
                          { uid: '1', username: 'Kofi', xp: 4820, coins: 2650, winStreak: 6 },
                          { uid: '2', username: 'Tunde', xp: 3420, coins: 1840, winStreak: 4 },
                          { uid: '3', username: 'Sarah', xp: 1980, coins: 1420, winStreak: 2 },
                          { uid: '4', username: 'Maya', xp: 760, coins: 960, winStreak: 1 },
                        ]
                    ).map((row, index) => (
                      <tr key={row.uid} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-5 font-mono tabular-nums text-slate-400">
                          #{index + 1}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-white">{row.username}</td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums text-emerald-400">
                          {row.xp.toLocaleString()} XP
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums text-amber-300">
                          {row.coins.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-300">
                          {row.winStreak}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>SnackStakes — Friendly Social Casino &amp; Snack Wagers</span>
          <span>Virtual Coins &amp; Redeemable Food IOUs · Play Responsibly</span>
        </div>
      </footer>
    </div>
  );
};
