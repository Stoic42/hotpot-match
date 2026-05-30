"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CHARACTER_MAP, CHARACTERS } from "@/lib/characters";
import { request } from "@/lib/api/request";
import { useClientId } from "@/components/client-id-provider";
import { Share2, RotateCcw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface SessionStats {
  guestId: string;
  messageCount: number;
  ingredientsEaten: number;
  hunger: number;     // 0–100
  drinkScore: number; // 0–100
  chaosScore: number; // 0–100
}

// Chen's letter grade thresholds
function getChenGrade(score: number): { grade: string; comment: string } {
  if (score >= 90) return { grade: "A+", comment: "勉强及格。" };
  if (score >= 80) return { grade: "A", comment: "还行。" };
  if (score >= 70) return { grade: "B+", comment: "差点意思。" };
  if (score >= 60) return { grade: "B", comment: "不正宗。" };
  if (score >= 50) return { grade: "C", comment: "在四川这叫温水。" };
  if (score >= 40) return { grade: "D", comment: "下次别来了。" };
  return { grade: "F", comment: "这不叫火锅。" };
}

// ── Stamp component ────────────────────────────────────────────────────────────
function ChenStamp({ grade }: { grade: string }) {
  return (
    <motion.div
      initial={{ scale: 3, opacity: 0, rotate: -15 }}
      animate={{ scale: 1, opacity: 1, rotate: -12 }}
      transition={{ type: "spring" as const, stiffness: 280, damping: 18, delay: 0.8 }}
      className="absolute top-4 right-4 w-20 h-20 rounded-full border-4 border-[#C0392B] flex items-center justify-center"
      style={{
        background: "transparent",
        boxShadow: "inset 0 0 0 2px #C0392B40, 0 0 0 2px #C0392B40",
      }}
    >
      <div className="text-center">
        <div className="text-2xl font-black text-[#C0392B] leading-none">{grade}</div>
        <div className="text-[8px] text-[#C0392B] font-black uppercase tracking-widest">CHEN</div>
      </div>
    </motion.div>
  );
}

// ── Score dial ─────────────────────────────────────────────────────────────────
function ScoreDial({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <motion.circle
            cx="32" cy="32" r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-[#F5F1E8]">{value}</span>
        </div>
      </div>
      <span className="text-[9px] font-bold text-[#78716C] uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ── Guest row ──────────────────────────────────────────────────────────────────
function GuestRow({ stat, delay }: { stat: SessionStats; delay: number }) {
  const char = CHARACTER_MAP[stat.guestId];
  if (!char) return null;

  const headline = stat.hunger > 70
    ? "went home hungry"
    : stat.chaosScore > 80
    ? "caused maximum chaos"
    : stat.drinkScore > 80
    ? "drank everyone under the table"
    : stat.messageCount > 8
    ? "wouldn't stop talking"
    : "ate quietly and judged everyone";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring" as const, stiffness: 250, damping: 28 }}
      className="border-b border-white/8 pb-4 mb-4 last:border-0 last:mb-0"
    >
      <div className="flex items-start gap-3">
        {/* Flag avatar */}
        <div className="w-10 h-10 rounded-full bg-[#221F1C] border border-white/10 flex items-center justify-center text-xl shrink-0">
          {char.flag}
        </div>
        <div className="flex-1 min-w-0">
          {/* Name + headline */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-black text-[#F5F1E8] uppercase tracking-wide text-sm">{char.name}</span>
            <span className="text-[#78716C] text-xs font-medium italic">{headline}</span>
          </div>
          <div className="text-[10px] text-[#A8A29E] mt-0.5">{char.tagline} · {stat.messageCount} msgs · ate {stat.ingredientsEaten} dishes</div>
          {/* Mini stats */}
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: stat.hunger > 60 ? "#C0392B" : "#9CB48A" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.hunger}%` }}
                  transition={{ delay: delay + 0.3, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-[9px] text-[#78716C]">hunger</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#F2A24A]"
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.chaosScore}%` }}
                  transition={{ delay: delay + 0.4, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-[9px] text-[#78716C]">chaos</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main verdict inner ─────────────────────────────────────────────────────────
function VerdictInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const { clientId, loading: authLoading } = useClientId();

  const [stats, setStats] = useState<SessionStats[]>([]);
  const [guestIds, setGuestIds] = useState<string[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [ingredientsCooked, setIngredientsCooked] = useState(
    parseInt(searchParams.get("cooked") ?? "0", 10)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || authLoading || !clientId) return;

    // Load session + messages to compute stats
    Promise.all([
      request(`/api/sessions`).then((r) => r.json()),
      request(`/api/sessions/${sessionId}/messages`).then((r) => r.json()),
    ]).then(([session, msgs]) => {
      const ids: string[] = session?.guestIds ?? [];
      setGuestIds(ids);

      const msgArr = Array.isArray(msgs) ? msgs : [];
      setTotalMessages(msgArr.length);

      // Build per-guest stats
      const built: SessionStats[] = ids.map((id) => {
        const guestMsgs = msgArr.filter((m: { guestId: string }) => m.guestId === id);
        const char = CHARACTER_MAP[id];
        // Deterministic but varied scores based on character traits
        const baseHunger = char?.traits.includes("Braces") ? 55
          : char?.id === "leo" ? 45
          : char?.id === "chen" ? 20
          : 35;
        const baseChaos = char?.id === "leo" ? 85
          : char?.id === "youwei" ? 75
          : char?.id === "chen" ? 60
          : 40;
        const baseDrink = char?.alcoholAllergy ? 0
          : (char?.drinkingPower ?? 5) * 10;

        // Use character traits for deterministic ingredientsEaten instead of Math.random
        const grabSpeed = char?.id === "chen" ? 0.9 : char?.id === "youwei" ? 0.8 : char?.id === "marta" ? 0.7 : char?.id === "nina" ? 0.65 : char?.id === "zion" ? 0.4 : 0.3;
        const baseEaten = Math.floor(ingredientsCooked / Math.max(1, ids.length));
        const bonusEaten = grabSpeed > 0.5 && ingredientsCooked > ids.length ? 1 : 0;
        return {
          guestId: id,
          messageCount: guestMsgs.length,
          ingredientsEaten: Math.max(0, baseEaten + bonusEaten),
          hunger: Math.min(100, baseHunger + (ingredientsCooked < 3 ? 30 : 0)),
          drinkScore: Math.min(100, baseDrink),
          chaosScore: Math.min(100, baseChaos + guestMsgs.length * 2),
        };
      });

      setStats(built);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sessionId, clientId, authLoading, ingredientsCooked]);

  // Overall party score
  const overallScore = stats.length > 0
    ? Math.round(
        (stats.reduce((a, s) => a + s.chaosScore, 0) / stats.length) * 0.4 +
        (totalMessages > 10 ? 70 : totalMessages * 7) * 0.3 +
        (ingredientsCooked > 3 ? 80 : ingredientsCooked * 20) * 0.3
      )
    : 0;

  const chenGrade = getChenGrade(overallScore);
  const totalChaos = stats.reduce((a, s) => a + s.chaosScore, 0) / Math.max(1, stats.length);
  const totalHunger = stats.reduce((a, s) => a + s.hunger, 0) / Math.max(1, stats.length);

  if (authLoading || loading) {
    return (
      <div className="min-h-svh bg-[#0E0C0A] flex items-center justify-center">
        <div className="text-center">
          <motion.div className="text-4xl mb-4" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>🗞</motion.div>
          <p className="text-[#78716C] text-sm font-medium uppercase tracking-widest">印刷中… Printing verdict…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#0E0C0A] text-[#F5F1E8] flex flex-col" style={{ fontFamily: "'Noto Sans SC', 'Noto Sans', sans-serif" }}>

      {/* Masthead */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-10 pb-6 border-b-2 border-[#F5F1E8] relative"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#78716C]">Vol. 1 · The Dinner Record</div>
          <div className="text-[9px] font-bold text-[#78716C]">火锅纪事 · 终版</div>
        </div>

        <h1 className="text-4xl font-black uppercase tracking-tight leading-none mb-1" style={{ letterSpacing: "-0.02em" }}>
          VERDICT<br />
          <span className="text-[#F2A24A]">PRESS</span>
        </h1>

        <p className="text-xs text-[#A8A29E] font-medium mt-2 leading-relaxed">
          The authoritative record of tonight's hotpot session.
          All findings reviewed by Chen. All rulings are final.
        </p>

        {/* Chen stamp */}
        <ChenStamp grade={chenGrade.grade} />
      </motion.div>

      {/* Banner headline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-6 py-5 border-b border-white/10 bg-[#F2A24A]/5"
      >
        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#F2A24A] mb-2">CHEN'S FINAL RULING</div>
        <p className="text-lg font-black leading-tight text-[#F5F1E8] italic">
          "{chenGrade.comment}"
        </p>
      </motion.div>

      {/* Score dials row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-6 py-5 border-b border-white/10 flex items-center justify-around"
      >
        <ScoreDial value={overallScore} label="Party Score" color="#F2A24A" />
        <ScoreDial value={Math.round(totalChaos)} label="Chaos" color="#C0392B" />
        <ScoreDial value={ingredientsCooked * 12} label="Food Score" color="#9CB48A" />
        <ScoreDial value={Math.round(100 - totalHunger)} label="Full" color="#F5BE00" />
      </motion.div>

      {/* Column divider — editorial rule */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#78716C]">Guest Profiles</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>
      </div>

      {/* Guest rows */}
      <div className="px-6 pb-6 flex-1">
        {stats.length > 0 ? (
          stats.map((stat, i) => (
            <GuestRow key={stat.guestId} stat={stat} delay={0.5 + i * 0.1} />
          ))
        ) : (
          <div className="text-center py-8 text-[#78716C] text-sm">
            No data — start a party first.
          </div>
        )}
      </div>

      {/* Pull quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mx-6 mb-6 border-l-4 border-[#F2A24A] pl-4"
      >
        <p className="text-sm font-bold italic text-[#A8A29E] leading-relaxed">
          "{totalMessages > 15
            ? "An evening of exceptional chaos. The pot demanded more attention than it received."
            : totalMessages > 8
            ? "A respectable showing. Several opinions were expressed. Most were wrong."
            : "A quiet table. Suspicious. Chen remains unsatisfied."}"
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#78716C] mt-1">— The Editors</p>
      </motion.div>

      {/* Footer actions */}
      <div
        className="px-6 pb-8 border-t border-white/10 pt-5 flex flex-col gap-3"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/")}
          className="w-full py-4 rounded-xl bg-[#F2A24A] text-[#0E0C0A] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(242,162,74,0.3)]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>再来一局 New Party</span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            const text = `Tonight's Hotpot Party: ${guestIds.map(id => CHARACTER_MAP[id]?.name).join(", ")} — Chen graded it ${chenGrade.grade}. "${chenGrade.comment}" 🍲`;
            if (navigator.share) {
              navigator.share({ title: "Hotpot Party Verdict", text }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(text).catch(() => {});
            }
          }}
          className="w-full py-3 rounded-xl border border-white/15 text-[#A8A29E] text-sm font-bold flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>分享结果 Share</span>
        </motion.button>
      </div>
    </div>
  );
}

export default function VerdictPage() {
  return (
    <Suspense fallback={
      <div className="min-h-svh bg-[#0E0C0A] flex items-center justify-center">
        <div className="text-4xl">🗞</div>
      </div>
    }>
      <VerdictInner />
    </Suspense>
  );
}
