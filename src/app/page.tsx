"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, type Character } from "@/lib/characters";
import { request } from "@/lib/api/request";
import { useClientId } from "@/components/client-id-provider";
import { AlertTriangle, ChevronRight, Plus, Check, Users } from "lucide-react";

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

        {/* Portrait area */}
        <div className="flex-1 w-full bg-black/25 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
          <CharacterPortrait id={character.id} />
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

  const handleStart = async () => {
    if (selected.size === 0) return;
    if (!clientId) return;

    setStarting(true);
    try {
      const res = await request("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: Array.from(selected) }),
      });
      const session = await res.json();
      router.push(`/feed?session=${session.id}`);
    } catch (err) {
      console.error("Failed to start session", err);
      setStarting(false);
    }
  };

  const selectedList = CHARACTERS.filter((c) => selected.has(c.id));
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
        <h1 className="text-3xl font-black tracking-tight text-[#F2A24A] mb-1">
          组局邀约{" "}
          <span className="text-[#A8A29E] font-normal text-xl">
            / Guest List
          </span>
        </h1>
        <p className="text-[#78716C] text-sm font-medium leading-relaxed">
          挑选今晚的派对阵容。当心跨文化碰撞！
          <br />
          Select your mix of chaos and connection.
        </p>
      </div>

      {/* Card Deck */}
      <div className="flex-1 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory flex items-center px-6 pb-36 space-x-4">
        {CHARACTERS.map((character) => (
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

        {/* Start button */}
        <motion.button
          whileTap={{ scale: selected.size > 0 ? 0.97 : 1 }}
          whileHover={{ scale: selected.size > 0 ? 1.01 : 1 }}
          onClick={handleStart}
          disabled={selected.size === 0 || starting}
          className={`w-full py-4 rounded-xl flex items-center justify-center space-x-2 text-base font-black uppercase tracking-widest transition-all ${
            selected.size > 0
              ? "bg-[#F2A24A] text-[#1A1816] shadow-[0_0_20px_rgba(242,162,74,0.4)]"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
          transition={SPRING}
        >
          {starting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-[#1A1816]/30 border-t-[#1A1816] rounded-full"
            />
          ) : (
            <>
              <span>打开大门 / Start Party</span>
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
