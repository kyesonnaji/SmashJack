import React, { useState } from 'react';
import {
  Bell,
  Coins,
  Home,
  LogOut,
  MessageSquare,
  PanelRight,
  ShoppingBag,
  Trophy,
  Users,
  DoorOpen,
} from 'lucide-react';
import { calculateLevelInfo } from '../game/engine';
import type { NotificationItem, Profile } from '../types/snackstakes';

export type DashboardTab = 'home' | 'rooms' | 'friends' | 'messages' | 'shop' | 'leaderboard';

interface Props {
  profile: Profile;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  notifications: NotificationItem[];
  onNotificationClick: (item: NotificationItem) => void;
  betSlipOpen: boolean;
  onToggleBetSlip: () => void;
  onSignOut: () => void;
}

const TIER_STYLES: Record<string, string> = {
  Bronze: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
  Silver: 'text-slate-200 border-slate-400/30 bg-slate-400/10',
  Gold: 'text-amber-300 border-amber-500/40 bg-amber-500/15',
  Diamond: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15',
  VIP: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15',
};

export const DashboardHeader: React.FC<Props> = ({
  profile,
  activeTab,
  onSelectTab,
  notifications,
  onNotificationClick,
  betSlipOpen,
  onToggleBetSlip,
  onSignOut,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const levelInfo = calculateLevelInfo(profile.xp);
  const hasXpBoost = profile.xpBoostUntil > Date.now();

  const frameClass =
    profile.equippedFrame === 'cosmetic_gold_frame'
      ? 'ring-2 ring-amber-400'
      : profile.equippedFrame === 'cosmetic_ember_frame'
        ? 'ring-2 ring-orange-500'
        : 'ring-1 ring-white/15';

  const navItems: Array<{ id: DashboardTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'rooms', label: 'Rooms', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'shop', label: 'Shop', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B0E14]/95 backdrop-blur-md border-b border-white/8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* Top Profile & Utility Row */}
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-lg font-extrabold tracking-tight text-white font-display whitespace-nowrap shrink-0">
              Snack<span className="text-emerald-400">Stakes</span>
            </span>

            <div className="flex items-center gap-2.5 pl-3 sm:pl-4 border-l border-white/10 min-w-0">
              <img
                src={profile.avatarUrl}
                alt={`${profile.username} avatar`}
                referrerPolicy="no-referrer"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#131822] object-cover shrink-0 ${frameClass}`}
              />
              <div className="hidden sm:block min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate max-w-[130px]">
                    {profile.username}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap ${
                      TIER_STYLES[levelInfo.vipTier] || TIER_STYLES.Bronze
                    }`}
                  >
                    {levelInfo.vipTier}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
                    Lv.{levelInfo.level}
                  </span>
                  <div
                    className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden"
                    title={`${levelInfo.currentLevelXp} / ${levelInfo.nextLevelXp} XP`}
                  >
                    <div
                      className="h-full bg-emerald-400 transition-all duration-200"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                  </div>
                  {hasXpBoost && (
                    <span className="text-[10px] font-semibold text-amber-400 whitespace-nowrap">
                      2x XP
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls: Coin Balance, Notifications Bell, Bet Slip Toggle, Sign Out */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#131822] border border-white/10 flex items-center gap-1.5 sm:gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-white">
                {profile.coins.toLocaleString()}
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label={`Notifications (${notifications.length})`}
                className="relative p-2 rounded-lg bg-[#131822] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-slate-950 flex items-center justify-center tabular-nums">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#131822] border border-white/12 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {notifications.length} active
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/6">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 text-center">
                        You&apos;re all caught up!
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            onNotificationClick(n);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-white">{n.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{n.detail}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleBetSlip}
              aria-label="Toggle Bet Slip and IOU Ledger"
              className={`px-2.5 sm:px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                betSlipOpen
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#131822] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <PanelRight className="w-4 h-4" />
              <span className="hidden md:inline">Bet Slip</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              aria-label="Log Out"
              className="p-2 rounded-lg bg-[#131822] border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Row */}
        <nav aria-label="Dashboard sections" className="flex items-center gap-1 overflow-x-auto pb-2.5">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
