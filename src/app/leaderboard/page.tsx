"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { request } from "@/lib/api/request";
import { CHARACTER_MAP } from "@/lib/characters";
import { ChevronLeft, Flame, Trophy } from "lucide-react";

interface LeaderboardEntry {
  id: number;
  sessionId: number;
  hotpotScore: number;
  partyScore: number;
  highlightQuote: string;
  highlightGuestId: string | null;
  guestSummary: string;
  ingredientsCooked: number;
  displayName: string | null;
  createdAt: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    request("/api/leaderboard")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((data: { entries: LeaderboardEntry[] }) => {
        setEntries(data.entries ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("排行榜加载失败");
        setLoading(false);
      });
  }, []);

  return (
    <div
      className="min-h-svh bg-[#0E0C0A] text-[#F5F1E8] flex flex-col"
      style={{ fontFamily: "'Noto Sans SC', 'Noto Sans', sans-serif" }}
    >
      <header className="px-4 pt-10 pb-4 border-b border-white/10 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="w-10 h-10 flex items-center justify-center text-[#78716C] rounded-full hover:bg-white/5"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F2A24A]" />
            全球火锅味榜
          </h1>
          <p className="text-[10px] text-[#78716C] font-bold uppercase tracking-widest mt-0.5">
            Hotpot Authenticity · Hall of Fame
          </p>
        </div>
      </header>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-[#78716C] text-sm">
          开锅加载中…
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center text-[#C0392B] text-sm">{error}</div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <Flame className="w-12 h-12 text-[#F2A24A]/40 mb-4" />
          <p className="text-[#A8A29E] text-sm">还没有人上榜。打完一局 Verdict 会自动提交火锅味分数。</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {entries.map((e, i) => {
          const guest = e.highlightGuestId ? CHARACTER_MAP[e.highlightGuestId] : null;
          return (
            <motion.article
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-white/10 bg-[#1A1816] p-4 relative overflow-hidden"
            >
              <div className="absolute top-3 right-3 text-[10px] font-black text-[#78716C]">#{i + 1}</div>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-3xl font-black text-[#F2A24A] tabular-nums">{e.hotpotScore}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C] pb-1">
                  火锅味 · party {e.partyScore}
                </span>
              </div>
              <p className="text-[10px] text-[#78716C] mb-2 truncate">{e.guestSummary}</p>
              <div className="border-l-2 border-[#F2A24A] pl-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#F2A24A] mb-1">
                  精彩瞬间
                  {guest ? ` · ${guest.flag} ${guest.name}` : ""}
                </p>
                <p className="text-sm text-[#A8A29E] italic leading-relaxed line-clamp-3">
                  &ldquo;{e.highlightQuote}&rdquo;
                </p>
              </div>
              <p className="text-[9px] text-[#78716C] mt-2">
                {e.ingredientsCooked} 道菜下锅 ·{" "}
                {new Date(e.createdAt).toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
