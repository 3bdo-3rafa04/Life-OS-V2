import {
  TaskItem,
  PomodoroSessionRecord,
  StudyModuleItem,
  StudyItemRecord,
  HealthLogRecord,
  GoalHabitRecord,
  PersonalRecord,
  UserProfile,
} from '../types.ts';

export type RpgRankTier =
  | 'Beginner'
  | 'Explorer'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Legend';

export type RpgItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export type RpgShopCategory =
  | 'Furniture'
  | 'Electronics'
  | 'Decorations'
  | 'Plants'
  | 'Pets'
  | 'Wallpapers'
  | 'Room Themes'
  | 'Special Items';

export type RpgRoomSlot =
  | 'desk'
  | 'chair'
  | 'computer'
  | 'keyboard'
  | 'lamp'
  | 'shelf'
  | 'plant_left'
  | 'plant_right'
  | 'poster'
  | 'rug'
  | 'clock'
  | 'pet'
  | 'special'
  | 'wallpaper'
  | 'theme';

export type StudyEnvironmentMode = 'morning_study' | 'rainy_day' | 'night_study';

export type AmbientSoundType = 'off' | 'rain' | 'fireplace' | 'night_wind' | 'brown_noise';

export interface RpgShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: RpgShopCategory;
  subType: string;
  slot: RpgRoomSlot;
  rarity: RpgItemRarity;
  defaultX: number;
  defaultY: number;
  isStarter?: boolean;
  levelRequired?: number;
}

export interface RpgPlacedItem {
  itemId: string;
  slot: RpgRoomSlot;
  offsetX: number;
  offsetY: number;
}

export interface RpgRoomPreset {
  id: string;
  name: string;
  createdAt: string;
  environment: StudyEnvironmentMode;
  placedItems: RpgPlacedItem[];
}

export interface RpgAvatarConfig {
  skinTone: '#F3C6A5' | '#E0AC69' | '#C68642' | '#8D5524';
  hairStyle: 'scholar' | 'spiky' | 'long' | 'hooded';
  hairColor: '#2C221E' | '#6E473B' | '#D7B779' | '#B97862' | '#788FA3';
  outfitColor: '#294C45' | '#B97862' | '#788FA3' | '#D7B779' | '#4A3B5C';
  hat: 'none' | 'wizard_hat' | 'headband' | 'crown' | 'headphones';
  titleBadge: string;
}

export interface RpgCoinTransaction {
  id: string;
  timestamp: string;
  type: 'earn' | 'spend';
  amount: number;
  xpDelta: number;
  reason: string;
  sourceModule: 'task' | 'pomodoro' | 'habit' | 'study' | 'workout' | 'mission' | 'achievement' | 'shop' | 'level_up';
  activityKey?: string;
}

export type RpgMissionType = 'daily' | 'weekly' | 'special';
export type RpgMissionDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Epic';

export interface RpgMission {
  id: string;
  title: string;
  description: string;
  missionType: RpgMissionType;
  difficulty: RpgMissionDifficulty;
  targetValue: number;
  currentValue: number;
  unit: string;
  xpReward: number;
  coinReward: number;
  metricKey:
    | 'daily_pomodoros'
    | 'daily_lectures'
    | 'daily_tasks'
    | 'daily_flashcards'
    | 'daily_workout'
    | 'weekly_study_hours'
    | 'weekly_lectures'
    | 'weekly_streak'
    | 'weekly_habits'
    | 'special_exam_prep'
    | 'special_fitness_prs'
    | 'special_deep_focus'
    | 'custom_ai';
  linkedEntityId?: string;
  periodKey: string; // e.g. '2026-11-17' for daily, '2026-W46' for weekly, 'lifetime' for special
  isAiGenerated?: boolean;
  claimed: boolean;
}

export interface RpgAchievement {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  rarity: RpgItemRarity;
  xpReward: number;
  coinReward: number;
  currentProgress: number;
  targetProgress: number;
  unlocked: boolean;
  claimed: boolean;
  unlockedAt?: string;
}

export interface RpgGamificationState {
  ownedItemIds: string[];
  placedItems: RpgPlacedItem[];
  savedRoomPresets: RpgRoomPreset[];
  activeEnvironment: StudyEnvironmentMode;
  activeAmbientSound: AmbientSoundType;
  ambientVolume: number;
  avatar: RpgAvatarConfig;
  customMissions: RpgMission[];
  claimedMissionKeys: string[];
  claimedAchievementIds: string[];
  rewardedActivityIds: string[];
  transactions: RpgCoinTransaction[];
  updatedAt: string;
}

export const STARTER_ITEM_IDS = [
  'desk_basic',
  'chair_basic',
  'pc_basic',
  'lamp_basic',
  'shelf_basic',
  'wall_timber',
  'theme_forest',
];

export const DEFAULT_PLACED_ITEMS: RpgPlacedItem[] = [
  { itemId: 'wall_timber', slot: 'wallpaper', offsetX: 0, offsetY: 0 },
  { itemId: 'theme_forest', slot: 'theme', offsetX: 0, offsetY: 0 },
  { itemId: 'desk_basic', slot: 'desk', offsetX: 0, offsetY: 0 },
  { itemId: 'chair_basic', slot: 'chair', offsetX: 0, offsetY: 0 },
  { itemId: 'pc_basic', slot: 'computer', offsetX: 0, offsetY: 0 },
  { itemId: 'lamp_basic', slot: 'lamp', offsetX: 0, offsetY: 0 },
  { itemId: 'shelf_basic', slot: 'shelf', offsetX: 0, offsetY: 0 },
];

export const DEFAULT_RPG_STATE: RpgGamificationState = {
  ownedItemIds: [...STARTER_ITEM_IDS],
  placedItems: [...DEFAULT_PLACED_ITEMS],
  savedRoomPresets: [
    {
      id: 'preset_starter',
      name: 'Starter Study Nook',
      createdAt: new Date().toISOString(),
      environment: 'morning_study',
      placedItems: [...DEFAULT_PLACED_ITEMS],
    },
  ],
  activeEnvironment: 'night_study',
  activeAmbientSound: 'off',
  ambientVolume: 0.4,
  avatar: {
    skinTone: '#F3C6A5',
    hairStyle: 'scholar',
    hairColor: '#2C221E',
    outfitColor: '#294C45',
    hat: 'headphones',
    titleBadge: 'Focus Adventurer',
  },
  customMissions: [],
  claimedMissionKeys: [],
  claimedAchievementIds: [],
  rewardedActivityIds: [],
  transactions: [],
  updatedAt: new Date().toISOString(),
};

// Complete Pixel-Art Item Shop Catalog (30 distinct items with custom pixel-art sprites)
export const RPG_SHOP_ITEMS: RpgShopItem[] = [
  // Starter Items (Price 0, owned by default)
  {
    id: 'desk_basic',
    name: 'Basic Wooden Desk',
    description: 'Sturdy pine study desk where every scholar begins their journey.',
    price: 0,
    category: 'Furniture',
    subType: 'Desk',
    slot: 'desk',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
    isStarter: true,
  },
  {
    id: 'chair_basic',
    name: 'Simple Wooden Chair',
    description: 'Classic four-legged wooden study chair.',
    price: 0,
    category: 'Furniture',
    subType: 'Chair',
    slot: 'chair',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
    isStarter: true,
  },
  {
    id: 'pc_basic',
    name: 'Basic Desktop Computer',
    description: 'Reliable compact monitor for lecture slides and flashcards.',
    price: 0,
    category: 'Electronics',
    subType: 'Computer',
    slot: 'computer',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
    isStarter: true,
  },
  {
    id: 'lamp_basic',
    name: 'Warm Brass Desk Lamp',
    description: 'Casts a focused pool of warm amber light across your notes.',
    price: 0,
    category: 'Electronics',
    subType: 'Lamp',
    slot: 'lamp',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
    isStarter: true,
  },
  {
    id: 'shelf_basic',
    name: 'Empty Wall Shelves',
    description: 'Simple wooden wall shelves waiting to be filled with knowledge.',
    price: 0,
    category: 'Furniture',
    subType: 'Bookshelf',
    slot: 'shelf',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
    isStarter: true,
  },
  {
    id: 'wall_timber',
    name: 'Cozy Timber Wainscoting',
    description: 'Classic warm cabin wall paneling.',
    price: 0,
    category: 'Wallpapers',
    subType: 'Wallpaper',
    slot: 'wallpaper',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
    isStarter: true,
  },
  {
    id: 'theme_forest',
    name: 'Deep Forest Sanctuary Theme',
    description: 'Signature Deep Forest & Warm Gold RPG study atmosphere.',
    price: 0,
    category: 'Room Themes',
    subType: 'Theme',
    slot: 'theme',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
    isStarter: true,
  },

  // Upgradable Furniture
  {
    id: 'desk_oak_scholar',
    name: 'Crafted Oak Scholar Desk',
    description: 'Wide carved oak desk with brass drawer pulls and leather writing mat.',
    price: 85,
    category: 'Furniture',
    subType: 'Desk',
    slot: 'desk',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'desk_standing_pro',
    name: 'Walnut Standing Command Desk',
    description: 'Motorized dark walnut desk with cable channels and warm LED trim.',
    price: 190,
    category: 'Furniture',
    subType: 'Desk',
    slot: 'desk',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'desk_alchemist_grand',
    name: 'Grand Guildmaster Desk',
    description: 'Gilded mahogany desk inlaid with celestial brass runes.',
    price: 380,
    category: 'Furniture',
    subType: 'Desk',
    slot: 'desk',
    rarity: 'Legendary',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'chair_cozy_cushion',
    name: 'Sage Velvet Study Chair',
    description: 'Plush tufted cushion chair in Pixel Green velvet.',
    price: 70,
    category: 'Furniture',
    subType: 'Chair',
    slot: 'chair',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'chair_ergo_throne',
    name: 'Ergonomic Scholar Throne',
    description: 'High-back lumbar support chair built for marathon Pomodoro blocks.',
    price: 175,
    category: 'Furniture',
    subType: 'Chair',
    slot: 'chair',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'shelf_medical_tomes',
    name: 'Medical Tome Library Shelf',
    description: 'Packed with leather-bound anatomy atlases, pathology texts, and scrolls.',
    price: 110,
    category: 'Furniture',
    subType: 'Bookshelf',
    slot: 'shelf',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'shelf_grimoire_grand',
    name: 'Grand Arcane Archive Case',
    description: 'Illuminated bookshelf with glowing crystal bookends and rare volumes.',
    price: 260,
    category: 'Furniture',
    subType: 'Bookshelf',
    slot: 'shelf',
    rarity: 'Epic',
    defaultX: 0,
    defaultY: 0,
  },

  // Electronics
  {
    id: 'pc_dual_monitor',
    name: 'Dual Monitor Workstation',
    description: 'Side-by-side pixel displays showing lecture diagrams and live flashcards.',
    price: 160,
    category: 'Electronics',
    subType: 'Monitor',
    slot: 'computer',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'pc_ultrawide_battlestation',
    name: 'Curved Ultrawide & Laptop Dock',
    description: 'Panoramic curved display with vertical reference monitor and glowing tower.',
    price: 340,
    category: 'Electronics',
    subType: 'Computer',
    slot: 'computer',
    rarity: 'Epic',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'kb_mechanical_custom',
    name: 'Custom Tactile Mechanical Keyboard',
    description: '65% custom keyboard with cream & sage keycaps and coiled aviator cable.',
    price: 65,
    category: 'Electronics',
    subType: 'Keyboard',
    slot: 'keyboard',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'lamp_banker_emerald',
    name: 'Emerald Glass Banker Lamp',
    description: 'Iconic library lamp with a hand-blown pixel green shade and brass pull chain.',
    price: 80,
    category: 'Electronics',
    subType: 'Lamp',
    slot: 'lamp',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'lamp_celestial_orb',
    name: 'Levitating Sunstone Lantern',
    description: 'A warm levitating orb that pulses gently in sync with your focus timer.',
    price: 220,
    category: 'Electronics',
    subType: 'Lamp',
    slot: 'lamp',
    rarity: 'Epic',
    defaultX: 0,
    defaultY: 0,
  },

  // Plants
  {
    id: 'plant_monstera',
    name: 'Potted Monstera Deliciosa',
    description: 'Lush split-leaf tropical plant in a terracotta pot.',
    price: 50,
    category: 'Plants',
    subType: 'Plant',
    slot: 'plant_left',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'plant_bonsai_spirit',
    name: 'Ancient Golden Bonsai',
    description: 'Sculpted miniature tree with warm gold and jade foliage.',
    price: 145,
    category: 'Plants',
    subType: 'Plant',
    slot: 'plant_right',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'plant_hanging_ivy',
    name: 'Cascading Forest Ivy',
    description: 'Trailing pixel vines that bring calm woodland energy to your desk corner.',
    price: 75,
    category: 'Plants',
    subType: 'Plant',
    slot: 'plant_right',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },

  // Decorations
  {
    id: 'decor_rug_persian',
    name: 'Woven Terracotta & Gold Rug',
    description: 'Hand-knotted pixel rug that anchors the center of your study room.',
    price: 90,
    category: 'Decorations',
    subType: 'Decoration',
    slot: 'rug',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'decor_poster_anatomy',
    name: 'Framed Anatomical & Star Map',
    description: 'Vintage parchment anatomical study chart paired with a celestial map.',
    price: 60,
    category: 'Decorations',
    subType: 'Decoration',
    slot: 'poster',
    rarity: 'Common',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'decor_clock_pendulum',
    name: 'Brass Pendulum Wall Clock',
    description: 'Crafted wall timepiece with a swinging golden pixel pendulum.',
    price: 95,
    category: 'Decorations',
    subType: 'Decoration',
    slot: 'clock',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },

  // Pets
  {
    id: 'pet_ginger_cat',
    name: 'Mochi the Pixel Ginger Cat',
    description: 'Purrs beside your desk and naps peacefully while you complete Pomodoros.',
    price: 150,
    category: 'Pets',
    subType: 'Pet',
    slot: 'pet',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'pet_scholar_owl',
    name: 'Archimedes the Wise Owl',
    description: 'Perches near your bookshelf, blinking watchful golden eyes during deep work.',
    price: 230,
    category: 'Pets',
    subType: 'Pet',
    slot: 'pet',
    rarity: 'Epic',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'pet_shiba_dog',
    name: 'Koji the Loyal Shiba',
    description: 'Wags his tail happily every time you finish a study session or task.',
    price: 180,
    category: 'Pets',
    subType: 'Pet',
    slot: 'pet',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },

  // Wallpapers & Room Themes
  {
    id: 'wall_sage_botanical',
    name: 'Botanical Sage Mural Wallpaper',
    description: 'Hand-painted pixel sage leaves with warm cream wainscoting.',
    price: 110,
    category: 'Wallpapers',
    subType: 'Wallpaper',
    slot: 'wallpaper',
    rarity: 'Uncommon',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'wall_midnight_observatory',
    name: 'Celestial Observatory Stone Wall',
    description: 'Deep slate masonry etched with constellations and warm sconces.',
    price: 210,
    category: 'Wallpapers',
    subType: 'Wallpaper',
    slot: 'wallpaper',
    rarity: 'Epic',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'theme_midnight_loft',
    name: 'Midnight Starlight Loft Theme',
    description: 'Deep indigo and muted blue ambient palette for serene evening focus.',
    price: 160,
    category: 'Room Themes',
    subType: 'Theme',
    slot: 'theme',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'theme_terracotta_hearth',
    name: 'Warm Terracotta Hearth Theme',
    description: 'Cozy autumn terracotta and cream tones inspired by classic RPG inns.',
    price: 160,
    category: 'Room Themes',
    subType: 'Theme',
    slot: 'theme',
    rarity: 'Rare',
    defaultX: 0,
    defaultY: 0,
  },

  // Special Items
  {
    id: 'special_hourglass_chronos',
    name: 'Chronos Golden Hourglass & Coffee Bar',
    description: 'Artisanal pour-over coffee station paired with a shimmering golden sand timer.',
    price: 290,
    category: 'Special Items',
    subType: 'Artifact',
    slot: 'special',
    rarity: 'Legendary',
    defaultX: 0,
    defaultY: 0,
  },
  {
    id: 'special_champion_chalice',
    name: 'Legend’s Obsidian & Gold Trophy',
    description: 'Prestigious pedestal monument celebrating relentless real-life mastery.',
    price: 450,
    category: 'Special Items',
    subType: 'Monument',
    slot: 'special',
    rarity: 'Legendary',
    defaultX: 0,
    defaultY: 0,
  },
];

// Progressive Level & XP Calculation
export function calculateLevelProgress(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpRequiredForNextLevel: number;
  progressPercent: number;
  totalXpForNextLevel: number;
} {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));
  // Progressive curve: Level L requires 150 + (L - 1) * 75 XP
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = 150 + (level - 1) * 75;
    if (safeXp < accumulated + needed) {
      const currentLevelXp = safeXp - accumulated;
      const progressPercent = Math.min(100, Math.round((currentLevelXp / needed) * 100));
      return {
        level,
        currentLevelXp,
        xpRequiredForNextLevel: needed,
        progressPercent,
        totalXpForNextLevel: accumulated + needed,
      };
    }
    accumulated += needed;
    level += 1;
    if (level > 200) break;
  }
  return {
    level,
    currentLevelXp: 0,
    xpRequiredForNextLevel: 1000,
    progressPercent: 100,
    totalXpForNextLevel: safeXp + 1000,
  };
}

// 8-Tier Rank System based on real long-term multi-domain progress
export interface RankEvaluation {
  rank: RpgRankTier;
  nextRank: RpgRankTier | null;
  rankIndex: number;
  rankScore: number;
  nextRankScore: number;
  progressPercent: number;
  badgeColor: string;
  perksDescription: string;
}

const RANK_TIERS: {
  rank: RpgRankTier;
  minScore: number;
  badgeColor: string;
  perksDescription: string;
}[] = [
  {
    rank: 'Beginner',
    minScore: 0,
    badgeColor: '#9AA79E',
    perksDescription: 'Starter Pixel Study Room unlocked',
  },
  {
    rank: 'Explorer',
    minScore: 250,
    badgeColor: '#788FA3',
    perksDescription: 'Unlocks Daily & Weekly Guild Contracts',
  },
  {
    rank: 'Bronze',
    minScore: 650,
    badgeColor: '#B97862',
    perksDescription: '+5% bonus XP on Pomodoro study sessions',
  },
  {
    rank: 'Silver',
    minScore: 1400,
    badgeColor: '#C5D1DB',
    perksDescription: 'Unlocks Rare tier workshop electronics',
  },
  {
    rank: 'Gold',
    minScore: 2600,
    badgeColor: '#D7B779',
    perksDescription: 'Unlocks Epic study companions & ambient themes',
  },
  {
    rank: 'Platinum',
    minScore: 4500,
    badgeColor: '#8FC1B5',
    perksDescription: 'Prestigious Platinum Crest & +10% Mission Coins',
  },
  {
    rank: 'Diamond',
    minScore: 7500,
    badgeColor: '#9BB9A2',
    perksDescription: 'Diamond Scholar Aura & Legendary Artifacts',
  },
  {
    rank: 'Legend',
    minScore: 12000,
    badgeColor: '#F3C66F',
    perksDescription: 'Grandmaster of Life OS · Sovereign of the Study Realm',
  },
];

export function evaluateUserRank(params: {
  xp: number;
  completedTasksCount: number;
  totalPomodoroMinutes: number;
  streakDays: number;
  studiedItemsCount: number;
  workoutsCount: number;
}): RankEvaluation {
  // Meaningful composite score across real productivity domains
  const rankScore = Math.round(
    params.xp * 0.65 +
      params.completedTasksCount * 20 +
      params.totalPomodoroMinutes * 1.5 +
      params.streakDays * 40 +
      params.studiedItemsCount * 30 +
      params.workoutsCount * 35
  );

  let currentIdx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (rankScore >= RANK_TIERS[i].minScore) {
      currentIdx = i;
    }
  }

  const currentTier = RANK_TIERS[currentIdx];
  const nextTier = currentIdx < RANK_TIERS.length - 1 ? RANK_TIERS[currentIdx + 1] : null;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((rankScore - currentTier.minScore) / (nextTier.minScore - currentTier.minScore)) * 100
          )
        )
      )
    : 100;

  return {
    rank: currentTier.rank,
    nextRank: nextTier ? nextTier.rank : null,
    rankIndex: currentIdx,
    rankScore,
    nextRankScore: nextTier ? nextTier.minScore : currentTier.minScore,
    progressPercent,
    badgeColor: currentTier.badgeColor,
    perksDescription: currentTier.perksDescription,
  };
}

// Compute live Daily, Weekly, and Special Missions connected to real Life OS data
export function computeLiveMissions(params: {
  todayDate: string;
  tasks: TaskItem[];
  pomodoroSessions: PomodoroSessionRecord[];
  studyModules: StudyModuleItem[];
  studyItems: StudyItemRecord[];
  healthLogs: HealthLogRecord[];
  goalsHabits: GoalHabitRecord[];
  personalRecords: PersonalRecord[];
  profile: UserProfile | null;
  customMissions: RpgMission[];
  claimedMissionKeys: string[];
}): RpgMission[] {
  const {
    todayDate,
    tasks,
    pomodoroSessions,
    studyModules,
    studyItems,
    healthLogs,
    goalsHabits,
    personalRecords,
    profile,
    customMissions,
    claimedMissionKeys,
  } = params;

  const weekKey = todayDate.slice(0, 7) + '-W' + Math.ceil(Number(todayDate.slice(8, 10) || 1) / 7);

  // Real Today metrics
  const todayPomodoros = pomodoroSessions.filter(
    (s) => s.date === todayDate && s.mode === 'focus'
  ).length;
  const todayStudiedLectures = studyItems.filter(
    (s) =>
      s.itemType === 'lecture' &&
      (s.lastStudiedDate === todayDate || s.status === 'studied' || s.status === 'mastered')
  ).length;
  const completedTasksTotal = tasks.filter((t) => t.status === 'completed').length;
  const reviewedFlashcardsCount = studyItems.filter(
    (s) =>
      (s.itemType === 'flashcard' || s.repetitionCount > 0) &&
      (s.lastStudiedDate === todayDate || s.repetitionCount >= 1)
  ).length;
  const todayWorkouts = healthLogs.filter(
    (h) => h.logType === 'workout' && h.date === todayDate
  ).length;

  // Real Last 7 Days metrics
  const sevenDaysAgoDate = (() => {
    const d = new Date(`${todayDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6);
    return d.toISOString().split('T')[0];
  })();

  const weekStudyMinutes = pomodoroSessions
    .filter((s) => s.date >= sevenDaysAgoDate && s.date <= todayDate && s.mode === 'focus')
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  const weekStudyHours = Math.round((weekStudyMinutes / 60) * 10) / 10;

  const totalCompletedLectures =
    studyModules.reduce((acc, m) => acc + (m.completedLectures || 0), 0) ||
    studyItems.filter((s) => s.status === 'studied' || s.status === 'mastered').length;

  const streakDays = profile?.streakDays || 0;
  const completedHabitsToday = goalsHabits.filter(
    (g) => g.recordType === 'habit' && g.completedToday
  ).length;

  const upcomingExamModule = studyModules
    .filter((m) => m.examDate && m.examDate >= todayDate)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))[0];

  const coreMissions: Omit<RpgMission, 'claimed'>[] = [
    // DAILY MISSIONS
    {
      id: `daily_pomo_3_${todayDate}`,
      title: 'Deep Focus Apprentice',
      description: 'Complete 3 verified Pomodoro focus sessions today.',
      missionType: 'daily',
      difficulty: 'Medium',
      targetValue: 3,
      currentValue: Math.min(3, todayPomodoros),
      unit: 'sessions',
      xpReward: 90,
      coinReward: 35,
      metricKey: 'daily_pomodoros',
      periodKey: todayDate,
    },
    {
      id: `daily_lecture_1_${todayDate}`,
      title: 'Lecture Mastery Step',
      description: 'Study or complete at least 1 lecture in your Study Hub.',
      missionType: 'daily',
      difficulty: 'Easy',
      targetValue: 1,
      currentValue: Math.min(1, todayStudiedLectures),
      unit: 'lecture',
      xpReward: 60,
      coinReward: 25,
      metricKey: 'daily_lectures',
      periodKey: todayDate,
    },
    {
      id: `daily_tasks_5_${todayDate}`,
      title: 'Priority Vanguard',
      description: 'Have 5 completed tasks in your task list.',
      missionType: 'daily',
      difficulty: 'Medium',
      targetValue: 5,
      currentValue: Math.min(5, completedTasksTotal),
      unit: 'tasks',
      xpReward: 85,
      coinReward: 30,
      metricKey: 'daily_tasks',
      periodKey: todayDate,
    },
    {
      id: `daily_cards_5_${todayDate}`,
      title: 'Spaced Repetition Scholar',
      description: 'Review or master 5 flashcards / study items.',
      missionType: 'daily',
      difficulty: 'Easy',
      targetValue: 5,
      currentValue: Math.min(5, reviewedFlashcardsCount),
      unit: 'items',
      xpReward: 55,
      coinReward: 20,
      metricKey: 'daily_flashcards',
      periodKey: todayDate,
    },
    {
      id: `daily_workout_1_${todayDate}`,
      title: 'Physical Vitality Training',
      description: 'Log 1 completed workout session in the Health Hub today.',
      missionType: 'daily',
      difficulty: 'Medium',
      targetValue: 1,
      currentValue: Math.min(1, todayWorkouts),
      unit: 'workout',
      xpReward: 80,
      coinReward: 30,
      metricKey: 'daily_workout',
      periodKey: todayDate,
    },

    // WEEKLY MISSIONS
    {
      id: `weekly_study_20h_${weekKey}`,
      title: '20-Hour Scholarly Expedition',
      description: 'Accumulate 20 hours of Pomodoro focus time this week.',
      missionType: 'weekly',
      difficulty: 'Hard',
      targetValue: 20,
      currentValue: Math.min(20, weekStudyHours),
      unit: 'hours',
      xpReward: 300,
      coinReward: 120,
      metricKey: 'weekly_study_hours',
      periodKey: weekKey,
    },
    {
      id: `weekly_lectures_5_${weekKey}`,
      title: 'Module Curriculum Push',
      description: 'Finish 5 lectures across your active academic modules.',
      missionType: 'weekly',
      difficulty: 'Medium',
      targetValue: 5,
      currentValue: Math.min(5, totalCompletedLectures),
      unit: 'lectures',
      xpReward: 200,
      coinReward: 85,
      metricKey: 'weekly_lectures',
      periodKey: weekKey,
    },
    {
      id: `weekly_streak_5_${weekKey}`,
      title: 'Unbroken Discipline Streak',
      description: 'Maintain a 5-day productivity streak.',
      missionType: 'weekly',
      difficulty: 'Medium',
      targetValue: 5,
      currentValue: Math.min(5, streakDays),
      unit: 'days',
      xpReward: 180,
      coinReward: 75,
      metricKey: 'weekly_streak',
      periodKey: weekKey,
    },
    {
      id: `weekly_habits_3_${weekKey}`,
      title: 'Ritual Keeper',
      description: 'Complete at least 3 daily habits today to fortify your weekly momentum.',
      missionType: 'weekly',
      difficulty: 'Easy',
      targetValue: 3,
      currentValue: Math.min(3, completedHabitsToday),
      unit: 'habits',
      xpReward: 120,
      coinReward: 50,
      metricKey: 'weekly_habits',
      periodKey: weekKey,
    },

    // SPECIAL QUESTS
    {
      id: `special_exam_${upcomingExamModule?.id || 'general'}`,
      title: upcomingExamModule
        ? `Exam Campaign: ${upcomingExamModule.code}`
        : 'Academic Citadel Preparation',
      description: upcomingExamModule
        ? `Complete lectures for ${upcomingExamModule.title} before exam on ${upcomingExamModule.examDate}.`
        : 'Complete 10 lectures across your study modules to fortify exam readiness.',
      missionType: 'special',
      difficulty: 'Epic',
      targetValue: upcomingExamModule
        ? Math.max(1, upcomingExamModule.totalLectures || 10)
        : 10,
      currentValue: upcomingExamModule
        ? Math.min(
            upcomingExamModule.totalLectures || 10,
            upcomingExamModule.completedLectures || 0
          )
        : Math.min(10, totalCompletedLectures),
      unit: 'lectures',
      xpReward: 450,
      coinReward: 180,
      metricKey: 'special_exam_prep',
      periodKey: 'lifetime',
    },
    {
      id: 'special_pr_hunter',
      title: 'Iron Forged: 3 Personal Records',
      description: 'Establish or break 3 exercise Personal Records (PRs) in the Fitness Hub.',
      missionType: 'special',
      difficulty: 'Hard',
      targetValue: 3,
      currentValue: Math.min(3, personalRecords.length),
      unit: 'PRs',
      xpReward: 320,
      coinReward: 130,
      metricKey: 'special_fitness_prs',
      periodKey: 'lifetime',
    },
  ];

  // Merge AI custom missions and evaluate their live progress as well
  const evaluatedCustom = customMissions.map((cm) => {
    let liveVal = cm.currentValue;
    if (cm.metricKey === 'daily_pomodoros') liveVal = todayPomodoros;
    else if (cm.metricKey === 'daily_tasks') liveVal = completedTasksTotal;
    else if (cm.metricKey === 'daily_lectures') liveVal = todayStudiedLectures;
    else if (cm.metricKey === 'daily_flashcards') liveVal = reviewedFlashcardsCount;
    else if (cm.metricKey === 'daily_workout') liveVal = todayWorkouts;
    else if (cm.metricKey === 'weekly_study_hours') liveVal = weekStudyHours;

    return {
      ...cm,
      currentValue: Math.min(cm.targetValue, liveVal),
      claimed: claimedMissionKeys.includes(cm.id),
    };
  });

  return [
    ...coreMissions.map((m) => ({
      ...m,
      claimed: claimedMissionKeys.includes(m.id),
    })),
    ...evaluatedCustom,
  ];
}

// Compute Achievements Hall unlocked states from real verified Life OS data
export function computeLiveAchievements(params: {
  tasks: TaskItem[];
  pomodoroSessions: PomodoroSessionRecord[];
  studyModules: StudyModuleItem[];
  studyItems: StudyItemRecord[];
  healthLogs: HealthLogRecord[];
  goalsHabits: GoalHabitRecord[];
  personalRecords: PersonalRecord[];
  profile: UserProfile | null;
  claimedAchievementIds: string[];
}): RpgAchievement[] {
  const {
    tasks,
    pomodoroSessions,
    studyModules,
    studyItems,
    healthLogs,
    goalsHabits,
    personalRecords,
    profile,
    claimedAchievementIds,
  } = params;

  const focusSessionsCount = pomodoroSessions.filter((s) => s.mode === 'focus').length;
  const totalFocusMinutes = pomodoroSessions
    .filter((s) => s.mode === 'focus')
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const streakDays = profile?.streakDays || 0;
  const completedGoalsCount = goalsHabits.filter(
    (g) =>
      g.recordType === 'goal' &&
      (g.status === 'completed' || g.progressPercent >= 100 || g.completedToday)
  ).length;
  const masteredStudyCount =
    studyItems.filter((s) => s.status === 'studied' || s.status === 'mastered').length +
    studyModules.reduce((acc, m) => acc + (m.completedLectures || 0), 0);
  const completedWorkoutsCount = healthLogs.filter((h) => h.logType === 'workout').length;

  const definitions: Omit<RpgAchievement, 'unlocked' | 'claimed'>[] = [
    {
      id: 'ach_first_focus',
      title: 'First Focus Session',
      description: 'Complete your very first verified Pomodoro study session.',
      badgeIcon: 'flame',
      rarity: 'Common',
      xpReward: 50,
      coinReward: 25,
      currentProgress: Math.min(1, focusSessionsCount),
      targetProgress: 1,
    },
    {
      id: 'ach_10_hours_studied',
      title: '10 Hours Studied',
      description: 'Accumulate 10 total hours of focused study time via the Pomodoro engine.',
      badgeIcon: 'hourglass',
      rarity: 'Uncommon',
      xpReward: 150,
      coinReward: 60,
      currentProgress: Math.min(10, totalFocusHours),
      targetProgress: 10,
    },
    {
      id: 'ach_100_tasks_completed',
      title: 'Centurion of Action (100 Tasks)',
      description: 'Complete 100 real tasks across your Life OS workspace.',
      badgeIcon: 'sword',
      rarity: 'Epic',
      xpReward: 400,
      coinReward: 160,
      currentProgress: Math.min(100, completedTasksCount),
      targetProgress: 100,
    },
    {
      id: 'ach_7_day_streak',
      title: '7-Day Streak',
      description: 'Maintain a 7-day consistency streak in Life OS.',
      badgeIcon: 'shield',
      rarity: 'Rare',
      xpReward: 220,
      coinReward: 90,
      currentProgress: Math.min(7, streakDays),
      targetProgress: 7,
    },
    {
      id: 'ach_first_weekly_goal',
      title: 'First Goal Completed',
      description: 'Reach 100% completion on a personal, academic, or health goal.',
      badgeIcon: 'target',
      rarity: 'Uncommon',
      xpReward: 140,
      coinReward: 55,
      currentProgress: Math.min(1, completedGoalsCount),
      targetProgress: 1,
    },
    {
      id: 'ach_study_master',
      title: 'Study Master',
      description: 'Complete or master 15 lectures and spaced-repetition study items.',
      badgeIcon: 'book',
      rarity: 'Rare',
      xpReward: 260,
      coinReward: 110,
      currentProgress: Math.min(15, masteredStudyCount),
      targetProgress: 15,
    },
    {
      id: 'ach_consistency_champion',
      title: 'Consistency Champion',
      description: 'Log 10 Pomodoro sessions and 5 workouts across your journey.',
      badgeIcon: 'crown',
      rarity: 'Legendary',
      xpReward: 500,
      coinReward: 200,
      currentProgress: Math.min(15, focusSessionsCount + completedWorkoutsCount + personalRecords.length),
      targetProgress: 15,
    },
  ];

  return definitions.map((d) => ({
    ...d,
    unlocked: d.currentProgress >= d.targetProgress,
    claimed: claimedAchievementIds.includes(d.id),
  }));
}
