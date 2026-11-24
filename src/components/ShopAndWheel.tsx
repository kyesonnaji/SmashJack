import React, { useState } from 'react';
import { Check, Coins, History, Package, RotateCw, Sparkles, Utensils } from 'lucide-react';
import { DAILY_WHEEL_SEGMENTS, SNACK_AND_SHOP_CATALOG } from '../data/catalog';
import type { InventoryItem, MatchHistoryEntry, Profile } from '../types/snackstakes';

interface ShopProps {
  profile: Profile;
  inventory: InventoryItem[];
  onBuy: (itemId: string) => Promise<void>;
  onEquip: (itemId: string) => Promise<void>;
}

export const ShopView: React.FC<ShopProps> = ({ profile, inventory, onBuy, onEquip }) => {
  const [filter, setFilter] = useState<'all' | 'snack' | 'cosmetic'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleItems = SNACK_AND_SHOP_CATALOG.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'snack') return item.itemType === 'snack';
    return item.itemType === 'cosmetic' || item.itemType === 'booster';
  });

  const handleBuy = async (itemId: string, name: string) => {
    setFeedback(null);
    try {
      await onBuy(itemId);
      setFeedback(`Added ${name} to your Inventory.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Purchase failed.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display">
            Snack Menu, VIP Cosmetics &amp; Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Redeem earned Coins for bettable Snack Tokens, custom card backs, felts, and 2x XP Boosters
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#131822] border border-white/8">
          {(
            [
              ['all', 'All Items'],
              ['snack', 'Daily Snack & Meat Menu'],
              ['cosmetic', 'VIP Cosmetics & Boosters'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filter === id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
          {feedback}
        </div>
      )}

      {/* Shop Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {visibleItems.map((item) => {
          const owned = inventory.find((i) => i.itemId === item.id);
          const isEquipped =
            profile.equippedCardBack === item.id ||
            profile.equippedFelt === item.id ||
            profile.equippedFrame === item.id;

          return (
            <div
              key={item.id}
              className="bg-[#131822] border border-white/8 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-36 bg-[#0B0E14] relative overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#131822] to-[#0B0E14] flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-amber-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131822] via-transparent to-transparent" />
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>{item.tag}</span>
                    {owned && <span className="text-emerald-400 font-mono">Owned x{owned.quantity}</span>}
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.subtitle}</p>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between gap-2">
                <span className="text-sm font-bold font-mono tabular-nums text-amber-300 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  {item.price}
                </span>

                <div className="flex items-center gap-2">
                  {item.itemType === 'cosmetic' && owned && (
                    <button
                      type="button"
                      disabled={isEquipped}
                      onClick={() => onEquip(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                    >
                      {isEquipped ? 'Equipped' : 'Equip'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={profile.coins < item.price}
                    onClick={() => handleBuy(item.id, item.name)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Buy
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Owned Inventory */}
      <div className="bg-[#131822] border border-white/8 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            Your Snack &amp; Cosmetic Inventory
          </h3>
          <span className="text-xs text-slate-400 tabular-nums">{inventory.length} items</span>
        </div>

        {inventory.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">
            Your inventory is empty. Buy snack tokens above to stake them in 1v1 or group matches.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {inventory.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-lg bg-[#0B0E14] border border-white/8 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {inv.itemName}
                  </p>
                  <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                    {inv.itemType} · Qty {inv.quantity}
                  </p>
                </div>
                {inv.equipped && (
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 shrink-0">
                    <Check className="w-3 h-3" />
                    Equipped
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface WheelHistoryProps {
  profile: Profile;
  matchHistory: MatchHistoryEntry[];
  onSpinWheel: () => Promise<{ index: number; segment: { label: string } }>;
}

export const DailyWheelAndHistory: React.FC<WheelHistoryProps> = ({
  profile,
  matchHistory,
  onSpinWheel,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);

  const canSpin =
    !profile.lastDailySpin || Date.now() - profile.lastDailySpin >= 24 * 60 * 60 * 1000;

  const handleSpin = async () => {
    setSpinError(null);
    setSpinning(true);
    try {
      const res = await onSpinWheel();
      const targetDeg = 1080 + res.index * (360 / DAILY_WHEEL_SEGMENTS.length);
      setWheelAngle((prev) => prev + targetDeg);
      setTimeout(() => {
        setSpinning(false);
        setSpinResult(`Won ${res.segment.label}!`);
      }, 850);
    } catch (err) {
      setSpinning(false);
      setSpinError(err instanceof Error ? err.message : 'Wheel spin unavailable.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Daily Wheel Spin */}
      <div className="lg:col-span-5 bg-[#131822] border border-white/8 rounded-xl p-6 flex flex-col justify-between space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-display">Daily Bonus Wheel</h3>
            <p className="text-xs text-slate-400">Free daily spin for Coins, Snack Tokens &amp; 2x XP</p>
          </div>
          <RotateCw className="w-4 h-4 text-amber-400" />
        </div>

        <div className="flex items-center gap-6">
          <div
            className="w-28 h-28 rounded-full border-4 border-amber-400/70 bg-[conic-gradient(#1e293b_0deg_45deg,#065f46_45deg_90deg,#1e293b_90deg_135deg,#92400e_135deg_180deg,#1e293b_180deg_225deg,#9a3412_225deg_270deg,#064e3b_270deg_315deg,#1e293b_315deg_360deg)] shrink-0 transition-transform duration-700 ease-out flex items-center justify-center"
            style={{ transform: `rotate(${wheelAngle}deg)` }}
          >
            <div className="w-9 h-9 rounded-full bg-[#0B0E14] border border-white/20" />
          </div>

          <div className="space-y-2.5">
            {spinResult && <p className="text-sm font-bold text-emerald-400">{spinResult}</p>}
            {spinError && <p className="text-xs text-amber-300">{spinError}</p>}
            <button
              type="button"
              disabled={!canSpin || spinning}
              onClick={handleSpin}
              className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 text-xs font-bold cursor-pointer"
            >
              {spinning ? 'Spinning...' : canSpin ? 'Spin Daily Wheel' : 'Spun Today'}
            </button>
          </div>
        </div>
      </div>

      {/* Match History Log */}
      <div className="lg:col-span-7 bg-[#131822] border border-white/8 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            Match History
          </h3>
          <span className="text-xs text-slate-400 tabular-nums">{matchHistory.length} rounds</span>
        </div>

        {matchHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Complete a Solo or Multiplayer round to see your XP and coin history.
          </p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {matchHistory.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-lg bg-[#0B0E14] border border-white/6 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{m.summary}</p>
                  <p className="text-[11px] text-slate-400 capitalize">
                    {m.mode} · {m.gameType}
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <p
                    className={
                      m.coinsDelta >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'
                    }
                  >
                    {m.coinsDelta >= 0 ? `+${m.coinsDelta}` : m.coinsDelta} Coins
                  </p>
                  <p className="text-[11px] text-amber-300">+{m.xpEarned} XP</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
