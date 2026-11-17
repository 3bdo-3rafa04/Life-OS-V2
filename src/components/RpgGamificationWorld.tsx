import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import {
  RPG_SHOP_ITEMS,
  RpgShopCategory,
  RpgItemRarity,
  RpgRoomSlot,
  StudyEnvironmentMode,
  AmbientSoundType,
  RpgShopItem,
} from '../services/rpgGamificationEngine.ts';
import {
  PixelStudyRoomCanvas,
  PixelAvatarSprite,
  PixelItemPreview,
} from './PixelStudyRoomCanvas.tsx';
import {
  Sparkles,
  Trophy,
  Coins,
  Flame,
  ScrollText,
  ShoppingBag,
  Package,
  Award,
  Home,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Volume2,
  Sun,
  CloudRain,
  Moon,
  Sliders,
  Check,
  Lock,
  X,
  Maximize2,
  Minimize2,
  UserCheck,
  History,
  Save,
  FolderOpen,
  Trash2,
} from 'lucide-react';

type RpgTabId = 'study_room' | 'missions' | 'shop' | 'inventory' | 'achievements';

interface RpgGamificationWorldProps {
  isFullScreenModal?: boolean;
  initialTab?: RpgTabId;
  onCloseModal?: () => void;
}

const RARITY_STYLES: Record<
  RpgItemRarity,
  { border: string; bg: string; text: string }
> = {
  Common: {
    border: 'border-[#788FA3]/40',
    bg: 'bg-[#788FA3]/15',
    text: 'text-[#E8DDC8]',
  },
  Uncommon: {
    border: 'border-[#6EBF8B]/50',
    bg: 'bg-[#294C45]/60',
    text: 'text-[#6EBF8B]',
  },
  Rare: {
    border: 'border-[#788FA3]',
    bg: 'bg-[#788FA3]/25',
    text: 'text-[#9EC5E8]',
  },
  Epic: {
    border: 'border-[#B97862]',
    bg: 'bg-[#B97862]/25',
    text: 'text-[#F2A68D]',
  },
  Legendary: {
    border: 'border-[#D7B779]',
    bg: 'bg-[#D7B779]/25',
    text: 'text-[#F3C66F]',
  },
};

const SHOP_CATEGORIES: ('All' | RpgShopCategory)[] = [
  'All',
  'Furniture',
  'Electronics',
  'Decorations',
  'Plants',
  'Pets',
  'Wallpapers',
  'Room Themes',
  'Special Items',
];

export const RpgGamificationWorld: React.FC<RpgGamificationWorldProps> = ({
  isFullScreenModal = false,
  initialTab = 'study_room',
  onCloseModal,
}) => {
  const {
    profile,
    rpgState,
    rpgMissions,
    rpgAchievements,
    rpgRankEval,
    rpgLevelInfo,
    pomodoroState,
    togglePomodoro,
    resetPomodoro,
    completePomodoroSession,
    claimRpgMissionReward,
    claimRpgAchievementReward,
    purchaseRpgShopItem,
    equipRpgItem,
    unequipRpgSlot,
    moveRpgPlacedItem,
    resetRpgPlacedItemPosition,
    setRpgEnvironment,
    setRpgAmbientSound,
    updateRpgAvatar,
    saveRpgRoomPreset,
    loadRpgRoomPreset,
    deleteRpgRoomPreset,
    generateAiPersonalizedMissions,
    openRpgWorld,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<RpgTabId>(initialTab);
  const [customizeRoomMode, setCustomizeRoomMode] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<RpgRoomSlot | null>('desk');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Mission filters
  const [missionFilter, setMissionFilter] = useState<'all' | 'daily' | 'weekly' | 'special'>('all');
  const [generatingAiMissions, setGeneratingAiMissions] = useState(false);

  // Shop filters & confirmation modal
  const [shopCategory, setShopCategory] = useState<'All' | RpgShopCategory>('All');
  const [shopRarity, setShopRarity] = useState<'All' | RpgItemRarity>('All');
  const [shopSort, setShopSort] = useState<'price_asc' | 'price_desc' | 'rarity'>('price_asc');
  const [confirmPurchaseItem, setConfirmPurchaseItem] = useState<RpgShopItem | null>(null);

  const coins = profile?.coins ?? 0;
  const xp = profile?.xp ?? 0;
  const streakDays = profile?.streakDays ?? 0;

  const triggerToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const filteredMissions = useMemo(() => {
    if (missionFilter === 'all') return rpgMissions;
    return rpgMissions.filter((m) => m.missionType === missionFilter);
  }, [rpgMissions, missionFilter]);

  const claimableMissionsCount = useMemo(
    () => rpgMissions.filter((m) => !m.claimed && m.currentValue >= m.targetValue).length,
    [rpgMissions]
  );

  const claimableAchievementsCount = useMemo(
    () => rpgAchievements.filter((a) => a.unlocked && !a.claimed).length,
    [rpgAchievements]
  );

  const filteredShopItems = useMemo(() => {
    let list = [...RPG_SHOP_ITEMS];
    if (shopCategory !== 'All') {
      list = list.filter((i) => i.category === shopCategory);
    }
    if (shopRarity !== 'All') {
      list = list.filter((i) => i.rarity === shopRarity);
    }
    list.sort((a, b) => {
      if (shopSort === 'price_asc') return a.price - b.price;
      if (shopSort === 'price_desc') return b.price - a.price;
      const order: Record<RpgItemRarity, number> = {
        Legendary: 5,
        Epic: 4,
        Rare: 3,
        Uncommon: 2,
        Common: 1,
      };
      return order[b.rarity] - order[a.rarity];
    });
    return list;
  }, [shopCategory, shopRarity, shopSort]);

  const ownedItemsCatalog = useMemo(
    () => RPG_SHOP_ITEMS.filter((i) => rpgState.ownedItemIds.includes(i.id)),
    [rpgState.ownedItemIds]
  );

  const handleClaimMission = async (missionId: string, title: string, xpR: number, coinR: number) => {
    const ok = await claimRpgMissionReward(missionId);
    if (ok) {
      triggerToast(`Mission Complete! Claimed +${xpR} XP & +${coinR} Life Coins for "${title}"!`);
    }
  };

  const handleClaimAchievement = async (
    achId: string,
    title: string,
    xpR: number,
    coinR: number
  ) => {
    const ok = await claimRpgAchievementReward(achId);
    if (ok) {
      triggerToast(
        `Achievement Unlocked! Claimed +${xpR} XP & +${coinR} Life Coins for "${title}"!`
      );
    }
  };

  const handleConfirmBuy = async () => {
    if (!confirmPurchaseItem) return;
    const res = await purchaseRpgShopItem(confirmPurchaseItem.id);
    triggerToast(res.message);
    setConfirmPurchaseItem(null);
  };

  const handleGenerateAiMissions = async () => {
    setGeneratingAiMissions(true);
    try {
      const created = await generateAiPersonalizedMissions();
      if (created.length > 0) {
        triggerToast(`Generated ${created.length} personalized AI Guild Contracts!`);
      }
    } finally {
      setGeneratingAiMissions(false);
    }
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;
    await saveRpgRoomPreset(presetNameInput.trim());
    triggerToast(`Saved Study Room layout "${presetNameInput.trim()}"!`);
    setPresetNameInput('');
  };

  const handleFinishPomodoroInRoom = async () => {
    const mins =
      pomodoroState.elapsedFocusSeconds >= 60
        ? Math.round(pomodoroState.elapsedFocusSeconds / 60)
        : pomodoroState.focusMinutesPreset;
    await completePomodoroSession();
    triggerToast(
      `Session Complete! Earned +${mins * 2} XP & +${Math.max(
        8,
        Math.round(mins * 0.6)
      )} Life Coins!`
    );
  };

  return (
    <div
      className={`${
        isFullScreenModal
          ? 'fixed inset-0 z-50 overflow-y-auto bg-[#172A32] text-[#E8DDC8] p-4 md:p-6'
          : 'rounded-2xl bg-[#172A32] text-[#E8DDC8] border-2 border-[#D7B779]/40 p-4 md:p-6 shadow-2xl'
      }`}
    >
      <div className="max-w-[1440px] mx-auto space-y-5">
        {/* Toast Reward Banner */}
        {toastBanner && (
          <div className="p-3.5 rounded-xl bg-[#294C45] border-2 border-[#D7B779] text-[#E8DDC8] flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2.5 text-xs md:text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-[#D7B779] shrink-0" />
              <span>{toastBanner}</span>
            </div>
            <button
              onClick={() => setToastBanner(null)}
              className="text-[#E8DDC8]/70 hover:text-[#E8DDC8]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TOP RPG WORLD HERO BAR */}
        <div className="p-4 md:p-5 rounded-2xl bg-[#1E353F] border-2 border-[#D7B779]/45 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: Pixel Avatar + Character Rank & Level */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              className="relative group p-2 rounded-xl bg-[#172A32] border-2 border-[#D7B779] hover:scale-105 transition-transform"
              title="Customize Pixel Avatar"
            >
              <PixelAvatarSprite
                avatar={rpgState.avatar}
                size={60}
                isFocusing={pomodoroState.running}
              />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#D7B779] text-[#172A32] text-[9px] font-bold uppercase tracking-wider">
                Edit
              </span>
            </button>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#D7B779] text-[#172A32] text-xs font-extrabold uppercase tracking-wider">
                  {rpgRankEval.rank} Rank
                </span>
                <span className="text-lg md:text-xl font-bold text-[#E8DDC8]">
                  {profile?.displayName || 'Scholar Adventurer'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#294C45] border border-[#D7B779]/30 text-[11px] text-[#D7B779]">
                  {rpgState.avatar.titleBadge}
                </span>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full sm:w-80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#D7B779] font-mono">
                    LVL {rpgLevelInfo.level}
                  </span>
                  <span className="text-[#E8DDC8]/80 font-mono text-[11px]">
                    {rpgLevelInfo.currentLevelXp} / {rpgLevelInfo.xpRequiredForNextLevel} XP (
                    {xp.toLocaleString()} Total XP)
                  </span>
                </div>
                <div className="w-full h-3 rounded-md bg-[#172A32] border border-[#D7B779]/40 p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-gradient-to-r from-[#294C45] via-[#6EBF8B] to-[#D7B779] transition-all duration-500"
                    style={{ width: `${rpgLevelInfo.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Currency, Streak, Rank Perks & Exit/Fullscreen Control */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-[#172A32] border border-[#D7B779]/40 flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#D7B779]" />
              <div>
                <div className="text-sm font-bold font-mono text-[#D7B779] tabular-nums">
                  {coins.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#788FA3]">
                  Life Coins
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-[#172A32] border border-[#B97862]/50 flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#B97862]" />
              <div>
                <div className="text-sm font-bold font-mono text-[#E8DDC8] tabular-nums">
                  {streakDays}d
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#788FA3]">
                  Daily Streak
                </div>
              </div>
            </div>

            <div className="hidden sm:block px-3.5 py-2 rounded-xl bg-[#172A32] border border-[#788FA3]/40">
              <div className="text-xs font-bold text-[#E8DDC8]">
                Next Rank: {rpgRankEval.nextRank || 'MAX (Legend)'}
              </div>
              <div className="text-[10px] text-[#788FA3]">
                Score: {rpgRankEval.rankScore} / {rpgRankEval.nextRankScore} ({rpgRankEval.progressPercent}%)
              </div>
            </div>

            {isFullScreenModal ? (
              <button
                type="button"
                onClick={onCloseModal}
                className="px-4 py-2.5 rounded-xl bg-[#B97862] hover:bg-[#c8856e] text-[#172A32] text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
                Exit to Life OS
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openRpgWorld(activeTab)}
                className="px-4 py-2.5 rounded-xl bg-[#D7B779] hover:bg-[#e2c68c] text-[#172A32] text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                Full-Screen RPG World
              </button>
            )}
          </div>
        </div>

        {/* GAME NAVIGATION TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D7B779]/25 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'study_room', label: 'Pixel Study Room', icon: Home, badge: 0 },
                {
                  id: 'missions',
                  label: 'Mission Board',
                  icon: ScrollText,
                  badge: claimableMissionsCount,
                },
                { id: 'shop', label: 'Item Shop', icon: ShoppingBag, badge: 0 },
                {
                  id: 'inventory',
                  label: `Inventory (${ownedItemsCatalog.length})`,
                  icon: Package,
                  badge: 0,
                },
                {
                  id: 'achievements',
                  label: 'Achievement Hall',
                  icon: Award,
                  badge: claimableAchievementsCount,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border-2 transition-all ${
                    isActive
                      ? 'bg-[#D7B779] text-[#172A32] border-[#D7B779] shadow-lg'
                      : 'bg-[#1E353F] text-[#E8DDC8] border-[#788FA3]/30 hover:border-[#D7B779]/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#B97862] text-white font-extrabold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-[#788FA3]">
            Rank Perks: <span className="text-[#D7B779]">{rpgRankEval.perksDescription}</span>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE PIXEL-ART STUDY ROOM & POMODORO INTEGRATION */}
        {activeTab === 'study_room' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Interactive Pixel Study Room Canvas + Environment & Customization Controls */}
            <div className="lg:col-span-8 space-y-4">
              {/* Room Atmosphere & Customize Toolbar */}
              <div className="p-3.5 rounded-xl bg-[#1E353F] border border-[#D7B779]/30 flex flex-wrap items-center justify-between gap-3">
                {/* Environment Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#D7B779] mr-1">Atmosphere:</span>
                  {(
                    [
                      { id: 'morning_study', label: 'Morning Study', icon: Sun },
                      { id: 'rainy_day', label: 'Rainy Day', icon: CloudRain },
                      { id: 'night_study', label: 'Night Study', icon: Moon },
                    ] as { id: StudyEnvironmentMode; label: string; icon: typeof Sun }[]
                  ).map((env) => {
                    const Icon = env.icon;
                    const active = rpgState.activeEnvironment === env.id;
                    return (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => setRpgEnvironment(env.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          active
                            ? 'bg-[#D7B779] text-[#172A32]'
                            : 'bg-[#172A32] text-[#E8DDC8] hover:bg-[#294C45]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{env.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Ambient Sound Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#D7B779]" />
                  <select
                    value={rpgState.activeAmbientSound}
                    onChange={(e) =>
                      setRpgAmbientSound(e.target.value as AmbientSoundType)
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-[#172A32] border border-[#D7B779]/40 text-xs text-[#E8DDC8]"
                  >
                    <option value="off">Ambient Sound: Off</option>
                    <option value="rain">Gentle Rain on Window</option>
                    <option value="fireplace">Cozy Study Hearth</option>
                    <option value="night_wind">Midnight Forest Breeze</option>
                    <option value="brown_noise">Deep Focus Warm Noise</option>
                  </select>

                  {rpgState.activeAmbientSound !== 'off' && (
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={rpgState.ambientVolume}
                      onChange={(e) =>
                        setRpgAmbientSound(
                          rpgState.activeAmbientSound,
                          Number(e.target.value)
                        )
                      }
                      className="w-20 accent-[#D7B779]"
                      title="Ambient sound volume"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setCustomizeRoomMode((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                      customizeRoomMode
                        ? 'bg-[#B97862] text-[#172A32] border-[#B97862]'
                        : 'bg-[#294C45] text-[#E8DDC8] border-[#D7B779]/40 hover:bg-[#345f56]'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{customizeRoomMode ? 'Done Customizing' : 'Customize Room'}</span>
                  </button>
                </div>
              </div>

              {/* Main Pixel-Art Study Room Canvas */}
              <PixelStudyRoomCanvas
                placedItems={rpgState.placedItems}
                avatar={rpgState.avatar}
                environment={rpgState.activeEnvironment}
                ambientSound={rpgState.activeAmbientSound}
                ambientVolume={rpgState.ambientVolume}
                isPomodoroRunning={pomodoroState.running}
                customizeMode={customizeRoomMode}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => setSelectedSlot(slot)}
                onMovePlacedItem={moveRpgPlacedItem}
                onResetPlacedItem={resetRpgPlacedItemPosition}
                onUnequipSlot={unequipRpgSlot}
              />

              {/* Quick Owned Furniture & Room Slot Switcher */}
              <div className="p-4 rounded-xl bg-[#1E353F] border border-[#D7B779]/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#D7B779]">
                      Owned Study Room Items ({ownedItemsCatalog.length})
                    </h3>
                    <p className="text-[11px] text-[#788FA3]">
                      Click any owned item below to place or swap it inside your Study Room.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('shop')}
                    className="text-xs font-bold text-[#D7B779] hover:underline"
                  >
                    Visit Item Shop (+{RPG_SHOP_ITEMS.length - ownedItemsCatalog.length} more) →
                  </button>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {ownedItemsCatalog.map((item) => {
                    const isEquipped = rpgState.placedItems.some(
                      (p) => p.itemId === item.id
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          isEquipped && !['desk', 'chair'].includes(item.slot)
                            ? unequipRpgSlot(item.slot)
                            : equipRpgItem(item.id)
                        }
                        className={`shrink-0 p-2.5 rounded-xl border text-left w-36 transition-all ${
                          isEquipped
                            ? 'bg-[#294C45] border-[#D7B779] shadow-md'
                            : 'bg-[#172A32] border-[#788FA3]/30 hover:border-[#D7B779]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <PixelItemPreview itemId={item.id} size={36} />
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isEquipped
                                ? 'bg-[#D7B779] text-[#172A32]'
                                : 'bg-[#1E353F] text-[#788FA3]'
                            }`}
                          >
                            {isEquipped ? 'Placed' : 'Stored'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#E8DDC8] truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-[#788FA3] truncate">{item.subType}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Integrated Study Room Pomodoro Console & Saved Room Layouts */}
            <div className="lg:col-span-4 space-y-4">
              {/* Study Room Pomodoro Focus Console */}
              <div className="p-5 rounded-2xl bg-[#1E353F] border-2 border-[#D7B779]/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#D7B779]">
                      STUDY ROOM FOCUS SHRINE
                    </span>
                    <h3 className="text-base font-bold text-[#E8DDC8]">
                      {pomodoroState.category}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      pomodoroState.running
                        ? 'bg-[#6EBF8B]/20 text-[#6EBF8B] border border-[#6EBF8B]/40'
                        : 'bg-[#172A32] text-[#788FA3]'
                    }`}
                  >
                    {pomodoroState.running ? '● Avatar Studying' : 'Idle'}
                  </span>
                </div>

                <div className="p-5 rounded-xl bg-[#172A32] border border-[#D7B779]/30 text-center space-y-2">
                  <div className="text-4xl md:text-5xl font-extrabold font-mono text-[#D7B779] tracking-tight tabular-nums">
                    {formatTimer(pomodoroState.remainingSeconds)}
                  </div>
                  <p className="text-xs text-[#788FA3]">
                    Session #{pomodoroState.sessionNumber} · Complete to earn{' '}
                    <span className="text-[#D7B779] font-semibold">
                      +{pomodoroState.focusMinutesPreset * 2} XP
                    </span>{' '}
                    &amp;{' '}
                    <span className="text-[#6EBF8B] font-semibold">
                      +{Math.max(8, Math.round(pomodoroState.focusMinutesPreset * 0.6))} Coins
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePomodoro}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#D7B779] hover:bg-[#e3c78d] text-[#172A32] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {pomodoroState.running ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" /> Pause Study
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />{' '}
                        {pomodoroState.elapsedFocusSeconds > 0 ? 'Resume Study' : 'Start Study'}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetPomodoro}
                    className="p-2.5 rounded-xl bg-[#172A32] hover:bg-[#294C45] text-[#E8DDC8] border border-[#788FA3]/30"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishPomodoroInRoom}
                    className="px-3.5 py-2.5 rounded-xl bg-[#294C45] hover:bg-[#356158] border border-[#6EBF8B]/50 text-[#6EBF8B] text-xs font-bold flex items-center gap-1.5"
                    title="Complete and claim session XP & Coins"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finish &amp; Claim
                  </button>
                </div>
              </div>

              {/* Active Daily Missions Snapshot inside Study Room */}
              <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#D7B779]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#D7B779]">
                    Active Guild Contracts
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('missions')}
                    className="text-xs text-[#D7B779] hover:underline"
                  >
                    All Missions →
                  </button>
                </div>

                <div className="space-y-2">
                  {rpgMissions.slice(0, 3).map((m) => {
                    const isDone = m.currentValue >= m.targetValue;
                    const pct = Math.min(100, Math.round((m.currentValue / m.targetValue) * 100));
                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-[#172A32] border border-[#788FA3]/25 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#E8DDC8] truncate">
                            {m.title}
                          </span>
                          <span className="text-[10px] font-mono text-[#D7B779] shrink-0">
                            +{m.xpReward} XP · +{m.coinReward}c
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#1E353F] overflow-hidden">
                          <div
                            className="h-full bg-[#D7B779]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#788FA3]">
                          <span>
                            {m.currentValue} / {m.targetValue} {m.unit}
                          </span>
                          {isDone && !m.claimed ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleClaimMission(m.id, m.title, m.xpReward, m.coinReward)
                              }
                              className="px-2 py-0.5 rounded bg-[#D7B779] text-[#172A32] font-bold"
                            >
                              Claim Reward!
                            </button>
                          ) : m.claimed ? (
                            <span className="text-[#6EBF8B] font-semibold">Claimed ✓</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Saved Room Configurations */}
              <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#D7B779]/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D7B779] flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Saved Room Configurations
                </h3>

                <form onSubmit={handleSavePreset} className="flex gap-2">
                  <input
                    type="text"
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    placeholder="Save current layout as..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#172A32] border border-[#788FA3]/40 text-xs text-[#E8DDC8]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#294C45] hover:bg-[#356158] border border-[#D7B779]/40 text-xs font-bold text-[#D7B779]"
                  >
                    Save
                  </button>
                </form>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {rpgState.savedRoomPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#172A32] border border-[#788FA3]/20 text-xs"
                    >
                      <span className="font-medium text-[#E8DDC8] truncate">
                        {preset.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            loadRpgRoomPreset(preset.id);
                            triggerToast(`Loaded room layout "${preset.name}"!`);
                          }}
                          className="px-2 py-0.5 rounded bg-[#294C45] text-[#D7B779] text-[11px] font-semibold flex items-center gap-1"
                        >
                          <FolderOpen className="w-3 h-3" /> Load
                        </button>
                        {preset.id !== 'preset_starter' && (
                          <button
                            type="button"
                            onClick={() => deleteRpgRoomPreset(preset.id)}
                            className="text-[#788FA3] hover:text-[#B97862]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MISSION & QUEST BOARD */}
        {activeTab === 'missions' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#D7B779]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#E8DDC8]">
                  Guild Mission &amp; Quest Board
                </h2>
                <p className="text-xs text-[#788FA3]">
                  Automatically verified against your real Pomodoro sessions, lectures, tasks, flashcards, and workouts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-[#172A32] border border-[#788FA3]/30 text-xs">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'daily', label: 'Daily' },
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'special', label: 'Special Quests' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setMissionFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        missionFilter === f.id
                          ? 'bg-[#D7B779] text-[#172A32]'
                          : 'text-[#E8DDC8] hover:text-[#D7B779]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAiMissions}
                  disabled={generatingAiMissions}
                  className="px-4 py-2 rounded-xl bg-[#294C45] hover:bg-[#356158] border border-[#D7B779] text-[#D7B779] text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {generatingAiMissions
                      ? 'Scouting Contracts...'
                      : 'AI Personalized Missions'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMissions.map((m) => {
                const isComplete = m.currentValue >= m.targetValue;
                const pct = Math.min(100, Math.round((m.currentValue / m.targetValue) * 100));
                return (
                  <div
                    key={m.id}
                    className={`p-5 rounded-2xl border-2 flex flex-col justify-between space-y-4 transition-all ${
                      m.claimed
                        ? 'bg-[#172A32]/70 border-[#6EBF8B]/40 opacity-80'
                        : isComplete
                        ? 'bg-[#1E353F] border-[#D7B779] shadow-lg'
                        : 'bg-[#1E353F] border-[#788FA3]/30'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#172A32] text-[#D7B779] border border-[#D7B779]/30">
                          {m.missionType} · {m.difficulty}
                        </span>
                        {m.isAiGenerated && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#294C45] text-[#6EBF8B]">
                            AI Personalized
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#E8DDC8]">{m.title}</h3>
                      <p className="text-xs text-[#788FA3] leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[#788FA3]/20">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#788FA3]">Verified Progress</span>
                          <span className="font-mono font-bold text-[#E8DDC8]">
                            {m.currentValue} / {m.targetValue} {m.unit} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-md bg-[#172A32] overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-sm transition-all ${
                              isComplete ? 'bg-[#6EBF8B]' : 'bg-[#D7B779]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold">
                          <span className="px-2 py-1 rounded bg-[#172A32] text-[#6EBF8B]">
                            +{m.xpReward} XP
                          </span>
                          <span className="px-2 py-1 rounded bg-[#172A32] text-[#D7B779]">
                            +{m.coinReward} Coins
                          </span>
                        </div>

                        {m.claimed ? (
                          <span className="px-3 py-1.5 rounded-xl bg-[#294C45] text-[#6EBF8B] text-xs font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Claimed
                          </span>
                        ) : isComplete ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleClaimMission(m.id, m.title, m.xpReward, m.coinReward)
                            }
                            className="px-4 py-1.5 rounded-xl bg-[#D7B779] hover:bg-[#e3c78d] text-[#172A32] text-xs font-extrabold shadow-md animate-pulse"
                          >
                            Claim Reward
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#788FA3]">In Progress</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PIXEL-ART ITEM SHOP */}
        {activeTab === 'shop' && (
          <div className="space-y-5">
            {/* Shop Filters Bar */}
            <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#D7B779]/35 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {SHOP_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setShopCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      shopCategory === cat
                        ? 'bg-[#D7B779] text-[#172A32]'
                        : 'bg-[#172A32] text-[#E8DDC8] hover:bg-[#294C45]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={shopRarity}
                  onChange={(e) => setShopRarity(e.target.value as 'All' | RpgItemRarity)}
                  className="px-3 py-1.5 rounded-xl bg-[#172A32] border border-[#D7B779]/40 text-xs text-[#E8DDC8]"
                >
                  <option value="All">All Rarities</option>
                  <option value="Common">Common</option>
                  <option value="Uncommon">Uncommon</option>
                  <option value="Rare">Rare</option>
                  <option value="Epic">Epic</option>
                  <option value="Legendary">Legendary</option>
                </select>

                <select
                  value={shopSort}
                  onChange={(e) =>
                    setShopSort(
                      e.target.value as 'price_asc' | 'price_desc' | 'rarity'
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#172A32] border border-[#D7B779]/40 text-xs text-[#E8DDC8]"
                >
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rarity">Rarity: Highest First</option>
                </select>
              </div>
            </div>

            {/* Shop Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredShopItems.map((item) => {
                const isOwned = rpgState.ownedItemIds.includes(item.id);
                const isEquipped = rpgState.placedItems.some((p) => p.itemId === item.id);
                const canAfford = coins >= item.price;
                const rStyle = RARITY_STYLES[item.rarity];

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl bg-[#1E353F] border-2 ${rStyle.border} flex flex-col justify-between space-y-4`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2 rounded-xl bg-[#172A32] border border-[#D7B779]/30">
                          <PixelItemPreview itemId={item.id} size={56} />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${rStyle.bg} ${rStyle.text}`}
                          >
                            {item.rarity}
                          </span>
                          <span className="text-[10px] text-[#788FA3]">
                            {item.category} · {item.subType}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[#E8DDC8]">{item.name}</h3>
                        <p className="text-xs text-[#788FA3] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#788FA3]/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 font-mono font-bold text-sm text-[#D7B779]">
                        <Coins className="w-4 h-4" />
                        <span>{item.price === 0 ? 'Starter' : item.price}</span>
                      </div>

                      {isOwned ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEquipped && !['desk', 'chair'].includes(item.slot)) {
                              unequipRpgSlot(item.slot);
                              triggerToast(`Stored ${item.name} in Inventory.`);
                            } else {
                              equipRpgItem(item.id);
                              triggerToast(`Placed ${item.name} in your Study Room!`);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            isEquipped
                              ? 'bg-[#294C45] text-[#6EBF8B] border border-[#6EBF8B]/40'
                              : 'bg-[#172A32] text-[#E8DDC8] hover:bg-[#294C45]'
                          }`}
                        >
                          {isEquipped ? 'Equipped ✓' : 'Place in Room'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => setConfirmPurchaseItem(item)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                            canAfford
                              ? 'bg-[#D7B779] hover:bg-[#e3c78d] text-[#172A32] shadow-md'
                              : 'bg-[#172A32] text-[#788FA3] opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? 'Purchase' : 'Need Coins'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: INVENTORY & PERSISTENT COIN WALLET LEDGER */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Owned Items Inventory */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#D7B779]/35">
                <h2 className="text-base font-bold text-[#E8DDC8]">
                  Permanent Item Inventory ({ownedItemsCatalog.length} / {RPG_SHOP_ITEMS.length})
                </h2>
                <p className="text-xs text-[#788FA3]">
                  Every purchased item stays in your inventory permanently. Toggle placement anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ownedItemsCatalog.map((item) => {
                  const isEquipped = rpgState.placedItems.some((p) => p.itemId === item.id);
                  const rStyle = RARITY_STYLES[item.rarity];
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#1E353F] border border-[#788FA3]/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PixelItemPreview itemId={item.id} size={46} />
                        <div className="min-w-0">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${rStyle.bg} ${rStyle.text}`}
                          >
                            {item.rarity}
                          </span>
                          <h4 className="text-xs font-bold text-[#E8DDC8] truncate mt-0.5">
                            {item.name}
                          </h4>
                          <p className="text-[10px] text-[#788FA3]">{item.category}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          isEquipped && !['desk', 'chair'].includes(item.slot)
                            ? unequipRpgSlot(item.slot)
                            : equipRpgItem(item.id)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                          isEquipped
                            ? 'bg-[#294C45] text-[#6EBF8B] border border-[#6EBF8B]/40'
                            : 'bg-[#D7B779] text-[#172A32]'
                        }`}
                      >
                        {isEquipped ? 'Active in Room' : 'Equip'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Cols: Persistent Wallet & Verified Reward Transaction History */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#D7B779]/35 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#E8DDC8] flex items-center gap-2">
                    <History className="w-4 h-4 text-[#D7B779]" />
                    Wallet &amp; Reward Ledger
                  </h2>
                  <p className="text-xs text-[#788FA3]">
                    Verified activity rewards &amp; shop purchases (Duplicate-Reward Lock Active)
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-base font-extrabold text-[#D7B779]">{coins} Coins</div>
                  <div className="text-[10px] text-[#6EBF8B]">
                    {rpgState.rewardedActivityIds.length} verified locks
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#788FA3]/30 space-y-2.5 max-h-[500px] overflow-y-auto">
                {rpgState.transactions.length === 0 ? (
                  <p className="text-xs text-[#788FA3] text-center py-8">
                    Complete a task, Pomodoro session, habit, or mission to record your first verified transaction.
                  </p>
                ) : (
                  rpgState.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-[#172A32] border border-[#788FA3]/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#E8DDC8] truncate">{tx.reason}</p>
                        <p className="text-[10px] text-[#788FA3] font-mono">
                          {tx.timestamp.slice(0, 16).replace('T', ' ')} · {tx.sourceModule}
                        </p>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        {tx.xpDelta > 0 && (
                          <div className="text-[11px] font-bold text-[#6EBF8B]">
                            +{tx.xpDelta} XP
                          </div>
                        )}
                        <div
                          className={`font-bold ${
                            tx.amount >= 0 ? 'text-[#D7B779]' : 'text-[#B97862]'
                          }`}
                        >
                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} Coins
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ACHIEVEMENT HALL */}
        {activeTab === 'achievements' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#1E353F] border border-[#D7B779]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#E8DDC8]">
                  Hall of Achievements &amp; Badges
                </h2>
                <p className="text-xs text-[#788FA3]">
                  Long-term milestones unlocked automatically by your real Life OS progress.
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#172A32] border border-[#D7B779]/40 text-xs font-bold text-[#D7B779]">
                {rpgAchievements.filter((a) => a.unlocked).length} / {rpgAchievements.length}{' '}
                Unlocked
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rpgAchievements.map((ach) => {
                const pct = Math.min(
                  100,
                  Math.round((ach.currentProgress / ach.targetProgress) * 100)
                );
                const rStyle = RARITY_STYLES[ach.rarity];

                return (
                  <div
                    key={ach.id}
                    className={`p-5 rounded-2xl border-2 flex flex-col justify-between space-y-4 ${
                      ach.unlocked
                        ? 'bg-[#1E353F] border-[#D7B779]'
                        : 'bg-[#1E353F]/60 border-[#788FA3]/25 opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                          ach.unlocked
                            ? 'bg-[#294C45] border-[#D7B779] text-[#D7B779]'
                            : 'bg-[#172A32] border-[#788FA3]/30 text-[#788FA3]'
                        }`}
                      >
                        {ach.unlocked ? (
                          <Trophy className="w-6 h-6" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${rStyle.bg} ${rStyle.text}`}
                        >
                          {ach.rarity} Badge
                        </span>
                        <h3 className="text-sm font-bold text-[#E8DDC8]">{ach.title}</h3>
                        <p className="text-xs text-[#788FA3] leading-relaxed">
                          {ach.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[#788FA3]/20">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#788FA3]">Progress</span>
                          <span className="font-mono font-bold text-[#E8DDC8]">
                            {ach.currentProgress} / {ach.targetProgress} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-md bg-[#172A32] overflow-hidden">
                          <div
                            className={`h-full ${
                              ach.unlocked ? 'bg-[#6EBF8B]' : 'bg-[#D7B779]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#D7B779]">
                          +{ach.xpReward} XP · +{ach.coinReward} Coins
                        </span>

                        {ach.claimed ? (
                          <span className="px-3 py-1 rounded-lg bg-[#294C45] text-[#6EBF8B] text-xs font-bold">
                            Claimed ✓
                          </span>
                        ) : ach.unlocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleClaimAchievement(
                                ach.id,
                                ach.title,
                                ach.xpReward,
                                ach.coinReward
                              )
                            }
                            className="px-3.5 py-1.5 rounded-xl bg-[#D7B779] text-[#172A32] text-xs font-extrabold shadow-md"
                          >
                            Claim Badge Reward
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#788FA3]">Locked</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PURCHASE CONFIRMATION MODAL */}
      {confirmPurchaseItem && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1E353F] border-2 border-[#D7B779] p-6 space-y-4 text-[#E8DDC8]">
            <div className="flex items-center gap-3">
              <PixelItemPreview itemId={confirmPurchaseItem.id} size={56} />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#D7B779]">
                  Confirm Shop Purchase
                </span>
                <h3 className="text-base font-bold">{confirmPurchaseItem.name}</h3>
                <p className="text-xs text-[#788FA3]">{confirmPurchaseItem.description}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#172A32] flex items-center justify-between text-xs font-mono">
              <span>Item Cost:</span>
              <span className="font-bold text-[#D7B779]">
                {confirmPurchaseItem.price} Life Coins
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPurchaseItem(null)}
                className="px-4 py-2 rounded-xl bg-[#172A32] text-xs font-bold text-[#E8DDC8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBuy}
                className="px-5 py-2 rounded-xl bg-[#D7B779] text-[#172A32] text-xs font-extrabold"
              >
                Confirm &amp; Place in Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIXEL AVATAR CUSTOMIZER MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#1E353F] border-2 border-[#D7B779] p-6 space-y-5 text-[#E8DDC8]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#D7B779]" />
                Customize Pixel Avatar
              </h3>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="text-[#788FA3] hover:text-[#E8DDC8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center p-4 rounded-xl bg-[#172A32] border border-[#D7B779]/30">
              <PixelAvatarSprite avatar={rpgState.avatar} size={96} isFocusing />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#788FA3] mb-1">Headgear / Accessory</label>
                <select
                  value={rpgState.avatar.hat}
                  onChange={(e) =>
                    updateRpgAvatar({
                      hat: e.target.value as typeof rpgState.avatar.hat,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#172A32] border border-[#D7B779]/40"
                >
                  <option value="headphones">Focus Headphones</option>
                  <option value="wizard_hat">Scholar Mage Hat</option>
                  <option value="crown">Golden Sovereign Crown</option>
                  <option value="headband">Warrior Headband</option>
                  <option value="none">No Headgear</option>
                </select>
              </div>

              <div>
                <label className="block text-[#788FA3] mb-1">Hair Style</label>
                <select
                  value={rpgState.avatar.hairStyle}
                  onChange={(e) =>
                    updateRpgAvatar({
                      hairStyle: e.target.value as typeof rpgState.avatar.hairStyle,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#172A32] border border-[#D7B779]/40"
                >
                  <option value="scholar">Classic Scholar</option>
                  <option value="spiky">Adventurer Spiky</option>
                  <option value="long">Long Flowing</option>
                  <option value="hooded">Mystic Crop</option>
                </select>
              </div>

              <div>
                <label className="block text-[#788FA3] mb-1">Outfit / Tunic Color</label>
                <div className="flex gap-2">
                  {(
                    [
                      '#294C45',
                      '#B97862',
                      '#788FA3',
                      '#D7B779',
                      '#4A3B5C',
                    ] as const
                  ).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => updateRpgAvatar({ outfitColor: col })}
                      className={`w-7 h-7 rounded-lg border-2 ${
                        rpgState.avatar.outfitColor === col
                          ? 'border-white scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#788FA3] mb-1">Skin Tone</label>
                <div className="flex gap-2">
                  {(
                    ['#F3C6A5', '#E0AC69', '#C68642', '#8D5524'] as const
                  ).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => updateRpgAvatar({ skinTone: tone })}
                      className={`w-7 h-7 rounded-lg border-2 ${
                        rpgState.avatar.skinTone === tone
                          ? 'border-white scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: tone }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-5 py-2 rounded-xl bg-[#D7B779] text-[#172A32] text-xs font-extrabold"
              >
                Save Avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
