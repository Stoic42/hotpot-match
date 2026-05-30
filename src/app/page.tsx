"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, type Character } from "@/lib/characters";
import { request } from "@/lib/api/request";
import { useClientId } from "@/components/client-id-provider";
import { CustomAgentCreator } from "@/components/custom-agent-creator";
import {
  loadCustomAgents,
  saveSessionCustomAgents,
  type CustomAgentDraft,
} from "@/lib/custom-agent";
import { listSelectableCharacters } from "@/lib/character-registry";
import { BALANCE_BUDGET } from "@/lib/character-balance";
import { AlertTriangle, ChevronRight, Plus, Check, Users, Sparkles, Trophy } from "lucide-react";

const MAX_GUESTS = 5;
const SPRING = { type: "spring" as const, stiffness: 280, damping: 35 };
const TAP_SCALE = 0.97;

// Character avatar icons using inline SVG to avoid flag emoji inconsistency
function CharacterPortrait({ id }: { id: string }) {
  const color =
    id === "chen"
      ? "#fca5a5"
      : id === "leo"
      ? "#fde68a"
      : id === "youwei"
      ? "#d8b4fe"
      : id === "zion"
      ? "#d6d3d1"
      : id === "marta"
      ? "#86efac"
      : "#93c5fd";
  return (
    <svg
      className="w-16 h-16 opacity-60"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CharacterCard({
  character,
  isSelected,
  onToggle,
}: {
  character: Character;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: TAP_SCALE }}
      whileHover={{ y: -4 }}
      onClick={() => onToggle(character.id)}
      className={`snap-center shrink-0 w-[240px] h-[340px] rounded-2xl relative overflow-hidden cursor-pointer select-none`}
      style={{
        background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
      }}
      transition={SPRING}
    >
      {/* Gradient background via inline style for flexibility */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${character.gradient}`}
      />

      {/* Flag watermark */}
      <div className="absolute -right-4 -bottom-4 text-[120px] opacity-[0.08] leading-none pointer-events-none select-none z-0">
        {character.flag}
      </div>

      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected ? (
          <motion.div
            key="selected"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F2A24A] flex items-center justify-center shadow-lg z-20"
          >
            <Check className="w-4 h-4 text-[#1A1816]" strokeWidth={3} />
          </motion.div>
        ) : (
          <motion.div
            key="unselected"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center z-20"
          >
            <Plus className="w-4 h-4 text-white/60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card content */}
      <div className="absolute inset-0 p-5 flex flex-col items-start z-10 relative">
        {/* Name row */}
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-2xl select-none">{character.flag}</span>
          <span className="font-black text-xl uppercase tracking-widest text-[#F5F1E8]">
            {character.name}
          </span>
        </div>
        <span className="text-[#A8A29E] text-[10px] uppercase tracking-widest mb-4 font-bold">
          {character.chineseTagline} / {character.tagline}
        </span>

        {/* Skills (turn-based drink bout) */}
        <div className="flex-1 w-full bg-black/25 rounded-xl mb-3 p-2.5 flex flex-col justify-end gap-1.5 min-h-[100px]">
          {character.skills.length > 0 ? (
            character.skills.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-sm">{s.icon}</span>
                <div className="min-w-0">
                  <div className="text-[9px] font-black text-white/80 uppercase tracking-widest">
                    {s.nameCN}
                  </div>
                  <div className="text-[8px] text-white/50 leading-tight line-clamp-1">
                    {s.description}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <span className="text-[9px] text-white/40">无战斗技能</span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2 w-full">
          <span className="text-[7px] text-[#78716C] uppercase tracking-widest shrink-0">酒量</span>
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F2A24A]"
              style={{ width: `${character.drinkingPower * 10}%` }}
            />
          </div>
          <span className="text-[7px] text-[#78716C]">{character.drinkingPower}/10</span>
        </div>

        {/* Traits */}
        <div className="flex flex-wrap gap-1.5 mb-auto">
          {character.traits.map((trait) => (
            <span
              key={trait}
              className="px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] font-bold text-white/90 uppercase tracking-widest border border-white/10"
            >
              {trait}
            </span>
          ))}
        </div>

        {/* Dietary restrictions warning */}
        {character.restrictions.length > 0 && (
          <div className="mt-3 border-t border-white/10 pt-3 w-full">
            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase text-[#A8A29E]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#C0392B] shrink-0" />
              <span className="truncate">{character.restrictions[0]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Selection ring */}
      {isSelected && (
        <motion.div
          layoutId={`ring-${character.id}`}
          className="absolute inset-0 rounded-2xl ring-4 ring-[#F2A24A] shadow-[0_0_25px_rgba(242,162,74,0.4)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
        />
      )}
    </motion.div>
  );
}

export default function GuestSelectionPage() {
  const router = useRouter();
  const { clientId, loading: authLoading } = useClientId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [customAgents, setCustomAgents] = useState<CustomAgentDraft[]>([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState("");

  useEffect(() => {
    setCustomAgents(loadCustomAgents());
  }, [creatorOpen]);

  const roster = listSelectableCharacters(customAgents);

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < MAX_GUESTS) {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const handleCreateLobby = async () => {
    if (!clientId) return;
    setStarting(true);
    try {
      const res = await request("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobby: true, guestIds: [] }),
      });
      if (!res.ok) {
        setStarting(false);
        return;
      }
      const session = await res.json();
      router.push(`/lobby?session=${session.id}`);
    } catch (err) {
      console.error(err);
      setStarting(false);
    }
  };

  const handleStart = async () => {
    if (selected.size === 0) return;
    if (!clientId) return;

    setStarting(true);
    try {
      const res = await request("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestIds: Array.from(selected),
          customGuests: customAgents.filter((a) => selected.has(a.id)),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to start session", errData);
        setStarting(false);
        return;
      }
      const session = await res.json();
      saveSessionCustomAgents(String(session.id), customAgents.filter((a) => selected.has(a.id)));
      router.push(`/feed?session=${session.id}`);
    } catch (err) {
      console.error("Failed to start session", err);
      setStarting(false);
    }
  };

  const selectedList = roster.filter((c) => selected.has(c.id));
  const emptySlots = MAX_GUESTS - selectedList.length;

  if (authLoading) {
    return (
      <div className="min-h-svh bg-[#1A1816] flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[#F2A24A]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#1A1816] flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 shrink-0 z-20">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-3xl font-black tracking-tight text-[#F2A24A]">
            组局邀约{" "}
            <span className="text-[#A8A29E] font-normal text-xl">
              / Guest List
            </span>
          </h1>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/leaderboard")}
            className="shrink-0 mt-1 px-2.5 py-1.5 rounded-lg border border-[#F2A24A]/30 text-[#F2A24A] text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
          >
            <Trophy className="w-3.5 h-3.5" />
            火锅味榜
          </motion.button>
        </div>
        <p className="text-[#78716C] text-sm font-medium leading-relaxed">
          多人：创建房间 → 好友各选不同角色 → 闪记烫几秒 → 熟了拼手速抢菜。
          <br />
          单人演示：下方选多个角色由你一人操控。
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setCreatorOpen(true)}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#F2A24A]/40 text-[#F2A24A] text-xs font-black uppercase tracking-widest"
        >
          <Sparkles className="w-3.5 h-3.5" />
          捏一个 Agent
        </motion.button>
        <div className="mt-4 flex gap-2 items-center">
          <input
            type="text"
            inputMode="numeric"
            placeholder="房间号 session id"
            value={joinSessionId}
            onChange={(e) => setJoinSessionId(e.target.value.replace(/\D/g, ""))}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#221F1C] border border-white/10 text-sm text-[#F5F1E8] placeholder:text-[#78716C]"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={!joinSessionId}
            onClick={() => router.push(`/lobby?session=${joinSessionId}`)}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-indigo-600/80 text-white disabled:opacity-30"
          >
            加入房间
          </motion.button>
        </div>
      </div>

      <CustomAgentCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onSaved={(draft) => {
          setCustomAgents(loadCustomAgents());
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.size < MAX_GUESTS) next.add(draft.id);
            return next;
          });
        }}
      />

      {/* Card Deck */}
      <div className="flex-1 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory flex items-center px-6 pb-36 space-x-4">
        {roster.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            isSelected={selected.has(character.id)}
            onToggle={toggle}
          />
        ))}
        {/* End spacer */}
        <div className="shrink-0 w-6" />
      </div>

      {/* Footer */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 p-6 bg-[#12100E]/95 backdrop-blur border-t border-white/10 z-30 flex flex-col space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Roster preview */}
        <div className="flex items-center justify-between">
          <span className="text-[#78716C] text-xs font-bold tracking-widest uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Invited ({selected.size}/{MAX_GUESTS})
          </span>
          <div className="flex space-x-2">
            <AnimatePresence>
              {selectedList.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
                  className="w-8 h-8 rounded-full border border-[#F2A24A] bg-[#1A1816] flex items-center justify-center text-sm cursor-pointer"
                  onClick={() => toggle(c.id)}
                  title={c.name}
                >
                  {c.flag}
                </motion.div>
              ))}
            </AnimatePresence>
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-8 h-8 rounded-full border border-dashed border-white/20 bg-white/5"
              />
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCreateLobby}
          disabled={starting}
          className="w-full py-4 rounded-xl flex items-center justify-center space-x-2 text-base font-black uppercase tracking-widest bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.35)] disabled:opacity-50"
          transition={SPRING}
        >
          <Users className="w-5 h-5" />
          <span>创建多人房间 / Multiplayer</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: selected.size > 0 ? 0.97 : 1 }}
          whileHover={{ scale: selected.size > 0 ? 1.01 : 1 }}
          onClick={handleStart}
          disabled={selected.size === 0 || starting}
          className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 text-sm font-black uppercase tracking-widest transition-all border ${
            selected.size > 0
              ? "border-[#F2A24A]/50 text-[#F2A24A] bg-[#F2A24A]/10"
              : "border-white/10 text-white/30 cursor-not-allowed"
          }`}
          transition={SPRING}
        >
          {starting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-[#F2A24A]/30 border-t-[#F2A24A] rounded-full"
            />
          ) : (
            <>
              <span>单人演示 / Solo (选 {selected.size} 角)</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
