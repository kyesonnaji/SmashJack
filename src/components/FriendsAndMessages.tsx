import React, { useState } from 'react';
import {
  Check,
  MessageSquare,
  Search,
  Send,
  Swords,
  UserPlus,
  X,
} from 'lucide-react';
import type { ChatMessage, Friendship, Profile, Wager } from '../types/snackstakes';

interface FriendsProps {
  currentUid: string;
  profiles: Profile[];
  friendships: Friendship[];
  onSendRequest: (friendId: string) => Promise<void>;
  onAcceptRequest: (friendshipId: string) => Promise<void>;
  onDeclineRequest: (friendshipId: string) => Promise<void>;
  onOpenDm: (friend: Profile) => void;
  onChallenge: (friend: Profile) => void;
}

export const FriendsView: React.FC<FriendsProps> = ({
  currentUid,
  profiles,
  friendships,
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onOpenDm,
  onChallenge,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const incomingRequests = friendships.filter(
    (f) => f.friendId === currentUid && f.status === 'pending'
  );
  const acceptedLinks = friendships.filter((f) => f.status === 'accepted');
  const acceptedUids = new Set(
    acceptedLinks.map((f) => (f.userId === currentUid ? f.friendId : f.userId))
  );
  const pendingUids = new Set(
    friendships
      .filter((f) => f.status === 'pending')
      .map((f) => (f.userId === currentUid ? f.friendId : f.userId))
  );

  const friendsList = profiles.filter((p) => acceptedUids.has(p.uid));
  const discoverList = profiles.filter(
    (p) =>
      p.uid !== currentUid &&
      !acceptedUids.has(p.uid) &&
      p.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const statusColor = (status: Profile['presenceStatus']) => {
    if (status === 'In Game') return 'text-orange-400';
    if (status === 'In Lobby') return 'text-amber-300';
    if (status === 'Online') return 'text-emerald-400';
    return 'text-slate-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: My Friends & Pending Requests */}
      <div className="lg:col-span-7 space-y-6">
        {incomingRequests.length > 0 && (
          <div className="bg-[#131822] border border-amber-500/30 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Incoming Friend Requests ({incomingRequests.length})
            </h3>
            <div className="space-y-2.5">
              {incomingRequests.map((req) => {
                const sender = profiles.find((p) => p.uid === req.userId);
                if (!sender) return null;
                return (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg bg-[#0B0E14] border border-white/8 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={sender.avatarUrl}
                        alt={sender.username}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{sender.username}</p>
                        <p className="text-[11px] text-slate-400">{sender.presenceStatus}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAcceptRequest(req.id)}
                        aria-label={`Accept ${sender.username}`}
                        className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineRequest(req.id)}
                        aria-label={`Decline ${sender.username}`}
                        className="p-1.5 rounded-md bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-[#131822] border border-white/8 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display">Friends Roster</h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {friendsList.length} connected
            </span>
          </div>

          {friendsList.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Search players on the right to add your crew.
            </p>
          ) : (
            <div className="space-y-3">
              {friendsList.map((friend) => (
                <div
                  key={friend.uid}
                  className="p-4 rounded-xl bg-[#0B0E14] border border-white/8 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={friend.avatarUrl}
                      alt={friend.username}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full bg-[#131822]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{friend.username}</p>
                      <p className="text-xs text-slate-400">
                        <span className={statusColor(friend.presenceStatus)}>
                          {friend.presenceStatus}
                        </span>{' '}
                        · {friend.xp.toLocaleString()} XP
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDm(friend)}
                      className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={() => onChallenge(friend)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      Challenge 1v1
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Search & Add Users */}
      <div className="lg:col-span-5 bg-[#131822] border border-white/8 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-display">Find Players</h3>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search players by username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white placeholder-slate-500"
          />
        </div>

        <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
          {discoverList.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No matching users found.</p>
          ) : (
            discoverList.map((user) => {
              const isPending = pendingUids.has(user.uid);
              return (
                <div
                  key={user.uid}
                  className="p-3 rounded-lg bg-[#0B0E14] border border-white/8 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{user.username}</p>
                      <p className={`text-[11px] ${statusColor(user.presenceStatus)}`}>
                        {user.presenceStatus}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onSendRequest(user.uid)}
                    className="px-3 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-300 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {isPending ? 'Pending' : 'Add'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

interface MessagesProps {
  currentUid: string;
  profiles: Profile[];
  messages: ChatMessage[];
  wagers: Wager[];
  selectedPeerId: string | null;
  typingUser: string | null;
  onSelectPeer: (peerId: string) => void;
  onSendMessage: (receiverId: string, content: string) => Promise<void>;
  onTyping: (receiverId: string, isTyping: boolean) => void;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onSendBetInvite: (friend: Profile) => void;
  onOpenWager: (wager: Wager) => void;
}

const REACTION_EMOJIS = ['🔥', '🍔', '🎲', '👏'];

export const MessagesView: React.FC<MessagesProps> = ({
  currentUid,
  profiles,
  messages,
  wagers,
  selectedPeerId,
  typingUser,
  onSelectPeer,
  onSendMessage,
  onTyping,
  onReact,
  onSendBetInvite,
  onOpenWager,
}) => {
  const [draft, setDraft] = useState('');
  const peers = profiles.filter((p) => p.uid !== currentUid);
  const activePeer = peers.find((p) => p.uid === selectedPeerId) || peers[0] || null;

  const threadMessages = activePeer
    ? messages.filter(
        (m) =>
          !m.roomId &&
          ((m.senderId === currentUid && m.receiverId === activePeer.uid) ||
            (m.senderId === activePeer.uid && m.receiverId === currentUid))
      )
    : [];

  return (
    <div className="bg-[#131822] border border-white/8 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
      {/* Thread List */}
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-white/8 p-4 space-y-2">
        <h2 className="text-sm font-bold text-white px-2 pb-2 font-display">Direct Messages</h2>
        {peers.map((peer) => {
          const isSelected = activePeer?.uid === peer.uid;
          return (
            <button
              key={peer.uid}
              type="button"
              onClick={() => onSelectPeer(peer.uid)}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                isSelected ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-white/5'
              }`}
            >
              <img
                src={peer.avatarUrl}
                alt={peer.username}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{peer.username}</p>
                <p className="text-[11px] text-slate-400 truncate">{peer.presenceStatus}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Chat Panel */}
      <div className="md:col-span-8 flex flex-col">
        {activePeer ? (
          <>
            <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={activePeer.avatarUrl}
                  alt={activePeer.username}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{activePeer.username}</p>
                  <p className="text-[11px] text-emerald-400">
                    {typingUser === activePeer.username ? 'Typing...' : activePeer.presenceStatus}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSendBetInvite(activePeer)}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Swords className="w-3.5 h-3.5" />
                Send Bet Invite
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[380px]">
              {threadMessages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">
                  Start the conversation or drop a snack bet invite!
                </p>
              ) : (
                threadMessages.map((msg) => {
                  const mine = msg.senderId === currentUid;
                  const linkedWager = msg.wagerId
                    ? wagers.find((w) => w.id === msg.wagerId)
                    : undefined;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] p-3.5 rounded-xl text-xs space-y-2 ${
                          mine
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                            : 'bg-[#0B0E14] border border-white/10 text-slate-200'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.content}</p>
                        {linkedWager && (
                          <button
                            type="button"
                            onClick={() => onOpenWager(linkedWager)}
                            className="w-full text-left p-2.5 rounded-lg bg-[#131822] border border-amber-500/35 hover:border-amber-400 transition-colors cursor-pointer"
                          >
                            <p className="font-semibold text-amber-300 flex items-center justify-between">
                              <span>Interactive 1v1 Wager Card</span>
                              <span className="capitalize text-[11px]">{linkedWager.status}</span>
                            </p>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                              {linkedWager.gameType.toUpperCase()} · Click to inspect or approve
                            </p>
                          </button>
                        )}
                      </div>

                      {/* Emoji Reactions */}
                      <div className="flex items-center gap-1 mt-1">
                        {REACTION_EMOJIS.map((emoji) => {
                          const count = msg.reactions?.[emoji]?.length || 0;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReact(msg.id, emoji)}
                              className={`px-1.5 py-0.5 rounded text-[11px] cursor-pointer transition-colors ${
                                count > 0
                                  ? 'bg-white/12 text-white'
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                              }`}
                            >
                              {emoji} {count > 0 ? count : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                const txt = draft.trim();
                setDraft('');
                onTyping(activePeer.uid, false);
                await onSendMessage(activePeer.uid, txt);
              }}
              className="p-4 border-t border-white/8 flex items-center gap-2.5"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  onTyping(activePeer.uid, e.target.value.length > 0);
                }}
                placeholder={`Message ${activePeer.username}...`}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              />
              <button
                type="submit"
                aria-label="Send direct message"
                className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
            Select a player to start chatting.
          </div>
        )}
      </div>
    </div>
  );
};
