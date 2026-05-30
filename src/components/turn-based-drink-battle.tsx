"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TOPIC_BOMBS } from "@/lib/characters";
import type { BattleAction, BattleParticipant, DrinkBattle } from "@/lib/drink-battle";

const SPRING_B = { type: "spring" as const, stiffness: 400, damping: 25 };

function HPBar({ participant, flipped }: { participant: BattleParticipant; flipped?: boolean }) {
  const pct = Math.max(0, participant.hp / participant.maxHp);
  const color = pct < 0.2 ? "#C0392B" : pct < 0.45 ? "#F5BE00" : "#9CB48A";
  return (
    <div className={`flex flex-col gap-1 ${flipped ? "items-end" : "items-start"} flex-1`}>
      <div className="flex items-center gap-1.5">
        <span className="text-base">{participant.char.flag}</span>
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
          {participant.char.name.toUpperCase()}
        </span>
        {participant.statusEffect !== "normal" && (
          <span className="text-[8px] font-black uppercase tracking-widest text-[#F5BE00] bg-[#F5BE00]/10 px-1 rounded">
            {participant.statusEffect}
          </span>
        )}
      </div>
      <div
        className={`w-full h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10 ${flipped ? "rotate-180" : ""}`}
      >
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
          style={{ background: `linear-gradient(to right, ${color}70, ${color})` }}
        />
      </div>
      <span className="text-[9px] text-[#78716C]">
        HP {participant.hp}/{participant.maxHp}
      </span>
    </div>
  );
}

export function TurnBasedDrinkBattleOverlay({
  battle,
  onCommit,
  onClose,
}: {
  battle: DrinkBattle;
  onCommit: (
    action: BattleAction,
    targetIdx: number | undefined,
    topicId: string | undefined,
    skillId: string | undefined,
  ) => void;
  onClose: () => void;
}) {
  const [selAction, setSelAction] = useState<BattleAction | null>(null);
  const [selTargetIdx, setSelTargetIdx] = useState<number | null>(null);
  const [selTopicId, setSelTopicId] = useState<string | null>(null);
  const [selSkillId, setSelSkillId] = useState<string | null>(null);

  if (!battle.open) return null;
  const parts = battle.participants;
  const actor = parts[battle.currentTurnIdx];
  const isOver = !!battle.winner;

  if (!actor && !isOver) return null;

  const needsTarget = selAction === "drink" || selAction === "drink_topic";
  const needsTopic = selAction === "topic" || selAction === "drink_topic";
  const isSkill = selAction === "skill";

  const canCommit =
    selAction !== null &&
    (isSkill
      ? selSkillId !== null
      : (!needsTarget || selTargetIdx !== null) && (!needsTopic || selTopicId !== null));

  const handleCommit = () => {
    if (!canCommit || !selAction) return;
    onCommit(selAction, selTargetIdx ?? undefined, selTopicId ?? undefined, selSkillId ?? undefined);
    setSelAction(null);
    setSelTargetIdx(null);
    setSelTopicId(null);
    setSelSkillId(null);
  };

  const handleActionClick = (a: BattleAction) => {
    setSelAction(a);
    setSelTargetIdx(null);
    setSelTopicId(null);
    setSelSkillId(null);
  };

  const opponents = parts.filter((p, i) => i !== battle.currentTurnIdx && p.hp > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #1a0a02 0%, #0a0604 100%)" }}
    >
      <div className="px-4 pt-10 pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-gradient-to-r from-[#C0392B] to-transparent" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#F2A24A] px-2">
            回合制拼酒 · TURN BOUT
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-[#C0392B] to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {parts.map((p, i) => (
            <HPBar key={p.char.id} participant={p} flipped={i % 2 === 1} />
          ))}
        </div>
        <div className="mt-2 text-center text-[10px] font-black text-[#78716C] uppercase tracking-widest">
          Round {battle.roundNumber}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col-reverse gap-1 min-h-0">
        {[...battle.log].reverse().slice(0, 6).map((r, i) => {
          const a = parts.find((p) => p.char.id === r.actorId);
          return (
            <motion.div key={i} className="flex items-start gap-2 opacity-70">
              <span className="text-sm shrink-0">{a?.char.flag ?? "🍺"}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-[#78716C] italic leading-snug">{r.narrative}</p>
                {r.damage > 0 && (
                  <span className="text-[9px] font-black text-[#C0392B]">−{r.damage} HP</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div
        className="px-4 pb-4 border-t border-white/10 pt-3 shrink-0"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {isOver ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING_B}
              className="text-5xl mb-3"
            >
              🏆
            </motion.div>
            <p className="text-[#F2A24A] font-black text-xl uppercase tracking-widest">
              {battle.winner?.name} WINS!
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-xl bg-[#F2A24A] text-[#1A1816] font-black text-sm uppercase tracking-widest"
            >
              回到饭桌 Back to Table
            </motion.button>
          </div>
        ) : actor.statusEffect === "skipped" ? (
          <div className="text-center py-3">
            <p className="text-[#F5BE00] font-black text-sm uppercase tracking-widest">
              ⚠ {actor.char.name} 被眩晕
            </p>
            <p className="text-[#78716C] text-xs mt-1">回合自动跳过…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{actor.char.flag}</span>
              <div>
                <div className="text-xs font-black text-[#F2A24A] uppercase tracking-widest">
                  {actor.char.name} 的回合
                </div>
                <div className="text-[9px] text-[#78716C]">{actor.char.weaknessDescription}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              {(["drink", "topic", "drink_topic"] as BattleAction[]).map((a) => {
                const labels: Record<string, { emoji: string; cn: string; en: string }> = {
                  drink: { emoji: "🍺", cn: "喝酒", en: "Attack" },
                  topic: { emoji: "💥", cn: "开话题", en: "Topic" },
                  drink_topic: { emoji: "🌪", cn: "双管", en: "+40%" },
                };
                const l = labels[a];
                const active = selAction === a;
                return (
                  <motion.button
                    key={a}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleActionClick(a)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-center transition-all ${
                      active
                        ? "border-[#F2A24A] bg-[#F2A24A]/15"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg mb-0.5">{l.emoji}</span>
                    <span className="text-[9px] font-black text-[#F5F1E8] uppercase tracking-widest">
                      {l.cn}
                    </span>
                    <span className="text-[8px] text-[#78716C] mt-0.5">{l.en}</span>
                  </motion.button>
                );
              })}
            </div>

            {actor.char.skills.length > 0 ? (
              <div className="flex gap-2 mb-2 flex-wrap">
                {actor.char.skills.map((skill) => {
                  const cd = actor.skillCooldowns[skill.id] ?? 0;
                  const active = selAction === "skill" && selSkillId === skill.id;
                  return (
                    <motion.button
                      key={skill.id}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        if (cd === 0) {
                          handleActionClick("skill");
                          setSelSkillId(skill.id);
                        }
                      }}
                      disabled={cd > 0}
                      className={`flex-1 min-w-[45%] flex items-center gap-2 py-2 px-2.5 rounded-lg border text-left transition-all ${
                        cd > 0
                          ? "opacity-40 border-white/5"
                          : active
                            ? "border-[#F2A24A] bg-[#F2A24A]/15"
                            : "border-[#F2A24A]/40 bg-[#F2A24A]/8 hover:bg-[#F2A24A]/15"
                      }`}
                    >
                      <span className="text-base">{skill.icon}</span>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black text-[#F2A24A] uppercase tracking-widest truncate">
                          {skill.nameCN}
                        </div>
                        <div className="text-[8px] text-[#78716C]">
                          {cd > 0 ? `${cd}轮冷却` : "就绪"}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[9px] text-[#78716C] mb-2 italic">该角色暂无预制技能（选有技能牌的嘉宾）</p>
            )}

            {needsTarget && selAction && (
              <div className="mb-2">
                <p className="text-[9px] text-[#78716C] uppercase tracking-widest mb-1.5">目标</p>
                <div className="flex gap-2 flex-wrap">
                  {opponents.map((p) => {
                    const idx = parts.indexOf(p);
                    const active = selTargetIdx === idx;
                    return (
                      <motion.button
                        key={p.char.id}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setSelTargetIdx(idx)}
                        className={`flex-1 min-w-[40%] flex items-center gap-2 py-2 px-2.5 rounded-lg border transition-all ${
                          active
                            ? "border-[#C0392B] bg-[#C0392B]/20"
                            : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-base">{p.char.flag}</span>
                        <div>
                          <div className="text-[9px] font-black text-[#F5F1E8] uppercase">
                            {p.char.name}
                          </div>
                          <div className="text-[8px] text-[#78716C]">HP {p.hp}</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {needsTopic && selAction && (
              <div className="mb-2">
                <p className="text-[9px] text-[#78716C] uppercase tracking-widest mb-1.5">话题</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {TOPIC_BOMBS.map((t) => {
                    const active = selTopicId === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setSelTopicId(t.id)}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-lg border transition-all text-left"
                        style={{
                          borderColor: active ? t.color : `${t.color}60`,
                          background: active ? `${t.color}30` : `${t.color}10`,
                        }}
                      >
                        <span className="text-base">{t.icon}</span>
                        <span
                          className="text-[9px] font-black uppercase tracking-widest"
                          style={{ color: t.color }}
                        >
                          {t.labelCN}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            <motion.button
              whileTap={{ scale: canCommit ? 0.97 : 1 }}
              onClick={handleCommit}
              disabled={!canCommit}
              className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                canCommit
                  ? "bg-[#F2A24A] text-[#1A1816] shadow-[0_0_15px_rgba(242,162,74,0.35)]"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              {!selAction ? "选择行动" : canCommit ? "出招！" : "继续选择…"}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
