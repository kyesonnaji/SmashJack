import React, { useState } from 'react';
import {
  Check,
  Copy,
  DoorOpen,
  Play,
  Plus,
  Send,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import type {
  ChatMessage,
  GameRoom,
  GameType,
  InventoryItem,
  Profile,
  WagerOffer,
} from '../types/snackstakes';
import { MultiplayerRoomTable } from './CasinoGames';

interface Props {
  currentUid: string;
  profile: Profile;
  profiles: Profile[];
  inventory: InventoryItem[];
  rooms: GameRoom[];
  messages: ChatMessage[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onCreateRoom: (gameType: GameType, maxPlayers: number) => Promise<void>;
  onJoinRoom: (payload: { roomId?: string; roomCode?: string }) => Promise<void>;
  onQuickMatch: (gameType?: GameType) => Promise<void>;
  onAddFriendToRoom: (roomId: string, friendId: string) => Promise<void>;
  onUpdateStake: (
    roomId: string,
    payload: { stakeOffer?: WagerOffer; approvePot?: boolean }
  ) => Promise<void>;
  onStartRoom: (roomId: string) => Promise<void>;
  onRoomAction: (roomId: string, action: string, choice?: string) => Promise<void>;
  onSendRoomMessage: (roomId: string, content: string) => Promise<void>;
}

export const RoomsView: React.FC<Props> = ({
  currentUid,
  profile,
  profiles,
  inventory,
  rooms,
  messages,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  onJoinRoom,
  onQuickMatch,
  onAddFriendToRoom,
  onUpdateStake,
  onStartRoom,
  onRoomAction,
  onSendRoomMessage,
}) => {
  const [createGame, setCreateGame] = useState<GameType>('blackjack');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatText, setChatText] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);

  const snackItems = inventory.filter((i) => i.itemType === 'snack' && i.quantity > 0);
  const [stakeSnackId, setStakeSnackId] = useState<string>(snackItems[0]?.itemId || '');
  const [stakeCustom, setStakeCustom] = useState('');
  const [stakeCoins, setStakeCoins] = useState(50);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;
  const roomMessages = activeRoom
    ? messages.filter((m) => m.roomId === activeRoom.id)
    : [];

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError(null);
    if (joinCode.trim().length !== 6) {
      setRoomError('Enter a 6-character Room Code.');
      return;
    }
    try {
      await onJoinRoom({ roomCode: joinCode.trim().toUpperCase() });
      setJoinCode('');
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : 'Could not join room.');
    }
  };

  if (activeRoom) {
    const mySeat = activeRoom.players.find((p) => p.uid === currentUid);
    const isHost = activeRoom.hostId === currentUid;
    const allApproved =
      activeRoom.players.length >= 2 && activeRoom.players.every((p) => p.potApproved);
    const inviteCandidates = profiles.filter(
      (p) => p.uid !== currentUid && !activeRoom.playerIds.includes(p.uid)
    );

    const buildStake = (): WagerOffer => {
      const snack = snackItems.find((s) => s.itemId === stakeSnackId);
      return {
        snackItemId: snack?.itemId,
        snackName: snack?.itemName,
        customStake: stakeCustom.trim() || undefined,
        coins: Math.max(0, Math.floor(stakeCoins)),
      };
    };

    return (
      <div className="space-y-6">
        {/* Room Header */}
        <div className="bg-[#131822] border border-white/8 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSelectRoom(null)}
                className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                ← Back to Rooms
              </button>
              <span className="text-slate-600">/</span>
              <h2 className="text-lg font-bold text-white capitalize font-display">
                {activeRoom.gameType === 'highlow' ? 'High-Low Duel' : activeRoom.gameType} Room
              </h2>
            </div>
            <p className="text-xs text-slate-400 tabular-nums">
              {activeRoom.players.length} of {activeRoom.maxPlayers} seats filled · Status:{' '}
              <span className="text-emerald-400 capitalize">{activeRoom.status}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(activeRoom.roomCode).catch(() => {});
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 1800);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0B0E14] border border-white/12 text-xs font-mono font-bold text-amber-300 flex items-center gap-2 cursor-pointer"
            >
              Code: {activeRoom.roomCode}
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {isHost && activeRoom.status === 'waiting' && (
              <button
                type="button"
                disabled={!allApproved}
                onClick={() => onStartRoom(activeRoom.id)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Start Match
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            {/* Group Pot System (Waiting Phase) */}
            {activeRoom.status === 'waiting' && (
              <div className="bg-[#131822] border border-white/8 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      Central Group Pot
                    </h3>
                    <p className="text-xs text-slate-400">
                      Every player locks in a snack or coin stake and clicks Approve Pot before start.
                    </p>
                  </div>
                  {inviteCandidates.length > 0 && activeRoom.players.length < activeRoom.maxPlayers && (
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Invite friend to room"
                        onChange={(e) => {
                          if (e.target.value) {
                            void onAddFriendToRoom(activeRoom.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-white/12 text-xs text-white"
                      >
                        <option value="" disabled>
                          + Add Online Friend
                        </option>
                        {inviteCandidates.map((f) => (
                          <option key={f.uid} value={f.uid}>
                            {f.username} ({f.presenceStatus})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* All Seats & Stakes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRoom.players.map((p) => (
                    <div
                      key={p.uid}
                      className="p-3.5 rounded-xl bg-[#0B0E14] border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={p.avatarUrl}
                          alt={p.username}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full bg-[#131822] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {p.username} {p.uid === activeRoom.hostId ? '· Host' : ''}
                          </p>
                          <p className="text-xs text-amber-300 truncate">
                            {p.stakeOffer.snackName || p.stakeOffer.customStake || 'Coins Only'} ·{' '}
                            <span className="font-mono tabular-nums text-slate-400">
                              {p.stakeOffer.coins} Coins
                            </span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          p.potApproved ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {p.potApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* My Stake Controls */}
                {mySeat && (
                  <div className="pt-4 border-t border-white/8 space-y-3">
                    <p className="text-xs font-semibold text-slate-300">Your Pot Contribution</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        aria-label="Choose snack stake"
                        value={stakeSnackId}
                        onChange={(e) => setStakeSnackId(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                      >
                        <option value="">No Inventory Snack</option>
                        {snackItems.map((s) => (
                          <option key={s.id} value={s.itemId}>
                            {s.itemName} (x{s.quantity})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={stakeCustom}
                        onChange={(e) => setStakeCustom(e.target.value)}
                        placeholder="Custom food/dare stake"
                        className="px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        aria-label="Coins stake"
                        value={stakeCoins}
                        onChange={(e) => setStakeCoins(Number(e.target.value || 0))}
                        className="px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs font-mono text-white"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStake(activeRoom.id, {
                            stakeOffer: buildStake(),
                            approvePot: true,
                          })
                        }
                        className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        {mySeat.potApproved ? 'Update & Keep Approved' : 'Approve Pot'}
                      </button>
                      {!allApproved && (
                        <span className="text-xs text-slate-400">
                          Waiting for all players to approve pot (min 2 players).
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Game Table */}
            {(activeRoom.status === 'playing' || activeRoom.status === 'finished') && (
              <MultiplayerRoomTable
                room={activeRoom}
                currentUid={currentUid}
                profile={profile}
                onAction={(action, choice) => onRoomAction(activeRoom.id, action, choice)}
              />
            )}
          </div>

          {/* Built-in Room Group Chat */}
          <div className="xl:col-span-4 bg-[#131822] border border-white/8 rounded-xl flex flex-col h-[460px]">
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white">Room Group Chat</h3>
              <span className="text-[11px] text-slate-400 font-mono">{activeRoom.roomCode}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {roomMessages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  No messages in this room yet. Say hello or call out a side bet!
                </p>
              ) : (
                roomMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-lg text-xs ${
                      m.senderId === currentUid
                        ? 'bg-emerald-500/15 border border-emerald-500/25 ml-6'
                        : 'bg-[#0B0E14] border border-white/8 mr-6'
                    }`}
                  >
                    <p className="font-semibold text-white">{m.senderName}</p>
                    <p className="text-slate-300 mt-0.5">{m.content}</p>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!chatText.trim()) return;
                const txt = chatText.trim();
                setChatText('');
                await onSendRoomMessage(activeRoom.id, txt);
              }}
              className="p-3 border-t border-white/8 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Message table..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              />
              <button
                type="submit"
                aria-label="Send room message"
                className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Matchmaking Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Room */}
        <div className="lg:col-span-6 bg-[#131822] border border-white/8 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display">Create Group Room</h2>
            <span className="text-xs text-slate-400">2–8 Players</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              aria-label="Game type"
              value={createGame}
              onChange={(e) => setCreateGame(e.target.value as GameType)}
              className="px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
            >
              <option value="blackjack">Blackjack</option>
              <option value="highlow">High-Low Duel</option>
              <option value="roulette">Roulette Wheel</option>
              <option value="dice">Dice Roll</option>
            </select>
            <select
              aria-label="Max players"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  Max {n} Players
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onCreateRoom(createGame, maxPlayers)}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </button>
          </div>
        </div>

        {/* Quick Match & Join by Code */}
        <div className="lg:col-span-6 bg-[#131822] border border-white/8 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display">
              Quick Match &amp; Room Code
            </h2>
            <button
              type="button"
              onClick={() => onQuickMatch(createGame)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Quick Match
            </button>
          </div>
          <form onSubmit={handleJoinCode} className="flex items-center gap-3">
            <input
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-char Room Code (e.g. VIP777)"
              className="flex-1 px-3.5 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs font-mono uppercase text-white placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <DoorOpen className="w-4 h-4" />
              Join Code
            </button>
          </form>
          {roomError && <p className="text-xs text-red-400">{roomError}</p>}
        </div>
      </div>

      {/* Open Lobbies */}
      <div className="bg-[#131822] border border-white/8 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-display">Open Friend Lobbies</h3>
          <span className="text-xs text-slate-400 tabular-nums">{rooms.length} rooms</span>
        </div>

        {rooms.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            No open rooms yet. Create a room or hit Quick Match above!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-4 rounded-xl bg-[#0B0E14] border border-white/10 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white capitalize">
                      {room.gameType === 'highlow' ? 'High-Low Duel' : room.gameType}
                    </span>
                    <span className="font-mono text-amber-300">{room.roomCode}</span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    {room.players.length}/{room.maxPlayers} players ·{' '}
                    <span className="capitalize">{room.status}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Stakes:{' '}
                    {room.players
                      .map((p) => p.stakeOffer.snackName || `${p.stakeOffer.coins}c`)
                      .join(', ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onJoinRoom({ roomId: room.id })}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {room.playerIds.includes(currentUid) ? 'Enter Room' : 'Join Lobby'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
