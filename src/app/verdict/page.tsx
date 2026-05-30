"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CHARACTER_MAP } from "@/lib/characters";
import { request } from "@/lib/api/request";
import { useClientId } from "@/components/client-id-provider";
import { buildCharacterMap } from "@/lib/character-registry";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import {
  buildSessionStats,
  computeHotpotScore,
  computePartyScore,
  pickHighlightMoment,
  type SessionStats,
} from "@/lib/party-scoring";
import { Share2, RotateCcw, Trophy } from "lucide-react";

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
function GuestRow({
  stat,
  delay,
  charMap,
}: {
  stat: SessionStats;
  delay: number;
  charMap: Record<string, { name: string; flag: string; tagline: string }>;
}) {
  const char = charMap[stat.guestId] ?? CHARACTER_MAP[stat.guestId];
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
  const cookedParam = searchParams.get("cooked") ?? "0";

  const { clientId, loading: authLoading } = useClientId();

  const [stats, setStats] = useState<SessionStats[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [ingredientsCooked, setIngredientsCooked] = useState(
    parseInt(cookedParam, 10)
  );
  const [loading, setLoading] = useState(true);
  const [hotpotScore, setHotpotScore] = useState(0);
  const [highlightQuote, setHighlightQuote] = useState<string | null>(null);
  const [highlightGuestId, setHighlightGuestId] = useState<string | null>(null);
  const [charMap, setCharMap] = useState<Record<string, { name: string; flag: string; tagline: string }>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || authLoading) return;

    const sid = parseInt(sessionId, 10);
    if (Number.isNaN(sid)) {
      setError("Invalid session id.");
      setLoading(false);
      return;
    }

    Promise.all([
      request(`/api/sessions/${sessionId}`).then(async (r) => {
        if (!r.ok) throw new Error(`Session request failed: ${r.status}`);
        return r.json();
      }),
      request(`/api/sessions/${sessionId}/messages`).then(async (r) => {
        if (!r.ok) throw new Error(`Messages request failed: ${r.status}`);
        return r.json();
      }),
    ])
      .then(async ([session, msgs]) => {
        const ids: string[] = session?.guestIds ?? [];
        const cookedFromPot = session?.pot?.cookedCount;
        if (typeof cookedFromPot === "number" && cookedFromPot > 0) {
          setIngredientsCooked(cookedFromPot);
        }

        const customs = (session?.customGuests ?? []) as CustomAgentDraft[];
        const map = buildCharacterMap(customs);
        setCharMap(map);

        const msgArr = (Array.isArray(msgs) ? msgs : []) as {
          guestId: string;
          content: string;
          messageType: string;
        }[];
        setTotalMessages(msgArr.length);

        const cooked =
          typeof session?.pot?.cookedCount === "number"
            ? session.pot.cookedCount
            : parseInt(cookedParam, 10);
        const built = buildSessionStats(ids, msgArr, cooked);
        setStats(built);

        const partyScore = computePartyScore(built, msgArr.length, cooked);
        const hp = computeHotpotScore(built, partyScore, cooked);
        setHotpotScore(hp);

        const hl = pickHighlightMoment(msgArr, ids);
        setHighlightQuote(hl.quote);
        setHighlightGuestId(hl.guestId);

        if (clientId) {
          request("/api/leaderboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sid,
              ingredientsCooked: cooked,
            }),
          }).catch(() => {});
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load verdict.");
        setLoading(false);
      });
  }, [sessionId, clientId, authLoading, cookedParam]);

  const overallScore =
    stats.length > 0
      ? computePartyScore(stats, totalMessages, ingredientsCooked)
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

  if (error) {
    return (
      <div className="min-h-svh bg-[#0E0C0A] text-[#F5F1E8] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">🗞</div>
          <h1 className="text-xl font-black text-[#F2A24A] mb-2">Verdict 没印出来</h1>
          <p className="text-sm text-[#A8A29E] leading-relaxed mb-5">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl bg-[#F2A24A] text-[#0E0C0A] font-black text-sm uppercase tracking-widest"
          >
            回到首页
          </button>
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
        <ScoreDial value={hotpotScore} label="火锅味" color="#F2A24A" />
        <ScoreDial value={overallScore} label="Party" color="#9CB48A" />
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
            <GuestRow key={stat.guestId} stat={stat} delay={0.5 + i * 0.1} charMap={charMap} />
          ))
        ) : (
          <div className="text-center py-8 text-[#78716C] text-sm">
            No data — start a party first.
          </div>
        )}
      </div>

      {highlightQuote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mx-6 mb-6 border-l-4 border-[#F2A24A] pl-4"
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-[#F2A24A] mb-1">
            精彩瞬间 · Highlight
            {highlightGuestId && charMap[highlightGuestId]
              ? ` — ${charMap[highlightGuestId].name}`
              : highlightGuestId && CHARACTER_MAP[highlightGuestId]
              ? ` — ${CHARACTER_MAP[highlightGuestId].name}`
              : ""}
          </p>
          <p className="text-sm font-bold italic text-[#A8A29E] leading-relaxed">
            &ldquo;{highlightQuote}&rdquo;
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#78716C] mt-1">
            已提交全球火锅味榜 · 得分 {hotpotScore}
          </p>
        </motion.div>
      )}

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
          transition={{ delay: 1.15 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/leaderboard")}
          className="w-full py-3 rounded-xl border border-[#F2A24A]/40 text-[#F2A24A] text-sm font-bold flex items-center justify-center gap-2"
        >
          <Trophy className="w-4 h-4" />
          <span>全球火锅味榜 Leaderboard</span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            const text = `火锅局火锅味 ${hotpotScore} 分 — Chen ${chenGrade.grade}：「${chenGrade.comment}」${highlightQuote ? ` 精彩瞬间：${highlightQuote}` : ""} 🍲`;
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
