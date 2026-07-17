// Client-side port of server/services/battleEngine.js — pure JS, no dependencies.
// The server still validates outcomes and awards rewards; this runs locally for
// smooth real-time animation without waiting for a round-trip.

export const TICK_MS = 100;
export const MAX_TICKS = 300;
const DOT_INTERVAL_MS = 1000;

function makeCombatant({ id, side, stats, skills }) {
  return {
    id,
    side,
    maxHp: stats.hp,
    hp: stats.hp,
    stats,
    skills: [...skills].sort((a, b) => a.priority - b.priority),
    cooldowns: {},
    lastBasicAttackAt: -Infinity,
    effects: [],
    dots: [],
  };
}

function pruneExpired(combatant, now) {
  combatant.effects = combatant.effects.filter((e) => e.expiresAt > now);
  combatant.dots = combatant.dots.filter((d) => d.expiresAt > now);
}

function effectiveStats(combatant) {
  const stats = { ...combatant.stats };
  let defenseMult = 1;
  let attackSpeedMult = 1;
  let critChanceBonus = 0;
  let critDmgBonus = 0;
  let lifestealAdd = 0;
  let defenseReduction = 0;

  for (const e of combatant.effects) {
    if (e.stat === 'defense_mult') defenseMult *= e.value;
    if (e.stat === 'attack_speed_mult') attackSpeedMult *= e.value;
    if (e.stat === 'crit_chance_bonus') critChanceBonus += e.value;
    if (e.stat === 'crit_dmg_bonus') critDmgBonus += e.value;
    if (e.stat === 'lifesteal_add') lifestealAdd += e.value;
    if (e.stat === 'defense_reduction') defenseReduction += e.value;
  }

  return {
    ...stats,
    defense: Math.max(0, stats.defense * defenseMult * (1 - defenseReduction)),
    attack_speed: Math.max(0.05, stats.attack_speed * attackSpeedMult),
    crit_chance: Math.min(1, Math.max(0, stats.crit_chance + critChanceBonus)),
    crit_dmg: stats.crit_dmg + critDmgBonus,
    lifesteal: Math.max(0, stats.lifesteal + lifestealAdd),
  };
}

function rollCrit(critChance, rng) {
  return rng() < critChance;
}

function computeDamage(attackerEff, defenderEff, skill, rng) {
  const pierce = skill.extra?.defense_pierce || 0;
  const effectiveDefense = defenderEff.defense * (1 - pierce);
  let dmg = Math.max(1, attackerEff.attack * skill.power_multiplier * (100 / (100 + effectiveDefense)));

  const critChance = attackerEff.crit_chance + (skill.extra?.crit_chance_bonus || 0);
  const isCrit = rollCrit(critChance, rng);
  if (isCrit) {
    const critDmg = attackerEff.crit_dmg + (skill.extra?.crit_dmg_bonus || 0);
    dmg *= critDmg;
  }

  return { dmg, isCrit };
}

function applySkillEffect(actor, target, skill, now, rng, log, tick) {
  const actorEff = effectiveStats(actor);
  const targetEff = effectiveStats(target);

  if (skill.effect_type === 'damage') {
    let { dmg, isCrit } = computeDamage(actorEff, targetEff, skill, rng);

    if (skill.extra?.execute_threshold && target.hp / target.maxHp <= skill.extra.execute_threshold) {
      dmg *= skill.extra.execute_mult || 1;
    }

    dmg = Math.round(dmg);
    target.hp = Math.max(0, target.hp - dmg);

    const lifestealPct = skill.extra?.self_lifesteal_override ?? actorEff.lifesteal;
    let healed = 0;
    if (lifestealPct > 0) {
      healed = Math.round(dmg * lifestealPct);
      actor.hp = Math.min(actor.maxHp, actor.hp + healed);
    }

    log.push({
      tick, time: now, actorSide: actor.side, targetSide: target.side, skillKey: skill.key, skillName: skill.name,
      type: 'damage', damage: dmg, crit: isCrit, healed,
      actorHp: actor.hp, targetHp: target.hp,
    });
  } else if (skill.effect_type === 'heal') {
    const healed = Math.round((skill.extra?.heal_pct || 0) * actor.maxHp);
    actor.hp = Math.min(actor.maxHp, actor.hp + healed);
    log.push({
      tick, time: now, actorSide: actor.side, targetSide: actor.side, skillKey: skill.key, skillName: skill.name,
      type: 'heal', healed, actorHp: actor.hp, targetHp: target.hp,
    });
  } else if (skill.effect_type === 'buff') {
    const extra = skill.extra || {};
    const duration = extra.duration_ms || 3000;
    if (extra.defense_mult) actor.effects.push({ stat: 'defense_mult', value: extra.defense_mult, expiresAt: now + duration });
    if (extra.crit_chance_bonus) actor.effects.push({ stat: 'crit_chance_bonus', value: extra.crit_chance_bonus, expiresAt: now + duration });
    if (extra.attack_speed_mult) actor.effects.push({ stat: 'attack_speed_mult', value: extra.attack_speed_mult, expiresAt: now + duration });
    log.push({
      tick, time: now, actorSide: actor.side, targetSide: actor.side, skillKey: skill.key, skillName: skill.name,
      type: 'buff', actorHp: actor.hp, targetHp: target.hp,
    });
  } else if (skill.effect_type === 'debuff') {
    const extra = skill.extra || {};
    const duration = extra.duration_ms || 3000;
    if (extra.defense_reduction) target.effects.push({ stat: 'defense_reduction', value: extra.defense_reduction, expiresAt: now + duration });
    if (extra.dot_pct) {
      const dmgPerHit = Math.round(actorEff.attack * extra.dot_pct);
      target.dots.push({ dmgPerHit, nextTickAt: now + DOT_INTERVAL_MS, expiresAt: now + duration });
    }
    log.push({
      tick, time: now, actorSide: actor.side, targetSide: target.side, skillKey: skill.key, skillName: skill.name,
      type: 'debuff', actorHp: actor.hp, targetHp: target.hp,
    });
  } else if (skill.effect_type === 'lifesteal_bonus') {
    const extra = skill.extra || {};
    const duration = extra.duration_ms || 3000;
    actor.effects.push({ stat: 'lifesteal_add', value: extra.lifesteal_bonus || 0, expiresAt: now + duration });
    log.push({
      tick, time: now, actorSide: actor.side, targetSide: actor.side, skillKey: skill.key, skillName: skill.name,
      type: 'lifesteal_bonus', actorHp: actor.hp, targetHp: target.hp,
    });
  }
}

function tickDots(combatant, now, log, tick) {
  for (const dot of combatant.dots) {
    if (now >= dot.nextTickAt) {
      combatant.hp = Math.max(0, combatant.hp - dot.dmgPerHit);
      dot.nextTickAt += DOT_INTERVAL_MS;
      log.push({
        tick, time: now,
        actorSide: combatant.side === 'player' ? 'monster' : 'player',
        targetSide: combatant.side,
        skillKey: 'dot', skillName: 'Отравление', type: 'dot', damage: dot.dmgPerHit,
        actorHp: null, targetHp: combatant.hp,
      });
    }
  }
}

function actOnce(actor, target, now, rng, log, tick) {
  const actorEff = effectiveStats(actor);

  for (const skill of actor.skills) {
    const lastFired = actor.cooldowns[skill.key] ?? -Infinity;
    if (now - lastFired >= skill.cooldown_ms) {
      actor.cooldowns[skill.key] = now;
      applySkillEffect(actor, target, skill, now, rng, log, tick);
      return true;
    }
  }

  const basicCadence = 1000 / actorEff.attack_speed;
  if (now - actor.lastBasicAttackAt >= basicCadence) {
    actor.lastBasicAttackAt = now;
    applySkillEffect(actor, target, {
      key: 'basic_attack', name: 'Обычная атака', effect_type: 'damage', power_multiplier: 1, extra: {},
    }, now, rng, log, tick);
    return true;
  }

  return false;
}

// player: { id, stats, skills }, monster: { id, stats, skills }
// Returns { outcome: 'win'|'loss'|'timeout', log: [...], ticks }
export function simulateBattle(player, monster) {
  const rng = Math.random;
  const p = makeCombatant({ id: player.id, side: 'player', stats: player.stats, skills: player.skills });
  const m = makeCombatant({ id: monster.id, side: 'monster', stats: monster.stats, skills: monster.skills || [] });
  const log = [];

  let tick = 0;
  for (; tick < MAX_TICKS; tick++) {
    const now = tick * TICK_MS;
    pruneExpired(p, now);
    pruneExpired(m, now);
    tickDots(p, now, log, tick);
    tickDots(m, now, log, tick);

    if (p.hp <= 0 || m.hp <= 0) break;

    actOnce(p, m, now, rng, log, tick);
    if (m.hp <= 0) break;
    actOnce(m, p, now, rng, log, tick);
    if (p.hp <= 0) break;
  }

  let outcome;
  if (p.hp <= 0 && m.hp <= 0) outcome = 'loss';
  else if (m.hp <= 0) outcome = 'win';
  else if (p.hp <= 0) outcome = 'loss';
  else outcome = 'timeout';

  return { outcome, log, ticks: tick, playerHpRemaining: p.hp, monsterHpRemaining: m.hp };
}
