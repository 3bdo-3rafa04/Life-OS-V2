import React, { useEffect, useRef } from 'react';
import {
  RpgAvatarConfig,
  RpgPlacedItem,
  RpgRoomSlot,
  StudyEnvironmentMode,
  AmbientSoundType,
  RPG_SHOP_ITEMS,
} from '../services/rpgGamificationEngine.ts';
import { Move, RotateCcw, EyeOff } from 'lucide-react';

// Procedural Web Audio Ambient Sound Controller (Rain, Fireplace, Night Wind, Focus Noise)
class AmbientSoundController {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private currentType: AmbientSoundType = 'off';

  public update(type: AmbientSoundType, volume: number) {
    if (type === 'off' || volume <= 0.01) {
      this.stop();
      return;
    }

    if (this.currentType !== type || !this.ctx) {
      this.start(type, volume);
    } else if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(volume * 0.22, this.ctx.currentTime, 0.15);
    }
  }

  private start(type: AmbientSoundType, volume: number) {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      this.ctx = ctx;
      this.currentType = type;

      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      // Generate pink/brownian texture with optional crackle for fireplace
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        let sample = lastOut * 2.5;
        if (type === 'fireplace' && Math.random() < 0.0018) {
          sample += (Math.random() * 2 - 1) * 0.85;
        }
        output[i] = Math.max(-1, Math.min(1, sample));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      if (type === 'rain') {
        filter.type = 'bandpass';
        filter.frequency.value = 950;
        filter.Q.value = 0.65;
      } else if (type === 'fireplace') {
        filter.type = 'lowpass';
        filter.frequency.value = 420;
      } else if (type === 'night_wind') {
        filter.type = 'bandpass';
        filter.frequency.value = 340;
        filter.Q.value = 2.2;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 600;
      }

      const gain = ctx.createGain();
      gain.gain.value = volume * 0.22;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(0);

      this.sourceNode = noise;
      this.filterNode = filter;
      this.gainNode = gain;
    } catch {
      // Browser autoplay policy may block until interaction
    }
  }

  public stop() {
    try {
      if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch {
      // ignore
    }
    this.sourceNode = null;
    this.filterNode = null;
    this.gainNode = null;
    this.ctx = null;
    this.currentType = 'off';
  }
}

const sharedAmbientAudio = new AmbientSoundController();

export const PixelAvatarSprite: React.FC<{
  avatar: RpgAvatarConfig;
  size?: number;
  isFocusing?: boolean;
}> = ({ avatar, size = 64, isFocusing = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="select-none"
    >
      {/* Shadow */}
      <rect x="4" y="14" width="8" height="1" fill="#0E171B" opacity="0.5" />
      {/* Body / Tunic */}
      <rect x="4" y="9" width="8" height="5" fill={avatar.outfitColor} />
      <rect x="5" y="10" width="6" height="4" fill={avatar.outfitColor} />
      {/* Collar / Gold Trim */}
      <rect x="6" y="9" width="4" height="1" fill="#D7B779" />
      <rect x="7" y="10" width="2" height="1" fill="#E8DDC8" />
      {/* Head */}
      <rect x="5" y="4" width="6" height="5" fill={avatar.skinTone} />
      {/* Eyes */}
      <rect x="6" y="6" width="1" height="1" fill="#172A32" />
      <rect x="9" y="6" width="1" height="1" fill="#172A32" />
      {/* Blush / Smile */}
      <rect x="7" y="8" width="2" height="1" fill="#B97862" />
      {/* Hair */}
      <rect x="4" y="3" width="8" height="2" fill={avatar.hairColor} />
      <rect x="4" y="5" width="1" height="3" fill={avatar.hairColor} />
      <rect x="11" y="5" width="1" height="3" fill={avatar.hairColor} />
      {avatar.hairStyle === 'spiky' && (
        <>
          <rect x="5" y="2" width="2" height="1" fill={avatar.hairColor} />
          <rect x="9" y="2" width="2" height="1" fill={avatar.hairColor} />
        </>
      )}
      {avatar.hairStyle === 'long' && (
        <>
          <rect x="4" y="8" width="1" height="3" fill={avatar.hairColor} />
          <rect x="11" y="8" width="1" height="3" fill={avatar.hairColor} />
        </>
      )}
      {/* Hat / Accessory */}
      {avatar.hat === 'wizard_hat' && (
        <>
          <rect x="3" y="3" width="10" height="1" fill="#294C45" />
          <rect x="5" y="1" width="6" height="2" fill="#294C45" />
          <rect x="7" y="0" width="2" height="1" fill="#D7B779" />
        </>
      )}
      {avatar.hat === 'crown' && (
        <>
          <rect x="5" y="2" width="6" height="1" fill="#D7B779" />
          <rect x="5" y="1" width="1" height="1" fill="#D7B779" />
          <rect x="7" y="1" width="2" height="1" fill="#F3C66F" />
          <rect x="10" y="1" width="1" height="1" fill="#D7B779" />
        </>
      )}
      {avatar.hat === 'headphones' && (
        <>
          <rect x="4" y="2" width="8" height="1" fill="#788FA3" />
          <rect x="3" y="5" width="1" height="3" fill="#D7B779" />
          <rect x="12" y="5" width="1" height="3" fill="#D7B779" />
        </>
      )}
      {avatar.hat === 'headband' && (
        <rect x="4" y="4" width="8" height="1" fill="#B97862" />
      )}
      {/* Focus Sparkle when Pomodoro is active */}
      {isFocusing && (
        <>
          <rect x="1" y="2" width="1" height="1" fill="#D7B779" />
          <rect x="14" y="3" width="1" height="1" fill="#D7B779" />
        </>
      )}
    </svg>
  );
};

export const PixelItemPreview: React.FC<{ itemId: string; size?: number }> = ({
  itemId,
  size = 56,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      className="select-none"
    >
      <rect width="24" height="24" fill="#172A32" rx="2" />
      {itemId.startsWith('desk_') && (
        <>
          <rect
            x="3"
            y="10"
            width="18"
            height="3"
            fill={
              itemId === 'desk_alchemist_grand'
                ? '#7A3E2E'
                : itemId === 'desk_standing_pro'
                ? '#4A372B'
                : '#8C6239'
            }
          />
          <rect x="4" y="13" width="3" height="7" fill="#5E4026" />
          <rect x="17" y="13" width="3" height="7" fill="#5E4026" />
          {itemId === 'desk_alchemist_grand' && (
            <rect x="5" y="11" width="14" height="1" fill="#D7B779" />
          )}
        </>
      )}
      {itemId.startsWith('chair_') && (
        <>
          <rect
            x="8"
            y="5"
            width="8"
            height="8"
            fill={
              itemId === 'chair_ergo_throne'
                ? '#D7B779'
                : itemId === 'chair_cozy_cushion'
                ? '#294C45'
                : '#8C6239'
            }
          />
          <rect x="7" y="13" width="10" height="2" fill="#6E473B" />
          <rect x="8" y="15" width="2" height="5" fill="#4A3222" />
          <rect x="14" y="15" width="2" height="5" fill="#4A3222" />
        </>
      )}
      {itemId.startsWith('pc_') && (
        <>
          <rect x="4" y="6" width="16" height="10" fill="#2A3B44" />
          <rect x="5" y="7" width="14" height="8" fill="#294C45" />
          <rect x="7" y="9" width="6" height="1" fill="#9BB9A2" />
          <rect x="7" y="11" width="9" height="1" fill="#D7B779" />
          <rect x="10" y="16" width="4" height="3" fill="#788FA3" />
          <rect x="8" y="19" width="8" height="1" fill="#788FA3" />
        </>
      )}
      {itemId.startsWith('kb_') && (
        <>
          <rect x="4" y="10" width="16" height="6" fill="#E8DDC8" />
          <rect x="5" y="11" width="2" height="2" fill="#B97862" />
          <rect x="8" y="11" width="8" height="2" fill="#294C45" />
          <rect x="17" y="11" width="2" height="2" fill="#D7B779" />
          <rect x="7" y="14" width="10" height="1" fill="#788FA3" />
        </>
      )}
      {itemId.startsWith('lamp_') && (
        <>
          <rect
            x="8"
            y="5"
            width="8"
            height="5"
            fill={
              itemId === 'lamp_banker_emerald'
                ? '#294C45'
                : itemId === 'lamp_celestial_orb'
                ? '#F3C66F'
                : '#D7B779'
            }
          />
          <rect x="11" y="10" width="2" height="7" fill="#B97862" />
          <rect x="8" y="17" width="8" height="2" fill="#D7B779" />
        </>
      )}
      {itemId.startsWith('shelf_') && (
        <>
          <rect x="3" y="7" width="18" height="2" fill="#8C6239" />
          <rect x="3" y="15" width="18" height="2" fill="#8C6239" />
          {itemId !== 'shelf_basic' && (
            <>
              <rect x="5" y="3" width="3" height="4" fill="#B97862" />
              <rect x="9" y="4" width="3" height="3" fill="#294C45" />
              <rect x="13" y="2" width="4" height="5" fill="#D7B779" />
              <rect x="6" y="11" width="4" height="4" fill="#788FA3" />
              <rect x="12" y="11" width="5" height="4" fill="#B97862" />
            </>
          )}
        </>
      )}
      {itemId.startsWith('plant_') && (
        <>
          <rect x="8" y="14" width="8" height="6" fill="#B97862" />
          <rect x="6" y="7" width="12" height="7" fill="#294C45" />
          <rect
            x="8"
            y="5"
            width="8"
            height="4"
            fill={itemId === 'plant_bonsai_spirit' ? '#D7B779' : '#6EBF8B'}
          />
        </>
      )}
      {itemId.startsWith('decor_') && (
        <>
          <rect x="5" y="6" width="14" height="12" fill="#B97862" />
          <rect x="7" y="8" width="10" height="8" fill="#E8DDC8" />
          <rect x="10" y="10" width="4" height="4" fill="#D7B779" />
        </>
      )}
      {itemId.startsWith('pet_') && (
        <>
          <rect
            x="6"
            y="9"
            width="12"
            height="9"
            fill={
              itemId === 'pet_ginger_cat'
                ? '#E08A4B'
                : itemId === 'pet_scholar_owl'
                ? '#8C6239'
                : '#D7B779'
            }
          />
          <rect x="6" y="6" width="3" height="3" fill="#B97862" />
          <rect x="15" y="6" width="3" height="3" fill="#B97862" />
          <rect x="8" y="11" width="2" height="2" fill="#172A32" />
          <rect x="14" y="11" width="2" height="2" fill="#172A32" />
        </>
      )}
      {(itemId.startsWith('wall_') ||
        itemId.startsWith('theme_') ||
        itemId.startsWith('special_')) && (
        <>
          <rect x="4" y="4" width="16" height="16" fill="#294C45" />
          <rect x="7" y="7" width="10" height="10" fill="#D7B779" />
          <rect x="9" y="9" width="6" height="6" fill="#E8DDC8" />
        </>
      )}
    </svg>
  );
};

interface PixelStudyRoomCanvasProps {
  placedItems: RpgPlacedItem[];
  avatar: RpgAvatarConfig;
  environment: StudyEnvironmentMode;
  ambientSound: AmbientSoundType;
  ambientVolume: number;
  isPomodoroRunning?: boolean;
  customizeMode?: boolean;
  selectedSlot?: RpgRoomSlot | null;
  onSelectSlot?: (slot: RpgRoomSlot) => void;
  onMovePlacedItem?: (slot: RpgRoomSlot, dx: number, dy: number) => void;
  onResetPlacedItem?: (slot: RpgRoomSlot) => void;
  onUnequipSlot?: (slot: RpgRoomSlot) => void;
}

export const PixelStudyRoomCanvas: React.FC<PixelStudyRoomCanvasProps> = ({
  placedItems,
  avatar,
  environment,
  ambientSound,
  ambientVolume,
  isPomodoroRunning = false,
  customizeMode = false,
  selectedSlot = null,
  onSelectSlot,
  onMovePlacedItem,
  onResetPlacedItem,
  onUnequipSlot,
}) => {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    sharedAmbientAudio.update(ambientSound, ambientVolume);
    return () => {
      mountedRef.current = false;
    };
  }, [ambientSound, ambientVolume]);

  useEffect(() => {
    return () => {
      sharedAmbientAudio.stop();
    };
  }, []);

  const getEquipped = (slot: RpgRoomSlot) =>
    placedItems.find((p) => p.slot === slot) || null;

  const wallpaperItem = getEquipped('wallpaper')?.itemId || 'wall_timber';
  const themeItem = getEquipped('theme')?.itemId || 'theme_forest';

  // Determine wall & floor colors from equipped theme + wallpaper
  const wallTopColor =
    themeItem === 'theme_midnight_loft'
      ? '#141E28'
      : themeItem === 'theme_terracotta_hearth'
      ? '#3B231E'
      : wallpaperItem === 'wall_sage_botanical'
      ? '#243F39'
      : wallpaperItem === 'wall_midnight_observatory'
      ? '#1B2836'
      : '#172A32';

  const wainscotingColor =
    themeItem === 'theme_terracotta_hearth'
      ? '#59342A'
      : wallpaperItem === 'wall_sage_botanical'
      ? '#294C45'
      : '#26383F';

  const floorColor =
    themeItem === 'theme_midnight_loft'
      ? '#1F2D3A'
      : themeItem === 'theme_terracotta_hearth'
      ? '#4D2E24'
      : '#3A2A21';

  const floorPlankColor =
    themeItem === 'theme_midnight_loft' ? '#17222C' : '#2E2018';

  const skyColor =
    environment === 'morning_study'
      ? '#78A8C8'
      : environment === 'rainy_day'
      ? '#394D5E'
      : '#0E1722';

  const deskEquipped = getEquipped('desk');
  const chairEquipped = getEquipped('chair');
  const pcEquipped = getEquipped('computer');
  const kbEquipped = getEquipped('keyboard');
  const lampEquipped = getEquipped('lamp');
  const shelfEquipped = getEquipped('shelf');
  const plantLeftEquipped = getEquipped('plant_left');
  const plantRightEquipped = getEquipped('plant_right');
  const posterEquipped = getEquipped('poster');
  const rugEquipped = getEquipped('rug');
  const clockEquipped = getEquipped('clock');
  const petEquipped = getEquipped('pet');
  const specialEquipped = getEquipped('special');

  const selectedPlaced = selectedSlot ? getEquipped(selectedSlot) : null;
  const selectedShopMeta = selectedPlaced
    ? RPG_SHOP_ITEMS.find((i) => i.id === selectedPlaced.itemId)
    : null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border-2 border-[#D7B779]/35 bg-[#172A32] shadow-2xl">
      {/* Main Pixel-Art SVG Canvas (160x100 virtual pixel grid) */}
      <svg
        viewBox="0 0 160 100"
        shapeRendering="crispEdges"
        className="w-full h-auto block select-none"
      >
        {/* 1. UPPER WALL */}
        <rect x="0" y="0" width="160" height="58" fill={wallTopColor} />

        {/* Subtle Pixel Wallpaper Pattern */}
        {wallpaperItem === 'wall_sage_botanical' && (
          <g fill="#325950" opacity="0.55">
            <rect x="12" y="10" width="2" height="4" />
            <rect x="11" y="11" width="4" height="2" />
            <rect x="142" y="14" width="2" height="4" />
            <rect x="141" y="15" width="4" height="2" />
          </g>
        )}
        {wallpaperItem === 'wall_midnight_observatory' && (
          <g fill="#D7B779" opacity="0.45">
            <rect x="14" y="8" width="1" height="1" />
            <rect x="22" y="15" width="1" height="1" />
            <rect x="138" y="10" width="1" height="1" />
            <rect x="148" y="18" width="1" height="1" />
          </g>
        )}

        {/* WAINSCOTING / LOWER WALL TRIM */}
        <rect x="0" y="44" width="160" height="2" fill="#D7B779" opacity="0.45" />
        <rect x="0" y="46" width="160" height="12" fill={wainscotingColor} />
        {Array.from({ length: 16 }).map((_, idx) => (
          <rect
            key={idx}
            x={idx * 10 + 2}
            y="48"
            width="1"
            height="8"
            fill="#172A32"
            opacity="0.35"
          />
        ))}

        {/* 2. PIXEL FLOOR & WOODEN PLANKS */}
        <rect x="0" y="58" width="160" height="42" fill={floorColor} />
        <rect x="0" y="58" width="160" height="2" fill="#172A32" opacity="0.5" />
        <rect x="0" y="66" width="160" height="1" fill={floorPlankColor} />
        <rect x="0" y="75" width="160" height="1" fill={floorPlankColor} />
        <rect x="0" y="85" width="160" height="1" fill={floorPlankColor} />
        <rect x="0" y="95" width="160" height="1" fill={floorPlankColor} />

        {/* 3. PIXEL WINDOW WITH LIVE WEATHER ENVIRONMENT */}
        <g transform="translate(18, 8)">
          {/* Window Frame */}
          <rect x="0" y="0" width="34" height="30" fill="#4A3222" />
          <rect x="2" y="2" width="30" height="26" fill={skyColor} />

          {/* Environment Details */}
          {environment === 'morning_study' && (
            <>
              {/* Sun & Distant Hills */}
              <rect x="22" y="5" width="5" height="5" fill="#F3C66F" />
              <rect x="2" y="20" width="18" height="8" fill="#5D8C7B" />
              <rect x="14" y="18" width="18" height="10" fill="#294C45" />
              {/* Warm Morning Sunbeam into the room */}
              <polygon
                points="2,28 32,28 52,65 12,65"
                fill="#F3C66F"
                opacity="0.09"
              />
            </>
          )}

          {environment === 'rainy_day' && (
            <>
              {/* Storm Clouds & Animated Rain Streaks */}
              <rect x="3" y="3" width="28" height="5" fill="#273643" />
              <rect x="2" y="22" width="30" height="6" fill="#22313B" />
              <g fill="#A9C5D3" opacity="0.75">
                <rect x="6" y="10" width="1" height="4">
                  <animate
                    attributeName="y"
                    values="8;24;8"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                </rect>
                <rect x="13" y="14" width="1" height="4">
                  <animate
                    attributeName="y"
                    values="10;25;10"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                </rect>
                <rect x="21" y="9" width="1" height="4">
                  <animate
                    attributeName="y"
                    values="7;24;7"
                    dur="1.25s"
                    repeatCount="indefinite"
                  />
                </rect>
                <rect x="27" y="13" width="1" height="4">
                  <animate
                    attributeName="y"
                    values="9;25;9"
                    dur="1.0s"
                    repeatCount="indefinite"
                  />
                </rect>
              </g>
            </>
          )}

          {environment === 'night_study' && (
            <>
              {/* Crescent Moon & Twinkling Stars */}
              <rect x="23" y="5" width="4" height="4" fill="#F3C66F" />
              <rect x="25" y="5" width="2" height="2" fill={skyColor} />
              <rect x="7" y="7" width="1" height="1" fill="#E8DDC8">
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="15" y="12" width="1" height="1" fill="#D7B779">
                <animate
                  attributeName="opacity"
                  values="1;0.2;1"
                  dur="3.1s"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="9" y="18" width="1" height="1" fill="#E8DDC8" />
              {/* Distant Silhouette */}
              <rect x="2" y="22" width="30" height="6" fill="#172A32" />
            </>
          )}

          {/* Window Panes Crossbar & Sill */}
          <rect x="16" y="2" width="2" height="26" fill="#4A3222" />
          <rect x="2" y="14" width="30" height="2" fill="#4A3222" />
          <rect x="-2" y="29" width="38" height="2" fill="#6E473B" />
        </g>

        {/* 4. RUG SLOT */}
        {rugEquipped && (
          <g
            transform={`translate(${48 + rugEquipped.offsetX}, ${73 + rugEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('rug')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            <rect x="0" y="0" width="64" height="18" fill="#B97862" />
            <rect x="2" y="2" width="60" height="14" fill="#8E4E3B" />
            <rect x="5" y="4" width="54" height="10" fill="#D7B779" opacity="0.85" />
            <rect x="9" y="6" width="46" height="6" fill="#294C45" />
            {customizeMode && selectedSlot === 'rug' && (
              <rect
                x="-1"
                y="-1"
                width="66"
                height="20"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 5. POSTER SLOT */}
        {posterEquipped && (
          <g
            transform={`translate(${60 + posterEquipped.offsetX}, ${11 + posterEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('poster')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            <rect x="0" y="0" width="18" height="22" fill="#6E473B" />
            <rect x="2" y="2" width="14" height="18" fill="#E8DDC8" />
            <rect x="5" y="5" width="8" height="6" fill="#B97862" />
            <rect x="4" y="13" width="10" height="1" fill="#294C45" />
            <rect x="4" y="15" width="8" height="1" fill="#788FA3" />
            {customizeMode && selectedSlot === 'poster' && (
              <rect
                x="-1"
                y="-1"
                width="20"
                height="24"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 6. WALL CLOCK SLOT */}
        {clockEquipped && (
          <g
            transform={`translate(${84 + clockEquipped.offsetX}, ${10 + clockEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('clock')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            <rect x="0" y="0" width="10" height="16" fill="#5E4026" />
            <rect x="2" y="2" width="6" height="6" fill="#E8DDC8" />
            <rect x="4" y="3" width="1" height="3" fill="#172A32" />
            <rect x="4" y="5" width="2" height="1" fill="#172A32" />
            <rect x="4" y="9" width="2" height="5" fill="#D7B779">
              <animate
                attributeName="x"
                values="3;5;3"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </rect>
            {customizeMode && selectedSlot === 'clock' && (
              <rect
                x="-1"
                y="-1"
                width="12"
                height="18"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 7. BOOKSHELF SLOT */}
        {shelfEquipped && (
          <g
            transform={`translate(${104 + shelfEquipped.offsetX}, ${12 + shelfEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('shelf')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            {/* Shelf Backing & Frame */}
            <rect
              x="0"
              y="0"
              width="38"
              height="46"
              fill={
                shelfEquipped.itemId === 'shelf_grimoire_grand' ? '#3B231E' : '#5E4026'
              }
            />
            <rect x="2" y="2" width="34" height="42" fill="#2A1B12" />
            {/* Shelves */}
            <rect x="1" y="13" width="36" height="2" fill="#8C6239" />
            <rect x="1" y="26" width="36" height="2" fill="#8C6239" />
            <rect x="1" y="39" width="36" height="2" fill="#8C6239" />

            {/* Books if upgraded */}
            {shelfEquipped.itemId !== 'shelf_basic' && (
              <>
                <rect x="4" y="6" width="3" height="7" fill="#B97862" />
                <rect x="8" y="5" width="4" height="8" fill="#294C45" />
                <rect x="13" y="7" width="3" height="6" fill="#D7B779" />
                <rect x="19" y="5" width="4" height="8" fill="#788FA3" />
                <rect x="24" y="6" width="3" height="7" fill="#E8DDC8" />

                <rect x="5" y="18" width="4" height="8" fill="#788FA3" />
                <rect x="10" y="19" width="3" height="7" fill="#B97862" />
                <rect x="14" y="17" width="5" height="9" fill="#D7B779" />
                <rect x="25" y="18" width="6" height="8" fill="#294C45" />

                <rect x="4" y="31" width="5" height="8" fill="#D7B779" />
                <rect x="10" y="32" width="4" height="7" fill="#B97862" />
                <rect x="16" y="30" width="6" height="9" fill="#294C45" />
              </>
            )}

            {shelfEquipped.itemId === 'shelf_grimoire_grand' && (
              <>
                {/* Glowing Arcane Crystal on top shelf */}
                <rect x="30" y="6" width="4" height="7" fill="#6EBF8B" />
                <rect x="1" y="0" width="36" height="1" fill="#D7B779" />
              </>
            )}

            {customizeMode && selectedSlot === 'shelf' && (
              <rect
                x="-1"
                y="-1"
                width="40"
                height="48"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 8. LEFT PLANT SLOT */}
        {plantLeftEquipped && (
          <g
            transform={`translate(${10 + plantLeftEquipped.offsetX}, ${46 + plantLeftEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('plant_left')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            <rect x="3" y="11" width="8" height="8" fill="#B97862" />
            <rect x="2" y="10" width="10" height="2" fill="#9E5E49" />
            <rect x="1" y="3" width="12" height="7" fill="#294C45" />
            <rect x="3" y="0" width="8" height="5" fill="#6EBF8B" />
            {customizeMode && selectedSlot === 'plant_left' && (
              <rect
                x="-1"
                y="-1"
                width="16"
                height="21"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 9. RIGHT PLANT SLOT */}
        {plantRightEquipped && (
          <g
            transform={`translate(${144 + plantRightEquipped.offsetX}, ${45 + plantRightEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('plant_right')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            <rect x="2" y="12" width="8" height="7" fill="#B97862" />
            <rect
              x="0"
              y="2"
              width="12"
              height="10"
              fill={
                plantRightEquipped.itemId === 'plant_bonsai_spirit'
                  ? '#D7B779'
                  : '#294C45'
              }
            />
            <rect
              x="2"
              y="0"
              width="8"
              height="4"
              fill={
                plantRightEquipped.itemId === 'plant_bonsai_spirit'
                  ? '#F3C66F'
                  : '#6EBF8B'
              }
            />
            {customizeMode && selectedSlot === 'plant_right' && (
              <rect
                x="-1"
                y="-1"
                width="14"
                height="21"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 10. DESK & WORKSTATION */}
        {deskEquipped && (
          <g
            transform={`translate(${44 + deskEquipped.offsetX}, ${48 + deskEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('desk')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            {/* Desk Surface */}
            <rect
              x="0"
              y="6"
              width="62"
              height="5"
              fill={
                deskEquipped.itemId === 'desk_alchemist_grand'
                  ? '#6E3224'
                  : deskEquipped.itemId === 'desk_standing_pro'
                  ? '#3E2C22'
                  : deskEquipped.itemId === 'desk_oak_scholar'
                  ? '#7C5330'
                  : '#8C6239'
              }
            />
            {/* Gold Inlay for Grand Desk */}
            {deskEquipped.itemId === 'desk_alchemist_grand' && (
              <rect x="2" y="7" width="58" height="1" fill="#D7B779" />
            )}
            {/* Desk Legs & Drawers */}
            <rect x="3" y="11" width="5" height="18" fill="#4A3222" />
            <rect x="46" y="11" width="13" height="18" fill="#5E4026" />
            <rect x="48" y="13" width="9" height="4" fill="#4A3222" />
            <rect x="51" y="14" width="3" height="1" fill="#D7B779" />
            <rect x="48" y="19" width="9" height="4" fill="#4A3222" />
            <rect x="51" y="20" width="3" height="1" fill="#D7B779" />

            {/* Steaming Pixel Coffee Mug on Desk */}
            <rect x="10" y="3" width="3" height="3" fill="#E8DDC8" />
            <rect x="13" y="4" width="1" height="1" fill="#E8DDC8" />
            <rect x="11" y="0" width="1" height="2" fill="#E8DDC8" opacity="0.6">
              <animate
                attributeName="y"
                values="1;-1;1"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </rect>

            {customizeMode && selectedSlot === 'desk' && (
              <rect
                x="-1"
                y="5"
                width="64"
                height="25"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 11. COMPUTER / MONITOR ON DESK */}
        {pcEquipped && (
          <g
            transform={`translate(${64 + pcEquipped.offsetX}, ${37 + pcEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('computer')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            {pcEquipped.itemId === 'pc_dual_monitor' ||
            pcEquipped.itemId === 'pc_ultrawide_battlestation' ? (
              <>
                <rect x="-8" y="0" width="34" height="12" fill="#1E2B33" />
                <rect x="-7" y="1" width="15" height="10" fill="#294C45" />
                <rect x="10" y="1" width="15" height="10" fill="#233C47" />
                <rect x="-5" y="3" width="8" height="1" fill="#9BB9A2" />
                <rect x="-5" y="5" width="11" height="1" fill="#D7B779" />
                <rect x="12" y="3" width="10" height="1" fill="#6EBF8B" />
                <rect x="12" y="6" width="7" height="1" fill="#E8DDC8" />
                <rect x="6" y="12" width="6" height="4" fill="#788FA3" />
                <rect x="3" y="16" width="12" height="1" fill="#788FA3" />
              </>
            ) : (
              <>
                <rect x="0" y="0" width="20" height="13" fill="#273640" />
                <rect x="1" y="1" width="18" height="10" fill="#294C45" />
                <rect x="3" y="3" width="9" height="1" fill="#9BB9A2" />
                <rect x="3" y="5" width="12" height="1" fill="#D7B779" />
                <rect x="3" y="7" width="7" height="1" fill="#E8DDC8" />
                <rect x="8" y="13" width="4" height="3" fill="#788FA3" />
                <rect x="5" y="16" width="10" height="1" fill="#788FA3" />
              </>
            )}
            {customizeMode && selectedSlot === 'computer' && (
              <rect
                x="-9"
                y="-1"
                width="36"
                height="19"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 12. KEYBOARD ON DESK */}
        {kbEquipped && (
          <g
            transform={`translate(${67 + kbEquipped.offsetX}, ${52 + kbEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('keyboard')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            <rect x="0" y="0" width="14" height="3" fill="#E8DDC8" />
            <rect x="1" y="1" width="2" height="1" fill="#B97862" />
            <rect x="4" y="1" width="6" height="1" fill="#294C45" />
            <rect x="11" y="1" width="2" height="1" fill="#D7B779" />
          </g>
        )}

        {/* 13. DESK LAMP WITH WARM CONE OF LIGHT */}
        {lampEquipped && (
          <g
            transform={`translate(${92 + lampEquipped.offsetX}, ${39 + lampEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('lamp')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            {/* Warm Ambient Light Cone */}
            <polygon
              points="4,6 -12,20 18,20"
              fill="#F3C66F"
              opacity={environment === 'night_study' ? '0.22' : '0.12'}
            />
            <rect
              x="0"
              y="2"
              width="8"
              height="4"
              fill={
                lampEquipped.itemId === 'lamp_banker_emerald'
                  ? '#294C45'
                  : lampEquipped.itemId === 'lamp_celestial_orb'
                  ? '#F3C66F'
                  : '#D7B779'
              }
            />
            <rect x="3" y="6" width="2" height="8" fill="#B97862" />
            <rect x="1" y="14" width="6" height="1" fill="#D7B779" />
            {customizeMode && selectedSlot === 'lamp' && (
              <rect
                x="-1"
                y="1"
                width="10"
                height="15"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 14. USER AVATAR AT STUDY DESK + CHAIR */}
        {chairEquipped && (
          <g
            transform={`translate(${66 + chairEquipped.offsetX}, ${46 + chairEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('chair')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            {/* Avatar Seated at Desk */}
            <g transform="translate(1, -4)">
              <rect x="3" y="2" width="8" height="2" fill={avatar.hairColor} />
              <rect x="4" y="4" width="6" height="4" fill={avatar.skinTone} />
              <rect x="3" y="8" width="8" height="6" fill={avatar.outfitColor} />
              {avatar.hat === 'wizard_hat' && (
                <rect x="2" y="0" width="10" height="2" fill="#294C45" />
              )}
              {avatar.hat === 'crown' && (
                <rect x="4" y="0" width="6" height="2" fill="#D7B779" />
              )}
              {avatar.hat === 'headphones' && (
                <>
                  <rect x="2" y="4" width="1" height="3" fill="#D7B779" />
                  <rect x="11" y="4" width="1" height="3" fill="#D7B779" />
                </>
              )}
              {/* Focus Aura Particles when Pomodoro is Running */}
              {isPomodoroRunning && (
                <g fill="#F3C66F">
                  <rect x="0" y="1" width="1" height="1">
                    <animate
                      attributeName="y"
                      values="3;-2;3"
                      dur="1.4s"
                      repeatCount="indefinite"
                    />
                  </rect>
                  <rect x="13" y="2" width="1" height="1">
                    <animate
                      attributeName="y"
                      values="4;-1;4"
                      dur="1.7s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </g>
              )}
            </g>

            {/* Chair Backrest & Legs (visible from back/side) */}
            <rect
              x="2"
              y="6"
              width="12"
              height="11"
              fill={
                chairEquipped.itemId === 'chair_ergo_throne'
                  ? '#D7B779'
                  : chairEquipped.itemId === 'chair_cozy_cushion'
                  ? '#294C45'
                  : '#6E473B'
              }
            />
            <rect
              x="3"
              y="7"
              width="10"
              height="9"
              fill={
                chairEquipped.itemId === 'chair_cozy_cushion'
                  ? '#356158'
                  : '#543828'
              }
            />
            <rect x="3" y="17" width="2" height="10" fill="#2E2018" />
            <rect x="11" y="17" width="2" height="10" fill="#2E2018" />

            {customizeMode && selectedSlot === 'chair' && (
              <rect
                x="0"
                y="-5"
                width="16"
                height="33"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 15. PET COMPANION SLOT */}
        {petEquipped && (
          <g
            transform={`translate(${28 + petEquipped.offsetX}, ${72 + petEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('pet')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            {/* Pet Cushion */}
            <rect x="0" y="9" width="16" height="4" fill="#294C45" />
            <rect x="1" y="8" width="14" height="3" fill="#788FA3" />
            {/* Pet Sprite */}
            <rect
              x="3"
              y="3"
              width="10"
              height="6"
              fill={
                petEquipped.itemId === 'pet_ginger_cat'
                  ? '#E08A4B'
                  : petEquipped.itemId === 'pet_scholar_owl'
                  ? '#8C6239'
                  : '#D7B779'
              }
            />
            <rect x="3" y="1" width="2" height="2" fill="#B97862" />
            <rect x="11" y="1" width="2" height="2" fill="#B97862" />
            <rect x="5" y="5" width="1" height="1" fill="#172A32" />
            <rect x="10" y="5" width="1" height="1" fill="#172A32" />
            {/* Breathing / Purring subtle motion */}
            <rect x="13" y="1" width="1" height="1" fill="#D7B779">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="2.2s"
                repeatCount="indefinite"
              />
            </rect>
            {customizeMode && selectedSlot === 'pet' && (
              <rect
                x="-1"
                y="0"
                width="18"
                height="14"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* 16. SPECIAL ARTIFACT SLOT */}
        {specialEquipped && (
          <g
            transform={`translate(${122 + specialEquipped.offsetX}, ${64 + specialEquipped.offsetY})`}
            onClick={() => onSelectSlot?.('special')}
            className={customizeMode ? 'cursor-pointer' : ''}
          >
            <rect x="2" y="10" width="12" height="12" fill="#4A3222" />
            <rect x="1" y="9" width="14" height="2" fill="#D7B779" />
            <rect x="4" y="1" width="8" height="8" fill="#F3C66F" />
            <rect x="6" y="3" width="4" height="4" fill="#E8DDC8" />
            {customizeMode && selectedSlot === 'special' && (
              <rect
                x="0"
                y="0"
                width="16"
                height="23"
                fill="none"
                stroke="#F3C66F"
                strokeWidth="1"
              />
            )}
          </g>
        )}
      </svg>

      {/* Interactive Room Customization Floating Bar when customizeMode is active */}
      {customizeMode && (
        <div className="p-3 bg-[#172A32]/95 border-t border-[#D7B779]/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[#E8DDC8]">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-[#D7B779]" />
            <span>
              {selectedShopMeta ? (
                <>
                  Selected: <strong className="text-[#D7B779]">{selectedShopMeta.name}</strong>{' '}
                  <span className="text-[#788FA3] font-mono">
                    (x:{selectedPlaced?.offsetX || 0}, y:{selectedPlaced?.offsetY || 0})
                  </span>
                </>
              ) : (
                'Click any furniture, electronics, plant, or pet in the room to reposition or swap it.'
              )}
            </span>
          </div>

          {selectedSlot && selectedPlaced && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMovePlacedItem?.(selectedSlot, -3, 0)}
                className="px-2.5 py-1 rounded bg-[#294C45] hover:bg-[#356158] text-[#E8DDC8] font-mono"
              >
                ← Left
              </button>
              <button
                type="button"
                onClick={() => onMovePlacedItem?.(selectedSlot, 3, 0)}
                className="px-2.5 py-1 rounded bg-[#294C45] hover:bg-[#356158] text-[#E8DDC8] font-mono"
              >
                Right →
              </button>
              <button
                type="button"
                onClick={() => onMovePlacedItem?.(selectedSlot, 0, -2)}
                className="px-2.5 py-1 rounded bg-[#294C45] hover:bg-[#356158] text-[#E8DDC8] font-mono"
              >
                ↑ Up
              </button>
              <button
                type="button"
                onClick={() => onMovePlacedItem?.(selectedSlot, 0, 2)}
                className="px-2.5 py-1 rounded bg-[#294C45] hover:bg-[#356158] text-[#E8DDC8] font-mono"
              >
                ↓ Down
              </button>
              <button
                type="button"
                onClick={() => onResetPlacedItem?.(selectedSlot)}
                className="px-2.5 py-1 rounded bg-[#788FA3]/30 hover:bg-[#788FA3]/50 text-[#E8DDC8] flex items-center gap-1"
                title="Reset position"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              {!['desk', 'chair'].includes(selectedSlot) && (
                <button
                  type="button"
                  onClick={() => onUnequipSlot?.(selectedSlot)}
                  className="px-2.5 py-1 rounded bg-[#B97862]/30 hover:bg-[#B97862]/50 text-[#E8DDC8] flex items-center gap-1"
                  title="Remove from room (stays in inventory)"
                >
                  <EyeOff className="w-3 h-3" /> Store
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
