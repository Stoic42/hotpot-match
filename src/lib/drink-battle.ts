import { TOPIC_BOMBS, type Character } from "@/lib/characters";

export type BattleAction = "drink" | "topic" | "drink_topic" | "skill";

export interface BattleParticipant {
  char: Character;
  hp: number;
  maxHp: number;
  statusEffect: "normal" | "skipped" | "immune" | "stunned";
  skillCooldowns: Record<string, number>;
  drinkCount: number;
}

export interface BattleRound {
  actorId: string;
  action: BattleAction;
  targetId?: string;
  topicId?: string;
  skillId?: string;
  damage: number;
  narrative: string;
  feedLines: string[];
  specialEvent?: "weakness_triggered" | "forced_drink" | "topic_bomb" | "skill_used" | "immunity";
}

export interface DrinkBattle {
  open: boolean;
  participants: BattleParticipant[];
  currentTurnIdx: number;
  roundNumber: number;
  log: BattleRound[];
  winner: Character | null;
  lastEvent: string;
  feedQueue: string[];
}

export function emptyDrinkBattle(): DrinkBattle {
  return {
    open: false,
    participants: [],
    currentTurnIdx: 0,
    roundNumber: 1,
    log: [],
    winner: null,
    lastEvent: "",
    feedQueue: [],
  };
}

export function createBattleParticipants(guests: Character[]): BattleParticipant[] {
  return guests.map((g) => ({
    char: g,
    hp: Math.max(60, g.drinkingPower * 10),
    maxHp: Math.max(60, g.drinkingPower * 10),
    statusEffect: "normal" as const,
    skillCooldowns: {},
    drinkCount: 0,
  }));
}

export function computeDamage(
  attacker: BattleParticipant,
  target: BattleParticipant,
  action: BattleAction,
  skillId?: string,
): number {
  if (attacker.char.alcoholAllergy) return 0;
  const base = attacker.char.drinkingPower + 3 + Math.floor(Math.random() * 8);
  let multiplier = 1;
  if (action === "drink_topic") multiplier = 1.4;
  if (skillId) {
    const skill = attacker.char.skills.find((s) => s.id === skillId);
    if (skill?.effect === "damage_boost") multiplier = skill.value;
  }
  if (target.statusEffect === "immune") return 0;
  return Math.round(base * multiplier);
}

export function buildNarrative(round: BattleRound, participants: BattleParticipant[]): string {
  const actor = participants.find((p) => p.char.id === round.actorId)?.char;
  const target = round.targetId
    ? participants.find((p) => p.char.id === round.targetId)?.char
    : null;
  if (!actor) return "";
  if (round.action === "drink" && target) {
    return `${actor.flag} ${actor.name} raises a glass at ${target.flag} ${target.name} — ${actor.drinkLines[Math.floor(Math.random() * actor.drinkLines.length)]}`;
  }
  if (round.action === "topic" && round.topicId) {
    const topic = TOPIC_BOMBS.find((t) => t.id === round.topicId);
    return `${actor.flag} ${actor.name} drops a topic bomb: "${topic?.labelCN}" — ${actor.topicReactions[round.topicId ?? "food"] ?? "..."}`;
  }
  if (round.action === "drink_topic") {
    return `${actor.flag} ${actor.name} drinks AND starts a topic — chaos ensues`;
  }
  if (round.action === "skill") {
    const skill = actor.skills.find((s) => s.id === round.skillId);
    return `${actor.flag} ${actor.name} uses ${skill?.icon ?? "✨"} ${skill?.nameCN ?? "skill"}! ${skill?.description ?? ""}`;
  }
  return `${actor.name} acts.`;
}

export function applyBattleAction(
  battle: DrinkBattle,
  action: BattleAction,
  targetIdx?: number,
  topicId?: string,
  skillId?: string,
): DrinkBattle {
  if (!battle.open || battle.winner) return battle;

  const parts = battle.participants.map((p) => ({ ...p, char: p.char }));
  const actorIdx = battle.currentTurnIdx;
  const actor = { ...parts[actorIdx] };

  const finalTargetIdx =
    targetIdx !== undefined
      ? targetIdx
      : parts.findIndex((p, i) => i !== actorIdx && p.hp > 0);
  const target = finalTargetIdx >= 0 ? { ...parts[finalTargetIdx] } : null;

  let damage = 0;
  let specialEvent: BattleRound["specialEvent"];
  const feedLines: string[] = [];

  if (action === "drink" || action === "drink_topic") {
    if (actor.char.alcoholAllergy) {
      feedLines.push(
        `${actor.char.flag} ${actor.char.name}: ${actor.char.drinkLines[0]}`,
      );
    } else if (target) {
      damage = computeDamage(actor, target, action, skillId);
      if (target.statusEffect === "immune") {
        specialEvent = "immunity";
        damage = 0;
      } else if (actor.char.weaknessTopic && topicId === actor.char.weaknessTopic) {
        const selfDmg = Math.round(damage * 0.4);
        parts[actorIdx] = { ...actor, hp: Math.max(0, actor.hp - selfDmg) };
        specialEvent = "weakness_triggered";
      }
      parts[finalTargetIdx] = {
        ...target,
        hp: Math.max(0, target.hp - damage),
        drinkCount: target.drinkCount + 1,
      };
      feedLines.push(
        `${actor.char.flag} ${actor.char.name} → ${target.char.flag} ${target.char.name}: ${actor.char.drinkBoastLines[Math.floor(Math.random() * actor.char.drinkBoastLines.length)]}`,
      );
      feedLines.push(
        `${target.char.flag} ${target.char.name}: ${target.char.drinkLines[Math.floor(Math.random() * target.char.drinkLines.length)]}`,
      );
    }
    parts[actorIdx] = { ...parts[actorIdx], drinkCount: (parts[actorIdx].drinkCount ?? 0) + 1 };
  }

  if (action === "topic" || action === "drink_topic") {
    if (topicId) {
      const topicDef = TOPIC_BOMBS.find((t) => t.id === topicId);
      (topicDef?.forcesDrinkFrom ?? []).forEach((fid) => {
        const fi = parts.findIndex((p) => p.char.id === fid);
        if (fi >= 0 && parts[fi].hp > 0) {
          const fd = Math.round(15 + Math.random() * 10);
          parts[fi] = {
            ...parts[fi],
            hp: Math.max(0, parts[fi].hp - fd),
            drinkCount: parts[fi].drinkCount + 1,
          };
          feedLines.push(
            `${parts[fi].char.flag} ${parts[fi].char.name} 被话题卷进去喝了一杯！ (−${fd} HP)`,
          );
          specialEvent = "forced_drink";
        }
      });
      const topicLine =
        actor.char.topicReactions[topicId] ?? actor.char.messageSamples[0];
      feedLines.push(`${actor.char.flag} ${actor.char.name}: "${topicLine}"`);
      if (!specialEvent) specialEvent = "topic_bomb";
    }
  }

  if (action === "skill" && skillId) {
    const skill = actor.char.skills.find((s) => s.id === skillId);
    if (skill) {
      specialEvent = "skill_used";
      const cd: Record<string, number> = {
        ...actor.skillCooldowns,
        [skillId]: skill.cooldown,
      };
      parts[actorIdx] = { ...parts[actorIdx], skillCooldowns: cd };

      if (skill.effect === "skip_opponent" && target) {
        parts[finalTargetIdx] = { ...parts[finalTargetIdx], statusEffect: "skipped" };
        feedLines.push(
          `${actor.char.flag} ${actor.char.name} 发动【${skill.nameCN}】！${target.char.flag} ${target.char.name} 下回合无法行动！`,
        );
      } else if (skill.effect === "immunity") {
        parts[actorIdx] = { ...parts[actorIdx], statusEffect: "immune" };
        feedLines.push(
          `${actor.char.flag} ${actor.char.name} 发动【${skill.nameCN}】！本回合免疫！`,
        );
      } else if (skill.effect === "heal") {
        const healed = skill.value;
        parts[actorIdx] = {
          ...parts[actorIdx],
          hp: Math.min(parts[actorIdx].maxHp, parts[actorIdx].hp + healed),
        };
        feedLines.push(
          `${actor.char.flag} ${actor.char.name} 【${skill.nameCN}】回血 +${healed} HP`,
        );
      } else if (skill.effect === "forced_drink" && target) {
        damage = skill.value;
        parts[finalTargetIdx] = {
          ...parts[finalTargetIdx],
          hp: Math.max(0, parts[finalTargetIdx].hp - damage),
          drinkCount: parts[finalTargetIdx].drinkCount + 1,
        };
        feedLines.push(
          `${actor.char.flag} ${actor.char.name} 【${skill.nameCN}】— ${target.char.flag} ${target.char.name} 被迫喝！ (−${damage} HP)`,
        );
      } else if (skill.effect === "topic_bomb") {
        parts.forEach((p, i) => {
          if (i !== actorIdx && p.hp > 0) {
            const d = Math.round(skill.value + Math.random() * 5);
            parts[i] = { ...p, hp: Math.max(0, p.hp - d) };
            feedLines.push(`${p.char.flag} ${p.char.name} 被话题波及 −${d} HP`);
          }
        });
      } else if (skill.effect === "damage_boost" && target) {
        damage = computeDamage(actor, target, action, skillId);
        parts[finalTargetIdx] = {
          ...parts[finalTargetIdx],
          hp: Math.max(0, parts[finalTargetIdx].hp - damage),
        };
        feedLines.push(
          `${actor.char.flag} ${actor.char.name} 【${skill.nameCN}】暴击 −${damage} HP`,
        );
      }
    }
  }

  const newCooldowns: Record<string, number> = {};
  Object.entries(parts[actorIdx].skillCooldowns).forEach(([k, v]) => {
    newCooldowns[k] = Math.max(0, v - 1);
  });
  parts[actorIdx] = { ...parts[actorIdx], skillCooldowns: newCooldowns };
  if (parts[actorIdx].statusEffect !== "normal") {
    parts[actorIdx] = { ...parts[actorIdx], statusEffect: "normal" };
  }

  const roundRecord: BattleRound = {
    actorId: actor.char.id,
    action,
    targetId: target?.char.id,
    topicId,
    skillId,
    damage,
    narrative: "",
    feedLines,
    specialEvent,
  };
  roundRecord.narrative = buildNarrative(roundRecord, parts);

  const alive = parts.filter((p) => p.hp > 0);
  const winner = alive.length === 1 ? alive[0].char : null;

  let nextTurnIdx = (actorIdx + 1) % parts.length;
  let loops = 0;
  while (parts[nextTurnIdx]?.hp <= 0 && loops < parts.length) {
    nextTurnIdx = (nextTurnIdx + 1) % parts.length;
    loops++;
  }

  return {
    ...battle,
    participants: parts,
    currentTurnIdx: nextTurnIdx,
    roundNumber: battle.roundNumber + 1,
    log: [...battle.log, roundRecord],
    winner,
    lastEvent: roundRecord.narrative,
    feedQueue: [...battle.feedQueue, ...feedLines],
  };
}

export function skipStunnedTurn(battle: DrinkBattle): DrinkBattle {
  if (!battle.open || battle.winner) return battle;
  const parts = [...battle.participants];
  const idx = battle.currentTurnIdx;
  const stunned = parts[idx];
  if (!stunned || stunned.statusEffect !== "skipped") return battle;

  parts[idx] = { ...parts[idx], statusEffect: "normal" };
  let next = (idx + 1) % parts.length;
  let loops = 0;
  while (parts[next]?.hp <= 0 && loops < parts.length) {
    next = (next + 1) % parts.length;
    loops++;
  }
  return {
    ...battle,
    participants: parts,
    currentTurnIdx: next,
    lastEvent: `${stunned.char.name} 被眩晕，回合跳过`,
  };
}
