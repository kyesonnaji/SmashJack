import React, { useState } from 'react';
import { Check, Swords, X } from 'lucide-react';
import type { GameType, InventoryItem, Profile, Wager, WagerOffer } from '../types/snackstakes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUid: string;
  profiles: Profile[];
  inventory: InventoryItem[];
  existingWager?: Wager | null;
  defaultOpponent?: Profile | null;
  onCreateWager: (payload: {
    opponentId: string;
    creatorOffer: WagerOffer;
    gameType: GameType;
    sendInChat?: boolean;
  }) => Promise<Wager | void>;
  onUpdateOffer: (wagerId: string, payload: { offer?: WagerOffer; approve?: boolean }) => Promise<void>;
  onCancelWager: (wagerId: string) => Promise<void>;
  onEnterRoom: (roomId: string) => void;
}

export const WagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUid,
  profiles,
  inventory,
  existingWager,
  defaultOpponent,
  onCreateWager,
  onUpdateOffer,
  onCancelWager,
  onEnterRoom,
}) => {
  const snackItems = inventory.filter((i) => i.itemType === 'snack' && i.quantity > 0);
  const availableOpponents = profiles.filter((p) => p.uid !== currentUid);

  const [opponentId, setOpponentId] = useState<string>(
    defaultOpponent?.uid || availableOpponents[0]?.uid || ''
  );
  const [gameType, setGameType] = useState<GameType>(existingWager?.gameType || 'blackjack');
  const [selectedSnackId, setSelectedSnackId] = useState<string>(snackItems[0]?.itemId || '');
  const [customStake, setCustomStake] = useState<string>('');
  const [coins, setCoins] = useState<number>(50);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (defaultOpponent?.uid) setOpponentId(defaultOpponent.uid);
  }, [defaultOpponent]);

  if (!isOpen) return null;

  const buildOffer = (): WagerOffer => {
    const chosenSnack = snackItems.find((s) => s.itemId === selectedSnackId);
    return {
      snackItemId: chosenSnack?.itemId,
      snackName: chosenSnack?.itemName,
      customStake: customStake.trim() || undefined,
      coins: Math.max(0, Math.floor(coins)),
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentId) return;
    setBusy(true);
    try {
      const created = await onCreateWager({
        opponentId,
        creatorOffer: buildOffer(),
        gameType,
        sendInChat: true,
      });
      if (created && created.roomId) {
        onEnterRoom(created.roomId);
        onClose();
      } else {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const renderOfferBox = (title: string, offer: WagerOffer, approved: boolean) => (
    <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/10 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-white">{title}</span>
        <span className={approved ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
          {approved ? 'Approved' : 'Pending'}
        </span>
      </div>
      <p className="text-sm font-semibold text-amber-300">
        {offer.snackName || offer.customStake || 'Coins Only'}
      </p>
      {offer.customStake && offer.snackName && (
        <p className="text-xs text-slate-300">+ {offer.customStake}</p>
      )}
      <p className="text-xs font-mono tabular-nums text-slate-400">
        Side Coins: {offer.coins}
      </p>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wager-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl bg-[#131822] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 id="wager-modal-title" className="text-base font-bold text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            {existingWager ? '1v1 Wager Negotiation' : 'Challenge Friend to 1v1 Bet'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wager modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {existingWager ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderOfferBox(
                  existingWager.creatorName || 'Creator',
                  existingWager.creatorOffer,
                  existingWager.creatorApproved
                )}
                {renderOfferBox(
                  existingWager.opponentName || 'Opponent',
                  existingWager.opponentOffer,
                  existingWager.opponentApproved
                )}
              </div>

              {existingWager.status === 'active' && existingWager.roomId ? (
                <button
                  type="button"
                  onClick={() => {
                    onEnterRoom(existingWager.roomId!);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold cursor-pointer"
                >
                  Enter Locked 1v1 Room
                </button>
              ) : existingWager.status === 'negotiating' ? (
                <div className="space-y-4 pt-2 border-t border-white/8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Your Snack Stake</label>
                      <select
                        value={selectedSnackId}
                        onChange={(e) => setSelectedSnackId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                      >
                        <option value="">No Inventory Snack</option>
                        {snackItems.map((s) => (
                          <option key={s.id} value={s.itemId}>
                            {s.itemName} (x{s.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Coins Side-Bet</label>
                      <input
                        type="number"
                        min={0}
                        value={coins}
                        onChange={(e) => setCoins(Number(e.target.value || 0))}
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customStake}
                    onChange={(e) => setCustomStake(e.target.value)}
                    placeholder="Or type custom food / dare wager (e.g. Spicy Shawarma)"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                  />
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await onUpdateOffer(existingWager.id, {
                          offer: buildOffer(),
                          approve: true,
                        });
                        setBusy(false);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Approve Offer
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await onCancelWager(existingWager.id);
                        setBusy(false);
                        onClose();
                      }}
                      className="py-2.5 px-4 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel Match
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">This wager is {existingWager.status}.</p>
              )}
            </>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wager-opponent" className="block text-xs text-slate-300 mb-1.5">
                    Opponent
                  </label>
                  <select
                    id="wager-opponent"
                    value={opponentId}
                    onChange={(e) => setOpponentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                  >
                    {availableOpponents.map((p) => (
                      <option key={p.uid} value={p.uid}>
                        {p.username} ({p.presenceStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="wager-game" className="block text-xs text-slate-300 mb-1.5">
                    Game
                  </label>
                  <select
                    id="wager-game"
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as GameType)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                  >
                    <option value="blackjack">Blackjack</option>
                    <option value="highlow">High-Low Card Duel</option>
                    <option value="roulette">Roulette Wheel</option>
                    <option value="dice">Dice Roll</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wager-snack" className="block text-xs text-slate-300 mb-1.5">
                    Snack from Inventory
                  </label>
                  <select
                    id="wager-snack"
                    value={selectedSnackId}
                    onChange={(e) => setSelectedSnackId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                  >
                    <option value="">No Inventory Snack</option>
                    {snackItems.map((s) => (
                      <option key={s.id} value={s.itemId}>
                        {s.itemName} (x{s.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="wager-coins" className="block text-xs text-slate-300 mb-1.5">
                    Optional Coins
                  </label>
                  <input
                    id="wager-coins"
                    type="number"
                    min={0}
                    value={coins}
                    onChange={(e) => setCoins(Number(e.target.value || 0))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="wager-custom" className="block text-xs text-slate-300 mb-1.5">
                  Custom Food / Friendly Dare (Optional)
                </label>
                <input
                  id="wager-custom"
                  type="text"
                  value={customStake}
                  onChange={(e) => setCustomStake(e.target.value)}
                  placeholder="e.g. Winner gets iced matcha + grilled wings"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Send Wager Invite
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
