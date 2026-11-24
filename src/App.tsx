import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { DoorOpen, ShoppingBag, Swords, Zap } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { BetSlipSidebar } from './components/BetSlipSidebar';
import { SoloCasinoArena } from './components/CasinoGames';
import { DashboardHeader, type DashboardTab } from './components/DashboardHeader';
import { FriendsView, MessagesView } from './components/FriendsAndMessages';
import { LandingPage } from './components/LandingPage';
import { LeaderboardView } from './components/LeaderboardView';
import { RoomsView } from './components/RoomsView';
import { DailyWheelAndHistory, ShopView } from './components/ShopAndWheel';
import { WagerModal } from './components/WagerModal';
import { auth } from './lib/firebase';
import {
  ensureFirebaseProfile,
  serverApi,
  signOutFirebase,
  subscribeFirebaseState,
  type AppStateSnapshot,
} from './lib/snackApi';
import type { NotificationItem, Profile, Wager } from './types/snackstakes';

const EMPTY_STATE: AppStateSnapshot = {
  profile: null,
  profiles: [],
  friendships: [],
  messages: [],
  inventory: [],
  wagers: [],
  rooms: [],
  ious: [],
  matchHistory: [],
  ticker: [],
};

export default function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppStateSnapshot>(EMPTY_STATE);

  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [betSlipOpen, setBetSlipOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedDmPeerId, setSelectedDmPeerId] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const [wagerModalOpen, setWagerModalOpen] = useState(false);
  const [editingWagerId, setEditingWagerId] = useState<string | null>(null);
  const [defaultOpponent, setDefaultOpponent] = useState<Profile | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = sessionToken;

  const refreshServerState = useCallback(async (tok?: string) => {
    const activeTok = tok || tokenRef.current;
    if (!activeTok) return;
    try {
      const res = await serverApi.getState(activeTok);
      setAppState(res.state);
    } catch {
      // Ignore transient refresh failure
    }
  }, []);

  // Handle ?autostart=1 for immediate demo verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !sessionToken && !firebaseUser) {
      serverApi
        .demoLogin()
        .then((res) => {
          setSessionToken(res.token);
          setAppState(res.state);
        })
        .catch(() => {});
    }
  }, [sessionToken, firebaseUser]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !tokenRef.current) {
        setFirebaseUser(user);
        await ensureFirebaseProfile(user).catch(() => {});
      } else if (!user) {
        setFirebaseUser(null);
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time subscription when signed in via Google Firebase
  useEffect(() => {
    if (!firebaseUser || sessionToken) return;
    const unsub = subscribeFirebaseState(firebaseUser.uid, (partial) => {
      setAppState((prev) => ({ ...prev, ...partial }));
    });
    return () => unsub();
  }, [firebaseUser, sessionToken]);

  // Real-time WebSocket connection for server-backed multiplayer sync
  useEffect(() => {
    if (!sessionToken) return;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token: sessionToken }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data)) as { event?: string; payload?: any };
          if (msg.event === 'state:refresh' || msg.event === 'chat:message') {
            void refreshServerState(sessionToken);
          } else if (msg.event === 'ticker:new' && msg.payload) {
            setAppState((prev) => ({
              ...prev,
              ticker: [msg.payload, ...prev.ticker.slice(0, 19)],
            }));
          } else if (msg.event === 'typing:indicator' && msg.payload) {
            const p = msg.payload as {
              senderId: string;
              senderName: string;
              receiverId?: string;
              isTyping: boolean;
            };
            if (p.receiverId === appState.profile?.uid) {
              setTypingUser(p.isTyping ? p.senderName : null);
            }
          }
        } catch {
          // Ignore invalid socket payload
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionToken, refreshServerState, appState.profile?.uid]);

  const showError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Action failed.';
    setToastError(msg);
    setTimeout(() => setToastError(null), 4000);
  };

  const handleQuickDemoFromLanding = async () => {
    try {
      const res = await serverApi.demoLogin();
      setSessionToken(res.token);
      setAppState(res.state);
      setAuthModalOpen(false);
    } catch (err) {
      showError(err);
    }
  };

  const handleSignOut = async () => {
    try {
      if (sessionToken) {
        await serverApi.logout(sessionToken).catch(() => {});
        setSessionToken(null);
      }
      if (firebaseUser) {
        await signOutFirebase();
        setFirebaseUser(null);
      }
      setAppState(EMPTY_STATE);
      setActiveRoomId(null);
      setActiveTab('home');
    } catch (err) {
      showError(err);
    }
  };

  const currentProfile = appState.profile;
  const currentUid = currentProfile?.uid || firebaseUser?.uid || '';

  const notifications = useMemo<NotificationItem[]>(() => {
    if (!currentUid) return [];
    const items: NotificationItem[] = [];

    for (const f of appState.friendships) {
      if (f.friendId === currentUid && f.status === 'pending') {
        const sender = appState.profiles.find((p) => p.uid === f.userId);
        items.push({
          id: `nf-${f.id}`,
          type: 'friend_request',
          title: 'New Friend Request',
          detail: `${sender?.username || 'Player'} wants to connect`,
          actionTab: 'friends',
          createdAt: f.createdAt,
        });
      }
    }

    for (const w of appState.wagers) {
      if (w.status === 'negotiating') {
        items.push({
          id: `nw-${w.id}`,
          type: 'wager_invite',
          title: '1v1 Wager Pending',
          detail: `${w.gameType.toUpperCase()} vs ${
            w.creatorId === currentUid ? w.opponentName : w.creatorName
          }`,
          actionTab: 'home',
          targetId: w.id,
          createdAt: w.updatedAt,
        });
      }
    }

    for (const iou of appState.ious) {
      if (!iou.settled && iou.winnerId === currentUid) {
        items.push({
          id: `ni-${iou.id}`,
          type: 'iou',
          title: 'Snack IOU Ready to Settle',
          detail: `${iou.loserName} owes you ${iou.stakeLabel}`,
          actionTab: 'ledger',
          createdAt: iou.createdAt,
        });
      }
    }

    return items;
  }, [currentUid, appState.friendships, appState.wagers, appState.ious, appState.profiles]);

  const activeEditingWager: Wager | null = editingWagerId
    ? appState.wagers.find((w) => w.id === editingWagerId) || null
    : null;

  // Render Public Landing Page when unauthenticated
  if (!currentProfile) {
    return (
      <>
        <LandingPage
          onOpenAuth={(tab) => {
            setAuthModalTab(tab);
            setAuthModalOpen(true);
          }}
          onQuickDemo={handleQuickDemoFromLanding}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialTab={authModalTab}
          onClose={() => setAuthModalOpen(false)}
          onServerAuthSuccess={(token, state) => {
            setSessionToken(token);
            setAppState(state);
            setAuthModalOpen(false);
          }}
          onFirebaseAuthSuccess={(user) => {
            setFirebaseUser(user);
            setAuthModalOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col">
      <DashboardHeader
        profile={currentProfile}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        notifications={notifications}
        onNotificationClick={(n) => {
          if (n.type === 'wager_invite' && n.targetId) {
            setEditingWagerId(n.targetId);
            setWagerModalOpen(true);
          } else if (n.actionTab === 'ledger') {
            setBetSlipOpen(true);
          } else {
            setActiveTab(n.actionTab);
          }
        }}
        betSlipOpen={betSlipOpen}
        onToggleBetSlip={() => setBetSlipOpen((v) => !v)}
        onSignOut={handleSignOut}
      />

      {toastError && (
        <div
          role="alert"
          className="max-w-md mx-auto mt-3 px-4 py-2.5 rounded-lg bg-red-500/15 border border-red-500/35 text-xs text-red-200"
        >
          {toastError}
        </div>
      )}

      <div className="flex-1 max-w-[1600px] w-full mx-auto flex flex-col lg:flex-row">
        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-6">
          {activeTab === 'home' && (
            <>
              {/* Live Win Ticker Strip */}
              <div className="rounded-xl bg-[#131822] border border-white/8 px-4 py-2.5 overflow-hidden">
                <div className="animate-ticker flex items-center gap-8 text-xs text-slate-300">
                  {(appState.ticker.length > 0 ? [...appState.ticker, ...appState.ticker] : []).map(
                    (item, idx) => (
                      <div key={`${item.id}-${idx}`} className="flex items-center gap-2 whitespace-nowrap shrink-0">
                        <span className="text-amber-400 font-semibold">WIN</span>
                        <span className="text-slate-600">·</span>
                        <span>{item.text}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Quick Lobby Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={async () => {
                    if (!sessionToken) {
                      setActiveTab('rooms');
                      return;
                    }
                    try {
                      const res = await serverApi.quickMatch(sessionToken, 'blackjack');
                      setAppState(res.state);
                      setActiveRoomId(res.room.id);
                      setActiveTab('rooms');
                    } catch (err) {
                      showError(err);
                    }
                  }}
                  className="text-left p-5 rounded-xl bg-[#131822] border border-white/8 hover:border-emerald-500/40 transition-colors cursor-pointer space-y-2"
                >
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm font-bold text-white">Quick Match</p>
                  <p className="text-xs text-slate-400">
                    Auto-pair into an active friend lobby
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  className="text-left p-5 rounded-xl bg-[#131822] border border-white/8 hover:border-emerald-500/40 transition-colors cursor-pointer space-y-2"
                >
                  <DoorOpen className="w-5 h-5 text-amber-400" />
                  <p className="text-sm font-bold text-white">Rooms &amp; Group Play</p>
                  <p className="text-xs text-slate-400">
                    Host 2–8 player tables with 6-char codes
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingWagerId(null);
                    setDefaultOpponent(null);
                    setWagerModalOpen(true);
                  }}
                  className="text-left p-5 rounded-xl bg-[#131822] border border-white/8 hover:border-amber-500/40 transition-colors cursor-pointer space-y-2"
                >
                  <Swords className="w-5 h-5 text-orange-400" />
                  <p className="text-sm font-bold text-white">1v1 Snack Duel</p>
                  <p className="text-xs text-slate-400">
                    Negotiate snack or custom food stakes
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('shop')}
                  className="text-left p-5 rounded-xl bg-[#131822] border border-white/8 hover:border-emerald-500/40 transition-colors cursor-pointer space-y-2"
                >
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm font-bold text-white">Snack &amp; VIP Shop</p>
                  <p className="text-xs text-slate-400">
                    Buy Egg, Monday–Sunday Snacks &amp; Suya
                  </p>
                </button>
              </div>

              {/* Playable Solo Casino Engine */}
              <SoloCasinoArena
                profile={currentProfile}
                onCompleteSoloRound={async (payload) => {
                  if (!sessionToken) return;
                  try {
                    const res = await serverApi.completeSoloRound(sessionToken, payload);
                    setAppState(res.state);
                  } catch (err) {
                    showError(err);
                  }
                }}
              />

              {/* Daily Wheel Spin & Match History */}
              <DailyWheelAndHistory
                profile={currentProfile}
                matchHistory={appState.matchHistory}
                onSpinWheel={async () => {
                  if (!sessionToken) {
                    throw new Error('Daily Wheel sync requires active server session.');
                  }
                  const res = await serverApi.spinDailyWheel(sessionToken);
                  setAppState(res.state);
                  return res;
                }}
              />
            </>
          )}

          {activeTab === 'rooms' && (
            <RoomsView
              currentUid={currentUid}
              profile={currentProfile}
              profiles={appState.profiles}
              inventory={appState.inventory}
              rooms={appState.rooms}
              messages={appState.messages}
              activeRoomId={activeRoomId}
              onSelectRoom={(id) => setActiveRoomId(id)}
              onCreateRoom={async (gameType, maxPlayers) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.createRoom(sessionToken, gameType, maxPlayers);
                  setAppState(res.state);
                  setActiveRoomId(res.room.id);
                } catch (err) {
                  showError(err);
                }
              }}
              onJoinRoom={async (payload) => {
                if (!sessionToken) return;
                const res = await serverApi.joinRoom(sessionToken, payload);
                setAppState(res.state);
                setActiveRoomId(res.room.id);
              }}
              onQuickMatch={async (gameType) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.quickMatch(sessionToken, gameType);
                  setAppState(res.state);
                  setActiveRoomId(res.room.id);
                } catch (err) {
                  showError(err);
                }
              }}
              onAddFriendToRoom={async (roomId, friendId) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.addFriendToRoom(sessionToken, roomId, friendId);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onUpdateStake={async (roomId, payload) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.updateRoomStake(sessionToken, roomId, payload);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onStartRoom={async (roomId) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.startRoom(sessionToken, roomId);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onRoomAction={async (roomId, action, choice) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.roomAction(sessionToken, roomId, action, choice);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onSendRoomMessage={async (roomId, content) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.sendMessage(sessionToken, { roomId, content });
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsView
              currentUid={currentUid}
              profiles={appState.profiles}
              friendships={appState.friendships}
              onSendRequest={async (friendId) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.sendFriendRequest(sessionToken, friendId);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onAcceptRequest={async (friendshipId) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.acceptFriend(sessionToken, friendshipId);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onDeclineRequest={async (friendshipId) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.declineFriend(sessionToken, friendshipId);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onOpenDm={(friend) => {
                setSelectedDmPeerId(friend.uid);
                setActiveTab('messages');
              }}
              onChallenge={(friend) => {
                setEditingWagerId(null);
                setDefaultOpponent(friend);
                setWagerModalOpen(true);
              }}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesView
              currentUid={currentUid}
              profiles={appState.profiles}
              messages={appState.messages}
              wagers={appState.wagers}
              selectedPeerId={selectedDmPeerId}
              typingUser={typingUser}
              onSelectPeer={(id) => setSelectedDmPeerId(id)}
              onSendMessage={async (receiverId, content) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.sendMessage(sessionToken, { receiverId, content });
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onTyping={(receiverId, isTyping) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({ type: 'typing', receiverId, isTyping })
                  );
                }
              }}
              onReact={async (messageId, emoji) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.reactToMessage(sessionToken, messageId, emoji);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
              onSendBetInvite={(friend) => {
                setEditingWagerId(null);
                setDefaultOpponent(friend);
                setWagerModalOpen(true);
              }}
              onOpenWager={(wager) => {
                setEditingWagerId(wager.id);
                setWagerModalOpen(true);
              }}
            />
          )}

          {activeTab === 'shop' && (
            <ShopView
              profile={currentProfile}
              inventory={appState.inventory}
              onBuy={async (itemId) => {
                if (!sessionToken) return;
                const res = await serverApi.buyShopItem(sessionToken, itemId);
                setAppState(res.state);
              }}
              onEquip={async (itemId) => {
                if (!sessionToken) return;
                try {
                  const res = await serverApi.equipShopItem(sessionToken, itemId);
                  setAppState(res.state);
                } catch (err) {
                  showError(err);
                }
              }}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView currentUid={currentUid} profiles={appState.profiles} />
          )}
        </main>

        <BetSlipSidebar
          isOpen={betSlipOpen}
          onClose={() => setBetSlipOpen(false)}
          currentUid={currentUid}
          profiles={appState.profiles}
          wagers={appState.wagers}
          rooms={appState.rooms}
          ious={appState.ious}
          onOpenWager={(wager) => {
            setEditingWagerId(wager.id);
            setWagerModalOpen(true);
          }}
          onJoinRoom={(roomId) => {
            setActiveRoomId(roomId);
            setActiveTab('rooms');
          }}
          onSettleIou={async (iouId) => {
            if (!sessionToken) return;
            try {
              const res = await serverApi.settleIou(sessionToken, iouId);
              setAppState(res.state);
            } catch (err) {
              showError(err);
            }
          }}
        />
      </div>

      <WagerModal
        isOpen={wagerModalOpen}
        onClose={() => {
          setWagerModalOpen(false);
          setEditingWagerId(null);
        }}
        currentUid={currentUid}
        profiles={appState.profiles}
        inventory={appState.inventory}
        existingWager={activeEditingWager}
        defaultOpponent={defaultOpponent}
        onCreateWager={async (payload) => {
          if (!sessionToken) return;
          const res = await serverApi.createWager(sessionToken, payload);
          setAppState(res.state);
          return res.wager;
        }}
        onUpdateOffer={async (wagerId, payload) => {
          if (!sessionToken) return;
          const res = await serverApi.updateWagerOffer(sessionToken, wagerId, payload);
          setAppState(res.state);
        }}
        onCancelWager={async (wagerId) => {
          if (!sessionToken) return;
          const res = await serverApi.cancelWager(sessionToken, wagerId);
          setAppState(res.state);
        }}
        onEnterRoom={(roomId) => {
          setActiveRoomId(roomId);
          setActiveTab('rooms');
        }}
      />
    </div>
  );
}
