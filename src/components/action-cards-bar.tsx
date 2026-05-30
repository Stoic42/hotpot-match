"use client";

import { motion } from "framer-motion";
import { ACTION_CARDS, type ActionCardId } from "@/lib/action-cards";

export function ActionCardsBar({
  hand,
  used,
  disabled,
  onPlay,
}: {
  hand: ActionCardId[];
  used: Set<ActionCardId>;
  disabled?: boolean;
  onPlay: (id: ActionCardId) => void;
}) {
  if (hand.length === 0) return null;

  return (
    <div className="px-2 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
      {hand.map((id) => {
        const card = ACTION_CARDS[id];
        const spent = used.has(id);
        return (
          <motion.button
            key={id}
            whileTap={spent || disabled ? {} : { scale: 0.95 }}
            disabled={spent || disabled}
            onClick={() => onPlay(id)}
            className={`shrink-0 w-[100px] rounded-xl border p-2 text-left transition-opacity ${
              spent || disabled ? "opacity-35 border-white/5" : "border-white/15 bg-[#221F1C]"
            }`}
            style={!spent && !disabled ? { boxShadow: `0 0 12px ${card.color}40` } : undefined}
          >
            <div className="text-xl mb-0.5">{card.emoji}</div>
            <div className="text-[10px] font-black text-[#F5F1E8] leading-tight">{card.nameCN}</div>
            <div className="text-[8px] text-[#78716C] mt-0.5 line-clamp-2">{card.description}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
