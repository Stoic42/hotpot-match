"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CHARACTER_MAP,
  TOPIC_BOMBS,
  POT_INGREDIENTS,
  type Character,
  type TopicBomb,
  type PotIngredient,
} from "@/lib/characters";
import { request } from "@/lib/api/request";
import { useClientId } from "@/components/client-id-provider";
import {
  ChevronLeft,
  MoreVertical,
  MessageCircle,
  Pause,
  Play,
  Coffee,
  Zap,
  AlertTriangle,
  Flame,
} from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 280, damping: 35 };
const SPRING_BOUNCY = { type: "spring" as const, stiffness: 400, damping: 25 };

// ─────────────────────────────────────────────────────────────────────────────
// Each CHARACTER is permanently pinned to left or right in the feed.
// This avoids the "same person flips sides" bug caused by using array index.
// ─────────────────────────────────────────────────────────────────────────────
const CHAR_SIDE: Record<string, "left" | "right"> = {
  chen: "left",
  leo: "right",
  youwei: "left",
  zion: "right",
  marta: "left",
  nina: "right",
};

function getSide(guestId: string): "left" | "right" {
  if (guestId === "system") return "left"; // handled separately via isSystem
  return (CHAR_SIDE[guestId] as "left" | "right") ?? "left";
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FeedMessage {
  id: number | string;
  guestId: string;
  content: string;
  messageType: string;
  createdAt: string;
}

interface CookingItem {
  ingredient: PotIngredient;
  startedAt: number;
  notified: boolean;
  eatenBy: string | null; // guestId who grabbed it
}

// Per-guest hunger level: starts at 0, increments when someone ELSE grabs food
interface GuestHunger {
  [guestId: string]: number; // 0–100
}

interface FoodScramble {
  open: boolean;
  ingredient: PotIngredient | null;
  countdown: number; // 3..0
  grabbedBy: string | null;
  reactions: { guestId: string; speed: "fast" | "slow" | "miss"; line: string }[];
  phase: "counting" | "scramble" | "result";
}

interface DrinkBattleState {
  open: boolean;
  fighter1: Character | null;
  fighter2: Character | null;
  hp1: number;
  hp2: number;
  round: number;
  log: { guestId: string; line: string }[];
  winner: Character | null;
  flashLeft: boolean;
  flashRight: boolean;
  combo: number;
}

interface TopicBombState {
  open: boolean;
  topic: TopicBomb | null;
  reactions: { guestId: string; line: string }[];
  revealed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grab-speed profiles per character
// ─────────────────────────────────────────────────────────────────────────────
const GRAB_SPEED: Record<string, number> = {
  // 0–1, higher = faster reaction
  chen: 0.9,    // knows exactly when everything is ready
  youwei: 0.8,  // sichuan instinct
  marta: 0.7,
  nina: 0.65,
  zion: 0.4,    // braces make him hesitant
  leo: 0.3,     // ADHD — distracted, might miss it
};

const GRAB_MISS_LINES: Record<string, string> = {
  leo: "wait WHERE DID THE BEEF GO— oh no—",
  zion: "I was still checking if it was safe to eat and someone— wow okay—",
  youwei: "（被别人抢走了，愤愤不平）不正义！这是不正义！",
  chen: "你们— 好，这次算了。",
  marta: "ay, alguien agarró— next time I'm faster—",
  nina: "gone. it is gone. I watched it leave.",
};

const GRAB_WIN_LINES: Record<string, string[]> = {
  chen: ["*筷子精准落下* 这个归我。", "已捞。", "毫无疑问是该我拿的。"],
  leo: ["I GOT IT— wait oh my god I actually got it—", "YOINK— that was me!! I did that!!"],
  youwei: ["捞到了！这才是革命性的一刻！", "我的！阶级斗争在餐桌上最真实！"],
  zion: ["I got it! Oh wow! Is it... okay I'll just try a small piece—", "Wait I actually grabbed something??"],
  marta: ["¡Mía! That one was mine all along.", "Sí, sí — I was always going for that one—"],
  nina: ["mine.", "*eats immediately, says nothing more*", "I took it. This is correct."],
};

const HUNGER_LINES: Record<string, string[]> = {
  leo: ["wait did I... eat today? besides this? I can't remember— I'm hungry—", "the food keeps disappearing before I can— I'm starving—"],
  zion: ["I think I've had... two pieces? My orthodontist says I need nutrition—", "okay I'm genuinely a bit hungry and that makes me feel culturally out of depth—"],
  youwei: ["不公平！饥饿是一种政治状态！我饿了！", "肚子在抗议，就像人民对剥削阶级的抗议——"],
  nina: ["I am... somewhat empty. This is not ideal.", "In Russia, the table gives more food. This table is not giving enough."],
  marta: ["okay I need more food — ¿dónde está la carne?—", "someone needs to order more — I'm not full—"],
  chen: ["菜被你们糟蹋完了。再下锅。", "你们夹太快了，没品。"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble — side is deterministic per character ID
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: FeedMessage }) {
  const char = CHARACTER_MAP[msg.guestId];
  const side = getSide(msg.guestId);

  const isSystem = msg.messageType === "announcement" || msg.guestId === "system";
  const isChenRuling = msg.guestId === "chen" && msg.messageType === "ruling";
  const isLeo = msg.guestId === "leo";

  if (!char && !isSystem) return null;

  if (isSystem) {
    return (
      <div className="self-center my-1 message-in">
        <div className="bg-white/5 backdrop-blur-sm px-4 py-1.5 rounded-full">
          <span className="text-xs font-bold text-[#78716C]">{msg.content}</span>
        </div>
      </div>
    );
  }

  if (isChenRuling) {
    return (
      <div className="flex flex-col items-center w-full my-2 message-in">
        <div
          className="bg-[#1A1816] border-2 rounded-xl w-[90%] p-3 relative"
          style={{ borderColor: "#C0392B", boxShadow: "0 4px 15px rgba(192,57,43,0.3)", transform: "rotate(-1deg)" }}
        >
          <div className="absolute -top-3 left-4 bg-[#C0392B] text-[#F5F1E8] text-[10px] uppercase font-black px-2 py-0.5 rounded shadow">
            Chen's Ruling
          </div>
          <p className="text-sm font-bold mt-2 text-[#F5F1E8] leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  if (isLeo) {
    return (
      <div className="flex items-end w-full space-x-3 max-w-[95%] mt-4 relative message-in">
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-indigo-500 rounded-full opacity-50" />
        <div className="shrink-0 w-12 h-12 rounded-full border-2 border-indigo-400 bg-indigo-900/60 flex items-center justify-center text-2xl z-10 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
          {char!.flag}
        </div>
        <div className="flex flex-col space-y-1 w-full">
          <span className="text-[10px] text-indigo-300 ml-1 font-black tracking-widest uppercase flex items-center gap-1">
            {char!.name.toUpperCase()}
            <Zap className="w-3 h-3 fill-indigo-400 text-indigo-400" />
          </span>
          <div className="bg-indigo-950/40 border border-indigo-500/40 p-3 rounded-2xl rounded-bl-sm shadow-xl backdrop-blur-md" style={{ transform: "rotate(0.5deg)" }}>
            <p className="text-[13px] leading-relaxed text-[#F5F1E8]">{msg.content}</p>
          </div>
        </div>
      </div>
    );
  }

  if (side === "right") {
    return (
      <div className="flex items-end justify-end w-full gap-2 max-w-[85%] self-end message-in">
        <div className="flex flex-col space-y-1 items-end min-w-0">
          <span className="text-[10px] text-[#78716C] mr-1 font-bold uppercase tracking-widest">{char!.name}</span>
          <div className="bg-[#1A1816] border border-white/10 p-3 rounded-2xl rounded-br-sm shadow">
            <p className="text-sm text-[#F5F1E8] text-right">{msg.content}</p>
          </div>
        </div>
        <div className="shrink-0 w-10 h-10 rounded-full border border-white/10 bg-[#2A2622] flex items-center justify-center text-lg shadow-inner">
          {char!.flag}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end w-full gap-2 max-w-[85%] mt-2 message-in">
      <div className="shrink-0 w-10 h-10 rounded-full border border-white/10 bg-[#2A2622] flex items-center justify-center text-lg">
        {char!.flag}
      </div>
      <div className="flex flex-col space-y-1 min-w-0">
        <span className="text-[10px] text-[#78716C] ml-1 font-bold uppercase tracking-widest flex items-center gap-1">
          {char!.name}
          {char!.restrictions.length > 0 && <AlertTriangle className="w-3 h-3 text-[#C0392B]" />}
        </span>
        <div className="bg-[#241A14] border border-white/10 p-3 rounded-2xl rounded-bl-sm shadow">
          <p className="text-sm text-[#F5F1E8]">{msg.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cooking pill
// ─────────────────────────────────────────────────────────────────────────────

function CookingPill({ item, nowMs }: { item: CookingItem; nowMs: number }) {
  const elapsed = Math.floor((nowMs - item.startedAt) / 1000);
  const remaining = Math.max(0, item.ingredient.cookTimeSeconds - elapsed);
  const isReady = remaining === 0;
  const pct = Math.min(1, elapsed / item.ingredient.cookTimeSeconds);

  return (
    <motion.div layout
      className="bg-[#1A1816] border px-3 py-1.5 rounded-lg flex items-center space-x-2 shrink-0 relative overflow-hidden"
      style={{ borderColor: isReady ? "#9CB48A" : item.ingredient.color + "80" }}
      animate={isReady ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.4, repeat: isReady ? Infinity : 0, repeatDelay: 1 }}
    >
      <div className="absolute bottom-0 left-0 h-0.5 rounded-full" style={{ width: `${pct * 100}%`, background: isReady ? "#9CB48A" : item.ingredient.color }} />
      <span className="text-xs font-bold" style={{ color: isReady ? "#9CB48A" : item.ingredient.color }}>
        {item.ingredient.emoji} {item.ingredient.nameCN}
      </span>
      {isReady ? (
        <span className="text-[10px] text-emerald-400 font-black bg-emerald-900/40 px-1.5 py-0.5 rounded animate-pulse">熟了!</span>
      ) : (
        <span className="text-[10px] text-[#78716C] bg-white/5 px-1.5 py-0.5 rounded">
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
        </span>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Food Scramble Overlay — countdown + grab race
// ─────────────────────────────────────────────────────────────────────────────

function FoodScrambleOverlay({
  state,
  onClose,
}: {
  state: FoodScramble;
  onClose: () => void;
}) {
  if (!state.open || !state.ingredient) return null;
  const ing = state.ingredient;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-start"
      style={{ background: "rgba(10,8,6,0.92)", backdropFilter: "blur(8px)" }}
    >
      {/* Countdown phase */}
      {state.phase === "counting" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            className="text-7xl mb-4"
            animate={{ y: [0, -12, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            {ing.emoji}
          </motion.div>
          <div className="text-xs font-black uppercase tracking-[0.3em] text-[#78716C] mb-3">
            {ing.nameCN} 熟了！ — 抢菜倒计时
          </div>
          <motion.div
            key={state.countdown}
            initial={{ scale: 2.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
            className="text-8xl font-black"
            style={{ color: state.countdown <= 1 ? "#C0392B" : "#F2A24A" }}
          >
            {state.countdown}
          </motion.div>
        </div>
      )}

      {/* Scramble phase — chaos */}
      {state.phase === "scramble" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 w-full">
          <motion.div
            animate={{ rotate: [-8, 8, -8], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            className="text-6xl"
          >
            {ing.emoji}
          </motion.div>
          <div className="text-[#F2A24A] font-black text-xl uppercase tracking-widest animate-pulse">
            抢！抢！抢！
          </div>
          <div className="text-white/40 text-sm">GRAB IT—</div>
        </div>
      )}

      {/* Result phase */}
      {state.phase === "result" && (
        <div className="flex-1 flex flex-col w-full" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          {/* Winner hero */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {state.grabbedBy ? (() => {
              const winner = CHARACTER_MAP[state.grabbedBy];
              const winLine = GRAB_WIN_LINES[state.grabbedBy]?.[Math.floor(Math.random() * (GRAB_WIN_LINES[state.grabbedBy]?.length ?? 1))];
              return (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={SPRING_BOUNCY}
                    className="text-5xl mb-3"
                  >
                    {winner?.flag ?? "🎉"}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <p className="text-[#F2A24A] font-black text-lg uppercase tracking-widest">
                      {winner?.name} 抢到了！
                    </p>
                    <p className="text-[#A8A29E] text-sm italic mt-1">"{winLine}"</p>
                  </motion.div>
                </>
              );
            })() : (
              <div className="text-center">
                <div className="text-4xl mb-2">🫙</div>
                <p className="text-[#78716C] font-bold">Nobody grabbed it in time.</p>
              </div>
            )}
          </div>

          {/* Per-character reaction list */}
          <div className="px-6 space-y-2 mb-6 max-h-44 overflow-y-auto">
            {state.reactions.map((r, i) => {
              const char = CHARACTER_MAP[r.guestId];
              const speedColor = r.speed === "fast" ? "#9CB48A" : r.speed === "slow" ? "#F5BE00" : "#C0392B";
              return (
                <motion.div
                  key={r.guestId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 * i, type: "spring" as const, stiffness: 280, damping: 28 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full border border-white/10 bg-[#2A2622] flex items-center justify-center text-sm shrink-0">
                    {char?.flag ?? "?"}
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-black uppercase tracking-widest mr-1" style={{ color: speedColor }}>
                      {r.speed === "fast" ? "GRABBED" : r.speed === "slow" ? "TOO SLOW" : "MISSED"}
                    </span>
                    <span className="text-xs text-[#A8A29E] italic">"{r.line}"</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="px-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={onClose}
              className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-[#1A1816] flex items-center justify-center gap-2"
              style={{ background: ing.color, boxShadow: `0 0 20px ${ing.color}60` }}
            >
              <span>继续吃！ Keep Going</span>
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic Bomb Overlay
// ─────────────────────────────────────────────────────────────────────────────

function TopicBombOverlay({ state, onClose }: { state: TopicBombState; onClose: () => void }) {
  if (!state.open || !state.topic) return null;
  const t = state.topic;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-16 px-4"
      style={{ background: `linear-gradient(180deg, ${t.color}CC 0%, rgba(10,8,6,0.97) 40%)` }}
    >
      <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
        className="text-center mb-8"
      >
        <motion.div className="text-7xl mb-4 block" animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.6, delay: 0.1 }}>
          {t.icon}
        </motion.div>
        <div className="text-xs font-black uppercase tracking-[0.3em] mb-1" style={{ color: t.color }}>話題炸彈 · TOPIC BOMB</div>
        <h2 className="text-3xl font-black text-[#F5F1E8] tracking-tight leading-tight">{t.labelCN}</h2>
        <p className="text-sm text-[#A8A29E] mt-2 font-medium">{t.description}</p>
      </motion.div>

      <div className="w-full max-w-sm h-px mb-6" style={{ background: `linear-gradient(to right, transparent, ${t.color}, transparent)` }} />

      <div className="w-full max-w-sm space-y-3 flex-1 overflow-y-auto pb-24">
        {state.reactions.slice(0, state.revealed).map((r, i) => {
          const char = CHARACTER_MAP[r.guestId];
          if (!char) return null;
          return (
            <motion.div key={`${r.guestId}-${i}`} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring" as const, stiffness: 350, damping: 30 }}
              className="flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg shrink-0"
                style={{ borderColor: t.color + "80", background: `${t.color}15` }}>
                {char.flag}
              </div>
              <div className="flex-1 rounded-2xl rounded-tl-none p-3 border" style={{ background: `${t.color}10`, borderColor: `${t.color}30` }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: t.color }}>{char.name}</p>
                <p className="text-sm text-[#F5F1E8] leading-relaxed">{r.line}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))", background: "linear-gradient(to top, rgba(10,8,6,1) 60%, transparent)" }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
          className="w-full max-w-sm mx-auto py-4 rounded-xl font-black text-sm uppercase tracking-widest text-[#1A1816] block"
          style={{ background: t.color, boxShadow: `0 0 24px ${t.color}60` }}>
          继续吃！ Keep Going
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contra Drinking Battle
// ─────────────────────────────────────────────────────────────────────────────

function HPBar({ hp, maxHp, side, color }: { hp: number; maxHp: number; side: "left" | "right"; color: string }) {
  const pct = Math.max(0, hp / maxHp);
  const dangerColor = pct < 0.25 ? "#C0392B" : pct < 0.5 ? "#F5BE00" : color;
  return (
    <div className={`flex-1 flex flex-col gap-1 ${side === "right" ? "items-end" : "items-start"}`}>
      <div className="text-[9px] font-black uppercase tracking-widest text-[#78716C]">HP {Math.round(hp)}/{maxHp}</div>
      <div className={`w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/10 ${side === "right" ? "rotate-180" : ""}`}>
        <motion.div className="h-full rounded-full"
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring" as const, stiffness: 200, damping: 25 }}
          style={{ background: `linear-gradient(to right, ${dangerColor}80, ${dangerColor})` }}
        />
      </div>
    </div>
  );
}

function DrinkBattleOverlay({
  state, onAttack, onClose,
}: {
  state: DrinkBattleState;
  onAttack: (idx: 0 | 1) => void;
  onClose: () => void;
}) {
  if (!state.open || !state.fighter1 || !state.fighter2) return null;
  const f1 = state.fighter1;
  const f2 = state.fighter2;
  const isOver = !!state.winner;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #1a0a02 0%, #0a0604 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)" }} />

      <div className="relative z-10 px-4 pt-10 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-gradient-to-r from-[#C0392B] to-transparent" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#F2A24A] px-2">拼酒量 · DRINKING BOUT</span>
          <div className="flex-1 h-px bg-gradient-to-l from-[#C0392B] to-transparent" />
        </div>
        <div className="flex items-center gap-2">
          <HPBar hp={state.hp1} maxHp={100} side="left" color="#F2A24A" />
          <div className="shrink-0 flex flex-col items-center px-1">
            <div className="text-[10px] font-black text-white/40">VS</div>
            {state.combo > 1 && (
              <motion.div key={state.combo} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-[10px] font-black text-[#F5BE00] uppercase">{state.combo}x COMBO</motion.div>
            )}
          </div>
          <HPBar hp={state.hp2} maxHp={100} side="right" color="#7C3AED" />
        </div>
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[10px] font-black text-[#F2A24A] uppercase tracking-widest">{f1.flag} {f1.name}</span>
          <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">{f2.name} {f2.flag}</span>
        </div>
        <div className="text-center mt-1"><span className="text-[9px] text-[#78716C] uppercase tracking-widest">Round {state.round}</span></div>
      </div>

      <div className="relative flex-1 flex items-center justify-between px-8 overflow-hidden z-10" style={{ minHeight: 160 }}>
        <AnimatePresence>
          {state.flashLeft && <motion.div key="fl" initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0 bg-[#F2A24A] pointer-events-none" />}
          {state.flashRight && <motion.div key="fr" initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0 bg-[#7C3AED] pointer-events-none" />}
        </AnimatePresence>

        <motion.div className="flex flex-col items-center gap-2"
          animate={state.hp1 <= 0 ? { rotate: -90, y: 20, opacity: 0.5 } : { rotate: 0, y: 0, opacity: 1 }}
          transition={{ type: "spring" as const, stiffness: 200, damping: 20 }}
        >
          <motion.div className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl bg-[#2A1A0A]"
            style={{ borderColor: "#F2A24A80", boxShadow: state.hp1 > 0 ? "0 0 20px rgba(242,162,74,0.3)" : "none" }}
            animate={state.flashRight ? { x: [-4, 4, -4, 0] } : {}} transition={{ duration: 0.2 }}>
            {f1.flag}
          </motion.div>
          <div className="text-[9px] font-black uppercase text-[#F2A24A] tracking-widest">{f1.name}</div>
          <div className="text-[8px] text-[#78716C] uppercase">PWR {f1.drinkingPower}</div>
        </motion.div>

        <div className="flex flex-col items-center gap-1">
          <AnimatePresence>
            {state.log.length > 0 && (
              <motion.div key={state.log[state.log.length - 1].line}
                initial={{ scale: 0, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: -10 }}
                transition={SPRING_BOUNCY} className="text-center max-w-[120px]">
                <p className="text-[11px] text-[#F5F1E8] italic leading-tight">"{state.log[state.log.length - 1].line}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div className="flex flex-col items-center gap-2"
          animate={state.hp2 <= 0 ? { rotate: 90, y: 20, opacity: 0.5 } : { rotate: 0, y: 0, opacity: 1 }}
          transition={{ type: "spring" as const, stiffness: 200, damping: 20 }}
        >
          <motion.div className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl bg-[#150B2A]"
            style={{ borderColor: "#7C3AED80", boxShadow: state.hp2 > 0 ? "0 0 20px rgba(124,58,237,0.3)" : "none" }}
            animate={state.flashLeft ? { x: [4, -4, 4, 0] } : {}} transition={{ duration: 0.2 }}>
            {f2.flag}
          </motion.div>
          <div className="text-[9px] font-black uppercase text-[#7C3AED] tracking-widest">{f2.name}</div>
          <div className="text-[8px] text-[#78716C] uppercase">PWR {f2.drinkingPower}</div>
        </motion.div>
      </div>

      <div className="relative z-10 px-4 py-2 border-t border-white/5 max-h-28 overflow-y-auto flex flex-col-reverse gap-1">
        {[...state.log].reverse().slice(0, 5).map((entry, i) => {
          const char = CHARACTER_MAP[entry.guestId];
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1 - i * 0.2, x: 0 }} className="flex items-center gap-2">
              <span className="text-sm">{char?.flag ?? "🍺"}</span>
              <span className="text-[11px] text-[#A8A29E] italic">"{entry.line}"</span>
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 p-4 border-t border-white/10" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {isOver ? (
          <div className="text-center mb-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_BOUNCY} className="text-4xl mb-2">
              {state.hp1 <= 0 ? "🍺" : "🏆"}
            </motion.div>
            <p className="text-[#F2A24A] font-black text-lg uppercase tracking-widest">{state.winner?.name} WINS!</p>
            {state.winner?.id === "youwei" && <p className="text-[#78716C] text-xs mt-1">（Youwei 不参与喝酒，精神胜利）</p>}
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              className="mt-4 w-full py-3 rounded-xl bg-[#F2A24A] text-[#1A1816] font-black text-sm uppercase tracking-widest">
              回到饭桌 Back to Table
            </motion.button>
          </div>
        ) : (
          <>
            {(f1.alcoholAllergy || f2.alcoholAllergy) && (
              <div className="text-center mb-3 text-xs text-[#C0392B] font-bold">
                ⚠ {f1.alcoholAllergy ? f1.name : f2.name} 酒精过敏，以喝水参战！
              </div>
            )}
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAttack(0)}
                className="flex-1 py-3 rounded-xl border-2 border-[#F2A24A] text-[#F2A24A] font-black text-sm uppercase tracking-widest"
                style={{ background: "#F2A24A18" }}>
                {f1.flag} 喝!
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAttack(1)}
                className="flex-1 py-3 rounded-xl border-2 border-[#7C3AED] text-[#7C3AED] font-black text-sm uppercase tracking-widest"
                style={{ background: "#7C3AED18" }}>
                {f2.flag} 喝!
              </motion.button>
            </div>
            <p className="text-center text-[10px] text-[#78716C] mt-2 uppercase tracking-widest">按对应按钮为角色助攻 / 轮流出击</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main feed
// ─────────────────────────────────────────────────────────────────────────────

function MainFeedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const { clientId, loading: authLoading } = useClientId();

  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [guests, setGuests] = useState<Character[]>([]);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now);
  const [ingredientsCooked, setIngredientsCooked] = useState(0);

  const [cooking, setCooking] = useState<CookingItem[]>([]);
  const [hunger, setHunger] = useState<GuestHunger>({});

  const [foodScramble, setFoodScramble] = useState<FoodScramble>({
    open: false, ingredient: null, countdown: 3,
    grabbedBy: null, reactions: [], phase: "counting",
  });

  const [topicBomb, setTopicBomb] = useState<TopicBombState>({
    open: false, topic: null, reactions: [], revealed: 0,
  });

  const [drinkBattle, setDrinkBattle] = useState<DrinkBattleState>({
    open: false, fighter1: null, fighter2: null, hp1: 100, hp2: 100,
    round: 1, log: [], winner: null, flashLeft: false, flashRight: false, combo: 0,
  });

  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const msgIndexRef = useRef<Record<string, number>>({});
  const clockRef = useRef<NodeJS.Timeout | null>(null);
  const topicRevealRef = useRef<NodeJS.Timeout | null>(null);
  const scrambleRef = useRef<NodeJS.Timeout | null>(null);
  const recentMsgsRef = useRef<string[]>([]); // for AI context

  // ── clock ──
  useEffect(() => {
    clockRef.current = setInterval(() => setNowMs(Date.now()), 500);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  // ── load session ──
  useEffect(() => {
    if (!sessionId || authLoading || !clientId) return;

    request(`/api/sessions/${sessionId}/messages`).then((r) => r.json())
      .then((data: FeedMessage[]) => {
        setMessages(data);
        const counters: Record<string, number> = {};
        for (const m of data) counters[m.guestId] = (counters[m.guestId] ?? 0) + 1;
        msgIndexRef.current = counters;
      }).catch(console.error);

    request(`/api/sessions`).then((r) => r.json())
      .then((session: { guestIds: string[] } | null) => {
        if (session?.guestIds) {
          const chars = session.guestIds.map((id: string) => CHARACTER_MAP[id]).filter(Boolean) as Character[];
          setGuests(chars);
          // init hunger at 0
          const h: GuestHunger = {};
          chars.forEach((g) => { h[g.id] = 0; });
          setHunger(h);
        }
      }).catch(console.error);
  }, [sessionId, clientId, authLoading]);

  // ── arrival announcements ──
  useEffect(() => {
    if (guests.length === 0) return;
    const arrivals: FeedMessage[] = guests.map((g, i) => ({
      id: `arrive-${g.id}`, guestId: g.id,
      content: `${g.name} joined the table.${g.restrictions.length > 0 ? ` (⚠ ${g.restrictions[0]})` : ""}`,
      messageType: "announcement", createdAt: new Date(Date.now() + i * 500).toISOString(),
    }));
    setMessages((prev) => [...prev, ...arrivals]);
  }, [guests]);

  // ── redirect if no session id ──
  useEffect(() => {
    if (authLoading) return;
    if (!sessionId) router.push("/");
  }, [sessionId, authLoading, router]);

  // ── auto scroll ──
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  // ── check cooking timers ──
  useEffect(() => {
    if (foodScramble.open) return;
    for (const item of cooking) {
      if (item.notified || item.eatenBy) continue;
      const elapsed = (nowMs - item.startedAt) / 1000;
      if (elapsed >= item.ingredient.cookTimeSeconds) {
        setCooking((prev) => prev.map((c) => c.ingredient.id === item.ingredient.id ? { ...c, notified: true } : c));
        triggerFoodScramble(item.ingredient);
        break;
      }
    }
  }, [nowMs, cooking, foodScramble.open]);

  // ── topic bomb reveal sequencer ──
  useEffect(() => {
    if (!topicBomb.open || topicBomb.revealed >= topicBomb.reactions.length) return;
    topicRevealRef.current = setTimeout(() => {
      setTopicBomb((prev) => ({ ...prev, revealed: prev.revealed + 1 }));
    }, 600 + Math.random() * 400);
    return () => { if (topicRevealRef.current) clearTimeout(topicRevealRef.current); };
  }, [topicBomb.open, topicBomb.revealed, topicBomb.reactions.length]);

  // ── food scramble countdown ──
  const triggerFoodScramble = useCallback((ing: PotIngredient) => {
    setPaused(true);
    setFoodScramble({ open: true, ingredient: ing, countdown: 3, grabbedBy: null, reactions: [], phase: "counting" });
  }, []);

  useEffect(() => {
    if (!foodScramble.open || foodScramble.phase !== "counting") return;
    if (foodScramble.countdown <= 0) {
      // Switch to scramble phase
      setFoodScramble((prev) => ({ ...prev, phase: "scramble" }));
      scrambleRef.current = setTimeout(() => {
        resolveScramble(foodScramble.ingredient!);
      }, 800);
      return;
    }
    scrambleRef.current = setTimeout(() => {
      setFoodScramble((prev) => ({ ...prev, countdown: prev.countdown - 1 }));
    }, 700);
    return () => { if (scrambleRef.current) clearTimeout(scrambleRef.current); };
  }, [foodScramble.open, foodScramble.phase, foodScramble.countdown]);

  const resolveScramble = useCallback((ing: PotIngredient) => {
    // Each guest rolls their grab speed + some randomness
    const rolls = guests.map((g) => ({
      guestId: g.id,
      roll: (GRAB_SPEED[g.id] ?? 0.5) + Math.random() * 0.4,
    })).sort((a, b) => b.roll - a.roll);

    const winner = rolls[0];
    const threshold = 0.55; // must exceed to grab

    const reactions = rolls.map((r, i) => {
      const isWinner = i === 0 && r.roll > threshold;
      const isSlow = !isWinner && r.roll > threshold * 0.7;
      const speed = isWinner ? "fast" : isSlow ? "slow" : "miss";

      let line: string;
      if (isWinner) {
        const winLines = GRAB_WIN_LINES[r.guestId] ?? ["Got it!"];
        line = winLines[Math.floor(Math.random() * winLines.length)];
      } else {
        const char = CHARACTER_MAP[r.guestId];
        const missLine = GRAB_MISS_LINES[r.guestId] ?? "missed it...";
        const foodReaction = char?.foodReactions[ing.id]?.[0] ?? char?.foodReactionDefault[0] ?? "...";
        line = speed === "slow" ? foodReaction : missLine;
      }
      return { guestId: r.guestId, speed: speed as "fast" | "slow" | "miss", line };
    });

    const grabbedBy = winner.roll > threshold ? winner.guestId : null;

    // Update hunger for those who didn't grab
    if (grabbedBy) {
      setHunger((prev) => {
        const next = { ...prev };
        guests.forEach((g) => {
          if (g.id !== grabbedBy) {
            next[g.id] = Math.min(100, (next[g.id] ?? 0) + 15);
          } else {
            next[g.id] = Math.max(0, (next[g.id] ?? 0) - 5);
          }
        });
        return next;
      });
    }

    // Remove from cooking
    setCooking((prev) => prev.filter((c) => c.ingredient.id !== ing.id));
    setIngredientsCooked((n) => n + 1);

    setFoodScramble((prev) => ({ ...prev, phase: "result", grabbedBy, reactions }));
  }, [guests]);

  const closeFoodScramble = useCallback(() => {
    const ing = foodScramble.ingredient;
    const winner = foodScramble.grabbedBy;

    // Push result messages to feed
    const feedMsgs: FeedMessage[] = foodScramble.reactions.map((r, i) => ({
      id: `scramble-${Date.now()}-${i}`, guestId: r.guestId, content: r.line,
      messageType: "chat", createdAt: new Date(Date.now() + i * 200).toISOString(),
    }));

    if (ing) {
      feedMsgs.unshift({
        id: `scramble-sys-${Date.now()}`, guestId: "system",
        content: `${ing.emoji} ${ing.nameCN} 熟了！${winner ? ` ${CHARACTER_MAP[winner]?.name} 抢到了！` : " 没人抢到……"}`,
        messageType: "announcement", createdAt: new Date().toISOString(),
      });
    }

    setMessages((prev) => [...prev, ...feedMsgs]);
    setFoodScramble({ open: false, ingredient: null, countdown: 3, grabbedBy: null, reactions: [], phase: "counting" });
    setPaused(false);
  }, [foodScramble]);

  // ── AI message generation ──
  const generateAIMessage = useCallback(async (guest: Character, trigger: string) => {
    const context = recentMsgsRef.current.slice(-4).join(" | ") || "The hotpot dinner just started.";
    try {
      const res = await request("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, context, trigger }),
      });
      const data = await res.json();
      return (data.text as string) || guest.messageSamples[0];
    } catch {
      // fallback to sample
      const idx = msgIndexRef.current[guest.id] ?? 0;
      return guest.messageSamples[idx % guest.messageSamples.length];
    }
  }, []);

  // ── auto post messages with AI ──
  const postNextMessage = useCallback(async () => {
    if (!sessionId || guests.length === 0 || paused) return;
    const guest = guests[Math.floor(Math.random() * guests.length)];
    msgIndexRef.current[guest.id] = (msgIndexRef.current[guest.id] ?? 0) + 1;

    // Check if any guest is hungry — they complain about it
    const hungryGuest = guests.find((g) => (hunger[g.id] ?? 0) > 60 && Math.random() > 0.6);
    const trigger = hungryGuest?.id === guest.id
      ? `You are hungry (you haven't gotten much food). Complain subtly or directly about being hungry.`
      : `React naturally to the ongoing hotpot dinner conversation.`;

    const content = await generateAIMessage(guest, trigger);
    if (!content) return;

    recentMsgsRef.current = [...recentMsgsRef.current.slice(-6), `${guest.name}: ${content}`];

    const isChenRuling = guest.id === "chen" && msgIndexRef.current[guest.id] % 4 === 0;

    try {
      const res = await request(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, content, messageType: isChenRuling ? "ruling" : "chat" }),
      });
      const msg: FeedMessage = await res.json();
      setMessages((prev) => [...prev, msg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `local-${Date.now()}`, guestId: guest.id, content,
        messageType: isChenRuling ? "ruling" : "chat", createdAt: new Date().toISOString(),
      }]);
    }
  }, [sessionId, guests, paused, hunger, generateAIMessage]);

  useEffect(() => {
    if (paused || guests.length === 0) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    const delay = 4000 + Math.random() * 2000; // slightly slower — AI takes time
    intervalRef.current = setInterval(postNextMessage, delay);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, guests, postNextMessage]);

  // ── Add ingredient to pot ──
  const handleAddIngredient = (ingredientId: string) => {
    const ing = POT_INGREDIENTS.find((i) => i.id === ingredientId);
    if (!ing) return;
    setCooking((prev) => {
      if (prev.find((c) => c.ingredient.id === ingredientId)) return prev;
      return [...prev, { ingredient: ing, startedAt: Date.now(), notified: false, eatenBy: null }];
    });
    setMessages((prev) => [...prev, {
      id: `pot-${Date.now()}`, guestId: "system",
      content: `${ing.emoji} ${ing.nameCN} 下锅！（${ing.cookTimeSeconds}s）`,
      messageType: "announcement", createdAt: new Date().toISOString(),
    }]);
  };

  // ── Topic bomb ──
  const handleTopicBomb = async () => {
    const topic = TOPIC_BOMBS[Math.floor(Math.random() * TOPIC_BOMBS.length)];

    // Use AI to generate topic reactions
    const reactionPromises = guests.map(async (g) => {
      const line = await generateAIMessage(g, `The conversation topic just turned to: "${topic.labelCN} — ${topic.description}". React in your character.`);
      return { guestId: g.id, line };
    });
    const reactions = await Promise.all(reactionPromises);

    setPaused(true);
    setTopicBomb({ open: true, topic, reactions, revealed: 0 });
  };

  const handleCloseTopicBomb = () => {
    setTopicBomb((prev) => ({ ...prev, open: false }));
    setPaused(false);
    if (topicBomb.reactions.length > 0) {
      const feedMsgs: FeedMessage[] = topicBomb.reactions.map((r, i) => ({
        id: `topic-${Date.now()}-${i}`, guestId: r.guestId, content: r.line,
        messageType: "chat", createdAt: new Date(Date.now() + i * 100).toISOString(),
      }));
      setMessages((prev) => [...prev, ...feedMsgs]);
    }
  };

  // ── Drink battle ──
  const handleDrinkBattle = () => {
    if (guests.length < 2) return;
    const [f1, f2] = guests.length >= 2 ? [guests[0], guests[1]] : [guests[0], guests[0]];
    setPaused(true);
    setDrinkBattle({
      open: true, fighter1: f1, fighter2: f2, hp1: 100, hp2: 100,
      round: 1, log: [{ guestId: f1.id, line: f1.drinkBoastLines[0] }],
      winner: null, flashLeft: false, flashRight: false, combo: 0,
    });
  };

  const handleAttack = useCallback((attackerIdx: 0 | 1) => {
    setDrinkBattle((prev) => {
      if (!prev.fighter1 || !prev.fighter2 || prev.winner) return prev;
      const attacker = attackerIdx === 0 ? prev.fighter1 : prev.fighter2;
      const isAllergy = attacker.alcoholAllergy;
      const dmg = isAllergy ? 0 : Math.round(8 + Math.random() * 14 + attacker.drinkingPower * 1.2);
      const newHp1 = attackerIdx === 1 ? Math.max(0, prev.hp1 - dmg) : prev.hp1;
      const newHp2 = attackerIdx === 0 ? Math.max(0, prev.hp2 - dmg) : prev.hp2;
      const combo = attackerIdx === 0 ? prev.combo + 1 : 1;
      const logLine = isAllergy ? attacker.drinkLines[0] : attacker.drinkLines[Math.floor(Math.random() * attacker.drinkLines.length)];
      const winner = newHp1 <= 0 ? prev.fighter2 : newHp2 <= 0 ? prev.fighter1 : null;
      return { ...prev, hp1: newHp1, hp2: newHp2, round: prev.round + 1, log: [...prev.log, { guestId: attacker.id, line: logLine }], winner, flashLeft: attackerIdx === 0, flashRight: attackerIdx === 1, combo };
    });
    setTimeout(() => setDrinkBattle((prev) => ({ ...prev, flashLeft: false, flashRight: false })), 300);
  }, []);

  const handleCloseBattle = () => {
    if (!drinkBattle.winner || !drinkBattle.fighter1 || !drinkBattle.fighter2) return;
    const winner = drinkBattle.winner;
    const loser = winner.id === drinkBattle.fighter1.id ? drinkBattle.fighter2 : drinkBattle.fighter1;
    setMessages((prev) => [
      ...prev,
      { id: `battle-${Date.now()}`, guestId: "system", content: `🏆 拼酒结果：${winner.name} 胜！${loser.name} 认输！`, messageType: "announcement", createdAt: new Date().toISOString() },
      { id: `battle-down-${Date.now()}`, guestId: loser.id, content: loser.drinkDownLines[0], messageType: "chat", createdAt: new Date(Date.now() + 500).toISOString() },
    ]);
    setDrinkBattle({ open: false, fighter1: null, fighter2: null, hp1: 100, hp2: 100, round: 1, log: [], winner: null, flashLeft: false, flashRight: false, combo: 0 });
    setPaused(false);
  };

  // ── Loading / auth states ──
  if (authLoading) {
    return (
      <div className="min-h-svh bg-[#1A1816] flex items-center justify-center">
        <div className="flex gap-2">{[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-[#F2A24A]"
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }} />
        ))}</div>
      </div>
    );
  }
  if (!clientId) {
    return (
      <div className="min-h-svh bg-[#1A1816] flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-[#A8A29E] text-center">Initializing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#1A1816] flex flex-col relative overflow-hidden">

      {/* ── Overlays ── */}
      <AnimatePresence>
        {foodScramble.open && <FoodScrambleOverlay state={foodScramble} onClose={closeFoodScramble} />}
      </AnimatePresence>
      <AnimatePresence>
        {topicBomb.open && <TopicBombOverlay state={topicBomb} onClose={handleCloseTopicBomb} />}
      </AnimatePresence>
      <AnimatePresence>
        {drinkBattle.open && <DrinkBattleOverlay state={drinkBattle} onAttack={handleAttack} onClose={handleCloseBattle} />}
      </AnimatePresence>

      {/* ── Ingredient picker ── */}
      <AnimatePresence>
        {ingredientPickerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setIngredientPickerOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring" as const, stiffness: 380, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1816] rounded-t-3xl border-t border-white/10"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" />
              <div className="px-6 mb-4">
                <h3 className="text-base font-black text-[#F5F1E8]">下锅 / Add to Pot</h3>
                <p className="text-xs text-[#78716C] mt-0.5">食材熟了会触发抢菜大战——谁快谁吃到</p>
              </div>
              <div className="grid grid-cols-4 gap-3 px-6 pb-4">
                {POT_INGREDIENTS.map((ing) => {
                  const alreadyCooking = cooking.find((c) => c.ingredient.id === ing.id);
                  return (
                    <motion.button key={ing.id} whileTap={{ scale: 0.92 }}
                      onClick={() => { if (!alreadyCooking) { handleAddIngredient(ing.id); setIngredientPickerOpen(false); } }}
                      disabled={!!alreadyCooking}
                      className={`flex flex-col items-center py-3 rounded-xl border transition-all ${alreadyCooking ? "opacity-40 border-white/5 bg-white/5" : "border-white/10 bg-[#221F1C] hover:bg-white/5"}`}
                    >
                      <div className="text-2xl mb-1">{ing.emoji}</div>
                      <div className="text-[10px] font-bold text-[#F5F1E8]">{ing.nameCN}</div>
                      <div className="text-[9px] text-[#78716C] mt-0.5">{ing.cookTimeSeconds}s</div>
                      {alreadyCooking && <div className="text-[8px] text-[#F2A24A] font-black mt-0.5">锅里</div>}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 bg-[#1A1816]/95 backdrop-blur-md border-b border-white/10 z-30 shadow-md flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 w-full">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push("/")}
            className="w-10 h-10 flex items-center justify-center text-[#78716C] rounded-full hover:bg-white/5">
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm text-[#F5F1E8] tracking-wider">火锅纪 / The Feed</span>
            <span className="text-[10px] text-emerald-400 font-bold tracking-widest animate-pulse">● 沸腾中 BOILING</span>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 flex items-center justify-center text-[#78716C] rounded-full hover:bg-white/5">
            <MoreVertical className="w-5 h-5" />
          </motion.button>
        </div>

        {cooking.length > 0 && (
          <div className="px-4 pb-3 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <div className="w-8 h-8 shrink-0 bg-[#D2691E]/20 border border-[#D2691E] rounded-full flex items-center justify-center text-base relative">
              <span className="absolute -top-1.5 flex space-x-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-0.5 h-2 bg-white/30 rounded-full"
                    animate={{ scaleY: [1, 1.5 + i * 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </span>
              🍲
            </div>
            <div className="flex space-x-2">
              {cooking.map((c) => <CookingPill key={c.ingredient.id} item={c} nowMs={nowMs} />)}
            </div>
          </div>
        )}
      </header>

      {/* ── Feed ── */}
      <main ref={feedRef} className="flex-1 w-full overflow-y-auto px-4 flex flex-col gap-4"
        style={{ paddingTop: cooking.length > 0 ? 130 : 80, paddingBottom: 100 }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
            <div className="flex gap-2">{[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-10 h-2 rounded-full skeleton"
                animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
            ))}</div>
            <p className="text-[#78716C] text-sm font-medium">宾客入席中… Setting the table…</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#12100E] border-t border-white/10 z-30"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="w-full flex items-center justify-between px-2 pt-2 pb-1">
          <motion.button whileTap={{ scale: 0.93 }} onClick={handleTopicBomb}
            className="flex-1 flex flex-col items-center justify-center space-y-1 text-[#78716C] hover:text-[#F5F1E8] transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#1A1816] border border-white/10 flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">话题 Topic</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setIngredientPickerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center space-y-1 text-[#F2A24A] -translate-y-2">
            <div className="w-14 h-14 rounded-full bg-[#F2A24A] text-[#1A1816] flex items-center justify-center shadow-[0_0_20px_rgba(242,162,74,0.3)]">
              <Flame className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md text-[#F2A24A]">下锅 Cook</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.93 }} onClick={handleDrinkBattle}
            className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors ${
              guests.length < 2 ? "text-white/20 cursor-not-allowed" : "text-[#78716C] hover:text-[#F5F1E8]"
            }`}>
            <div className="w-10 h-10 rounded-full bg-[#1A1816] border border-white/10 flex items-center justify-center shadow-sm">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{guests.length < 2 ? "需2人+ Need 2+" : "拼酒 Battle"}</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPaused((p) => !p)}
            className="flex-1 flex flex-col items-center justify-center space-y-1 text-[#78716C] hover:text-[#F5F1E8] transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#1A1816] border border-white/10 flex items-center justify-center shadow-sm">
              {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{paused ? "续 Go" : "停 Pause"}</span>
          </motion.button>
        </div>
      </footer>

      {/* Drop-down menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={SPRING}
            className="fixed top-14 right-4 bg-[#221F1C] border border-white/10 rounded-xl shadow-xl z-40 min-w-[180px] overflow-hidden">
            {[
              { label: "Verdict 结算", action: () => router.push(`/verdict?session=${sessionId}&cooked=${ingredientsCooked}`) },
              { label: "Menu Prep 备菜", action: () => router.push(`/menu?session=${sessionId}`) },
              { label: "End Party 散伙", action: () => router.push("/") },
            ].map((item) => (
              <motion.button key={item.label} whileTap={{ scale: 0.98 }} onClick={item.action}
                className="w-full px-4 py-3 text-left text-sm text-[#F5F1E8] hover:bg-white/5 transition-colors font-medium">
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MainFeedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-svh bg-[#1A1816] flex items-center justify-center">
        <div className="flex gap-2">{[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-[#F2A24A]"
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }} />
        ))}</div>
      </div>
    }>
      <MainFeedInner />
    </Suspense>
  );
}
