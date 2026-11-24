import React from 'react';
import { CheckCircle2, ChevronRight, Clock, Receipt, Swords, X } from 'lucide-react';
import type { GameRoom, IouEntry, Profile, Wager } from '../types/snackstakes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUid: string;
  profiles: Profile[];
  wagers: Wager[];
  rooms: GameRoom[];
  ious: IouEntry[];
  onOpenWager: (wager: Wager) => void;
  onJoinRoom: (roomId: string) => void;
  onSettleIou: (iouId: string) => Promise<void>;
}

export const BetSlipSidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUid,
  wagers,
  rooms,
  ious,
  onOpenWager,
  onJoinRoom,
  onSettleIou,
}) => {
  const activeRooms = rooms.filter((r) => r.playerIds.includes(currentUid) && r.status !== 'finished');
  const pendingWagers = wagers.filter((w) => w.status === 'negotiating' || w.status === 'active');
  const openIous = ious.filter((i) => !i.settled);
  const settledIous = ious.filter((i) => i.settled).slice(0, 4);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Active Bet Slip and IOU Ledger"
      className="w-full lg:w-80 xl:w-88 shrink-0 bg-[#131822] border-t lg:border-t-0 lg:border-l border-white/8 flex flex-col max-h-[calc(100vh-4rem)] lg:sticky lg:top-16"
    >
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Active Bet Slip &amp; IOU Ledger
          </h2>
          <p className="text-xs text-slate-400">
            {pendingWagers.length + activeRooms.length} live · {openIous.length} unsettled
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse Bet Slip Sidebar"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/8">
        {/* Active Rooms & Wagers */}
        <section className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300">Active Slips &amp; Tables</h3>
            <span className="text-xs font-mono tabular-nums text-emerald-400">
              {activeRooms.length + pendingWagers.length}
            </span>
          </div>

          {activeRooms.length === 0 && pendingWagers.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              No active wagers right now. Challenge a friend or join a room to lock a stake.
            </p>
          ) : (
            <div className="space-y-2.5">
              {activeRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onJoinRoom(room.id)}
                  className="w-full text-left p-3 rounded-lg bg-[#0B0E14]/70 border border-white/8 hover:border-emerald-500/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white capitalize">
                      {room.gameType} · {room.roomCode}
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      Enter
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 tabular-nums">
                    {room.players.length}/{room.maxPlayers} players ·{' '}
                    {room.status === 'playing' ? 'Live Table' : 'Pot Lobby'}
                  </p>
                </button>
              ))}

              {pendingWagers.map((wager) => {
                const isCreator = wager.creatorId === currentUid;
                const opponentLabel = isCreator ? wager.opponentName : wager.creatorName;
                return (
                  <button
                    key={wager.id}
                    type="button"
                    onClick={() => onOpenWager(wager)}
                    className="w-full text-left p-3 rounded-lg bg-[#0B0E14]/70 border border-white/8 hover:border-amber-500/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5 text-amber-400" />
                        vs {opponentLabel || 'Friend'}
                      </span>
                      <span
                        className={
                          wager.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                        }
                      >
                        {wager.status === 'active' ? 'Locked In' : 'Negotiating'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {wager.gameType.toUpperCase()} · {wager.creatorOffer.snackName || wager.creatorOffer.customStake || `${wager.creatorOffer.coins} Coins`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Who Owes Who Food Tracker */}
        <section className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-orange-400" />
              Who Owes Who (IOU Ledger)
            </h3>
            <span className="text-xs font-mono tabular-nums text-orange-400">
              {openIous.length}
            </span>
          </div>

          {openIous.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              All snack debts settled. Win a match to stack new snack IOUs.
            </p>
          ) : (
            <div className="space-y-2.5">
              {openIous.map((iou) => {
                const iAmWinner = iou.winnerId === currentUid;
                return (
                  <div
                    key={iou.id}
                    className="p-3 rounded-lg bg-[#0B0E14]/70 border border-white/8 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {iAmWinner ? `${iou.loserName} owes you` : `You owe ${iou.winnerName}`}
                        </p>
                        <p className="text-amber-400 font-medium mt-0.5 truncate">
                          {iou.stakeLabel}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0 capitalize">
                        {iou.gameType}
                      </span>
                    </div>
                    {iAmWinner ? (
                      <button
                        type="button"
                        onClick={() => onSettleIou(iou.id)}
                        className="w-full py-1.5 px-3 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Delivered / Settled
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-orange-400" />
                        Awaiting winner confirmation
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {settledIous.length > 0 && (
            <div className="pt-2 space-y-1.5 border-t border-white/6">
              <p className="text-[11px] text-slate-500">Recently Settled</p>
              {settledIous.map((iou) => (
                <div
                  key={iou.id}
                  className="flex items-center justify-between text-xs text-slate-500 py-1"
                >
                  <span className="truncate">
                    {iou.loserName} → {iou.winnerName} ({iou.stakeLabel})
                  </span>
                  <span className="text-emerald-500 shrink-0 ml-2">Settled</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};
