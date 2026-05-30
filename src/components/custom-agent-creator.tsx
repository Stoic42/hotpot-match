"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_TEMPLATES,
  BALANCE_BUDGET,
  computeCustomBalanceCost,
  type AgentArchetype,
} from "@/lib/character-balance";
import { TOPIC_BOMBS } from "@/lib/characters";
import { createCustomGuestProfile } from "@/lib/api";
import {
  createDraftFromForm,
  saveCustomAgent,
  type CustomAgentDraft,
} from "@/lib/custom-agent";

const TOPIC_OPTIONS = TOPIC_BOMBS.map((t) => ({ id: t.id, label: t.labelCN }));

export function CustomAgentCreator({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (draft: CustomAgentDraft) => void;
}) {
  const [name, setName] = useState("我的牌友");
  const [flag, setFlag] = useState("🎭");
  const [archetype, setArchetype] = useState<AgentArchetype>("diplomat");
  const [personality, setPersonality] = useState("爱攒局、怕尴尬、会看脸色。");
  const [speakingStyle, setSpeakingStyle] = useState("客气里带刺，爱转移话题");
  const [topicTriggers, setTopicTriggers] = useState<string[]>(["hierarchy", "food"]);
  const [alcoholAllergy, setAlcoholAllergy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const cost = computeCustomBalanceCost(archetype, topicTriggers, alcoholAllergy);
  const t = ARCHETYPE_TEMPLATES[archetype];

  const toggleTopic = (id: string) => {
    setTopicTriggers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 3),
    );
  };

  const handleSave = () => {
    const { draft, error: err } = createDraftFromForm({
      name: name.trim() || "无名",
      flag: flag.trim() || "🎭",
      chineseTagline: ARCHETYPE_LABELS[archetype].cn,
      tagline: ARCHETYPE_LABELS[archetype].en,
      personality,
      speakingStyle,
      archetype,
      topicTriggers,
      alcoholAllergy,
    });
    if (!draft || err) {
      setError(err ?? "保存失败");
      return;
    }
    saveCustomAgent(draft);
    onSaved(draft);
    onClose();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const guest = await createCustomGuestProfile({
        name: name.trim() || "无名",
        flag: flag.trim() || "🎭",
        gradient: "from-violet-800 to-rose-900",
        bio: personality,
        traits: [ARCHETYPE_LABELS[archetype].en, ...topicTriggers],
        dietary: alcoholAllergy ? ["no-alcohol"] : [],
        drinkingPower: t.drinkingPower,
      });
      const weakness = guest.generatedPersona?.weaknessTopic;
      const draft: CustomAgentDraft = {
        id: `custom-db-${guest.id}`,
        name: guest.name,
        flag: guest.flag,
        chineseTagline: ARCHETYPE_LABELS[archetype].cn,
        tagline: ARCHETYPE_LABELS[archetype].en,
        personality: guest.generatedPersona?.personality ?? personality,
        speakingStyle: guest.generatedPersona?.speakingStyle ?? speakingStyle,
        archetype,
        topicTriggers: weakness ? [weakness] : topicTriggers,
        alcoholAllergy,
        generatedPersona: guest.generatedPersona ?? undefined,
        drinkingPowerOverride: guest.drinkingPower,
        createdAt: new Date().toISOString(),
      };
      saveCustomAgent(draft);
      onSaved(draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 生成失败");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1816] rounded-t-3xl border-t border-white/10 max-h-[90vh] overflow-y-auto p-6"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <h2 className="text-xl font-black text-[#F2A24A] mb-1">捏一个 Agent</h2>
            <p className="text-xs text-[#78716C] mb-4">
              选原型 + 话题弱点，点数不超过 {BALANCE_BUDGET} 才能和预制角色同桌制衡
            </p>

            <label className="block text-[10px] font-bold text-[#A8A29E] uppercase mb-1">名字</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-[#221F1C] border border-white/10 text-[#F5F1E8]"
            />

            <label className="block text-[10px] font-bold text-[#A8A29E] uppercase mb-1">旗帜 emoji</label>
            <input
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              className="w-20 mb-3 px-3 py-2 rounded-lg bg-[#221F1C] border border-white/10 text-2xl text-center"
            />

            <label className="block text-[10px] font-bold text-[#A8A29E] uppercase mb-1">原型（决定酒量/抢菜/构筑分）</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(Object.keys(ARCHETYPE_TEMPLATES) as AgentArchetype[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setArchetype(a);
                    setTopicTriggers(ARCHETYPE_TEMPLATES[a].suggestedTopics.slice(0, 2));
                  }}
                  className={`py-2 px-2 rounded-lg text-left text-xs border ${
                    archetype === a
                      ? "border-[#F2A24A] bg-[#F2A24A]/15 text-[#F2A24A]"
                      : "border-white/10 text-[#A8A29E]"
                  }`}
                >
                  <div className="font-black">{ARCHETYPE_LABELS[a].cn}</div>
                  <div className="opacity-70">酒 {ARCHETYPE_TEMPLATES[a].drinkingPower} · 捞菜 {ARCHETYPE_TEMPLATES[a].grabTier}</div>
                </button>
              ))}
            </div>

            <label className="block text-[10px] font-bold text-[#A8A29E] uppercase mb-1">人设</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={2}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-[#221F1C] border border-white/10 text-sm text-[#F5F1E8]"
            />

            <label className="block text-[10px] font-bold text-[#A8A29E] uppercase mb-1">说话风格</label>
            <input
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-[#221F1C] border border-white/10 text-sm text-[#F5F1E8]"
            />

            <label className="block text-[10px] font-bold text-[#A8A29E] uppercase mb-1">话题弱点（1–3 个）</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {TOPIC_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleTopic(opt.id)}
                  className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                    topicTriggers.includes(opt.id)
                      ? "border-[#C0392B] text-[#F2A24A]"
                      : "border-white/15 text-[#78716C]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 mb-3 text-sm text-[#A8A29E]">
              <input
                type="checkbox"
                checked={alcoholAllergy}
                onChange={(e) => setAlcoholAllergy(e.target.checked)}
              />
              酒精过敏（减构筑分，酒局易冻结）
            </label>

            <div className={`text-xs font-bold mb-3 ${cost > BALANCE_BUDGET ? "text-[#C0392B]" : "text-emerald-400"}`}>
              构筑分 {cost} / {BALANCE_BUDGET} · 当前原型酒力 {t.drinkingPower}
            </div>

            {error && <p className="text-[#C0392B] text-xs mb-2">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/15 text-[#A8A29E] font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={cost > BALANCE_BUDGET || generating}
                className="flex-1 py-3 rounded-xl bg-[#F2A24A] text-[#1A1816] font-black disabled:opacity-40"
              >
                保存并加入牌组
              </button>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={cost > BALANCE_BUDGET || generating}
              className="mt-3 w-full py-3 rounded-xl border border-[#F2A24A]/40 text-[#F2A24A] font-black disabled:opacity-40"
            >
              {generating ? "AI 生成人设中…" : "AI 生成细节并加入"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
