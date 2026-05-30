"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, type Character } from "@/lib/characters";
import { request } from "@/lib/api/request";
import { useClientId } from "@/components/client-id-provider";
import { CustomAgentCreator } from "@/components/custom-agent-creator";
import {
  isCustomAgentId,
  loadCustomAgents,
  saveSessionCustomAgents,
  type CustomAgentDraft,
} from "@/lib/custom-agent";
import { listSelectableCharacters } from "@/lib/character-registry";
import type { SessionPlayer } from "@/lib/session-players";
import {
  Check,
  ChevronLeft,
  Copy,
  Link2,
  Play,
  Users,
  Sparkles,
} from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 280, damping: 35 };

function LobbyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const { clientId, loading: authLoading } = useClientId();

  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [hostClientId, setHostClientId] = useState<string | null>(null);
  const [rosterLocked, setRosterLocked] = useState(false);
  const [myGuestId, setMyGuestId] = useState<string | null>(null);
  const [customAgents, setCustomAgents] = useState<CustomAgentDraft[]>([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roster = listSelectableCharacters(customAgents);
  const isHost = clientId && hostClientId === clientId;
  const claimedCount = players.filter((p) => p.guestId).length;
  const canStart = isHost && claimedCount >= 2 && !rosterLocked;

  const syncLobby = useCallback(async () => {
    if (!sessionId || !clientId) return;
    try {
      await request(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "玩家" }),
      });

      const res = await request(`/api/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setPlayers(data.players ?? []);
      setHostClientId(data.hostClientId ?? null);
      setRosterLocked(!!data.rosterLocked);
      setMyGuestId(data.myGuestId ?? null);

      if (data.rosterLocked && (data.guestIds?.length ?? 0) > 0) {
        router.replace(`/feed?session=${sessionId}`);
      }
    } catch (e) {
      console.error(e);
    }
  }, [sessionId, clientId, router]);

  useEffect(() => {
    if (authLoading || !sessionId || !clientId) return;
    void syncLobby();
    const t = setInterval(() => void syncLobby(), 1500);
    return () => clearInterval(t);
  }, [authLoading, sessionId, clientId, syncLobby]);

  useEffect(() => {
    setCustomAgents(loadCustomAgents());
  }, [creatorOpen]);

  useEffect(() => {
    if (!authLoading && !sessionId) router.push("/");
  }, [authLoading, sessionId, router]);

  const copyInvite = () => {
    if (!sessionId || typeof window === "undefined") return;
    const url = `${window.location.origin}/lobby?session=${sessionId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  const handleClaim = async (character: Character) => {
    if (!sessionId || rosterLocked) return;
    setClaiming(character.id);
    setError(null);
    try {
      const customs = isCustomAgentId(character.id) ? customAgents : [];
      const res = await request(`/api/sessions/${sessionId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: character.id, customGuests: customs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "选角失败");
        return;
      }
      setMyGuestId(character.id);
      setPlayers(data.players ?? []);
      if (customs.length) {
        saveSessionCustomAgents(sessionId, customs.filter((a) => a.id === character.id));
      }
      await syncLobby();
    } catch (e) {
      console.error(e);
      setError("网络错误");
    } finally {
      setClaiming(null);
    }
  };

  const handleStart = async () => {
    if (!sessionId || !canStart) return;
    setStarting(true);
    setError(null);
    try {
      const res = await request(`/api/sessions/${sessionId}/lock-roster`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "无法开局");
        setStarting(false);
        return;
      }
      router.push(`/feed?session=${sessionId}`);
    } catch (e) {
      console.error(e);
      setError("网络错误");
      setStarting(false);
    }
  };

  if (authLoading || !sessionId) {
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
    <div className="min-h-svh bg-[#1A1816] flex flex-col">
      <header className="px-4 pt-8 pb-4 flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="w-10 h-10 flex items-center justify-center text-[#78716C] rounded-full border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-black text-[#F5F1E8]">选角大厅</h1>
          <p className="text-[10px] text-[#78716C] font-bold tracking-widest">
            房间 #{sessionId} · 每人一个角色
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={copyInvite}
          className="w-10 h-10 flex items-center justify-center text-indigo-300 rounded-full border border-indigo-500/30"
        >
          {inviteCopied ? <Copy className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
        </motion.button>
      </header>

      <div className="px-4 mb-4">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3 text-xs text-indigo-200 leading-relaxed">
          <p className="font-black text-indigo-300 mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> 多人玩法
          </p>
          <p>1. 把邀请链接发给朋友 · 2. 各自选不同角色 · 3. 房主点「开吃」</p>
          <p className="mt-1 text-[#78716C]">进局后先闪记烫几秒，熟了拼手速点「抢！」</p>
        </div>
      </div>

      <div className="px-4 mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#78716C] mb-2">
          已入座 ({players.length}) · 已选角 ({claimedCount})
        </p>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => {
            const char = roster.find((c) => c.id === p.guestId);
            return (
              <span
                key={p.clientId}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  p.clientId === clientId
                    ? "border-[#F2A24A] text-[#F2A24A] bg-[#F2A24A]/10"
                    : "border-white/10 text-[#A8A29E]"
                }`}
              >
                {p.clientId === clientId ? "你" : "玩家"}
                {char ? ` · ${char.flag} ${char.name}` : " · 未选角"}
                {p.clientId === hostClientId ? " · 房主" : ""}
              </span>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="px-4 mb-2 text-xs text-[#C0392B] font-bold">{error}</p>
      )}

      <div className="flex-1 overflow-x-auto px-4 pb-28">
        <div className="flex gap-3 pb-4">
          {roster.map((character) => {
            const takenBy = players.find(
              (p) => p.guestId === character.id && p.clientId !== clientId,
            );
            const isMine = myGuestId === character.id;
            const disabled = !!takenBy || rosterLocked;

            return (
              <motion.button
                key={character.id}
                whileTap={disabled ? undefined : { scale: 0.97 }}
                disabled={disabled || claiming === character.id}
                onClick={() => void handleClaim(character)}
                className={`snap-center shrink-0 w-[200px] rounded-2xl overflow-hidden text-left relative border-2 transition-all ${
                  isMine
                    ? "border-[#F2A24A] shadow-[0_0_20px_rgba(242,162,74,0.35)]"
                    : disabled
                      ? "border-white/5 opacity-40"
                      : "border-white/15"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${character.gradient}`} />
                <div className="relative p-4 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{character.flag}</span>
                    {isMine && (
                      <span className="w-6 h-6 rounded-full bg-[#F2A24A] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-[#1A1816]" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="font-black text-lg text-[#F5F1E8]">{character.name}</div>
                  <div className="text-[9px] text-white/60 uppercase tracking-widest">
                    {character.chineseTagline}
                  </div>
                  {takenBy && (
                    <div className="mt-2 text-[9px] font-black text-[#C0392B] uppercase">已被占用</div>
                  )}
                  {character.skills[0] && (
                    <div className="mt-2 text-[8px] text-white/50">
                      {character.skills[0].icon} {character.skills[0].nameCN}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setCreatorOpen(true)}
          className="w-full py-3 rounded-xl border border-dashed border-[#F2A24A]/40 text-[#F2A24A] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          捏自定义 Agent 再选角
        </motion.button>
      </div>

      <footer
        className="fixed bottom-0 left-0 right-0 p-4 bg-[#12100E]/95 border-t border-white/10"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {isHost ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={!canStart || starting}
            onClick={() => void handleStart()}
            className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 text-[#1A1816]"
            style={{ background: canStart ? "#F2A24A" : "#78716C" }}
          >
            <Play className="w-5 h-5" />
            {starting ? "开局中…" : canStart ? "开吃！进入火锅局" : `至少 2 人选角 (${claimedCount}/2)`}
          </motion.button>
        ) : (
          <p className="text-center text-sm text-[#78716C] font-medium">
            {myGuestId ? "已选角，等房主开吃…" : "请先选你的角色"}
          </p>
        )}
      </footer>

      <CustomAgentCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onSaved={(draft) => {
          setCustomAgents((prev) => [...prev.filter((a) => a.id !== draft.id), draft]);
          setCreatorOpen(false);
        }}
      />
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-[#1A1816] flex items-center justify-center text-[#78716C] text-sm">
          加载大厅…
        </div>
      }
    >
      <LobbyInner />
    </Suspense>
  );
}
