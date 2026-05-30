"use client";

import { useState, useEffect, useRef, useCallback, Suspense, createContext, useContext } from "react";
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
import {
  buildCharacterMap,
  buildTopicStatusMap,
  getCharSide,
} from "@/lib/character-registry";
import {
  loadSessionCustomAgents,
  type CustomAgentDraft,
} from "@/lib/custom-agent";
import {
  ACTION_CARDS,
  dealHand,
  topicForCard,
  type ActionCardId,
} from "@/lib/action-cards";
import { ActionCardsBar } from "@/components/action-cards-bar";
import { fetchAgentTurn } from "@/lib/ai/agent-client";
import { TurnBasedDrinkBattleOverlay } from "@/components/turn-based-drink-battle";
import {
  applyBattleAction,
  createBattleParticipants,
  emptyDrinkBattle,
  skipStunnedTurn,
  type BattleAction,
  type DrinkBattle,
} from "@/lib/drink-battle";
import { request } from "@/lib/api/request";
import { useClientId } from "@/components/client-id-provider";
import {
  MEMORY_FLASH_SECONDS,
  PARTY_ROUND_SECONDS,
  formatPartyClock,
} from "@/lib/game-config";
import type { RoundState } from "@/lib/round-state";
import {
  scrambleCountdownRemaining,
  type SessionPotState,
} from "@/lib/pot-state";
import {
  pruneGuestStatuses,
  rollTopicStatusFromMap,
  statusLabel,
  type GuestStatusEntry,
  type TopicStatusRule,
} from "@/lib/guest-status";
import { guestStatusFromAgentTurn } from "@/lib/ai/agent-types";
import type { AgentEmotion } from "@/lib/ai/agent-types";
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
  Layers,
  Link2,
  Users,
} from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 280, damping: 35 };
const SPRING_BOUNCY = { type: "spring" as const, stiffness: 400, damping: 25 };

const CharMapContext = createContext<Record<string, Character>>(CHARACTER_MAP);
function useCharMap() {
  return useContext(CharMapContext);
}

function getSide(guestId: string): "left" | "right" {
  if (guestId === "system") return "left";
  return getCharSide(guestId);
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

interface TopicAgentReaction {
  guestId: string;
  line: string;
  emotion: AgentEmotion;
  emotionSeconds: number;
  emotionReason: string;
  fromAgent: boolean;
}

interface TopicBombState {
  open: boolean;
  topic: TopicBomb | null;
  reactions: TopicAgentReaction[];
  revealed: number;
}

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
  const charMap = useCharMap();
  const char = charMap[msg.guestId];
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
// Memory flash — show all cook times briefly at round start
// ─────────────────────────────────────────────────────────────────────────────

function MemoryFlashOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, MEMORY_FLASH_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      style={{ background: "rgba(10,8,6,0.96)", backdropFilter: "blur(12px)" }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#F2A24A] mb-2">
        一分钟局 · 记住烫几秒
      </p>
      <h2 className="text-xl font-black text-[#F5F1E8] mb-6 text-center">食材成熟度闪现</h2>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {POT_INGREDIENTS.map((ing) => (
          <div
            key={ing.id}
            className="rounded-xl border border-white/15 bg-[#221F1C] p-4 flex items-center justify-between"
            style={{ boxShadow: `0 0 16px ${ing.color}30` }}
          >
            <span className="text-2xl">{ing.emoji}</span>
            <div className="text-right">
              <div className="text-sm font-bold text-[#F5F1E8]">{ing.nameCN}</div>
              <div className="text-lg font-black" style={{ color: ing.color }}>
                {ing.cookTimeSeconds}s
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[#78716C] text-xs mt-8 animate-pulse">闪记结束即开局…</p>
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
  const charMap = useCharMap();
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
              const winner = charMap[state.grabbedBy];
              const winLine = state.reactions.find((r) => r.guestId === state.grabbedBy)?.line;
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
              const char = charMap[r.guestId];
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
  const charMap = useCharMap();
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
        {state.reactions.length === 0 && (
          <p className="text-center text-indigo-300 text-sm font-bold animate-pulse py-8">
            各角色 Agent 思考中…
          </p>
        )}
        {state.reactions.slice(0, state.revealed).map((r, i) => {
          const char = charMap[r.guestId];
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
        <motion.button
          whileTap={{ scale: state.reactions.length > 0 ? 0.97 : 1 }}
          onClick={onClose}
          disabled={state.reactions.length === 0}
          className="w-full max-w-sm mx-auto py-4 rounded-xl font-black text-sm uppercase tracking-widest text-[#1A1816] block disabled:opacity-40"
          style={{ background: t.color, boxShadow: `0 0 24px ${t.color}60` }}
        >
          {state.reactions.length === 0 ? "Agent 思考中…" : "继续吃！ Keep Going"}
        </motion.button>
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

  const [drinkBattle, setDrinkBattle] = useState<DrinkBattle>(() => emptyDrinkBattle());

  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [serverRound, setServerRound] = useState<RoundState | null>(null);
  const [roundEnded, setRoundEnded] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [guestStatuses, setGuestStatuses] = useState<Record<string, GuestStatusEntry>>({});
  const [agentOnline, setAgentOnline] = useState(false);
  const [topicAgentLoading, setTopicAgentLoading] = useState(false);
  const [charMap, setCharMap] = useState<Record<string, Character>>(CHARACTER_MAP);
  const [cardHand, setCardHand] = useState<ActionCardId[]>([]);
  const [usedCards, setUsedCards] = useState<Set<ActionCardId>>(new Set());
  const [cardsOpen, setCardsOpen] = useState(false);

  const customDraftsRef = useRef<CustomAgentDraft[]>([]);
  const topicRulesRef = useRef<Record<string, Partial<Record<string, TopicStatusRule>>>>({});

  const feedRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const msgIndexRef = useRef<Record<string, number>>({});
  const clockRef = useRef<NodeJS.Timeout | null>(null);
  const topicRevealRef = useRef<NodeJS.Timeout | null>(null);
  const recentMsgsRef = useRef<string[]>([]); // for AI context
  const guestsHydratedRef = useRef(false);
  const potScrambleKeyRef = useRef<string | null>(null);

  const applyPotFromServer = useCallback((pot: SessionPotState) => {
    setIngredientsCooked(pot.cookedCount);
    setHunger(pot.hunger);
    setCooking(
      pot.cooking
        .map((c) => {
          const ing = POT_INGREDIENTS.find((i) => i.id === c.ingredientId);
          if (!ing) return null;
          return {
            ingredient: ing,
            startedAt: new Date(c.startedAt).getTime(),
            notified: c.notified,
            eatenBy: null,
          };
        })
        .filter(Boolean) as CookingItem[],
    );

    if (pot.scramble) {
      const ing = POT_INGREDIENTS.find((i) => i.id === pot.scramble!.ingredientId);
      if (!ing) return;
      potScrambleKeyRef.current = `${pot.scramble.ingredientId}:${pot.scramble.startedAt}`;
      const phase =
        pot.scramble.phase === "result"
          ? "result"
          : pot.scramble.phase === "scramble"
            ? "scramble"
            : "counting";
      setPaused(true);
      setFoodScramble({
        open: true,
        ingredient: ing,
        countdown: scrambleCountdownRemaining(pot.scramble, Date.now()),
        grabbedBy: pot.scramble.grabbedBy,
        reactions: pot.scramble.reactions,
        phase,
      });
    } else {
      potScrambleKeyRef.current = null;
      setFoodScramble((prev) =>
        prev.open
          ? {
              open: false,
              ingredient: null,
              countdown: 3,
              grabbedBy: null,
              reactions: [],
              phase: "counting",
            }
          : prev,
      );
      setPaused(false);
    }
  }, []);

  // ── clock ──
  useEffect(() => {
    clockRef.current = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      setGuestStatuses((prev) => pruneGuestStatuses(prev, t));
    }, 500);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  const syncSession = useCallback(async () => {
    if (!sessionId || !clientId) return;
    try {
      const [msgRes, sesRes] = await Promise.all([
        request(`/api/sessions/${sessionId}/messages`),
        request(`/api/sessions/${sessionId}`),
      ]);
      if (sesRes.ok) {
        const session = await sesRes.json() as {
          guestIds: string[];
          customGuests?: CustomAgentDraft[];
          round: RoundState;
          pot?: SessionPotState;
        };
        if (session.guestIds?.length) {
          const customs =
            session.customGuests?.length
              ? session.customGuests
              : loadSessionCustomAgents(sessionId);
          customDraftsRef.current = customs;
          const map = buildCharacterMap(customs);
          topicRulesRef.current = buildTopicStatusMap(customs);
          setCharMap(map);
          setGuests(
            session.guestIds.map((id: string) => map[id]).filter(Boolean) as Character[],
          );
          if (!guestsHydratedRef.current) {
            guestsHydratedRef.current = true;
            const h: GuestHunger = {};
            session.guestIds.forEach((id: string) => { h[id] = 0; });
            setHunger(h);
          }
        }
        setServerRound(session.round);
        if (session.pot) applyPotFromServer(session.pot);
      }
      if (msgRes.ok) {
        const data: FeedMessage[] = await msgRes.json();
        setMessages(data);
        const counters: Record<string, number> = {};
        for (const m of data) counters[m.guestId] = (counters[m.guestId] ?? 0) + 1;
        msgIndexRef.current = counters;
      }
    } catch (e) {
      console.error(e);
    }
  }, [sessionId, clientId, applyPotFromServer]);

  useEffect(() => {
    if (!sessionId || authLoading || !clientId) return;
    guestsHydratedRef.current = false;
    setRoundEnded(false);
    void syncSession();
    const poll = setInterval(() => void syncSession(), 1000);
    return () => clearInterval(poll);
  }, [sessionId, clientId, authLoading, syncSession]);

  const memoryFlashOpen = serverRound?.phase === "waiting";
  const partyRemaining = serverRound?.remainingSeconds ?? PARTY_ROUND_SECONDS;
  const roundActive =
    serverRound?.phase === "running" && partyRemaining > 0 && !roundEnded;

  const handleMemoryFlashDone = useCallback(async () => {
    if (!sessionId) return;
    try {
      await request(`/api/sessions/${sessionId}/start-round`, { method: "POST" });
      await syncSession();
      await request(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: "system",
          content: "⏱ 闪记结束 — 一分钟开局！全员同步计时开始！",
          messageType: "announcement",
        }),
      });
      await syncSession();
    } catch (e) {
      console.error(e);
    }
  }, [sessionId, syncSession]);

  const endRound = useCallback(async () => {
    if (roundEnded || !sessionId) return;
    setRoundEnded(true);
    setPaused(true);
    try {
      await request(`/api/sessions/${sessionId}/end-round`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    router.push(`/verdict?session=${sessionId}&cooked=${ingredientsCooked}`);
  }, [roundEnded, router, sessionId, ingredientsCooked]);

  useEffect(() => {
    if (!sessionId || roundEnded) return;
    if (serverRound?.phase === "ended") void endRound();
    else if (serverRound?.phase === "running" && serverRound.remainingSeconds <= 0) {
      void endRound();
    }
  }, [sessionId, roundEnded, serverRound, endRound]);

  const copyInviteLink = useCallback(() => {
    if (typeof window === "undefined" || !sessionId) return;
    const url = `${window.location.origin}/feed?session=${sessionId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }, [sessionId]);

  // ── redirect if no session id ──
  useEffect(() => {
    if (authLoading) return;
    if (!sessionId) router.push("/");
  }, [sessionId, authLoading, router]);

  // ── auto scroll ──
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  // ── topic bomb reveal sequencer ──
  useEffect(() => {
    if (!topicBomb.open || topicBomb.revealed >= topicBomb.reactions.length) return;
    topicRevealRef.current = setTimeout(() => {
      setTopicBomb((prev) => ({ ...prev, revealed: prev.revealed + 1 }));
    }, 600 + Math.random() * 400);
    return () => { if (topicRevealRef.current) clearTimeout(topicRevealRef.current); };
  }, [topicBomb.open, topicBomb.revealed, topicBomb.reactions.length]);

  const closeFoodScramble = useCallback(async () => {
    if (!sessionId) return;
    try {
      await request(`/api/sessions/${sessionId}/pot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_scramble" }),
      });
      await syncSession();
    } catch (e) {
      console.error(e);
    }
    setFoodScramble({
      open: false,
      ingredient: null,
      countdown: 3,
      grabbedBy: null,
      reactions: [],
      phase: "counting",
    });
    setPaused(false);
  }, [sessionId, syncSession]);

  const getDinnerContext = useCallback(
    () => recentMsgsRef.current.slice(-4).join(" | ") || "The hotpot dinner just started.",
    [],
  );

  const generateAIMessage = useCallback(async (guest: Character, trigger: string) => {
    const idx = msgIndexRef.current[guest.id] ?? 0;
    const fallback = guest.messageSamples[idx % guest.messageSamples.length];
    const turn = await fetchAgentTurn({
      guestId: guest.id,
      mode: "chat",
      context: getDinnerContext(),
      trigger,
      fallbackText: fallback,
    });
    if (turn.agent) setAgentOnline(true);
    return turn.text;
  }, [getDinnerContext]);

  // ── auto post messages with AI ──
  const postNextMessage = useCallback(async () => {
    if (!sessionId || guests.length === 0 || paused || !roundActive) return;
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
  }, [sessionId, guests, paused, hunger, generateAIMessage, roundActive]);

  useEffect(() => {
    if (paused || guests.length === 0 || !roundActive) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    const delay = 4000 + Math.random() * 2000; // slightly slower — AI takes time
    intervalRef.current = setInterval(postNextMessage, delay);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, guests, postNextMessage, roundActive]);

  const handleAddIngredient = useCallback(
    async (ingredientId: string) => {
      if (!roundActive || !sessionId) return;
      try {
        const res = await request(`/api/sessions/${sessionId}/pot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", ingredientId }),
        });
        if (!res.ok) return;
        await syncSession();
      } catch (e) {
        console.error(e);
      }
    },
    [roundActive, sessionId, syncSession],
  );

  const fireTopicBomb = useCallback(async (topic: TopicBomb) => {
    if (!roundActive || topicAgentLoading) return;

    setPaused(true);
    setTopicAgentLoading(true);
    setTopicBomb({ open: true, topic, reactions: [], revealed: 0 });

    const context = getDinnerContext();
    const reactions: TopicAgentReaction[] = await Promise.all(
      guests.map(async (g) => {
        const fallback =
          g.topicReactions[topic.id] ??
          g.messageSamples[Math.floor(Math.random() * g.messageSamples.length)];
        const turn = await fetchAgentTurn({
          guestId: g.id,
          mode: "topic",
          context,
          trigger: `Topic bomb at the table: "${topic.labelCN}" — ${topic.description}`,
          fallbackText: fallback,
        });
        if (turn.agent) setAgentOnline(true);
        return {
          guestId: g.id,
          line: turn.text,
          emotion: turn.emotion,
          emotionSeconds: turn.emotionSeconds,
          emotionReason: turn.emotionReason,
          fromAgent: turn.agent,
        };
      }),
    );

    setTopicAgentLoading(false);
    setTopicBomb({ open: true, topic, reactions, revealed: 0 });
  }, [roundActive, topicAgentLoading, guests, getDinnerContext]);

  const handleTopicBomb = () => {
    const topic = TOPIC_BOMBS[Math.floor(Math.random() * TOPIC_BOMBS.length)];
    void fireTopicBomb(topic);
  };

  const handleCloseTopicBomb = () => {
    const topic = topicBomb.topic;
    setTopicBomb((prev) => ({ ...prev, open: false }));
    setPaused(false);

    const feedMsgs: FeedMessage[] = [];
    if (topicBomb.reactions.length > 0) {
      topicBomb.reactions.forEach((r, i) => {
        feedMsgs.push({
          id: `topic-${Date.now()}-${i}`,
          guestId: r.guestId,
          content: r.line,
          messageType: "chat",
          createdAt: new Date(Date.now() + i * 100).toISOString(),
        });
      });
    }

    if (topic) {
      const t = Date.now();
      const applied: Record<string, GuestStatusEntry> = {};

      for (const r of topicBomb.reactions) {
        const fromAgent = guestStatusFromAgentTurn(
          {
            emotion: r.emotion,
            emotionSeconds: r.emotionSeconds,
            emotionReason: r.emotionReason,
          },
          t,
        );
        if (fromAgent) applied[r.guestId] = fromAgent;
      }

      const needsRules = guests
        .map((g) => g.id)
        .filter((id) => !applied[id]);
      const ruleBased = rollTopicStatusFromMap(
        topicRulesRef.current,
        topic.id,
        needsRules,
        t,
      );
      const merged = { ...ruleBased, ...applied };

      if (Object.keys(merged).length > 0) {
        setGuestStatuses((prev) => ({ ...prev, ...merged }));
        for (const [guestId, status] of Object.entries(merged)) {
          const char = charMap[guestId];
          const via = applied[guestId] ? "Agent" : "规则";
          feedMsgs.push({
            id: `status-${Date.now()}-${guestId}`,
            guestId: "system",
            content: `⚡ ${char?.name ?? guestId} · ${statusLabel(status.effect)}（${via}）：${status.reasonCN}（约 ${Math.ceil((status.untilMs - t) / 1000)}s，无法夹菜）`,
            messageType: "announcement",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    if (feedMsgs.length > 0) {
      setMessages((prev) => [...prev, ...feedMsgs]);
    }
  };

  useEffect(() => {
    if (!drinkBattle.open || drinkBattle.winner) return;
    const actor = drinkBattle.participants[drinkBattle.currentTurnIdx];
    if (!actor || actor.statusEffect !== "skipped") return;
    const t = setTimeout(() => {
      setDrinkBattle((prev: DrinkBattle) => skipStunnedTurn(prev));
    }, 1200);
    return () => clearTimeout(t);
  }, [drinkBattle.open, drinkBattle.currentTurnIdx, drinkBattle.winner, drinkBattle.participants]);

  const handleDrinkBattle = useCallback(() => {
    if (!roundActive || guests.length < 2) return;
    const participants = createBattleParticipants(guests);
    setMessages((prev) => [
      ...prev,
      {
        id: `battle-open-${Date.now()}`,
        guestId: "system",
        content: `🍺 回合制拼酒开始！${guests.map((g) => g.flag + g.name).join(" vs ")} — 每人轮流出招+预制技能`,
        messageType: "announcement",
        createdAt: new Date().toISOString(),
      },
    ]);
    setPaused(true);
    setDrinkBattle({
      open: true,
      participants,
      currentTurnIdx: 0,
      roundNumber: 1,
      log: [],
      winner: null,
      lastEvent: "",
      feedQueue: [],
    });
  }, [roundActive, guests]);

  const handleBattleAction = useCallback(
    (action: BattleAction, targetIdx?: number, topicId?: string, skillId?: string) => {
      setDrinkBattle((prev: DrinkBattle) =>
        applyBattleAction(prev, action, targetIdx, topicId, skillId),
      );
    },
    [],
  );

  const handleCloseBattle = useCallback(() => {
    const winner = drinkBattle.winner;
    const allLines = drinkBattle.feedQueue;
    const battleMsgs: FeedMessage[] = [];

    allLines.forEach((line: string, i: number) => {
      const guestId =
        drinkBattle.participants.find((p) => line.includes(p.char.name))?.char.id ??
        "system";
      battleMsgs.push({
        id: `battle-${Date.now()}-${i}`,
        guestId,
        content: line,
        messageType: "chat",
        createdAt: new Date(Date.now() + i * 150).toISOString(),
      });
    });

    if (winner) {
      battleMsgs.push({
        id: `battle-win-${Date.now()}`,
        guestId: "system",
        content: `🏆 拼酒结束！${winner.flag} ${winner.name} 胜！`,
        messageType: "announcement",
        createdAt: new Date().toISOString(),
      });
      const loser = drinkBattle.participants.find(
        (p) => p.char.id !== winner.id && p.hp <= 0,
      );
      if (loser) {
        battleMsgs.push({
          id: `battle-down-${Date.now()}`,
          guestId: loser.char.id,
          content: loser.char.drinkDownLines[0] ?? "*认输*",
          messageType: "chat",
          createdAt: new Date(Date.now() + 500).toISOString(),
        });
      }
    }

    if (battleMsgs.length > 0) {
      setMessages((prev) => [...prev, ...battleMsgs]);
    }
    setDrinkBattle(emptyDrinkBattle());
    setPaused(false);
  }, [drinkBattle]);

  const playActionCard = useCallback((cardId: ActionCardId) => {
    if (!roundActive || usedCards.has(cardId)) return;
    setUsedCards((prev) => new Set(prev).add(cardId));
    setCardsOpen(false);

    const topic = topicForCard(cardId);
    if (topic) {
      void fireTopicBomb(topic);
      setMessages((prev) => [...prev, {
        id: `card-${Date.now()}`, guestId: "system",
        content: `${ACTION_CARDS[cardId].emoji} 出牌：${ACTION_CARDS[cardId].nameCN}`,
        messageType: "announcement", createdAt: new Date().toISOString(),
      }]);
      return;
    }

    if (cardId === "card_toast") {
      handleDrinkBattle();
      return;
    }

    if (cardId === "card_distraction") {
      const picks = [...guests].sort(() => Math.random() - 0.5).slice(0, 2);
      const t = Date.now();
      const next: Record<string, GuestStatusEntry> = {};
      for (const g of picks) {
        next[g.id] = {
          effect: "distracted",
          untilMs: t + 8000,
          reasonCN: "被插科打诨带偏节奏",
        };
      }
      setGuestStatuses((s) => ({ ...s, ...next }));
      setMessages((prev) => [...prev, {
        id: `card-${Date.now()}`, guestId: "system",
        content: `💬 插科打诨 — ${picks.map((g) => g.name).join("、")} 分心 8 秒`,
        messageType: "announcement", createdAt: new Date().toISOString(),
      }]);
      return;
    }

    if (cardId === "card_sneak_shrimp") {
      handleAddIngredient("shrimp");
      setMessages((prev) => [...prev, {
        id: `card-${Date.now()}`, guestId: "system",
        content: "🦐 偷偷下了虾滑（8 秒）——趁乱！",
        messageType: "announcement", createdAt: new Date().toISOString(),
      }]);
    }
  }, [roundActive, usedCards, fireTopicBomb, guests]);

  useEffect(() => {
    if (serverRound?.phase === "running" && roundActive && cardHand.length === 0 && guests.length > 0) {
      setCardHand(dealHand(3));
      setUsedCards(new Set());
    }
  }, [serverRound?.phase, roundActive, cardHand.length, guests.length]);

  const nextReady = cooking
    .map((item) => {
      const elapsed = Math.floor((nowMs - item.startedAt) / 1000);
      return {
        item,
        remaining: Math.max(0, item.ingredient.cookTimeSeconds - elapsed),
      };
    })
    .sort((a, b) => a.remaining - b.remaining)[0];

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
    <CharMapContext.Provider value={charMap}>
    <div className="min-h-svh bg-[#1A1816] flex flex-col relative overflow-hidden">

      {/* ── Overlays ── */}
      <AnimatePresence>
        {foodScramble.open && <FoodScrambleOverlay state={foodScramble} onClose={closeFoodScramble} />}
      </AnimatePresence>
      <AnimatePresence>
        {topicBomb.open && <TopicBombOverlay state={topicBomb} onClose={handleCloseTopicBomb} />}
      </AnimatePresence>
      <AnimatePresence>
        {drinkBattle.open && (
          <TurnBasedDrinkBattleOverlay
            battle={drinkBattle}
            onCommit={handleBattleAction}
            onClose={handleCloseBattle}
          />
        )}
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
          <div className="flex items-center gap-1">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push("/")}
              className="w-10 h-10 flex items-center justify-center text-[#78716C] rounded-full hover:bg-white/5">
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            {sessionId && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={copyInviteLink}
                className="w-9 h-9 flex items-center justify-center text-indigo-300 rounded-full border border-indigo-500/30 bg-indigo-950/40"
                title="复制邀请链接（多人同桌）"
              >
                <Link2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm text-[#F5F1E8] tracking-wider">火锅纪 / The Feed</span>
            <span
              className={`text-[10px] font-black tracking-widest tabular-nums ${
                memoryFlashOpen
                  ? "text-[#F2A24A] animate-pulse"
                  : partyRemaining <= 10
                    ? "text-[#C0392B] animate-pulse"
                    : "text-emerald-400"
              }`}
            >
              {memoryFlashOpen
                ? "记牢烫秒 · 全员同步"
                : serverRound?.phase === "waiting"
                  ? "等一位玩家结束闪记…"
                  : `⏱ ${formatPartyClock(partyRemaining)} · 一分钟局`}
            </span>
            {serverRound?.phase === "running" && (
              <span className="text-[9px] text-indigo-300 font-bold tracking-widest mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> 多人 · 计时+锅里同步
              </span>
            )}
            {inviteCopied && (
              <span className="text-[9px] text-emerald-400 font-bold">链接已复制</span>
            )}
            {agentOnline && (
              <span className="text-[9px] text-indigo-300 font-bold tracking-widest mt-0.5">
                ● Agent 在线
              </span>
            )}
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 flex items-center justify-center text-[#78716C] rounded-full hover:bg-white/5">
            <MoreVertical className="w-5 h-5" />
          </motion.button>
        </div>

        {Object.keys(guestStatuses).length > 0 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {guests
              .filter((g) => guestStatuses[g.id] && guestStatuses[g.id].untilMs > nowMs)
              .map((g) => {
                const s = guestStatuses[g.id];
                const sec = Math.ceil((s.untilMs - nowMs) / 1000);
                const color =
                  s.effect === "angry" ? "#C0392B" : s.effect === "frozen" ? "#60A5FA" : "#F5BE00";
                return (
                  <span
                    key={g.id}
                    className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border"
                    style={{ borderColor: `${color}80`, color, background: `${color}18` }}
                  >
                    {g.flag} {statusLabel(s.effect)} {sec}s
                  </span>
                );
              })}
          </div>
        )}

        {cooking.length > 0 && (
          <div className="px-4 pb-3">
            {nextReady && nextReady.remaining <= 6 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 rounded-xl border border-[#F2A24A]/40 bg-[#F2A24A]/12 px-3 py-2 text-xs font-black text-[#F2A24A] flex items-center justify-between"
              >
                <span>{nextReady.item.ingredient.emoji} {nextReady.item.ingredient.nameCN} 快熟了</span>
                <span>{nextReady.remaining === 0 ? "抢菜开始" : `${nextReady.remaining}s`}</span>
              </motion.div>
            )}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
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
        {cardsOpen && (
          <ActionCardsBar
            hand={cardHand}
            used={usedCards}
            disabled={!roundActive}
            onPlay={playActionCard}
          />
        )}
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

          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCardsOpen((o) => !o)}
            className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors ${
              cardsOpen ? "text-[#F2A24A]" : "text-[#78716C] hover:text-[#F5F1E8]"
            }`}>
            <div className="w-10 h-10 rounded-full bg-[#1A1816] border border-white/10 flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">卡牌 Cards</span>
          </motion.button>
        </div>
      </footer>

      <AnimatePresence>
        {memoryFlashOpen && (
          <MemoryFlashOverlay onDone={handleMemoryFlashDone} />
        )}
      </AnimatePresence>

      {/* Drop-down menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={SPRING}
            className="fixed top-14 right-4 bg-[#221F1C] border border-white/10 rounded-xl shadow-xl z-40 min-w-[180px] overflow-hidden">
            {[
              { label: "Verdict 结算", action: () => endRound() },
              { label: "Menu Prep 备菜", action: () => router.push(`/menu?session=${sessionId}`) },
              { label: paused ? "继续 Pause" : "暂停 Pause", action: () => setPaused((p) => !p) },
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
    </CharMapContext.Provider>
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
