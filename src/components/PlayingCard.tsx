import React from 'react';
import { GOLD_CARDBACK_IMAGE } from '../data/catalog';
import type { Card } from '../types/snackstakes';

interface Props {
  card?: Card;
  faceDown?: boolean;
  cardBackSkin?: string;
  compact?: boolean;
}

export const PlayingCard: React.FC<Props> = ({
  card,
  faceDown = false,
  cardBackSkin = 'default',
  compact = false,
}) => {
  const sizeClass = compact ? 'w-12 h-16 text-xs' : 'w-16 h-24 text-base';

  if (faceDown || !card) {
    if (cardBackSkin === 'cosmetic_gold_foil') {
      return (
        <div
          className={`${sizeClass} rounded-lg border border-amber-400/60 overflow-hidden shadow-md shrink-0 bg-[#131822]`}
        >
          <img
            src={GOLD_CARDBACK_IMAGE}
            alt="Gold foil playing card back"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    if (cardBackSkin === 'cosmetic_neon_flame') {
      return (
        <div
          className={`${sizeClass} rounded-lg border border-orange-500/70 bg-gradient-to-br from-orange-950 via-[#131822] to-amber-950 flex items-center justify-center shadow-md shrink-0`}
        >
          <div className="w-6 h-8 rounded border border-orange-400/50 bg-orange-500/20" />
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-lg border border-emerald-500/40 bg-gradient-to-br from-[#0F241D] to-[#0B0E14] flex items-center justify-center shadow-md shrink-0`}
      >
        <div className="w-6 h-8 rounded border border-emerald-400/30 bg-emerald-500/10" />
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <div
      className={`${sizeClass} rounded-lg bg-white text-slate-950 border border-slate-200 shadow-md flex flex-col justify-between p-1.5 font-bold select-none shrink-0 transition-transform duration-150`}
    >
      <span className={`leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {card.rank}
      </span>
      <span
        className={`text-center leading-none ${compact ? 'text-base' : 'text-2xl'} ${
          isRed ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {card.suit}
      </span>
      <span className={`leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {card.rank}
      </span>
    </div>
  );
};
