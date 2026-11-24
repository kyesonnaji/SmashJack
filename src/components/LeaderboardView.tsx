import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { calculateLevelInfo } from '../game/engine';
import type { Profile } from '../types/snackstakes';

interface Props {
  currentUid: string;
  profiles: Profile[];
}

export const LeaderboardView: React.FC<Props> = ({ currentUid, profiles }) => {
  const [sortBy, setSortBy] = useState<'xp' | 'coins' | 'winStreak'>('xp');

  const sorted = [...profiles].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            SnackStakes VIP Leaderboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live standings across all lounge players
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#131822] border border-white/8">
          {(
            [
              ['xp', 'Sort by XP'],
              ['coins', 'Sort by Coins'],
              ['winStreak', 'Win Streak'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                sortBy === key ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#131822] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 text-xs text-slate-400">
              <tr>
                <th className="py-3.5 px-5 font-medium">Rank</th>
                <th className="py-3.5 px-5 font-medium">Player</th>
                <th className="py-3.5 px-5 font-medium">VIP Tier</th>
                <th className="py-3.5 px-5 font-medium text-right">XP</th>
                <th className="py-3.5 px-5 font-medium text-right">Coins</th>
                <th className="py-3.5 px-5 font-medium text-right">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {sorted.map((p, idx) => {
                const lvl = calculateLevelInfo(p.xp);
                const isMe = p.uid === currentUid;
                return (
                  <tr key={p.uid} className={isMe ? 'bg-emerald-500/8' : 'hover:bg-white/[0.02]'}>
                    <td className="py-3.5 px-5 font-mono tabular-nums text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.avatarUrl}
                          alt={p.username}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full bg-[#0B0E14]"
                        />
                        <div>
                          <p className="font-semibold text-white">
                            {p.username} {isMe ? '(You)' : ''}
                          </p>
                          <p className="text-[11px] text-slate-400">{p.presenceStatus}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-amber-300 font-semibold">
                      {lvl.vipTier} · Lv.{lvl.level}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-emerald-400">
                      {p.xp.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-amber-300">
                      {p.coins.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-300">
                      {p.winStreak}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
