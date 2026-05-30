"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Check, AlertTriangle } from "lucide-react";
import { memory } from "@eazo/sdk";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 35 };
const TAP_SCALE = 0.95;

// ── Menu items ─────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  emoji: string;
  name: string;
  nameEN: string;
  category: string;
  authenticity: number; // how much it moves the authenticity gauge
  restrictions?: string[]; // guest ids who can't eat it
  warning?: string;
}

const MENU_ITEMS: MenuItem[] = [
  // Meat
  { id: "beef", emoji: "🥩", name: "肥牛", nameEN: "Beef", category: "meat", authenticity: 15 },
  { id: "lamb", emoji: "🐑", name: "羊肉卷", nameEN: "Lamb", category: "meat", authenticity: 12 },
  { id: "pork", emoji: "🥓", name: "猪五花", nameEN: "Pork Belly", category: "meat", authenticity: 10 },
  // Offal
  { id: "tripe", emoji: "🟫", name: "毛肚", nameEN: "Tripe", category: "offal", authenticity: 20, restrictions: ["zion"], warning: "Zion's braces can't handle this" },
  { id: "blood", emoji: "🟥", name: "鸭血", nameEN: "Duck Blood", category: "offal", authenticity: 18 },
  { id: "brain", emoji: "🧠", name: "脑花", nameEN: "Brain", category: "offal", authenticity: 22 },
  // Vegetables
  { id: "tofu", emoji: "⬜", name: "豆腐", nameEN: "Tofu", category: "veg", authenticity: 5, restrictions: [] },
  { id: "potato", emoji: "🥔", name: "土豆", nameEN: "Potato", category: "veg", authenticity: 3 },
  { id: "mushroom", emoji: "🍄", name: "香菇", nameEN: "Mushroom", category: "veg", authenticity: 8 },
  { id: "greens", emoji: "🥬", name: "菠菜", nameEN: "Spinach", category: "veg", authenticity: 4 },
  // Seafood
  { id: "shrimp", emoji: "🦐", name: "虾滑", nameEN: "Shrimp Paste", category: "seafood", authenticity: 10 },
  { id: "fish", emoji: "🐟", name: "鱼片", nameEN: "Fish Fillet", category: "seafood", authenticity: 9 },
  // Noodles
  { id: "noodles", emoji: "🍜", name: "宽粉", nameEN: "Wide Noodles", category: "noodles", authenticity: 7 },
  { id: "enoki", emoji: "🌿", name: "金针菇", nameEN: "Enoki", category: "veg", authenticity: 6 },
];

const CATEGORIES = [
  { id: "meat", label: "肉类 Meat", labelColor: "#F5F1E8" },
  { id: "offal", label: "内脏 Offal", labelColor: "#C0392B" },
  { id: "veg", label: "蔬菜 Veg", labelColor: "#9CB48A" },
  { id: "seafood", label: "海鲜 Seafood", labelColor: "#A8A29E" },
  { id: "noodles", label: "主食 Starch", labelColor: "#F5BE00" },
];

// Chen's wisdom at various authenticity levels
function getChenComment(score: number): string {
  if (score >= 80) return "还不错。算是及格了。";
  if (score >= 60) return "勉强可以。但你们的火候还差得远。";
  if (score >= 40) return "这就叫火锅？我们在四川会把这叫做温水。";
  if (score >= 20) return "脑花都不敢点？懦夫。";
  return "你们连毛肚都不点，这不是火锅，这是西餐。";
}

function AuthenticityGauge({ score }: { score: number }) {
  const label = score >= 80 ? "Authentic!" : score >= 50 ? "Decent" : score >= 25 ? "Tourist Mode" : "Shame";
  const color = score >= 70 ? "#9CB48A" : score >= 40 ? "#F2A24A" : "#C0392B";
  return (
    <div className="w-full bg-[#1A1816] px-6 py-4 border-b border-white/10 shrink-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#C0392B] flex items-center gap-1">
          <Star className="w-3 h-3" />
          Chen's Authenticity Rating
        </span>
        <span className="text-[10px] font-bold text-[#F5F1E8]">
          {score}% — {label}
        </span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(to right, #F2A24A, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={SPRING}
        />
      </div>
      <p className="text-[11px] text-[#78716C] mt-2 italic">"{getChenComment(score)}"</p>
    </div>
  );
}

function MenuItemCard({
  item,
  isSelected,
  onToggle,
}: {
  item: MenuItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: TAP_SCALE }}
      onClick={() => onToggle(item.id)}
      className={`flex flex-col items-center rounded-xl py-3 px-2 relative overflow-visible cursor-pointer transition-colors ${
        isSelected
          ? "bg-[#F2A24A]/10 border-2 border-[#F2A24A] shadow-[0_0_15px_rgba(242,162,74,0.1)]"
          : item.category === "offal"
          ? "bg-[#1A1816] border border-[#C0392B]/50"
          : "bg-[#1A1816] border border-white/10 hover:bg-white/5"
      }`}
      transition={SPRING}
    >
      <div className="text-3xl mb-1 drop-shadow-md select-none">{item.emoji}</div>
      <span className={`text-xs font-bold ${isSelected ? "text-[#F5F1E8]" : "text-[#A8A29E]"}`}>
        {item.name}
      </span>
      <span
        className={`text-[9px] mt-0.5 uppercase tracking-widest ${isSelected ? "text-[#F2A24A]" : "text-[#78716C]"}`}
      >
        {isSelected ? "Added" : item.nameEN}
      </span>

      {/* Check badge */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring" as const, stiffness: 500, damping: 25 }}
          className="absolute -top-1 -right-1 bg-[#F2A24A] w-5 h-5 rounded-bl-lg flex items-center justify-center z-10"
        >
          <Check className="w-3 h-3 text-[#1A1816]" strokeWidth={3} />
        </motion.div>
      )}

      {/* Restriction warning badge */}
      {item.restrictions && item.restrictions.length > 0 && !isSelected && (
        <div className="absolute -top-2 -right-2 bg-[#1A1816] rounded-full border border-[#C0392B] p-0.5 z-10 shadow-lg">
          <AlertTriangle className="w-3 h-3 text-[#C0392B]" />
        </div>
      )}
    </motion.div>
  );
}

function MenuPrepInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [selected, setSelected] = useState<Set<string>>(new Set(["beef"]));
  const [dropped, setDropped] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const authenticityScore = Math.min(
    100,
    Array.from(selected).reduce((acc, id) => {
      const item = MENU_ITEMS.find((m) => m.id === id);
      return acc + (item?.authenticity ?? 0);
    }, 0)
  );

  const handleConfirm = () => {
    const selectedItems = MENU_ITEMS.filter((m) => selected.has(m.id));

    memory
      .reportAction({
        content: `User added ${selectedItems.length} ingredients to the pot: ${selectedItems.map((i) => i.nameEN).join(", ")}`,
        event_type: "update",
        page: "menu-prep",
        metadata: {
          type: "drop_ingredients",
          items: selectedItems.map((i) => i.id),
          authenticity_score: authenticityScore,
          session_id: sessionId,
        },
      })
      .catch(() => {});

    setDropped(true);
    setTimeout(() => {
      router.back();
    }, 800);
  };

  return (
    <div className="min-h-svh bg-[#1A1816] flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#1A1816] shrink-0 sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-black text-[#F2A24A] tracking-tight">
            备菜区 / The Pantry
          </h2>
          <p className="text-xs text-[#78716C] font-medium mt-1">
            Select ingredients to drop into the pot.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: TAP_SCALE }}
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[#A8A29E] hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Authenticity gauge */}
      <AuthenticityGauge score={authenticityScore} />

      {/* Pantry grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-32">
        {CATEGORIES.map((cat) => {
          const items = MENU_ITEMS.filter((m) => m.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id} className="relative">
              <div className="flex items-center space-x-3 mb-4">
                <h3
                  className="font-bold text-sm tracking-wider shrink-0"
                  style={{ color: cat.labelColor }}
                >
                  {cat.label}
                </h3>
                <div
                  className="flex-1 h-px"
                  style={{
                    background: `linear-gradient(to right, ${cat.labelColor}40, transparent)`,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    isSelected={selected.has(item.id)}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 p-6 bg-[#1A1816] border-t border-white/10 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <motion.button
          whileTap={{ scale: dropped ? 1 : 0.97 }}
          whileHover={{ scale: dropped ? 1 : 1.01 }}
          onClick={!dropped ? handleConfirm : undefined}
          disabled={selected.size === 0 || dropped}
          className={`w-full py-4 rounded-xl flex items-center justify-center space-x-2 text-base font-black uppercase tracking-widest transition-all ${
            dropped
              ? "bg-[#9CB48A] text-[#1A1816]"
              : selected.size > 0
              ? "bg-[#F2A24A] text-[#1A1816] shadow-[0_0_15px_rgba(242,162,74,0.3)]"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
          transition={SPRING}
        >
          {dropped ? (
            <>
              <Check className="w-5 h-5" />
              <span>下锅了！ Dropped!</span>
            </>
          ) : (
            <span>确认下锅 / Drop in Pot ({selected.size})</span>
          )}
        </motion.button>
      </div>
    </div>
  );
}

export default function MenuPrepPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-[#1A1816] flex items-center justify-center">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-10 h-2 rounded-full skeleton"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
        </div>
      }
    >
      <MenuPrepInner />
    </Suspense>
  );
}
