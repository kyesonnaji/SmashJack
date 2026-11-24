import type { ShopItem, TickerItem } from '../types/snackstakes';

export const HERO_LOUNGE_IMAGE = '/src/assets/images/hero_lounge_table_1795510279152.jpg';
export const GOLD_CARDBACK_IMAGE = '/src/assets/images/cosmetic_gold_cardback_1795510281076.jpg';

export const SNACK_AND_SHOP_CATALOG: ShopItem[] = [
  // Daily Snack & Meat Menu (All 8 Required Items)
  {
    id: 'snack_egg',
    name: 'Egg',
    subtitle: 'Classic Egg Snack Token — nimble 1v1 side stake',
    itemType: 'snack',
    price: 80,
    imageUrl: '/src/assets/images/snack_classic_egg_1795510281070.jpg',
    accentColor: '#F59E0B',
    tag: 'Daily Menu',
  },
  {
    id: 'snack_monday',
    name: 'Monday Snack',
    subtitle: 'Monday Kickoff Combo — savory wrap & drink token',
    itemType: 'snack',
    price: 150,
    imageUrl: '/src/assets/images/snack_friday_platter_1795510280423.jpg',
    accentColor: '#10B981',
    tag: 'Daily Menu',
  },
  {
    id: 'snack_tuesday',
    name: 'Tuesday Snack',
    subtitle: 'Tuesday Treat Box — crispy tacos & chilled soda',
    itemType: 'snack',
    price: 160,
    imageUrl: '/src/assets/images/snack_friday_platter_1795510280423.jpg',
    accentColor: '#F97316',
    tag: 'Daily Menu',
  },
  {
    id: 'snack_wednesday',
    name: 'Wednesday Snack',
    subtitle: 'Midweek Crunch Pack — spiced wings & kettle chips',
    itemType: 'snack',
    price: 180,
    imageUrl: '/src/assets/images/snack_friday_platter_1795510280423.jpg',
    accentColor: '#F59E0B',
    tag: 'Daily Menu',
  },
  {
    id: 'snack_thursday',
    name: 'Thursday Snack',
    subtitle: 'Thursday Feast Bite — loaded sliders & garlic dip',
    itemType: 'snack',
    price: 200,
    imageUrl: '/src/assets/images/snack_friday_platter_1795510280423.jpg',
    accentColor: '#10B981',
    tag: 'Daily Menu',
  },
  {
    id: 'snack_friday',
    name: 'Friday Snack',
    subtitle: 'Friday Night VIP Platter — sliders, wings & golden fries',
    itemType: 'snack',
    price: 320,
    imageUrl: '/src/assets/images/snack_friday_platter_1795510280423.jpg',
    accentColor: '#F59E0B',
    tag: 'VIP Platter',
  },
  {
    id: 'snack_sunday',
    name: 'Sunday Snack',
    subtitle: 'Sunday Chill Special — grilled bites & sweet pastries',
    itemType: 'snack',
    price: 240,
    imageUrl: '/src/assets/images/snack_classic_egg_1795510281070.jpg',
    accentColor: '#F97316',
    tag: 'Weekend Menu',
  },
  {
    id: 'snack_grilled_meat',
    name: 'Grilled Meat / Suya Platter',
    subtitle: 'High-Stakes Meat Token — smoky spiced skewers & sides',
    itemType: 'snack',
    price: 450,
    imageUrl: '/src/assets/images/snack_grilled_meat_1795510280453.jpg',
    accentColor: '#F97316',
    tag: 'High Stakes',
  },

  // VIP Cosmetics & Boosters
  {
    id: 'cosmetic_gold_foil',
    name: 'Gold Foil Card Back',
    subtitle: '24k geometric filigree deck finish for Blackjack & High-Low',
    itemType: 'cosmetic',
    cosmeticSlot: 'cardBack',
    price: 400,
    imageUrl: '/src/assets/images/cosmetic_gold_cardback_1795510281076.jpg',
    accentColor: '#F59E0B',
    tag: 'Card Back',
  },
  {
    id: 'cosmetic_neon_flame',
    name: 'Neon Flame Card Back',
    subtitle: 'Obsidian ember edge deck skin with crisp flame crest',
    itemType: 'cosmetic',
    cosmeticSlot: 'cardBack',
    price: 550,
    accentColor: '#F97316',
    tag: 'Card Back',
  },
  {
    id: 'cosmetic_emerald_felt',
    name: 'Emerald VIP Table Felt',
    subtitle: 'Deep tournament emerald felt with brushed gold trim',
    itemType: 'cosmetic',
    cosmeticSlot: 'felt',
    price: 350,
    accentColor: '#10B981',
    tag: 'Table Felt',
  },
  {
    id: 'cosmetic_crimson_felt',
    name: 'Obsidian Crimson Felt',
    subtitle: 'High-roller velvet crimson felt for private rooms',
    itemType: 'cosmetic',
    cosmeticSlot: 'felt',
    price: 500,
    accentColor: '#F97316',
    tag: 'Table Felt',
  },
  {
    id: 'cosmetic_gold_frame',
    name: 'Gold Crown Avatar Frame',
    subtitle: 'Metallic gold bezel around your lounge profile badge',
    itemType: 'cosmetic',
    cosmeticSlot: 'frame',
    price: 300,
    accentColor: '#F59E0B',
    tag: 'Avatar Frame',
  },
  {
    id: 'cosmetic_ember_frame',
    name: 'Ember Halo Avatar Frame',
    subtitle: 'Luminous amber-orange ring for high-streak players',
    itemType: 'cosmetic',
    cosmeticSlot: 'frame',
    price: 450,
    accentColor: '#F97316',
    tag: 'Avatar Frame',
  },
  {
    id: 'booster_2x_xp',
    name: '2x XP Booster (24h)',
    subtitle: 'Doubles all XP earned across Solo, 1v1, and Group Rooms',
    itemType: 'booster',
    price: 250,
    accentColor: '#10B981',
    tag: 'Booster',
  },
];

export interface WheelSegment {
  id: string;
  label: string;
  rewardType: 'coins' | 'booster' | 'snack';
  amount: number;
  snackId?: string;
  snackName?: string;
  color: string;
}

export const DAILY_WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'seg_1', label: '75 Coins', rewardType: 'coins', amount: 75, color: '#1E293B' },
  { id: 'seg_2', label: 'Egg Token', rewardType: 'snack', amount: 1, snackId: 'snack_egg', snackName: 'Egg', color: '#065F46' },
  { id: 'seg_3', label: '150 Coins', rewardType: 'coins', amount: 150, color: '#1E293B' },
  { id: 'seg_4', label: '2x XP Boost', rewardType: 'booster', amount: 1, color: '#92400E' },
  { id: 'seg_5', label: '250 Coins', rewardType: 'coins', amount: 250, color: '#1E293B' },
  { id: 'seg_6', label: 'Mon Snack', rewardType: 'snack', amount: 1, snackId: 'snack_monday', snackName: 'Monday Snack', color: '#9A3412' },
  { id: 'seg_7', label: '500 Coins', rewardType: 'coins', amount: 500, color: '#064E3B' },
  { id: 'seg_8', label: '100 Coins', rewardType: 'coins', amount: 100, color: '#1E293B' },
];

export const INITIAL_TICKER_ITEMS: TickerItem[] = [
  {
    id: 'tick_1',
    text: 'Tunde won a Friday Snack & Grilled Meat / Suya Platter in Group Blackjack',
    gameType: 'blackjack',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tick_2',
    text: 'Sarah settled a Monday Snack wager with Kofi',
    gameType: 'highlow',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tick_3',
    text: 'Kofi hit 35:1 on Number 17 in VIP Roulette for +700 Coins',
    gameType: 'roulette',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tick_4',
    text: 'Maya swept a 4-player Dice Roll pot including a Thursday Snack',
    gameType: 'dice',
    createdAt: new Date().toISOString(),
  },
];

export const GAME_META = {
  blackjack: {
    id: 'blackjack',
    title: 'Multiplayer Blackjack',
    subtitle: '21 or bust against the dealer with Hit, Stand, Double Down & live turn timer.',
    playersLabel: '1–8 Players',
    accent: '#10B981',
  },
  highlow: {
    id: 'highlow',
    title: 'High-Low Card Duel',
    subtitle: 'Call higher or lower on the next card draw to stack instant snack multipliers.',
    playersLabel: '1–8 Players',
    accent: '#F59E0B',
  },
  roulette: {
    id: 'roulette',
    title: 'Roulette Wheel',
    subtitle: 'European single-zero wheel with Red/Black, Even/Odd, Dozens & Straight 35:1 bets.',
    playersLabel: '1–8 Players',
    accent: '#F97316',
  },
  dice: {
    id: 'dice',
    title: 'Dice Roll',
    subtitle: 'Dual-die high-stakes roll on Under 7, Lucky 7 (5x), Over 7, or Doubles.',
    playersLabel: '1–8 Players',
    accent: '#10B981',
  },
} as const;
